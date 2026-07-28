#!/bin/bash

# sync_data.sh
#
# Two independent data-related utilities for local Fluxora development:
#
#   seed  (default) Bulk-seeds N days of realistic historical hourly
#         readings into a running Fluxora instance via the real API.
#         Useful because the prediction model's rolling-window features
#         need real history (weeks, not hours) to produce anything other
#         than a flat fallback forecast -- see ml_core/feature_engineering.py.
#
#   s3    Optionally syncs raw data down from an S3 bucket for offline
#         reference. Requires the AWS CLI and is entirely independent of
#         `seed` -- previously this script hard-required the AWS CLI just
#         to reach an unrelated local-data fallback path, even though the
#         actual `aws s3 sync` call was commented out.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_DIR}/code/backend"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${PROJECT_DIR}/logs/sync_data_${TIMESTAMP}.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "Starting sync_data.sh at $(date)" | tee -a "$LOG_FILE"

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

seed_via_api() {
    local api_url="$1"
    local email="$2"
    local password="$3"
    local days="$4"

    local py
    py="$(backend_python)"
    if [ -z "$py" ]; then
        echo "Error: no Python interpreter found. Run ./setup_environment.sh first." | tee -a "$LOG_FILE"
        exit 1
    fi

    echo "Seeding ${days} days of hourly history into ${api_url} as ${email}..." | tee -a "$LOG_FILE"

    "$py" - "$api_url" "$email" "$password" "$days" <<'PYEOF' 2>&1 | tee -a "$LOG_FILE"
import math
import random
import sys
from datetime import datetime, timedelta, timezone

import requests

api_url, email, password, days = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])

session = requests.Session()

resp = session.post(f"{api_url}/v1/auth/register", json={"email": email, "password": password})
if resp.status_code not in (201, 400):
    resp.raise_for_status()

resp = session.post(f"{api_url}/v1/auth/token", data={"username": email, "password": password})
resp.raise_for_status()
access_token = resp.json()["access_token"]
session.headers.update({"Authorization": f"Bearer {access_token}"})

start = datetime.now(timezone.utc) - timedelta(days=days)
rng = random.Random(42)
sent = 0
for i in range(days * 24):
    ts = start + timedelta(hours=i)
    cycle = math.sin(ts.hour / 24 * 2 * math.pi)
    consumption = max(50 + 20 * cycle + rng.gauss(0, 4), 0.0)
    payload = {
        "timestamp": ts.isoformat(),
        "consumption_kwh": round(consumption, 3),
        "cost_usd": round(consumption * 0.12, 3),
        "temperature_c": round(20 + 6 * cycle + rng.gauss(0, 1), 2),
        "humidity_percent": round(min(max(50 + 10 * rng.gauss(0, 1), 0), 100), 2),
    }
    resp = session.post(f"{api_url}/v1/data/", json=payload)
    if resp.status_code != 201:
        print(f"Failed to post reading at {ts.isoformat()}: {resp.status_code} {resp.text}")
        continue
    sent += 1
    if sent % 100 == 0:
        print(f"...{sent} readings sent")

print(f"Done: seeded {sent}/{days * 24} readings for {email}")
PYEOF
}

sync_from_s3() {
    local bucket="$1"
    local dest_dir="${PROJECT_DIR}/data/raw"

    if ! command -v aws &> /dev/null; then
        echo "Error: AWS CLI is not installed. Install it to use 's3' mode." | tee -a "$LOG_FILE"
        exit 1
    fi

    mkdir -p "$dest_dir"
    echo "Syncing raw data from s3://${bucket} to ${dest_dir}..." | tee -a "$LOG_FILE"
    aws s3 sync "s3://${bucket}" "$dest_dir" 2>&1 | tee -a "$LOG_FILE"
    echo "S3 sync completed." | tee -a "$LOG_FILE"
}

show_help() {
    echo "Data sync/seed helper for Fluxora"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  seed     (default) Bulk-seed realistic historical data via the API"
    echo "  s3       Sync raw data down from an S3 bucket (requires AWS CLI)"
    echo ""
    echo "Options for 'seed':"
    echo "  --api-url URL       Backend URL (default: http://localhost:8000)"
    echo "  --email EMAIL       Account to seed data for (default: demo@example.com)"
    echo "  --password PASS     Account password (default: demo-password-123)"
    echo "  --days N            Days of hourly history to generate (default: 60)"
    echo ""
    echo "Options for 's3':"
    echo "  --bucket NAME       S3 bucket to sync from (required)"
    echo ""
    echo "Examples:"
    echo "  $0                                   # Seed 60 days of demo data"
    echo "  $0 seed --days 90 --email me@example.com"
    echo "  $0 s3 --bucket my-fluxora-raw-data"
}

COMMAND="seed"
if [[ $# -gt 0 && "$1" != --* ]]; then
    COMMAND="$1"
    shift
fi

API_URL="http://localhost:8000"
EMAIL="demo@example.com"
PASSWORD="demo-password-123"
DAYS=60
BUCKET=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --password)
            PASSWORD="$2"
            shift 2
            ;;
        --days)
            DAYS="$2"
            shift 2
            ;;
        --bucket)
            BUCKET="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

case "$COMMAND" in
    seed)
        seed_via_api "$API_URL" "$EMAIL" "$PASSWORD" "$DAYS"
        ;;
    s3)
        if [ -z "$BUCKET" ]; then
            echo "Error: 's3' requires --bucket <name>"
            exit 1
        fi
        sync_from_s3 "$BUCKET"
        ;;
    -h|--help)
        show_help
        ;;
    *)
        echo "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac

echo "Finished at $(date)" | tee -a "$LOG_FILE"
