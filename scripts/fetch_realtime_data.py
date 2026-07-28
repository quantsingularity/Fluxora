#!/usr/bin/env python3
"""
fetch_realtime_data.py

Simulates a real-time energy meter feed and streams readings into a
running Fluxora backend via its real REST API.

There is no actual external real-time energy data service this project
connects to -- this script exists to make local development and demos
feel "live" without needing one. Each reading is validated with the same
ml_core.data_validator.validate_raw_data used by the training pipeline
before being posted to POST /v1/data/.

Usage:
    python fetch_realtime_data.py --email you@example.com --password secret
    python fetch_realtime_data.py --api-url http://localhost:8000 --interval 5 --count 20

Requires: requests, pandas (both already in code/backend/requirements.txt)
"""

import argparse
import math
import random
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

# Make ml_core importable when this script is run directly from scripts/.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PROJECT_ROOT / "code"))

try:
    from ml_core.data_validator import DataValidationError, validate_raw_data
except ImportError:  # pragma: no cover - keeps the simulator usable even
    # if ml_core isn't importable for some reason (e.g. missing numpy).
    validate_raw_data = None
    DataValidationError = Exception


class FluxoraClient:
    """Thin client for the parts of the real Fluxora API this script needs."""

    def __init__(self, api_url: str):
        self.api_url = api_url.rstrip("/")
        self.session = requests.Session()
        self.access_token = None
        self.refresh_token = None

    def register_if_needed(self, email: str, password: str) -> None:
        resp = self.session.post(
            f"{self.api_url}/v1/auth/register",
            json={"email": email, "password": password},
        )
        if resp.status_code == 201:
            print(f"Registered new user {email}")
        elif resp.status_code == 400:
            pass  # already registered -- that's fine
        else:
            resp.raise_for_status()

    def login(self, email: str, password: str) -> None:
        resp = self.session.post(
            f"{self.api_url}/v1/auth/token",
            data={"username": email, "password": password},
        )
        resp.raise_for_status()
        tokens = resp.json()
        self.access_token = tokens["access_token"]
        self.refresh_token = tokens["refresh_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})

    def refresh(self) -> None:
        resp = self.session.post(
            f"{self.api_url}/v1/auth/refresh",
            json={"refresh_token": self.refresh_token},
        )
        resp.raise_for_status()
        tokens = resp.json()
        self.access_token = tokens["access_token"]
        self.refresh_token = tokens["refresh_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})

    def post_reading(self, reading: dict) -> requests.Response:
        resp = self.session.post(f"{self.api_url}/v1/data/", json=reading)
        if resp.status_code == 401:
            # Access token expired mid-run -- refresh once and retry.
            self.refresh()
            resp = self.session.post(f"{self.api_url}/v1/data/", json=reading)
        return resp


def generate_reading() -> dict:
    """Generates one physically plausible energy reading for right now."""
    now = datetime.now(timezone.utc)
    hour = now.hour + now.minute / 60.0
    daily_cycle = math.sin(hour / 24 * 2 * math.pi)

    consumption = max(50 + 20 * daily_cycle + random.gauss(0, 4), 0.0)
    temperature = 20 + 6 * daily_cycle + random.gauss(0, 1)
    humidity = min(max(50 + 10 * random.gauss(0, 1), 0), 100)

    return {
        "timestamp": now.isoformat(),
        "consumption_kwh": round(consumption, 3),
        "cost_usd": round(consumption * 0.12, 3),
        "temperature_c": round(temperature, 2),
        "humidity_percent": round(humidity, 2),
    }


def validate_reading(reading: dict) -> bool:
    """Runs the reading through the same validator the training pipeline
    uses, so bad data is caught before it ever reaches the API."""
    if validate_raw_data is None:
        return True
    try:
        validate_raw_data(pd.DataFrame([reading]))
        return True
    except DataValidationError as e:
        print(f"Skipping invalid reading: {e}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--email", default="demo@example.com")
    parser.add_argument("--password", default="demo-password-123")
    parser.add_argument(
        "--interval", type=float, default=5.0, help="Seconds between readings"
    )
    parser.add_argument(
        "--count", type=int, default=0, help="Number of readings to send (0 = forever)"
    )
    args = parser.parse_args()

    client = FluxoraClient(args.api_url)

    print(f"Connecting to {args.api_url} as {args.email}...")
    try:
        client.register_if_needed(args.email, args.password)
        client.login(args.email, args.password)
    except requests.RequestException as e:
        print(f"Could not reach {args.api_url}: {e}")
        print("Is the backend running? See scripts/start_services.sh")
        sys.exit(1)

    print("Connected. Streaming simulated readings (Ctrl+C to stop)...")

    running = True

    def _stop(_signum, _frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    sent = 0
    while running:
        reading = generate_reading()
        if validate_reading(reading):
            try:
                resp = client.post_reading(reading)
                if resp.status_code == 201:
                    sent += 1
                    print(
                        f"[{sent}] posted {reading['consumption_kwh']} kWh "
                        f"at {reading['timestamp']}"
                    )
                else:
                    print(f"Unexpected response {resp.status_code}: {resp.text}")
            except requests.RequestException as e:
                print(f"Request failed, will retry next interval: {e}")

        if args.count and sent >= args.count:
            break

        time.sleep(args.interval)

    print(f"Stopped after sending {sent} reading(s).")


if __name__ == "__main__":
    main()
