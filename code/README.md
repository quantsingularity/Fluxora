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