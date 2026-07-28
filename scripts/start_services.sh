#!/bin/bash

# start_services.sh
# Automates the startup of all Fluxora services in the correct order
#
# This script handles:
# - Starting backend services
# - Starting frontend applications
# - Starting monitoring stack
# - Checking service health

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
COMPOSE=() # populated lazily by start_monitoring/stop_services

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

# Resolves a Docker Compose invocation, preferring the v2 plugin.
resolve_compose() {
    if docker compose version &> /dev/null; then
        COMPOSE=(docker compose)
    elif command -v docker-compose &> /dev/null; then
        COMPOSE=(docker-compose)
    else
        return 1
    fi
    return 0
}

# Function to check if a port is in use
check_port() {
    if command -v lsof &> /dev/null; then
        if lsof -Pi :"$1" -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    fi
    # Fallback for systems without lsof: a bare TCP connect attempt using
    # bash's built-in /dev/tcp pseudo-device, no external tool required.
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
    local result=$?
    exec 3<&- 2>/dev/null || true
    exec 3>&- 2>/dev/null || true
    return $result
}

# Function to wait for a service to be available
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=$3
    local attempt=1

    print_warning "Waiting for $service_name to be available on port $port..."

    while [ $attempt -le "$max_attempts" ]; do
        if check_port "$port"; then
            print_success "$service_name is available on port $port"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "$service_name did not become available on port $port after $max_attempts attempts"
    return 1
}

# Function to start backend services
start_backend() {
    print_section "Starting Backend Services"

    local backend_dir="${PROJECT_DIR}/code/backend"
    if ! check_directory "$backend_dir"; then
        print_warning "Backend directory (code/backend) not found, skipping..."
        return 1
    fi

    # Check if virtualenv exists
    if [ ! -x "${backend_dir}/venv/bin/python" ] && [ ! -x "${backend_dir}/.venv/bin/python" ]; then
        print_error "Python virtual environment not found in code/backend"
        print_warning "Please run ./setup_environment.sh first"
        return 1
    fi

    local py="${backend_dir}/venv/bin/python"
    [ -x "$py" ] || py="${backend_dir}/.venv/bin/python"

    # Start API server in background (uvicorn, matching the real app
    # entrypoint -- there is no src/api/main.py in this repo).
    print_warning "Starting API server..."
    (
        cd "$backend_dir"
        "$py" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 \
            > "${PROJECT_DIR}/logs/api.log" 2>&1 &
        echo $! > "${PROJECT_DIR}/logs/api.pid"
    )
    print_success "API server started with PID $(cat "${PROJECT_DIR}/logs/api.pid")"

    # Wait for API to be available
    wait_for_service "API server" 8000 15

    print_success "Backend services started successfully"
    return 0
}

# Function to start web frontend
start_web_frontend() {
    print_section "Starting Web Frontend"

    local frontend_dir="${PROJECT_DIR}/web-frontend"
    if ! check_directory "$frontend_dir"; then
        print_warning "Web frontend directory not found, skipping..."
        return 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_warning "Please run ./setup_environment.sh first"
        return 1
    fi

    # Check if dependencies are installed
    if [ ! -d "${frontend_dir}/node_modules" ]; then
        print_error "Node.js dependencies not installed for web-frontend"
        print_warning "Please run ./setup_environment.sh first"
        return 1
    fi

    # Start web frontend in development mode. web-frontend's package.json
    # (Vite) only defines "dev"/"build"/"preview" -- there is no "start"
    # script, so `npm start` here would fail with "Missing script: start".
    print_warning "Starting web frontend in development mode..."
    (
        cd "$frontend_dir"
        npm run dev > "${PROJECT_DIR}/logs/web-frontend.log" 2>&1 &
        echo $! > "${PROJECT_DIR}/logs/web-frontend.pid"
    )
    print_success "Web frontend started with PID $(cat "${PROJECT_DIR}/logs/web-frontend.pid")"

    # Wait for web frontend to be available (port 3000, set in
    # web-frontend/vite.config.js).
    wait_for_service "Web frontend" 3000 20

    print_success "Web frontend started successfully"
    return 0
}

