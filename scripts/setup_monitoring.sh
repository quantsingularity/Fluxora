#!/bin/bash

# monitoring_setup.sh
# Configures and launches the monitoring stack for Fluxora
#
# This script:
# - Sets up Prometheus, Grafana, and Alertmanager
# - Configures dashboards and alerts
# - Ensures proper data collection from Fluxora components

set -euo pipefail

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default project directory
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MONITORING_DIR="${PROJECT_DIR}/monitoring"
COMPOSE=() # populated by check_docker

# Function to print section headers
print_section() {
    echo -e "\n${BOLD}${BLUE}==== $1 ====${NC}\n"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to check if directory exists
check_directory() {
    if [ ! -d "$1" ]; then
        print_error "Directory $1 not found"
        return 1
    fi
    return 0
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker before continuing."
        exit 1
    fi

    if docker compose version &> /dev/null; then
        COMPOSE=(docker compose)
    elif command -v docker-compose &> /dev/null; then
        COMPOSE=(docker-compose)
    else
        print_error "Neither 'docker compose' nor 'docker-compose' is available."
        print_warning "Install Docker Compose (it ships with modern Docker Desktop/Engine)."
        exit 1
    fi
}

# Function to create monitoring directory structure
create_monitoring_structure() {
    print_section "Creating Monitoring Directory Structure"

    if [ ! -d "$MONITORING_DIR" ]; then
        print_warning "Creating monitoring directory: ${MONITORING_DIR}"
        mkdir -p "$MONITORING_DIR"
    fi

    # Create subdirectories
    mkdir -p "${MONITORING_DIR}/prometheus"
    mkdir -p "${MONITORING_DIR}/grafana/dashboards"
    mkdir -p "${MONITORING_DIR}/grafana/provisioning/dashboards"
    mkdir -p "${MONITORING_DIR}/grafana/provisioning/datasources"
    mkdir -p "${MONITORING_DIR}/alertmanager"
    mkdir -p "${MONITORING_DIR}/data/prometheus"
    mkdir -p "${MONITORING_DIR}/data/grafana"

    print_success "Monitoring directory structure created"
}

# Function to create Prometheus configuration
create_prometheus_config() {
    print_section "Creating Prometheus Configuration"

    cat > "${MONITORING_DIR}/prometheus/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # NOTE: 'api' and 'web-frontend' are service names from
  # code/backend/docker-compose.yml's network -- a completely separate
  # Docker Compose project from this monitoring stack, so those hostnames
  # would never resolve here. host.docker.internal reaches ports published
  # on the host machine instead (see the extra_hosts entry for this
  # service in create_docker_compose, needed for Linux; Docker Desktop
  # supports it natively on macOS/Windows).
  #
  # Also honestly: the Fluxora backend does not currently expose a
  # /metrics endpoint (no prometheus_client instrumentation is wired into
  # app/main.py), so this target will show as down until that's added --
  # this scrape config is ready for when it is, not a working integration
  # today.
  - job_name: 'fluxora_api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:8000']

  - job_name: 'fluxora_frontend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3000']

  - job_name: 'node_exporter'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

    cat > "${MONITORING_DIR}/prometheus/alert_rules.yml" << EOF
groups:
  - name: fluxora_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 10% for the last 5 minutes"

      - alert: APIDown
        expr: up{job="fluxora_api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Fluxora API is down"
          description: "The Fluxora API service is not responding"

      - alert: FrontendDown
        expr: up{job="fluxora_frontend"} == 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Fluxora Frontend is down"
          description: "The Fluxora Frontend service is not responding"
EOF

    print_success "Prometheus configuration created"
}

# Function to create Alertmanager configuration
create_alertmanager_config() {
    print_section "Creating Alertmanager Configuration"

    cat > "${MONITORING_DIR}/alertmanager/alertmanager.yml" << EOF
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager'
  smtp_auth_password: 'password'

route:
  group_by: ['alertname', 'job']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'email-notifications'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'admin@example.com'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'job']
EOF

    print_success "Alertmanager configuration created"
}

# Function to create Grafana dashboards
create_grafana_dashboards() {
    print_section "Creating Grafana Dashboards"

    # Create Grafana datasource configuration.
    # Bug fix: this previously wrote to grafana/datasources/prometheus.yml,
    # a directory that was never created (an immediate crash under `set -e`)
    # and, even if created, is never mounted into the Grafana container --
    # only ./grafana/provisioning is (see create_docker_compose below).
    # Grafana's own provisioning convention expects datasource configs
    # under <provisioning-path>/datasources/, so this now writes there.
    cat > "${MONITORING_DIR}/grafana/provisioning/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    # Create Fluxora Overview Dashboard
    cat > "${MONITORING_DIR}/grafana/dashboards/fluxora_overview.json" << EOF
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "custom": {}
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 2,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.3.7",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "rate(http_requests_total[5m])",
          "interval": "",
          "legendFormat": "{{job}} - {{status}}",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "HTTP Request Rate",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "custom": {}
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 4,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.3.7",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])",
          "interval": "",
          "legendFormat": "{{job}} - {{handler}}",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "HTTP Request Duration",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "s",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
  ],
  "refresh": "10s",
  "schemaVersion": 26,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-6h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "Fluxora Overview",
  "uid": "fluxora-overview",
  "version": 1
}
EOF

    # Create dashboard provisioning configuration
    mkdir -p "${MONITORING_DIR}/grafana/provisioning/dashboards"
    cat > "${MONITORING_DIR}/grafana/provisioning/dashboards/default.yml" << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/dashboards
      foldersFromFilesStructure: true
