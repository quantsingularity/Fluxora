#!/bin/bash

# deploy_model.sh
#
# Manages the trained Fluxora forecasting model file.
#
# The real training pipeline (ml_core/training.py, triggered via
# `POST /v1/predictions/train`) writes a single model file to $MODEL_PATH
# (default: code/backend/fluxora_model.joblib), overwriting it every time
# training runs -- there's no built-in versioning. This script adds the
# versioning/rollback safety net the pipeline itself doesn't have:
#   - archive : validate + snapshot the current model with a timestamp
#   - rollback: restore a previously archived snapshot
#   - list    : show archived snapshots
#
# The prediction endpoint re-reads $MODEL_PATH on every request (behind a
# circuit breaker, see app/api/v1/predictions.py), so there is no service
# to "restart" for a restored model to take effect.

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_DIR}/code/backend"
ARCHIVE_DIR="${BACKEND_DIR}/model_archive"

# Respect the same MODEL_PATH env var the app itself reads
# (ml_core/training.py); default matches the app's own default.
MODEL_PATH="${MODEL_PATH:-${BACKEND_DIR}/fluxora_model.joblib}"

print_section() { echo -e "\n${BOLD}${BLUE}==== $1 ====${NC}\n"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

# Resolves a Python interpreter, preferring the backend's own venv.
backend_python() {
    if [ -x "${BACKEND_DIR}/venv/bin/python" ]; then
        echo "${BACKEND_DIR}/venv/bin/python"
    elif [ -x "${BACKEND_DIR}/.venv/bin/python" ]; then
        echo "${BACKEND_DIR}/.venv/bin/python"
    else
        command -v python3
    fi
}

# Validates that a file is a loadable joblib/scikit-learn model.
validate_model() {
    local path="$1"
    local py
    py="$(backend_python)"
    if [ -z "$py" ]; then
        print_error "No Python interpreter found. Run ./setup_environment.sh first."
        return 1
    fi

    "$py" - "$path" <<'PYEOF'
import sys
import joblib

path = sys.argv[1]
try:
    model = joblib.load(path)
except Exception as e:
    print(f"Could not load model: {e}")
    sys.exit(1)

if not hasattr(model, "predict"):
    print("Loaded object has no predict() method -- not a usable model.")
    sys.exit(1)

n_features = getattr(model, "n_features_in_", "unknown")
n_estimators = getattr(model, "n_estimators", "unknown")
print(f"OK: {type(model).__name__} (n_features_in_={n_features}, n_estimators={n_estimators})")
PYEOF
}

# Archives the current model with a timestamp after validating it.
archive_model() {
    print_section "Archiving Current Model"

    if [ ! -f "$MODEL_PATH" ]; then
        print_error "No model file found at ${MODEL_PATH}"
        print_warning "Train one first: POST /v1/predictions/train (see scripts/test_api.sh)"
        return 1
    fi

    print_warning "Validating ${MODEL_PATH}..."
    if ! validate_model "$MODEL_PATH"; then
        print_error "Model failed validation -- refusing to archive a broken file"
        return 1
    fi

    mkdir -p "$ARCHIVE_DIR"
    local timestamp
    timestamp="$(date +%Y%m%d_%H%M%S)"
    local archive_path="${ARCHIVE_DIR}/fluxora_model_${timestamp}.joblib"

    cp "$MODEL_PATH" "$archive_path"
    print_success "Archived to ${archive_path}"
}

# Lists archived model snapshots, most recent first.
list_archives() {
    print_section "Archived Model Snapshots"

    if [ ! -d "$ARCHIVE_DIR" ] || [ -z "$(ls -A "$ARCHIVE_DIR" 2>/dev/null)" ]; then
        print_warning "No archived snapshots found in ${ARCHIVE_DIR}"
        return 0
    fi

    ls -1t "$ARCHIVE_DIR"
}

# Restores a previously archived snapshot as the active model.
rollback_model() {
    local snapshot="${1:-}"

    print_section "Rolling Back Model"

    if [ -z "$snapshot" ]; then
        print_error "Usage: $0 rollback <snapshot-filename>"
        print_warning "Run '$0 list' to see available snapshots"
        return 1
    fi

    local snapshot_path="${ARCHIVE_DIR}/${snapshot}"
    if [ ! -f "$snapshot_path" ]; then
        print_error "Snapshot not found: ${snapshot_path}"
        return 1
    fi

    print_warning "Validating ${snapshot_path}..."
    if ! validate_model "$snapshot_path"; then
        print_error "Snapshot failed validation -- refusing to roll back to a broken file"
        return 1
    fi

    # Keep a safety copy of whatever is currently live before overwriting it.
    if [ -f "$MODEL_PATH" ]; then
        mkdir -p "$ARCHIVE_DIR"
        cp "$MODEL_PATH" "${ARCHIVE_DIR}/fluxora_model_pre_rollback_$(date +%Y%m%d_%H%M%S).joblib"
    fi

    cp "$snapshot_path" "$MODEL_PATH"
    print_success "Restored ${snapshot} as the active model at ${MODEL_PATH}"
    print_warning "No restart needed -- the API re-reads this file on the next prediction request."
}

show_help() {
    echo "Model Deployment Helper for Fluxora"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  archive              Validate and timestamp-snapshot the current model"
    echo "  list                 List archived model snapshots"
    echo "  rollback <filename>  Restore an archived snapshot as the active model"
    echo "  validate             Validate the currently active model file"
    echo ""
    echo "Environment:"
    echo "  MODEL_PATH           Path to the active model file"
    echo "                       (default: code/backend/fluxora_model.joblib)"
    echo ""
    echo "Examples:"
    echo "  $0 archive"
    echo "  $0 list"
    echo "  $0 rollback fluxora_model_20260101_120000.joblib"
}

COMMAND="${1:-}"
[ $# -gt 0 ] && shift || true

case "$COMMAND" in
    archive)
        archive_model
        ;;
    list)
        list_archives
        ;;
    rollback)
        rollback_model "${1:-}"
        ;;
    validate)
        if [ ! -f "$MODEL_PATH" ]; then
            print_error "No model file found at ${MODEL_PATH}"
            exit 1
        fi
        validate_model "$MODEL_PATH"
        ;;
    -h|--help|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac

exit 0
