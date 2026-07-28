import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Dict, List

import numpy as np
import pandas as pd
from app.core.circuit_breaker import CircuitBreaker
from app.core.retry import retry
from app.core.security import get_current_active_user, get_current_superuser
from app.db.dependencies import get_db
from app.schemas.user import User
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

# ML utilities live in ml_core (project-level package). ``build_model_features``
# is the single source of truth for feature construction, shared by both the
# training pipeline (ml_core.training) and the per-row inference loop below,
# so the two can never silently drift into mismatched feature sets.
from ml_core.feature_engineering import (
    DEFAULT_LAGS,
    DEFAULT_WINDOWS,
    build_model_features,
)

try:
    import joblib

    _JOBLIB_AVAILABLE = True
except ImportError:
    _JOBLIB_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions", tags=["predictions"])

# Bug fix: the endpoint previously only fetched the 48 most recent readings
# as prediction context, but the largest rolling window used by the feature
# pipeline is 7*24=168 hours. With only 48 rows of history, the
# rolling_std_168 feature could never be non-NaN until ~120 future steps had
# already been (fallback-)predicted, so almost an entire 7-day forecast
# silently degraded to a flat "fallback mean" line instead of using the
# trained model. 30 days of hourly history comfortably covers every
# configured lag/window with room to spare.
_HISTORICAL_LOOKBACK_RECORDS = 24 * 30

# Protects the hot model-loading path: if the model file becomes corrupted
# or unreadable, we don't want every single prediction request to pay the
# cost of a failing disk read. After a few consecutive failures the circuit
# opens and requests fall straight through to the mock fallback until the
# recovery window elapses and a probe read is allowed again.
_model_breaker = CircuitBreaker(
    failure_threshold=3, recovery_timeout=60, fallback_function=lambda: None
)


def _read_model_from_disk() -> Any:
    from ml_core.training import MODEL_PATH

    if not os.path.exists(MODEL_PATH):
        return None
    return joblib.load(MODEL_PATH)


def load_model() -> Any:
    """Load the trained model from disk, returning None if unavailable."""
    if not _JOBLIB_AVAILABLE:
        return None
    try:
        return _model_breaker.call(_read_model_from_disk)
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return None


def generate_mock_predictions(days: int) -> List[Dict[str, Any]]:
    """Generate mock prediction data when no trained model is available."""
    data: List[Dict[str, Any]] = []
    now = datetime.now(timezone.utc)
    for i in range(days * 24):
        timestamp = now + timedelta(hours=i)
        hour = timestamp.hour
        base_load = 50.0
        daily_cycle = np.sin(hour / 24 * 2 * np.pi) * 20
        noise = np.random.default_rng().normal(0, 5)
        predicted = float(base_load + daily_cycle + noise)
        margin = abs(predicted) * 0.15
        data.append(
            {
                "timestamp": timestamp.isoformat(),
                "predicted_consumption": round(predicted, 2),
                "confidence_interval": {
                    "lower": round(predicted - margin, 2),
                    "upper": round(predicted + margin, 2),
                },
            }
        )
    return data


def _build_features_for_row(
    full_df: pd.DataFrame, row_idx: int, feature_cols: List[str]
) -> pd.DataFrame:
    """
    Build a single-row feature DataFrame for ``full_df.iloc[row_idx]``.

    Includes the target row so that lag/rolling features reference the
    *correct* preceding values (including previously predicted ones), and
    overrides time-based features with the actual future timestamp so the
    model sees the right hour/day_of_week etc.

    Uses :func:`build_model_features` — the exact same feature pipeline
    used to train the model — so the columns produced here always match
    the columns the model was fit on.
    """
    # Include the current future row so lags align correctly
    slice_df = full_df.iloc[: row_idx + 1].copy()
    slice_df = build_model_features(
        slice_df, lags=DEFAULT_LAGS, windows=DEFAULT_WINDOWS, group_col="user_id"
    )

    # Last row = the future step we want features for
    last = slice_df.iloc[[-1]].copy()

    # Check that all engineered feature columns are present and non-NaN
    missing_or_nan = [
        c for c in feature_cols if c not in last.columns or last[c].isnull().any()
    ]
    if missing_or_nan:
        return pd.DataFrame()  # signal: not enough history

    return last[feature_cols]