# Function to start mobile frontend
start_mobile_frontend() {
    print_section "Starting Mobile Frontend"

    local frontend_dir="${PROJECT_DIR}/mobile-frontend"
    if ! check_directory "$frontend_dir"; then
        print_warning "Mobile frontend directory not found, skipping..."
        return 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_warning "Please run ./setup_environment.sh first"
        return 1
    fi

    # Check if dependencies are installed
    if [ ! -d "${frontend_dir}/node_modules" ]; then
        print_error "Node.js dependencies not installed for mobile-frontend"
        print_warning "Please run ./setup_environment.sh first"
        return 1
    fi

    # This is an Expo-managed project (see mobile-frontend/App.js and its
    # "expo" scripts in package.json), not a bare React Native CLI project
    # -- `npx react-native start` bypasses Expo's own dev server/tooling
    # and is not the right way to run it.
    print_warning "Starting Expo dev server..."
    (
        cd "$frontend_dir"
        npx expo start > "${PROJECT_DIR}/logs/mobile-frontend.log" 2>&1 &
        echo $! > "${PROJECT_DIR}/logs/mobile-frontend.pid"
    )
    print_success "Expo dev server started with PID $(cat "${PROJECT_DIR}/logs/mobile-frontend.pid")"

    print_warning "To run on a device or emulator, use a separate terminal and run:"
    print_warning "cd ${PROJECT_DIR}/mobile-frontend && npx expo start --android"
    print_warning "or"
    print_warning "cd ${PROJECT_DIR}/mobile-frontend && npx expo start --ios"

    print_success "Mobile frontend started successfully"
    return 0
}

# Function to start monitoring stack
start_monitoring() {
    print_section "Starting Monitoring Stack"

    local monitoring_dir="${PROJECT_DIR}/monitoring"
    if ! check_directory "$monitoring_dir"; then
        print_warning "Monitoring directory not found, skipping..."
        print_warning "Run ./setup_monitoring.sh to create it first."
        return 1
    fi

    # Check if Docker (and a compose implementation) is installed
    if ! command -v docker &> /dev/null || ! resolve_compose; then
        print_error "Docker or Docker Compose is not installed"
        print_warning "Please install Docker before continuing"
        return 1
    fi

    # Start monitoring stack with Docker Compose
    print_warning "Starting monitoring stack with Docker Compose..."
    (cd "$monitoring_dir" && "${COMPOSE[@]}" up -d)

    # Wait for Grafana to be available. Mapped to host port 3001 (not
    # 3000) by setup_monitoring.sh specifically to avoid colliding with
    # the web frontend's Vite dev server, which also uses 3000.
    wait_for_service "Grafana" 3001 30

    print_success "Monitoring stack started successfully"
    print_warning "Access Grafana dashboard at http://localhost:3001"
    print_warning "Default credentials: admin/admin"

    return 0
}

# Function to check service health
check_health() {
    print_section "Checking Service Health"

    # Check API health
    if check_port 8000; then
        print_success "API server is running on port 8000"
    else
        print_error "API server is not running"
    fi

    # Check web frontend health
    if check_port 3000; then
        print_success "Web frontend is running on port 3000"
    else
        print_error "Web frontend is not running"
    fi

    # Check if monitoring is running (Grafana, on 3001 -- see
    # start_monitoring's comment on why it's not 3000).
    if check_port 3001; then
        print_success "Monitoring (Grafana) is running on port 3001"
    else
        print_error "Monitoring (Grafana) is not running"
    fi

    # Check if Prometheus is running
    if check_port 9090; then
        print_success "Prometheus is running on port 9090"
    else
        print_error "Prometheus is not running"
    fi

    print_section "Service URLs"
    echo "API: http://localhost:8000"
    echo "Web Dashboard: http://localhost:3000"
    echo "Grafana: http://localhost:3001"
    echo "Prometheus: http://localhost:9090"
}