EOF

    print_success "Grafana dashboards created"
}

# Function to create Docker Compose file
create_docker_compose() {
    print_section "Creating Docker Compose Configuration"

    cat > "${MONITORING_DIR}/docker-compose.yml" << EOF
version: '3'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: fluxora_prometheus
    # Lets the container reach ports published on the host (e.g. the
    # Fluxora API on :8000) via host.docker.internal. Docker Desktop
    # (macOS/Windows) supports this natively; this extra_hosts entry is
    # what makes it work on Linux too (Docker 20.10+).
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./prometheus:/etc/prometheus
      - ./data/prometheus:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    restart: unless-stopped
    networks:
      - fluxora-monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: fluxora_alertmanager
    volumes:
      - ./alertmanager:/etc/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    ports:
      - "9093:9093"
    restart: unless-stopped
    networks:
      - fluxora-monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: fluxora_grafana
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/etc/grafana/dashboards
      - ./data/grafana:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      # Bug fix: this was previously mapped to host port 3000, exactly the
      # port the web-frontend's Vite dev server uses (see
      # web-frontend/vite.config.js). Running start_services.sh and this
      # monitoring stack at the same time would fight over the same port.
      - "3001:3000"
    restart: unless-stopped
    networks:
      - fluxora-monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: fluxora_node_exporter
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)(\$|/)'
    ports:
      - "9100:9100"
    restart: unless-stopped
    networks:
      - fluxora-monitoring

networks:
  fluxora-monitoring:
    driver: bridge
EOF

    print_success "Docker Compose configuration created"
}

# Function to start monitoring stack
start_monitoring() {
    print_section "Starting Monitoring Stack"

    cd "$MONITORING_DIR"

    print_warning "Starting monitoring stack with Docker Compose..."
    "${COMPOSE[@]}" up -d

    print_success "Monitoring stack started successfully"
    print_warning "Grafana dashboard is available at http://localhost:3001"
    print_warning "Default credentials: admin/admin"
    print_warning "Prometheus is available at http://localhost:9090"
    print_warning "Alertmanager is available at http://localhost:9093"
}

# Function to stop monitoring stack
stop_monitoring() {
    print_section "Stopping Monitoring Stack"

    cd "$MONITORING_DIR"

    print_warning "Stopping monitoring stack..."
    "${COMPOSE[@]}" down

    print_success "Monitoring stack stopped successfully"
}

# Function to setup monitoring
setup_monitoring() {
    print_section "Setting Up Fluxora Monitoring Stack"

    # Create directory structure
    create_monitoring_structure

    # Create configurations
    create_prometheus_config
    create_alertmanager_config
    create_grafana_dashboards
    create_docker_compose

    print_section "Monitoring Setup Complete"
    print_success "Monitoring stack has been configured"

    # Ask if user wants to start monitoring stack
    read -p "Do you want to start the monitoring stack now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_monitoring
    else
        print_warning "You can start the monitoring stack later with:"
        print_warning "cd ${MONITORING_DIR} && docker compose up -d"
        print_warning "or use the start_services.sh script with the 'monitoring' option"
    fi
}

# Function to display help message
show_help() {
    echo "Monitoring Setup for Fluxora"
    echo ""
    echo "Usage: $0 [options] command"
    echo ""
    echo "Commands:"
    echo "  setup              Setup monitoring stack (default)"
    echo "  start              Start monitoring stack"
    echo "  stop               Stop monitoring stack"
    echo ""
    echo "Options:"
    echo "  -h, --help         Show this help message"
    echo "  -d, --directory    Specify Fluxora project directory (default: current directory)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Setup monitoring stack"
    echo "  $0 start                     # Start monitoring stack"
    echo "  $0 -d /path/to/fluxora setup # Setup monitoring in specific directory"
}

# Parse command line arguments
COMMAND="setup"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--directory)
            PROJECT_DIR="$2"
            MONITORING_DIR="${PROJECT_DIR}/monitoring"
            shift 2
            ;;
        setup|start|stop)
            COMMAND="$1"
            shift
            ;;
        *)
            print_error "Unknown option or command: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if Docker is installed
check_docker

# Execute based on command
case $COMMAND in
    setup)
        setup_monitoring
        ;;
    start)
        if ! check_directory "$MONITORING_DIR"; then
            print_error "Monitoring directory not found. Please run setup first."
            exit 1
        fi
        start_monitoring
        ;;
    stop)
        if ! check_directory "$MONITORING_DIR"; then
            print_error "Monitoring directory not found. Please run setup first."
            exit 1
        fi
        stop_monitoring
        ;;
esac

exit 0
