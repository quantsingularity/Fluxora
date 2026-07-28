"""Model training pipeline for Fluxora."""

import logging
import os
from datetime import datetime, timedelta
from typing import Any, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

# Import from ml_core (sibling module) – no longer from app.services
from ml_core.data_validator import validate_energy_dataframe
from ml_core.feature_engineering import preprocess_data_for_model

logger = logging.getLogger(__name__)

# Bug fix: this previously ignored the documented MODEL_PATH environment
# variable (see app/core/config.py and .env.example) and always hardcoded
# a path relative to the current working directory. Both the training
# pipeline and the predictions endpoint now resolve the model path from
# here, so setting MODEL_PATH actually has an effect.
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(os.getcwd(), "fluxora_model.joblib"))


def load_data_from_db(db_session: Any = None) -> pd.DataFrame:
    """
    Loads all energy data from the database.
    Falls back to synthetic data when no session is provided or the DB is empty.
    """
    if db_session is not None:
        try:
            # Lazy import keeps ml_core decoupled from the ORM layer;
            # callers are expected to have the backend on sys.path.
            from app.models.data import EnergyData  # type: ignore[import]

            records = db_session.query(EnergyData).order_by(EnergyData.timestamp).all()
            if records:
                rows = [
                    {
                        "timestamp": r.timestamp,
                        "consumption_kwh": float(r.consumption_kwh),
                        "user_id": r.user_id,
                    }
                    for r in records
                ]
                df = pd.DataFrame(rows)
                validation = validate_energy_dataframe(df)
                if validation["warnings"]:
                    logger.warning(
                        "Data quality warnings before training: %s",
                        validation["warnings"],
                    )
                return df
        except Exception as e:
            logger.warning(f"Could not load data from DB, using synthetic: {e}")

    # --- Synthetic fallback ---
    start_time = datetime.now() - timedelta(days=30)
    timestamps = [start_time + timedelta(hours=i) for i in range(30 * 24)]
    idx = np.arange(len(timestamps))
    daily_cycle = np.sin(idx * 2 * np.pi / 24) * 10
    weekly_cycle = np.sin(idx * 2 * np.pi / (24 * 7)) * 20
    base_load = 50
    noise = np.random.default_rng(seed=42).normal(0, 5, len(timestamps))
    consumption = np.abs(base_load + daily_cycle + weekly_cycle + noise)
    return pd.DataFrame(
        {"timestamp": timestamps, "consumption_kwh": consumption, "user_id": 1}
    )


def train_model(df: pd.DataFrame) -> Tuple[RandomForestRegressor, dict]:
    """Trains a RandomForestRegressor on the processed data.

    Feature engineering is scoped per ``user_id`` (see
    ``preprocess_data_for_model``'s ``group_col`` default) so that when the
    database holds data for more than one user, one user's consumption
    history cannot leak into another's lag/rolling features merely because
    their rows happened to be interleaved by timestamp.
    """
    processed_df = preprocess_data_for_model(df.copy())
    target_col = "consumption_kwh"
    features = [
        col
        for col in processed_df.columns
        if col not in [target_col, "timestamp", "user_id"]
    ]

    if not features:
        raise ValueError("No feature columns found after preprocessing.")

    X = processed_df[features]
    y = processed_df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )
    max_depth_env = os.getenv("MODEL_MAX_DEPTH")
    max_depth = int(max_depth_env) if max_depth_env else None
    model = RandomForestRegressor(
        n_estimators=100, max_depth=max_depth, random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    mse = float(mean_squared_error(y_test, y_pred))
    r2 = float(r2_score(y_test, y_pred))
    metrics = {
        "mean_squared_error": mse,
        "r2_score": r2,
        "feature_count": len(features),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
    }
    logger.info(f"Model Training Complete. MSE: {mse:.4f}, R2: {r2:.4f}")
    return model, metrics


def save_model(model: RandomForestRegressor, path: str = "") -> None:
    """Saves the trained model to disk."""
    save_path = path or MODEL_PATH
    dir_name = os.path.dirname(save_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    joblib.dump(model, save_path)
    logger.info(f"Model saved to {save_path}")


def run_training_pipeline(db_session: Any = None, model_path: str = "") -> dict:
    """Full pipeline: load data → train model → save."""
    logger.info("Starting training pipeline...")
    data_df = load_data_from_db(db_session)
    model, metrics = train_model(data_df)
    save_model(model, path=model_path or MODEL_PATH)
    return metrics
