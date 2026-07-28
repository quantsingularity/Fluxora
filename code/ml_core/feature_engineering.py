"""Feature engineering utilities for Fluxora ML pipeline."""

from typing import List, Optional

import pandas as pd

from .temporal_features import create_cyclical_features

# Default lag / rolling-window configuration shared by training and
# inference. Keeping these as module-level constants (rather than
# duplicating the literals in the backend's predictions endpoint) ensures
# the feature set used to *train* the model always matches the feature set
# used to *serve* predictions from it.
DEFAULT_LAGS = [1, 2, 24]
DEFAULT_WINDOWS = [3, 24 * 7]
DEFAULT_TARGET_COL = "consumption_kwh"
DEFAULT_GROUP_COL = "user_id"


def create_time_series_features(
    df: pd.DataFrame, time_col: str = "timestamp"
) -> pd.DataFrame:
    """Creates time-series features from a timestamp column."""
    df = df.copy()
    df[time_col] = pd.to_datetime(df[time_col])
    df["hour"] = df[time_col].dt.hour
    df["day_of_week"] = df[time_col].dt.dayofweek
    df["day_of_year"] = df[time_col].dt.dayofyear
    df["month"] = df[time_col].dt.month
    df["year"] = df[time_col].dt.year
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["quarter"] = df[time_col].dt.quarter
    return df


def create_lag_features(
    df: pd.DataFrame,
    target_col: str,
    lags: List[int],
    group_col: Optional[str] = None,
) -> pd.DataFrame:
    """Creates lag features for a given target column.

    When ``group_col`` is provided (e.g. ``"user_id"``), lags are computed
    *within each group* so that one user's history never leaks into
    another's lag features when multiple users' rows are concatenated into
    a single DataFrame (as happens when training a shared/global model).
    Without a group_col, behaves exactly as a plain ``.shift()``.
    """
    df = df.copy()
    for lag in lags:
        col = f"{target_col}_lag_{lag}"
        if group_col and group_col in df.columns:
            df[col] = df.groupby(group_col)[target_col].shift(lag)
        else:
            df[col] = df[target_col].shift(lag)
    return df


def create_rolling_features(
    df: pd.DataFrame,
    target_col: str,
    windows: List[int],
    group_col: Optional[str] = None,
) -> pd.DataFrame:
    """Creates rolling window features (mean, std) for a given target column.

    Bug fix: the rolling window is computed on the target *shifted by one
    row* rather than on the raw column directly. Pandas' ``.rolling()``
    windows are inclusive of the current row by default, so computing
    ``df[target_col].rolling(window).mean()`` folds each row's own target
    value into its own feature. That is a double problem:

      1. Target leakage during training — the model is handed a feature
         that is partly a smoothed copy of the very label it's predicting
         for that row, inflating validation metrics without generalising.
      2. A guaranteed dead end at inference time — the row being predicted
         has an unknown (NaN) target by definition, so its own rolling
         feature is *always* NaN regardless of how much history precedes
         it, which silently forced every real prediction to fall back to
         a flat historical-mean value no matter how much data existed.

    Shifting by one row first means ``rolling_mean_W``/``rolling_std_W``
    at row *i* reflect only the ``W`` rows strictly before *i* — the
    correct, leak-free definition for a forecasting feature, and one that
    remains computable for a still-unknown future row.

    Like :func:`create_lag_features`, an optional ``group_col`` keeps the
    rolling window scoped to each group instead of sliding across
    concatenated multi-user data.
    """
    df = df.copy()
    for window in windows:
        mean_col = f"{target_col}_rolling_mean_{window}"
        std_col = f"{target_col}_rolling_std_{window}"
        if group_col and group_col in df.columns:
            grouped = df.groupby(group_col)[target_col]
            df[mean_col] = grouped.transform(
                lambda s: s.shift(1).rolling(window=window).mean()
            )
            df[std_col] = grouped.transform(
                lambda s: s.shift(1).rolling(window=window).std()
            )
        else:
            shifted = df[target_col].shift(1)
            df[mean_col] = shifted.rolling(window=window).mean()
            df[std_col] = shifted.rolling(window=window).std()
    return df


def build_model_features(
    df: pd.DataFrame,
    target_col: str = DEFAULT_TARGET_COL,
    lags: Optional[List[int]] = None,
    windows: Optional[List[int]] = None,
    group_col: Optional[str] = DEFAULT_GROUP_COL,
    time_col: str = "timestamp",
) -> pd.DataFrame:
    """Single source-of-truth feature construction pipeline.

    Both model training (:func:`preprocess_data_for_model`) and the
    per-row inference loop in the predictions endpoint call *this exact
    function* so the two can never drift apart into mismatched feature
    sets (previously the prediction endpoint hand-rolled its own,
    slightly different, copy of this pipeline).

    Does not drop NaN rows — callers decide whether they want a fully
    "clean" training frame (:func:`preprocess_data_for_model`) or a single
    future row where insufficient history simply means some columns are
    still NaN (checked by the caller before calling ``model.predict``).
    """
    lags = lags if lags is not None else DEFAULT_LAGS
    windows = windows if windows is not None else DEFAULT_WINDOWS
    effective_group_col = group_col if (group_col and group_col in df.columns) else None

    df = create_time_series_features(df, time_col=time_col)
    # Cheap, stateless cyclical encodings of hour / day_of_week / month.
    # (Deliberately not using create_calendar_features' US-holiday lookup
    # here: that function is comparatively expensive and this pipeline can
    # run thousands of times in a single prediction request, once per
    # future timestep.)
    df = create_cyclical_features(df)
    df = create_lag_features(df, target_col, lags, group_col=effective_group_col)
    df = create_rolling_features(df, target_col, windows, group_col=effective_group_col)
    return df


def preprocess_data_for_model(
    df: pd.DataFrame, group_col: Optional[str] = DEFAULT_GROUP_COL
) -> pd.DataFrame:
    """Applies the full feature engineering pipeline to the raw data.

    Drops rows where *any* engineered feature is NaN (typically the first
    ``max(lags + windows)`` rows per group that lack enough history).

    ``group_col`` (default ``"user_id"``) scopes lag/rolling features to
    each group so that training a single shared model on multiple users'
    interleaved data doesn't leak one user's consumption history into
    another's lag/rolling features.
    """
    df = build_model_features(df, group_col=group_col)
    df = df.dropna()
    return df
