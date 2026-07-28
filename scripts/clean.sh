#!/bin/bash

# clean.sh: Removes build artifacts, caches, and installed dependencies
# across the Fluxora repository.
#
# Safe to run from anywhere -- paths are resolved relative to this script's
# own location, not the caller's current directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "----------------------------------------"
echo "Starting Fluxora project cleanup..."
echo "----------------------------------------"

# --- 1. Clean Python artifacts (code/backend + code/ml_core) ---
echo "Cleaning Python artifacts (.pyc files and __pycache__ directories)..."
find "${PROJECT_DIR}/code" -type f -name "*.pyc" -delete
# `-delete` on a directory requires it to already be empty, which
# __pycache__ dirs never are until their contents are removed first.
# `-exec rm -rf {} +` removes each match (and its contents) directly.
find "${PROJECT_DIR}/code" -type d -name "__pycache__" -exec rm -rf {} +

# --- 2. Clean backend test/build artifacts ---
echo "Cleaning test and coverage artifacts..."
rm -rf \
    "${PROJECT_DIR}/code/backend/.pytest_cache" \
    "${PROJECT_DIR}/code/backend/htmlcov" \
    "${PROJECT_DIR}/code/backend/.coverage" \
    "${PROJECT_DIR}/code/backend/fluxora.db" \
    "${PROJECT_DIR}/code/backend/fluxora_model.joblib"

# --- 3. Clean installed dependencies ---
echo "Cleaning installed dependencies (node_modules, Python venvs)..."
rm -rf \
    "${PROJECT_DIR}/code/backend/venv" \
    "${PROJECT_DIR}/code/backend/.venv" \
    "${PROJECT_DIR}/web-frontend/node_modules" \
    "${PROJECT_DIR}/web-frontend/dist" \
    "${PROJECT_DIR}/mobile-frontend/node_modules"

echo "----------------------------------------"
echo "Fluxora project cleanup complete."
echo "----------------------------------------"
