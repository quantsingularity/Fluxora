# Fluxora

Energy data management and ML-powered consumption prediction platform.

## Project Structure

```
fluxora/
├── backend/          # FastAPI REST API
│   ├── app/
│   │   ├── api/v1/   # Route handlers (auth, data, analytics, predictions)
│   │   ├── core/     # Security, config, circuit-breaker, retry, fallback, middleware
│   │   ├── crud/     # Database CRUD helpers
│   │   ├── db/       # SQLAlchemy engine & session factory
│   │   ├── models/   # ORM models
│   │   └── schemas/  # Pydantic schemas
│   ├── migrations/   # Alembic database migrations
│   ├── tests/        # pytest suite (api / integration / unit)
│   ├── main.py       # Uvicorn entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── ml_core/          # Machine-learning package (framework-independent)
    ├── __init__.py
    ├── data_validator.py      # DataFrame validation helpers
    ├── feature_engineering.py # Time-series, lag, rolling features
    ├── temporal_features.py   # Cyclical & calendar features
    ├── training.py            # RandomForest training pipeline
    └── requirements.txt
```

## Quick Start

### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL, SECRET_KEY, etc.
```

### 3. Run database migrations

```bash
cd backend
alembic upgrade head
```

### 4. Start the API server

```bash
cd backend
python main.py
# or
uvicorn app.main:app --reload
```

API docs available at http://localhost:8000/docs

### 5. Run tests

```bash
cd backend
pytest
```

### Alternative: Docker

```bash
cd backend
docker compose up --build
```

`docker-compose.yml`'s build context reaches up to this directory (`code/`)
so the image can include the sibling `ml_core` package alongside
`backend/` — that's resolved relative to the compose file itself, so
running the command from `backend/` is correct and doesn't need any `cd ..`.

## ml_core Package

`ml_core` is intentionally framework-independent – it depends only on
`numpy`, `pandas`, `scikit-learn`, and `joblib`. It can be imported by
external pipelines, notebooks, or batch jobs without pulling in FastAPI or
SQLAlchemy.

The backend's `app/main.py` and `backend/main.py` both insert the project
root into `sys.path` so `ml_core` is discoverable at runtime. When running
pytest from `backend/`, `tests/conftest.py` performs the same insertion.

## Key Fixes Applied

| Area                | Fix                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `predictions.py`    | Rewrote iterative prediction loop — lag features now reference the correct previous step, and time features use the actual future timestamp |
| `analytics.py`      | Replaced broken efficiency formula (`100 − kwh/temp`) with a properly normalised score `100 × (1 − kwh/max_kwh)`                            |
| `retry.py`          | Removed redundant `import time as time` self-alias                                                                                          |
| `training.py`       | Replaced deprecated `np.random.normal` global call with `np.random.default_rng(seed=42)` for reproducibility                                |
| `migrations/env.py` | Added `sys.path` guard so Alembic resolves `app.*` regardless of working directory                                                          |
| All imports         | Updated every `from app.services.*` reference to `from ml_core.*` across source and tests                                                   |

### Second review pass

| Area                                     | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feature_engineering.py`                 | **Critical**: rolling-window features (`rolling_mean_168`, etc.) previously included each row's own target value in its own window. This leaked the label into training features _and_ guaranteed the feature was NaN for any row still being forecast — every real prediction request silently fell back to a flat historical-mean line no matter how much data existed. Rolling windows now shift by one row first, so they only ever reference strictly preceding values.                                      |
| `feature_engineering.py` / `training.py` | Added optional `group_col` (default `"user_id"`) to lag/rolling feature construction. `ml_core/training.py::load_data_from_db` loads _all_ users' rows for a shared model, previously ordered only by global timestamp — one user's history could leak into another's lag/rolling features. Features are now scoped per user.                                                                                                                                                                                     |
| `predictions.py`                         | The prediction endpoint fetched only the 48 most recent readings as model context, far fewer than the largest rolling window (168h) the model trains on. Increased to a 30-day (720 row) lookback so the rolling features are actually satisfiable.                                                                                                                                                                                                                                                               |
| `predictions.py`                         | The endpoint hand-rolled its own copy of the feature-construction steps, independent of `preprocess_data_for_model`. Both now call a single shared `build_model_features()`, so training and inference can never silently drift into mismatched feature sets again.                                                                                                                                                                                                                                               |
| `predictions.py`                         | Model loading is now protected by a `CircuitBreaker` (previously fully unused despite being implemented and unit-tested) — a corrupted/unreadable model file no longer costs every request a failing disk read; the breaker opens and falls through to the mock forecast until the recovery window elapses.                                                                                                                                                                                                       |
| `predictions.py`                         | Training is now wrapped with the (previously unused) `@retry` decorator to ride out transient disk I/O errors when saving the model file.                                                                                                                                                                                                                                                                                                                                                                         |
| `analytics.py`                           | The no-data fallback returned a single hardcoded 3-point series (`"Day 1"`/`"Day 2"`/`"Day 3"`) regardless of the requested `period` — selecting `period=year` returned day-labelled mock points. Replaced with a period-aware generator producing the correct point count and label format (7 daily / 30 daily / 52 weekly).                                                                                                                                                                                     |
| `ml_core/training.py`                    | `MODEL_PATH` ignored the documented `MODEL_PATH` env var and always hardcoded a cwd-relative path; `MODEL_MAX_DEPTH` was documented in `.env.example` but never read. Both are now respected.                                                                                                                                                                                                                                                                                                                     |
| `ml_core/training.py`                    | Wired the previously-unused `validate_energy_dataframe` into the training data-load path so data-quality issues are logged before a model is fit on them.                                                                                                                                                                                                                                                                                                                                                         |
| `feature_engineering.py`                 | Wired the previously-unused `create_cyclical_features` (sin/cos encodings of hour/day-of-week/month) into the shared feature pipeline.                                                                                                                                                                                                                                                                                                                                                                            |
| `auth.py`                                | **Missing endpoints**: `crud/user.py::update_user` / `delete_user` were fully implemented and covered by CRUD-layer tests, but no route ever exposed them — account settings were read-only from the API's perspective. Added `PATCH /v1/auth/me` and `DELETE /v1/auth/me`.                                                                                                                                                                                                                                       |
| `api/v1/users.py` _(new)_                | **Missing endpoints**: exposed `get_users` / `update_user` / `delete_user` / `activate_user` / `deactivate_user` behind the (previously unused) `get_current_superuser` dependency as `/v1/users/*`, admin-only.                                                                                                                                                                                                                                                                                                  |
| `schemas/user.py`                        | Password minimum length was only enforced in the `/register` endpoint handler, not at the schema level, so any other code path constructing `UserCreate`/`UserUpdate` directly bypassed it. Added a `field_validator` for defense in depth.                                                                                                                                                                                                                                                                       |
| `migrations/versions/`                   | The versions directory was empty — `alembic upgrade head` (the documented setup step below) silently did nothing. Generated the initial autogenerated migration for the `users`/`energy_data` tables and verified it round-trips against the live models.                                                                                                                                                                                                                                                         |
| `Dockerfile` / `docker-compose.yml`      | **Critical**: the build context was `backend/` alone, so the image never included the sibling `ml_core` package that `app/main.py` imports at startup — the container crashed immediately with `ModuleNotFoundError`. Build context is now the parent `code/` directory. Also added the `curl` binary the healthcheck depends on (previously always failing), and fixed the `./data` volume mount to actually match where the app writes its SQLite DB / model file (previously a no-op mount to an unused path). |
