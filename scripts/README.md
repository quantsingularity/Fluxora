# Fluxora Scripts

Utility scripts for developing, testing, and operating Fluxora. All scripts
resolve the project root **relative to their own location** (not your
current directory), so they work correctly whether you run them as
`./script.sh` from inside `scripts/` or as `./scripts/script.sh` from the
repo root.

## Scripts

| Script                   | Purpose                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `setup.sh`               | Quick-start: creates a venv and installs backend + ml_core Python dependencies              |
| `setup_environment.sh`   | Installs dependencies for one or all components (backend, web, mobile)                      |
| `manage_docker.sh`       | Build/start/stop/status/logs for the backend's Docker container                             |
| `start_services.sh`      | Starts (or stops) the backend, both frontends, and the monitoring stack                     |
| `dev_tools.sh`           | Formatting (black/isort/Prettier), linting (flake8/ESLint), Alembic migrations, git helpers |
| `lint-all.sh`            | Repo-wide formatting/linting pass across Python, JS/TS, YAML, and Terraform                 |
| `run_tests.sh`           | Runs the backend test suite with a coverage report                                          |
| `test_api.sh`            | Exercises the real API end-to-end and generates example `curl` scripts                      |
| `deploy.sh`              | Deploys to `dev` (Docker Compose), or `staging`/`prod` (Terraform + Kubernetes)             |
| `deploy_model.sh`        | Validates, archives, and rolls back the trained forecasting model file                      |
| `setup_monitoring.sh`    | Generates a standalone Prometheus + Grafana + Alertmanager stack                            |
| `sync_data.sh`           | Seeds realistic historical data via the real API, or syncs raw data from S3                 |
| `fetch_realtime_data.py` | Simulates a live meter feed, streaming readings into the API                                |
| `clean.sh`               | Removes build artifacts, caches, and installed dependencies                                 |

## Typical workflow

```bash
cd scripts
./setup_environment.sh          # install backend + web + mobile dependencies
./dev_tools.sh migrate           # apply database migrations (Alembic)
./sync_data.sh seed --days 60    # seed some realistic history (optional but
                                  # recommended -- the forecasting model
                                  # needs real history to do anything useful)
./start_services.sh              # start backend + web frontend + mobile
./test_api.sh                    # sanity-check the running API
./run_tests.sh                   # run the backend test suite
./start_services.sh stop         # stop everything
```

## Notes on scope

- **Backend and ml_core** (`code/backend/`, `code/ml_core/`) are the real,
  working application these scripts operate on.
- **`infrastructure/`** ships as example Terraform/Kubernetes/Docker Compose
  scaffolding -- it references a placeholder image registry and doesn't
  (yet) describe this repo's actual Python backend. `deploy.sh` points at
  the right paths within it, but staging/prod deployment still needs that
  scaffolding adapted to the real application first. `dev` deployment,
  by contrast, uses the real, working `code/backend/docker-compose.yml`
  and needs no adaptation.
- **`monitoring/`** doesn't exist until you run `setup_monitoring.sh` --
  it's generated fresh each time, not tracked in git.
- The backend does not currently expose a Prometheus `/metrics` endpoint,
  so the `fluxora_api`/`fluxora_frontend` scrape targets in the generated
  Prometheus config will show as down until that instrumentation is added.
