"""Tests for /v1/analytics and /v1/predictions endpoints."""

from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------


def test_get_analytics_returns_list(client: TestClient, auth_headers: dict):
    response = client.get("/v1/analytics/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_analytics_week(client: TestClient, auth_headers: dict):
    response = client.get("/v1/analytics/?period=week", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_analytics_month(client: TestClient, auth_headers: dict):
    response = client.get("/v1/analytics/?period=month", headers=auth_headers)
    assert response.status_code == 200


def test_get_analytics_year(client: TestClient, auth_headers: dict):
    response = client.get("/v1/analytics/?period=year", headers=auth_headers)
    assert response.status_code == 200


def test_get_analytics_invalid_period(client: TestClient, auth_headers: dict):
    response = client.get("/v1/analytics/?period=decade", headers=auth_headers)
    assert response.status_code == 422


def test_get_analytics_unauthenticated(client: TestClient):
    response = client.get("/v1/analytics/")
    assert response.status_code == 401


def test_analytics_mock_data_shape(client: TestClient, auth_headers: dict):
    """With no real records mock data must have required fields."""
    response = client.get("/v1/analytics/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    first = data[0]
    assert "label" in first
    assert "consumption" in first
    assert "cost" in first
    assert "efficiency" in first


def test_analytics_mock_data_respects_period(client: TestClient, auth_headers: dict):
    """Regression test: the mock fallback must reflect the requested period
    instead of always returning the same static 3-point/day-labelled series
    regardless of period."""
    week = client.get("/v1/analytics/?period=week", headers=auth_headers).json()
    month = client.get("/v1/analytics/?period=month", headers=auth_headers).json()
    year = client.get("/v1/analytics/?period=year", headers=auth_headers).json()

    assert len(week) == 7
    assert len(month) == 30
    assert len(year) == 52
    # Year labels are week-based ("Week N"), not day-based.
    assert all(label["label"].startswith("Week ") for label in year)
    assert all(not label["label"].startswith("Week ") for label in week)


def test_get_analytics_summary(client: TestClient, auth_headers: dict):
    response = client.get("/v1/analytics/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_consumption_kwh" in data
    assert "total_cost_usd" in data
    assert "avg_daily_consumption_kwh" in data
    assert "record_count" in data


def test_analytics_summary_unauthenticated(client: TestClient):
    response = client.get("/v1/analytics/summary")
    assert response.status_code == 401


def test_analytics_summary_empty_returns_zeros(client: TestClient, auth_headers: dict):
    response = client.get("/v1/analytics/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["record_count"] == 0
    assert data["total_consumption_kwh"] == 0.0


def test_analytics_summary_with_data(client: TestClient, auth_headers: dict):
    client.post(
        "/v1/data/",
        headers=auth_headers,
        json={"consumption_kwh": 100.0, "cost_usd": 10.0},
    )
    response = client.get("/v1/analytics/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["record_count"] >= 1
    assert data["total_consumption_kwh"] >= 100.0
    assert data["total_cost_usd"] >= 10.0


def test_analytics_summary_avg_daily_non_negative(
    client: TestClient, auth_headers: dict
):
    client.post("/v1/data/", headers=auth_headers, json={"consumption_kwh": 50.0})
    response = client.get("/v1/analytics/summary", headers=auth_headers)
    data = response.json()
    assert data["avg_daily_consumption_kwh"] >= 0.0


def test_analytics_default_period_is_month(client: TestClient, auth_headers: dict):
    """Default period should be month (no query param needed)."""
    r1 = client.get("/v1/analytics/", headers=auth_headers)
    r2 = client.get("/v1/analytics/?period=month", headers=auth_headers)
    assert r1.status_code == 200
    assert r2.status_code == 200


# ---------------------------------------------------------------------------
# Predictions
# ---------------------------------------------------------------------------


def test_get_predictions_mock_1_day(client: TestClient, auth_headers: dict):
    response = client.get("/v1/predictions/?days=1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 24
    assert "timestamp" in data[0]
    assert "predicted_consumption" in data[0]


def test_get_predictions_default_7_days(client: TestClient, auth_headers: dict):
    response = client.get("/v1/predictions/", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 7 * 24


def test_get_predictions_max_days(client: TestClient, auth_headers: dict):
    response = client.get("/v1/predictions/?days=90", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 90 * 24


def test_get_predictions_days_zero_rejected(client: TestClient, auth_headers: dict):
    response = client.get("/v1/predictions/?days=0", headers=auth_headers)
    assert response.status_code == 422


def test_get_predictions_days_over_max_rejected(client: TestClient, auth_headers: dict):
    response = client.get("/v1/predictions/?days=91", headers=auth_headers)
    assert response.status_code == 422


def test_get_predictions_unauthenticated(client: TestClient):
    response = client.get("/v1/predictions/")
    assert response.status_code == 401


def test_predictions_confidence_interval_structure(
    client: TestClient, auth_headers: dict
):
    response = client.get("/v1/predictions/?days=1", headers=auth_headers)
    assert response.status_code == 200
    entry = response.json()[0]
    ci = entry["confidence_interval"]
    assert "lower" in ci
    assert "upper" in ci
    assert ci["upper"] >= ci["lower"]


def test_predictions_all_entries_have_required_fields(
    client: TestClient, auth_headers: dict
):
    response = client.get("/v1/predictions/?days=1", headers=auth_headers)
    for entry in response.json():
        assert "timestamp" in entry
        assert "predicted_consumption" in entry
        assert "confidence_interval" in entry


def test_predictions_confidence_bounds_ordered(client: TestClient, auth_headers: dict):
    response = client.get("/v1/predictions/?days=1", headers=auth_headers)
    for entry in response.json():
        ci = entry["confidence_interval"]
        assert ci["upper"] >= ci["lower"]


def test_train_endpoint_forbidden_for_regular_user(
    client: TestClient, auth_headers: dict
):
    response = client.post("/v1/predictions/train", headers=auth_headers)
    assert response.status_code == 403


def test_train_endpoint_allowed_for_superuser(
    client: TestClient, superuser_auth_headers: dict
):
    response = client.post("/v1/predictions/train", headers=superuser_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "trained"
    assert "metrics" in data


def test_train_endpoint_unauthenticated(client: TestClient):
    response = client.post("/v1/predictions/train")
    assert response.status_code == 401


def test_train_returns_metrics_fields(client: TestClient, superuser_auth_headers: dict):
    response = client.post("/v1/predictions/train", headers=superuser_auth_headers)
    metrics = response.json()["metrics"]
    assert "mean_squared_error" in metrics
    assert "r2_score" in metrics
    assert "feature_count" in metrics
    assert "training_samples" in metrics
    assert "test_samples" in metrics


def test_predictions_use_model_not_flat_fallback_with_sufficient_history(
    client: TestClient, superuser_auth_headers: dict
):
    """Regression test for two compounding bugs that previously made the
    prediction endpoint always fall back to a flat historical-mean value:

    1. Only the 48 most recent readings were fetched as model context, far
       fewer than the largest rolling window (168 hours) the model was
       trained on, so the engineered features were always NaN.
    2. Rolling features included each row's own (for a future row, unknown)
       target value, so they were NaN for the row being predicted no
       matter how much history existed.

    With enough seeded history and a trained model, predictions should now
    show real variation instead of 168 identical values.
    """
    import math
    import random
    from datetime import datetime, timedelta, timezone

    rng = random.Random(42)
    start = datetime.now(timezone.utc) - timedelta(days=45)
    for i in range(45 * 24):
        ts = start + timedelta(hours=i)
        consumption = max(
            50 + 20 * math.sin(ts.hour / 24 * 2 * math.pi) + rng.gauss(0, 3), 0.0
        )
        resp = client.post(
            "/v1/data/",
            headers=superuser_auth_headers,
            json={
                "consumption_kwh": round(consumption, 3),
                "timestamp": ts.isoformat(),
            },
        )
        assert resp.status_code == 201

    train_resp = client.post("/v1/predictions/train", headers=superuser_auth_headers)
    assert train_resp.status_code == 200

    pred_resp = client.get("/v1/predictions/?days=7", headers=superuser_auth_headers)
    assert pred_resp.status_code == 200
    values = [p["predicted_consumption"] for p in pred_resp.json()]
    assert len(values) == 7 * 24
    distinct_values = len(set(round(v, 2) for v in values))
    # The bug this guards against always produced EXACTLY 1 distinct value
    # (every hour fell back to the same historical mean). A working model,
    # even a tree ensemble that discretizes into a limited number of leaf
    # outputs, comfortably clears a much higher bar than that once fed
    # noisy, realistic data.
    assert distinct_values > 10, (
        "Predictions look like a flat fallback series "
        f"(only {distinct_values} distinct values across {len(values)} hours)"
    )
