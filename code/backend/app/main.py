"""
Fluxora FastAPI application factory.

sys.path is extended here (before any ml_core imports) so that the
ml_core package – which lives one directory above backend/ – is always
importable regardless of how the server is started.
"""

import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Make the project root (parent of backend/) importable so `ml_core` can be
# found regardless of the working directory.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    from app.db.database import init_db

    init_db()
    logger.info("Application startup complete.")
    yield
    logger.info("Application shutdown.")


app = FastAPI(
    title="Fluxora API",
    description="API for energy data management and prediction.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

_raw_origins = os.getenv(
    "CORS_ORIGINS", "http://localhost,http://localhost:3000,http://localhost:5173"
)
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.core.error_middleware import add_error_handlers  # noqa: E402

add_error_handlers(app)


@app.middleware("http")
async def log_requests(request: Request, call_next: Any) -> Any:
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} "
        f"({duration:.3f}s)"
    )
    return response


from app.api.v1 import analytics, auth, data, predictions, users  # noqa: E402

app.include_router(auth.router, prefix="/v1")
app.include_router(data.router, prefix="/v1")
app.include_router(analytics.router, prefix="/v1")
app.include_router(predictions.router, prefix="/v1")
app.include_router(users.router, prefix="/v1")


@app.get("/health", tags=["system"])
def health_check() -> Any:
    """Basic health check endpoint."""
    return {"status": "ok"}


@app.get("/", tags=["system"])
def root() -> Any:
    """Root endpoint."""
    return {
        "message": "Fluxora API",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8000")),
        workers=int(os.getenv("API_WORKERS", "1")),
        reload=os.getenv("ENV", "production") == "development",
    )
