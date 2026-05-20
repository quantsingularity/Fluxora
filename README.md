# Fluxora

![CI/CD Status](https://img.shields.io/github/actions/workflow/status/quantsingularity/Fluxora/cicd.yml?branch=main&label=CI/CD&logo=github)
[![Test Coverage](https://img.shields.io/badge/coverage-83%25-brightgreen)](https://github.com/quantsingularity/Fluxora/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Energy Forecasting & Optimization Platform

Fluxora is an advanced energy forecasting and optimization platform that leverages machine learning to predict energy consumption patterns and optimize resource allocation. The system helps utilities, grid operators, and energy managers make data-driven decisions for improved efficiency and sustainability.

<div align="center">
  <img src="docs/images/Fluxora_dashboard.bmp" alt="Fluxora Dashboard" width="80%">
</div>

## Table of Contents

- [Project Structure](#project-structure)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [API Reference](#api-reference)
- [Monitoring Stack](#monitoring-stack)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Project Structure

The project follows a modular and domain-driven structure to ensure maintainability and scalability.

├── code/                   # Core backend logic, services, and shared utilities
├── docs/                   # Project documentation
├── infrastructure/         # DevOps, deployment, and infra-related code
├── mobile-frontend/        # Mobile application
├── web-frontend/           # Web dashboard
├── scripts/                # Automation, setup, and utility scripts
├── LICENSE                 # License information
└── README.md               # Project overview and instructions

## Features

- **Energy Consumption Forecasting**: Predict energy usage patterns with high accuracy
- **Anomaly Detection**: Identify unusual consumption patterns and potential issues
- **Resource Optimization**: Optimize energy distribution and resource allocation
- **Real-time Monitoring**: Track energy usage and system performance in real-time
- **Interactive Dashboards**: Visualize data and insights through intuitive interfaces
- **API Integration**: Connect with existing energy management systems
- **Mobile Access**: Monitor and manage on the go with mobile application
- **Alerting System**: Receive notifications for critical events and anomalies

## Tech Stack

Fluxora is built on a modern, robust, and scalable technology stack.

| Component            | Technology                    | Role                                                                               |
| :------------------- | :---------------------------- | :--------------------------------------------------------------------------------- |
| **Backend API**      | Python, FastAPI, Uvicorn      | High-performance API for serving predictions and data                              |
| **Machine Learning** | TensorFlow, XGBoost, Prophet  | Core forecasting and anomaly detection models                                      |
| **MLOps**            | MLflow, Optuna, DVC, Prefect  | Model tracking, hyperparameter tuning, data versioning, and workflow orchestration |
| **Feature Store**    | Feast                         | Managing, serving, and versioning machine learning features                        |
| **Frontend**         | Node.js (Web & Mobile)        | Interactive web dashboard and mobile application                                   |
| **Database**         | PostgreSQL, Redis             | Persistent data storage and caching/session management                             |
| **Infrastructure**   | Docker, Kubernetes, Terraform | Containerization, orchestration, and Infrastructure as Code                        |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/quantsingularity/fluxora.git
cd fluxora

# Set up environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start the development server
python src/api/main.py
```

Once running, access the dashboard at http://localhost:8000

## Installation

### Prerequisites

- Python 3.9+
- Docker and Docker Compose
- Node.js 16+ (for web frontend)
- PostgreSQL 13+
- Redis

### Using Docker

```bash
# Build and start all services
docker-compose up -d

# Access the dashboard
open http://localhost:8000
```

### Manual Installation

1. **Set up the backend**:

```bash
cd src
pip install -r requirements.txt
python -m api.main
```

2. **Set up the web frontend**:

```bash
cd web-frontend
npm install
npm start
```

3. **Set up the mobile app**:

```bash
cd mobile-frontend
npm install
npx expo start
```

## API Reference

### Authentication

```bash
curl -X POST http://api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "secure_password"
  }'
```

### Prediction Endpoint

```bash
curl -X POST http://api/predict \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $SECRET_KEY" \
  -d '{
    "timestamp": "2023-08-15T14:00:00",
    "meter_id": "MT_001",
    "historical_load": [0.45, 0.48, 0.52]
  }'
```

### Data Retrieval

```bash
curl -X GET http://api/data/consumption \
  -H "X-API-Key: $SECRET_KEY" \
  -G --data-urlencode "start_date=2023-08-01" \
  --data-urlencode "end_date=2023-08-15" \
  --data-urlencode "meter_id=MT_001"
```

## Monitoring Stack

Fluxora includes a comprehensive monitoring stack:

| Tool             | Purpose                         | Access URL (Local)      |
| :--------------- | :------------------------------ | :---------------------- |
| **Prometheus**   | Metrics collection and storage  | N/A (Backend)           |
| **Grafana**      | Visualization and dashboards    | `http://localhost:3000` |
| **Alertmanager** | Alert routing and notifications | N/A (Backend)           |
| **Loki**         | Log aggregation and querying    | N/A (Backend)           |

Access the monitoring dashboard at http://localhost:3000 when running locally.

## Testing

The project maintains comprehensive test coverage across all components to ensure reliability and accuracy.

### Test Coverage

| Component       | Coverage | Status |
| :-------------- | :------- | :----- |
| API Services    | 89%      | ✅     |
| Data Processing | 85%      | ✅     |
| ML Models       | 78%      | ✅     |
| Frontend        | 80%      | ✅     |
| **Overall**     | **83%**  | **✅** |

### Running Tests

```bash
# Run backend tests
cd src
pytest

# Run frontend tests
cd web-frontend
npm test

# Run integration tests
cd tests
pytest -m integration
```

## CI/CD Pipeline

Fluxora uses GitHub Actions for continuous integration and deployment:

| Stage                | Control Area                    | Institutional-Grade Detail                                                              |
| :------------------- | :------------------------------ | :-------------------------------------------------------------------------------------- |
| **Formatting Check** | Change Triggers                 | Enforced on all `push` and `pull_request` events to `main` and `develop`                |
|                      | Manual Oversight                | On-demand execution via controlled `workflow_dispatch`                                  |
|                      | Source Integrity                | Full repository checkout with complete Git history for auditability                     |
|                      | Python Runtime Standardization  | Python 3.10 with deterministic dependency caching                                       |
|                      | Backend Code Hygiene            | `autoflake` to detect unused imports/variables using non-mutating diff-based validation |
|                      | Backend Style Compliance        | `black --check` to enforce institutional formatting standards                           |
|                      | Non-Intrusive Validation        | Temporary workspace comparison to prevent unauthorized source modification              |
|                      | Node.js Runtime Control         | Node.js 18 with locked dependency installation via `npm ci`                             |
|                      | Web Frontend Formatting Control | Prettier checks for web-facing assets                                                   |
|                      | Mobile Frontend Formatting      | Prettier enforcement for mobile application codebases                                   |
|                      | Documentation Governance        | Repository-wide Markdown formatting enforcement                                         |
|                      | Infrastructure Configuration    | Prettier validation for YAML/YML infrastructure definitions                             |
|                      | Compliance Gate                 | Any formatting deviation fails the pipeline and blocks merge                            |

## Documentation

| Document                    | Path                 | Description                                                    |
| :-------------------------- | :------------------- | :------------------------------------------------------------- |
| **README**                  | `README.md`          | High-level overview, project scope, and repository entry point |
| **Installation Guide**      | `INSTALLATION.md`    | Step-by-step installation and environment setup                |
| **API Reference**           | `API.md`             | Detailed documentation for all API endpoints                   |
| **CLI Reference**           | `CLI.md`             | Command-line interface usage, commands, and examples           |
| **User Guide**              | `USAGE.md`           | Comprehensive end-user guide, workflows, and examples          |
| **Architecture Overview**   | `ARCHITECTURE.md`    | System architecture, components, and design rationale          |
| **Configuration Guide**     | `CONFIGURATION.md`   | Configuration options, environment variables, and tuning       |
| **Feature Matrix**          | `FEATURE_MATRIX.md`  | Feature coverage, capabilities, and roadmap alignment          |
| **Contributing Guidelines** | `CONTRIBUTING.md`    | Contribution workflow, coding standards, and PR requirements   |
| **Troubleshooting**         | `TROUBLESHOOTING.md` | Common issues, diagnostics, and remediation steps              |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
