"""Integration tests for feature engineering, temporal features, data validator, and model training."""

import pandas as pd
import pytest

# ---------------------------------------------------------------------------
# Feature Engineering
# ---------------------------------------------------------------------------


class TestFeatureEngineering:
    def test_create_time_series_features(self):
        from ml_core.feature_engineering import create_time_series_features

        df = pd.DataFrame(
            {"timestamp": pd.date_range("2024-01-01", periods=5, freq="h")}
        )
        result = create_time_series_features(df)
        for col in ["hour", "day_of_week", "month", "year", "is_weekend", "quarter"]:
            assert col in result.columns

    def test_create_lag_features(self):
        from ml_core.feature_engineering import create_lag_features

        df = pd.DataFrame({"consumption_kwh": range(10)})
        result = create_lag_features(df, "consumption_kwh", lags=[1, 2])
        assert "consumption_kwh_lag_1" in result.columns
        assert "consumption_kwh_lag_2" in result.columns

    def test_lag_feature_values_correct(self):
        from ml_core.feature_engineering import create_lag_features

        df = pd.DataFrame({"consumption_kwh": [10.0, 20.0, 30.0]})
        result = create_lag_features(df, "consumption_kwh", lags=[1])
        assert pd.isna(result["consumption_kwh_lag_1"].iloc[0])
        assert result["consumption_kwh_lag_1"].iloc[1] == 10.0
        assert result["consumption_kwh_lag_1"].iloc[2] == 20.0

    def test_create_rolling_features(self):
        from ml_core.feature_engineering import create_rolling_features

        df = pd.DataFrame({"consumption_kwh": range(20)})
        result = create_rolling_features(df, "consumption_kwh", windows=[3])
        assert "consumption_kwh_rolling_mean_3" in result.columns
        assert "consumption_kwh_rolling_std_3" in result.columns

    def test_rolling_mean_correct(self):
        from ml_core.feature_engineering import create_rolling_features

        df = pd.DataFrame({"consumption_kwh": [1.0, 2.0, 3.0, 4.0, 5.0]})
        result = create_rolling_features(df, "consumption_kwh", windows=[3])
        # Rolling features must be computed over the `window` rows strictly
        # PRECEDING the current one -- never including the row's own value.
        # A row's own consumption is exactly the label being predicted for
        # that row, so folding it into its own feature would both leak the
        # target during training and make the feature permanently NaN at
        # inference time (the row being forecast has no known value yet).
        assert pd.isna(result["consumption_kwh_rolling_mean_3"].iloc[0])
        assert pd.isna(result["consumption_kwh_rolling_mean_3"].iloc[1])
        assert pd.isna(result["consumption_kwh_rolling_mean_3"].iloc[2])
        assert result["consumption_kwh_rolling_mean_3"].iloc[3] == pytest.approx(2.0)
        assert result["consumption_kwh_rolling_mean_3"].iloc[4] == pytest.approx(3.0)

    def test_rolling_features_do_not_include_current_row(self):
        """Regression test for the target-leakage bug: a row's rolling
        features must be computable (non-NaN) even when that row's own
        target value is unknown/NaN, since that is exactly the situation
        at inference time."""
        from ml_core.feature_engineering import create_rolling_features

        df = pd.DataFrame({"consumption_kwh": [1.0, 2.0, 3.0, 4.0, float("nan")]})
        result = create_rolling_features(df, "consumption_kwh", windows=[3])
        assert not pd.isna(result["consumption_kwh_rolling_mean_3"].iloc[4])
        assert result["consumption_kwh_rolling_mean_3"].iloc[4] == pytest.approx(3.0)

    def test_preprocess_pipeline_drops_nan_rows(self):
        from ml_core.feature_engineering import preprocess_data_for_model

        df = pd.DataFrame(
            {
                "timestamp": pd.date_range("2024-01-01", periods=50, freq="h"),
                "consumption_kwh": [float(i) for i in range(50)],
                "user_id": [1] * 50,
            }
        )
        result = preprocess_data_for_model(df)
        assert not result.isnull().any().any()
        assert len(result) < len(df)

    def test_preprocess_does_not_mutate_input(self):
        from ml_core.feature_engineering import preprocess_data_for_model

        df = pd.DataFrame(
            {
                "timestamp": pd.date_range("2024-01-01", periods=30, freq="h"),
                "consumption_kwh": [float(i) for i in range(30)],
                "user_id": [1] * 30,
            }
        )
        original_cols = list(df.columns)
        preprocess_data_for_model(df)
        assert list(df.columns) == original_cols

    def test_is_weekend_correct(self):
        from ml_core.feature_engineering import create_time_series_features

        df = pd.DataFrame(
            {"timestamp": pd.to_datetime(["2024-01-06", "2024-01-07", "2024-01-08"])}
        )
        result = create_time_series_features(df)
        assert result.loc[0, "is_weekend"] == 1
        assert result.loc[1, "is_weekend"] == 1
        assert result.loc[2, "is_weekend"] == 0

    def test_quarter_assignment(self):
        from ml_core.feature_engineering import create_time_series_features

        df = pd.DataFrame(
            {
                "timestamp": pd.to_datetime(
                    ["2024-01-15", "2024-04-15", "2024-07-15", "2024-10-15"]
                )
            }
        )
        result = create_time_series_features(df)
        assert list(result["quarter"]) == [1, 2, 3, 4]


