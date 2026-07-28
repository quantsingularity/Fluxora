#!/bin/bash

# setup.sh: Quick-start script to set up the Fluxora backend's Python
# environment (creates a venv and installs code/backend + code/ml_core
# dependencies).
#
# Safe to run from anywhere -- paths are resolved relative to this script's
# own location, not the caller's current directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_DIR}/code/backend"

echo "----------------------------------------"
echo "Starting Fluxora project setup..."
echo "----------------------------------------"

# --- 1. Check for Python and pip ---
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed. Please install Python 3.x."
    exit 1
fi

if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is not installed. Please install pip3."
    exit 1
fi

if [ ! -f "${BACKEND_DIR}/requirements.txt" ]; then
    echo "Error: ${BACKEND_DIR}/requirements.txt not found."
    echo "This script expects to live in <fluxora-repo>/scripts/."
    exit 1
fi

# --- 2. Create a virtual environment for the backend (Recommended) ---
VENV_DIR="${BACKEND_DIR}/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in ${VENV_DIR}..."
    python3 -m venv "$VENV_DIR"
fi

PYTHON_BIN="$VENV_DIR/bin/python"
PIP_BIN="$VENV_DIR/bin/pip"

# Fallback if venv creation failed or for systems where venv is not the standard
if [ ! -f "$PYTHON_BIN" ]; then
    PYTHON_BIN="python3"
    PIP_BIN="pip3"
    echo "Warning: Could not find venv binaries. Falling back to global python3/pip3."
fi

# --- 3. Install Python dependencies (backend + ml_core) ---
echo "Upgrading pip..."
"$PIP_BIN" install --upgrade pip

echo "Installing backend dependencies from code/backend/requirements.txt..."
"$PIP_BIN" install -r "${BACKEND_DIR}/requirements.txt" || {
    echo "Error: Failed to install backend dependencies."
    exit 1
}

if [ -f "${PROJECT_DIR}/code/ml_core/requirements.txt" ]; then
    echo "Installing ml_core dependencies (mostly already covered above)..."
    "$PIP_BIN" install -r "${PROJECT_DIR}/code/ml_core/requirements.txt" || {
        echo "Error: Failed to install ml_core dependencies."
        exit 1
    }
fi

echo "----------------------------------------"
echo "Fluxora backend setup complete."
echo "To use the environment, run: source ${VENV_DIR}/bin/activate"
echo "Then start the API with:"
echo "  cd ${BACKEND_DIR} && uvicorn app.main:app --reload"
echo "----------------------------------------"