@router.get("/", response_model=List[Dict[str, Any]])
def get_predictions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    days: int = Query(default=7, ge=1, le=90),
) -> Any:
    """
    Generate energy consumption predictions for the next N days.
    Falls back to mock predictions when no trained model or historical data
    is available.
    """
    model = load_model()
    if model is None:
        logger.info("No trained model found. Returning mock predictions.")
        return generate_mock_predictions(days)

    from app.crud.data import get_data_records

    historical_records = get_data_records(
        db, user_id=current_user.id, limit=_HISTORICAL_LOOKBACK_RECORDS
    )
    if not historical_records:
        logger.info("No historical records found. Returning mock predictions.")
        return generate_mock_predictions(days)

    historical_df = pd.DataFrame(
        [
            {
                "timestamp": r.timestamp,
                "consumption_kwh": float(r.consumption_kwh),
                "user_id": r.user_id,
            }
            for r in historical_records
        ]
    )

    if historical_df.empty:
        return generate_mock_predictions(days)

    historical_df["timestamp"] = pd.to_datetime(historical_df["timestamp"])
    historical_df = historical_df.sort_values("timestamp").reset_index(drop=True)

    # Determine feature columns from a fully-processed historical slice
    from ml_core.feature_engineering import preprocess_data_for_model

    processed_hist = preprocess_data_for_model(historical_df.copy())
    if processed_hist.empty:
        return generate_mock_predictions(days)

    target_col = "consumption_kwh"
    feature_cols = [
        col
        for col in processed_hist.columns
        if col not in [target_col, "timestamp", "user_id"]
    ]

    # Build combined DataFrame: historical + placeholder future rows
    future_timestamps = [
        historical_df["timestamp"].iloc[-1] + timedelta(hours=i)
        for i in range(1, days * 24 + 1)
    ]
    future_df = pd.DataFrame(
        {
            "timestamp": future_timestamps,
            "consumption_kwh": np.nan,
            "user_id": current_user.id,
        }
    )
    full_df = pd.concat([historical_df, future_df], ignore_index=True)
    start_idx = len(historical_df)
    fallback_value = float(historical_df["consumption_kwh"].mean())

    for i in range(start_idx, len(full_df)):
        X_pred = _build_features_for_row(full_df, i, feature_cols)
        if X_pred.empty:
            full_df.loc[i, "consumption_kwh"] = fallback_value
            continue

        prediction = float(model.predict(X_pred)[0])
        full_df.loc[i, "consumption_kwh"] = max(prediction, 0.0)

    predictions_df = full_df.iloc[start_idx:].copy()
    results: List[Dict[str, Any]] = []
    for _, row in predictions_df.iterrows():
        predicted = float(row["consumption_kwh"])
        margin = abs(predicted) * 0.10
        results.append(
            {
                "timestamp": pd.Timestamp(row["timestamp"]).isoformat(),
                "predicted_consumption": round(predicted, 2),
                "confidence_interval": {
                    "lower": round(predicted - margin, 2),
                    "upper": round(predicted + margin, 2),
                },
            }
        )
    return results


@retry(max_attempts=2, retry_exceptions=(OSError,), base_delay=0.5, jitter=False)
def _run_training_with_retry(db: Session) -> Dict[str, Any]:
    """Runs the training pipeline, retrying once on transient disk I/O
    errors (e.g. writing the model file to a momentarily-locked path)."""
    from ml_core.training import run_training_pipeline

    return run_training_pipeline(db_session=db)


@router.post("/train", response_model=Dict[str, Any])
def trigger_training(
    current_user: Annotated[User, Depends(get_current_superuser)],
    db: Annotated[Session, Depends(get_db)],
) -> Any:
    """
    Trigger model (re-)training using data from the database.
    Restricted to superusers.
    """
    metrics = _run_training_with_retry(db)
    return {"status": "trained", "metrics": metrics}