# ---------------------------------------------------------------------------
# Temporal Features
# ---------------------------------------------------------------------------


class TestTemporalFeatures:
    def test_cyclical_features_created(self):
        from ml_core.temporal_features import create_cyclical_features

        df = pd.DataFrame(
            {
                "hour": range(24),
                "day_of_week": [i % 7 for i in range(24)],
                "month": [(i % 12) + 1 for i in range(24)],
            }
        )
        result = create_cyclical_features(df)
        for col in [
            "hour_sin",
            "hour_cos",
            "day_of_week_sin",
            "day_of_week_cos",
            "month_sin",
            "month_cos",
        ]:
            assert col in result.columns

    def test_cyclical_values_in_range(self):
        from ml_core.temporal_features import create_cyclical_features

        df = pd.DataFrame(
            {
                "hour": range(24),
                "day_of_week": [0] * 24,
                "month": [1] * 24,
            }
        )
        result = create_cyclical_features(df)
        assert result["hour_sin"].between(-1.0, 1.0).all()
        assert result["hour_cos"].between(-1.0, 1.0).all()

    def test_hour_0_sin_is_zero(self):
        from ml_core.temporal_features import create_cyclical_features

        df = pd.DataFrame({"hour": [0], "day_of_week": [0], "month": [1]})
        result = create_cyclical_features(df)
        assert result["hour_sin"].iloc[0] == pytest.approx(0.0, abs=1e-10)
        assert result["hour_cos"].iloc[0] == pytest.approx(1.0, abs=1e-10)

    def test_calendar_features_with_timestamp_column(self):
        from ml_core.temporal_features import create_calendar_features

        df = pd.DataFrame(
            {"timestamp": pd.date_range("2024-01-01", periods=10, freq="D")}
        )
        result = create_calendar_features(df)
        assert "is_holiday" in result.columns
        assert "hour_sin" in result.columns

    def test_calendar_features_missing_column_raises(self):
        from ml_core.temporal_features import create_calendar_features

        df = pd.DataFrame({"value": [1, 2, 3]})
        with pytest.raises(ValueError):
            create_calendar_features(df)

    def test_cyclical_does_not_mutate_input(self):
        from ml_core.temporal_features import create_cyclical_features

        df = pd.DataFrame({"hour": [0, 6, 12, 18]})
        original_cols = list(df.columns)
        create_cyclical_features(df)
        assert list(df.columns) == original_cols


# ---------------------------------------------------------------------------
# Data Validator
# ---------------------------------------------------------------------------