# Function to stop all services
stop_services() {
    print_section "Stopping All Services"

    # Stop backend
    if [ -f "${PROJECT_DIR}/logs/api.pid" ]; then
        local api_pid
        api_pid="$(cat "${PROJECT_DIR}/logs/api.pid")"
        print_warning "Stopping API server (PID: $api_pid)..."
        kill -15 "$api_pid" 2>/dev/null || true
        rm "${PROJECT_DIR}/logs/api.pid"
    fi

    # Stop web frontend
    if [ -f "${PROJECT_DIR}/logs/web-frontend.pid" ]; then
        local web_pid
        web_pid="$(cat "${PROJECT_DIR}/logs/web-frontend.pid")"
        print_warning "Stopping web frontend (PID: $web_pid)..."
        kill -15 "$web_pid" 2>/dev/null || true
        rm "${PROJECT_DIR}/logs/web-frontend.pid"
    fi

    # Stop mobile frontend
    if [ -f "${PROJECT_DIR}/logs/mobile-frontend.pid" ]; then
        local mobile_pid
        mobile_pid="$(cat "${PROJECT_DIR}/logs/mobile-frontend.pid")"
        print_warning "Stopping mobile frontend bundler (PID: $mobile_pid)..."
        kill -15 "$mobile_pid" 2>/dev/null || true
        rm "${PROJECT_DIR}/logs/mobile-frontend.pid"
    fi

    # Stop monitoring stack
    if check_directory "${PROJECT_DIR}/monitoring" && command -v docker &> /dev/null && resolve_compose; then
        print_warning "Stopping monitoring stack..."
        (cd "${PROJECT_DIR}/monitoring" && "${COMPOSE[@]}" down)
    fi

    print_success "All services stopped successfully"
}

# Function to ensure logs directory exists
ensure_logs_dir() {
    if [ ! -d "${PROJECT_DIR}/logs" ]; then
        print_warning "Creating logs directory..."
        mkdir -p "${PROJECT_DIR}/logs"
    fi
}

# Function to start all services
start_all() {
    print_section "Starting All Fluxora Services"

    ensure_logs_dir

    # Start services in the correct order. Each is allowed to fail/skip
    # (missing directory, missing deps, etc.) without aborting the rest --
    # under `set -e`, calling these bare (without the `|| true`-style
    # guard) would abort the entire script the moment any one of them
    # returned non-zero, which defeats the whole "skip what's missing and
    # keep going" behavior the rest of this script is built around.
    start_backend || print_warning "Backend did not start -- see messages above"
    start_web_frontend || print_warning "Web frontend did not start -- see messages above"
    start_mobile_frontend || print_warning "Mobile frontend did not start -- see messages above"
    start_monitoring || print_warning "Monitoring stack did not start -- see messages above"

    # Check health
    check_health

    print_section "All Services Started"
    print_success "Fluxora is now running"

    echo -e "\nUseful commands:"
    echo "- Check service health: $0 health"
    echo "- Stop all services: $0 stop"
    echo "- View logs: tail -f ${PROJECT_DIR}/logs/*.log"
}

# Function to display help message
show_help() {
    echo "Service Manager for Fluxora"
    echo ""
    echo "Usage: $0 [options] command"
    echo ""
    echo "Commands:"
    echo "  start              Start all services (default)"
    echo "  stop               Stop all services"
    echo "  restart            Restart all services"
    echo "  health             Check service health"
    echo "  backend            Start only backend services"
    echo "  web                Start only web frontend"
    echo "  mobile             Start only mobile frontend"
    echo "  monitoring         Start only monitoring stack"
    echo ""
    echo "Options:"
    echo "  -h, --help         Show this help message"
    echo "  -d, --directory    Specify Fluxora project directory (default: repo root, auto-detected)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Start all services"
    echo "  $0 stop                      # Stop all services"
    echo "  $0 -d /path/to/fluxora start # Start all services in specific directory"
}

# Parse command line arguments
COMMAND="start"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--directory)
            PROJECT_DIR="$2"
            shift 2
            ;;
        start|stop|restart|health|backend|web|mobile|monitoring)
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

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory $PROJECT_DIR does not exist"
    exit 1
fi

# Execute based on command
case $COMMAND in
    start)
        start_all
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_all
        ;;
    health)
        check_health
        ;;
    backend)
        ensure_logs_dir
        start_backend
        ;;
    web)
        ensure_logs_dir
        start_web_frontend
        ;;
    mobile)
        ensure_logs_dir
        start_mobile_frontend
        ;;
    monitoring)
        ensure_logs_dir
        start_monitoring
        ;;
esac

exit 0
