#!/bin/bash

# run_tests.sh: Runs the Fluxora backend test suite with a coverage report.
#
# Safe to run from anywhere -- paths are resolved relative to this script's
# own location, not the caller's current directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_DIR}/code/backend"

echo "----------------------------------------"
echo "Starting Fluxora test suite..."
echo "----------------------------------------"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: backend directory not found at ${BACKEND_DIR}"
    exit 1
fi

cd "$BACKEND_DIR"

# --- 1. Find a Python environment: prefer the project's own venv ---
if [ -x "venv/bin/pytest" ]; then
    PYTHON_BIN="venv/bin/python"
    PIP_BIN="venv/bin/pip"
    PYTEST_BIN="venv/bin/pytest"
elif [ -x ".venv/bin/pytest" ]; then
    PYTHON_BIN=".venv/bin/python"
    PIP_BIN=".venv/bin/pip"
    PYTEST_BIN=".venv/bin/pytest"
elif command -v pytest &> /dev/null; then
    PYTHON_BIN="$(command -v python3 || command -v python)"
    PIP_BIN="$(command -v pip3 || command -v pip)"
    PYTEST_BIN="pytest"
else
    echo "Error: pytest not found. Run ./setup.sh or ./setup_environment.sh first,"
    echo "or install pytest with: pip install -r requirements.txt"
    exit 1
fi

# --- 2. Ensure pytest-cov is available ---
# Deliberately not part of requirements.txt (it's dev/CI tooling, not a
# runtime dependency) -- the CI pipeline installs it separately too.
if ! "$PYTHON_BIN" -c "import pytest_cov" &> /dev/null; then
    echo "Installing pytest-cov (test-only dependency, not in requirements.txt)..."
    "$PIP_BIN" install pytest-cov pytest-asyncio
fi

# --- 3. Run tests with coverage ---
echo "Running tests with coverage report (from ${BACKEND_DIR})..."
# Coverage target is the actual importable package (app/), not a
# placeholder `src` directory that doesn't exist in this repo.
"$PYTEST_BIN" tests/ --cov=app --cov-report=html --cov-report=term-missing || {
    echo "Error: Tests failed. Please review the output."
    exit 1
}

echo "----------------------------------------"
echo "Fluxora test suite completed successfully."
echo "Coverage report generated in ${BACKEND_DIR}/htmlcov/index.html"
echo "----------------------------------------"
