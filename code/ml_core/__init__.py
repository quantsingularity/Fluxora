"""
ml_core – Machine-learning services for Fluxora.

Provides:
  - data_validator   : DataFrame/record validation helpers
  - feature_engineering : time-series, lag, and rolling feature creation
  - temporal_features   : cyclical and calendar feature creation
  - training            : model training / persistence pipeline
"""

from .data_validator import (
    DataValidationError,
    ValidationResult,
    validate_energy_dataframe,
    validate_raw_data,
)
from .feature_engineering import (
    build_model_features,
    create_lag_features,
    create_rolling_features,
    create_time_series_features,
    preprocess_data_for_model,
)
from .temporal_features import create_calendar_features, create_cyclical_features
from .training import load_data_from_db, run_training_pipeline, save_model, train_model

__all__ = [
    # data_validator
    "validate_raw_data",
    "validate_energy_dataframe",
    "DataValidationError",
    "ValidationResult",
    # feature_engineering
    "create_time_series_features",
    "create_lag_features",
    "create_rolling_features",
    "build_model_features",
    "preprocess_data_for_model",
    # temporal_features
    "create_cyclical_features",
    "create_calendar_features",
    # training
    "load_data_from_db",
    "train_model",
    "save_model",
    "run_training_pipeline",
]
