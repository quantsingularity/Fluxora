# ---------------------------------------------------------------------------
# Build context for this Dockerfile MUST be the `code/` directory (the
# parent of both `backend/` and `ml_core/`), not `backend/` itself. See
# docker-compose.yml, which sets `context: ..` + `dockerfile: backend/Dockerfile`.
#
# Bug fix: this Dockerfile previously used `COPY . .` with a build context
# of `backend/` alone. `app/main.py` (and app/api/v1/predictions.py) import
# the sibling `ml_core` package at module load time, so the resulting image
# would crash immediately on startup with `ModuleNotFoundError: No module
# named 'ml_core'` — the container never actually ran.
# ---------------------------------------------------------------------------
FROM python:3.12-slim

# System dependencies. `curl` is required by the HEALTHCHECK in
# docker-compose.yml (previously absent, so the healthcheck always failed).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cache)
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy source: ml_core first (rarely changes independent of backend code,
# so this keeps Docker's layer cache useful), then the backend itself.
COPY ml_core /app/ml_core
COPY backend /app/backend

WORKDIR /app/backend

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