class TestDataValidator:
    def test_valid_dataframe_passes(self):
        from ml_core.data_validator import validate_raw_data

        df = pd.DataFrame(
            {
                "timestamp": pd.date_range("2024-01-01", periods=5, freq="h"),
                "consumption_kwh": [10.0, 20.0, 15.0, 30.0, 25.0],
            }
        )
        result = validate_raw_data(df)
        assert result.success is True
        assert result.errors == []

    def test_missing_required_column_raises(self):
        from ml_core.data_validator import DataValidationError, validate_raw_data

        df = pd.DataFrame(
            {"timestamp": pd.date_range("2024-01-01", periods=3, freq="h")}
        )
        with pytest.raises(DataValidationError, match="consumption_kwh"):
            validate_raw_data(df)

    def test_missing_timestamp_raises(self):
        from ml_core.data_validator import DataValidationError, validate_raw_data

        df = pd.DataFrame({"consumption_kwh": [10.0, 20.0]})
        with pytest.raises(DataValidationError, match="timestamp"):
            validate_raw_data(df)

    def test_negative_consumption_raises(self):
        from ml_core.data_validator import DataValidationError, validate_raw_data

        df = pd.DataFrame(
            {
                "timestamp": pd.date_range("2024-01-01", periods=3, freq="h"),
                "consumption_kwh": [10.0, -5.0, 20.0],
            }
        )
        with pytest.raises(DataValidationError, match="negative"):
            validate_raw_data(df)

    def test_null_consumption_raises(self):
        from ml_core.data_validator import DataValidationError, validate_raw_data

        df = pd.DataFrame(
            {
                "timestamp": pd.date_range("2024-01-01", periods=3, freq="h"),
                "consumption_kwh": [10.0, None, 20.0],
            }
        )
        with pytest.raises(DataValidationError, match="null"):
            validate_raw_data(df)

    def test_humidity_out_of_range_raises(self):
        from ml_core.data_validator import DataValidationError, validate_raw_data

        df = pd.DataFrame(
            {
                "timestamp": pd.date_range("2024-01-01", periods=2, freq="h"),
                "consumption_kwh": [10.0, 20.0],
                "humidity_percent": [50.0, 150.0],
            }
        )
        with pytest.raises(DataValidationError, match="humidity"):
            validate_raw_data(df)

    def test_temperature_out_of_range_raises(self):
        from ml_core.data_validator import DataValidationError, validate_raw_data

        df = pd.DataFrame(
            {
                "timestamp": pd.date_range("2024-01-01", periods=2, freq="h"),
                "consumption_kwh": [10.0, 20.0],
                "temperature_c": [20.0, 999.0],
            }
        )
        with pytest.raises(DataValidationError, match="temperature"):
            validate_raw_data(df)

    def test_validate_energy_dataframe_empty(self):
        from ml_core.data_validator import validate_energy_dataframe

        result = validate_energy_dataframe(pd.DataFrame())
        assert result["valid"] is False
        assert result["row_count"] == 0

    def test_validate_energy_dataframe_valid(self):
        from ml_core.data_validator import validate_energy_dataframe

        df = pd.DataFrame(
            {
                "timestamp": pd.date_range("2024-01-01", periods=4, freq="h"),
                "consumption_kwh": [10.0, 20.0, 15.0, 25.0],
            }
        )
        result = validate_energy_dataframe(df)
        assert result["valid"] is True
        assert result["row_count"] == 4

    def test_validate_energy_dataframe_null_consumption_warning(self):
        from ml_core.data_validator import validate_energy_dataframe

        df = pd.DataFrame(
            {
                "timestamp": pd.date_range("2024-01-01", periods=3, freq="h"),
                "consumption_kwh": [10.0, None, 20.0],
            }
        )
        result = validate_energy_dataframe(df)
        assert result["valid"] is False
        assert len(result["warnings"]) > 0


# ---------------------------------------------------------------------------
# Model Training
# ---------------------------------------------------------------------------


class TestModelTraining:
    def test_load_data_from_db_returns_dataframe(self):
        from ml_core.training import load_data_from_db

        df = load_data_from_db(db_session=None)
        assert isinstance(df, pd.DataFrame)
        assert "timestamp" in df.columns
        assert "consumption_kwh" in df.columns
        assert len(df) > 0

    def test_load_data_synthetic_non_negative(self):
        from ml_core.training import load_data_from_db

        df = load_data_from_db(db_session=None)
        assert (df["consumption_kwh"] >= 0).all()

    def test_train_model_returns_model_and_metrics(self):
        from ml_core.training import load_data_from_db, train_model

        df = load_data_from_db(db_session=None)
        model, metrics = train_model(df)
        assert model is not None
        assert "mean_squared_error" in metrics
        assert "r2_score" in metrics
        assert "feature_count" in metrics
        assert "training_samples" in metrics
        assert "test_samples" in metrics
        assert metrics["r2_score"] > -10

    def test_train_model_metrics_non_negative_mse(self):
        from ml_core.training import load_data_from_db, train_model

        df = load_data_from_db(db_session=None)
        _, metrics = train_model(df)
        assert metrics["mean_squared_error"] >= 0

    def test_run_training_pipeline(self, tmp_path, monkeypatch):
        import ml_core.training as training_mod

        model_path = str(tmp_path / "model.joblib")
        monkeypatch.setattr(training_mod, "MODEL_PATH", model_path)
        metrics = training_mod.run_training_pipeline(db_session=None)
        assert isinstance(metrics, dict)
        assert "mean_squared_error" in metrics

    def test_run_training_pipeline_saves_file(self, tmp_path, monkeypatch):
        import ml_core.training as training_mod

        model_path = str(tmp_path / "model.joblib")
        monkeypatch.setattr(training_mod, "MODEL_PATH", model_path)
        training_mod.run_training_pipeline(db_session=None)
        assert (tmp_path / "model.joblib").exists()
