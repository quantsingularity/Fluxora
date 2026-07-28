#!/bin/bash

# manage_docker.sh (a.k.a. the Docker manager)
# Simplifies Docker operations for the Fluxora backend:
# - build: Build the Docker image
# - start: Start the container
# - stop: Stop the container
# - status: Check status of the container
# - logs: View logs from the container
# - clean: Remove containers, images and volumes

set -euo pipefail

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The only docker-compose.yml that's actually wired up to build correctly
# (it needs the sibling code/ml_core package in its build context) lives in
# code/backend/. There is no top-level docker-compose.yml in this repo.
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/code/backend/docker-compose.yml"

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

# Function to check if Docker (and a Compose implementation) is installed.
# Populates the global $COMPOSE array so callers can do "${COMPOSE[@]} up -d"
# regardless of whether the host has the modern `docker compose` plugin or
# the legacy standalone `docker-compose` binary.
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop or Docker Engine."
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

# Function to check if the compose file exists
check_compose_file() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "docker-compose.yml not found at ${COMPOSE_FILE}"
        exit 1
    fi
}

# Function to build Docker images
build_images() {
    print_section "Building Docker Image"

    check_compose_file

    print_warning "Building the Fluxora API image. This may take a while..."
    "${COMPOSE[@]}" -f "$COMPOSE_FILE" build

    print_success "Docker image built successfully"
}

# Function to start Docker containers
start_containers() {
    print_section "Starting Docker Containers"

    check_compose_file

    print_warning "Starting the container in detached mode..."
    "${COMPOSE[@]}" -f "$COMPOSE_FILE" up -d

    print_success "Container started successfully"
    print_warning "Use './manage_docker.sh status' to check container status"
    print_warning "Use './manage_docker.sh logs' to view container logs"
}

# Function to stop Docker containers
stop_containers() {
    print_section "Stopping Docker Containers"

    check_compose_file

    print_warning "Stopping the container..."
    "${COMPOSE[@]}" -f "$COMPOSE_FILE" down

    print_success "Container stopped successfully"
}

# Function to check status of Docker containers
check_status() {
    print_section "Docker Container Status"

    check_compose_file

    echo "Current running containers:"
    "${COMPOSE[@]}" -f "$COMPOSE_FILE" ps
}

# Function to view Docker container logs
view_logs() {
    # $1 is optional: a specific service name, or empty for all services.
    local service="${1:-}"

    print_section "Docker Container Logs"

    check_compose_file

    if [ -z "$service" ]; then
        print_warning "Showing logs for all containers. Press Ctrl+C to exit."
        "${COMPOSE[@]}" -f "$COMPOSE_FILE" logs -f
    else
        print_warning "Showing logs for $service. Press Ctrl+C to exit."
        "${COMPOSE[@]}" -f "$COMPOSE_FILE" logs -f "$service"
    fi
}

# Function to clean Docker containers and images
clean_docker() {
    print_section "Cleaning Docker Resources"

    check_compose_file

    print_warning "Stopping and removing containers..."
    "${COMPOSE[@]}" -f "$COMPOSE_FILE" down --remove-orphans

    print_warning "Removing project images..."
    "${COMPOSE[@]}" -f "$COMPOSE_FILE" down --rmi all

    print_warning "Removing dangling images..."
    docker image prune -f

    print_warning "Removing dangling volumes..."
    docker volume prune -f

    print_success "Docker cleanup completed successfully"
}

# Function to display help message
show_help() {
    echo "Docker Manager for Fluxora"
    echo ""
    echo "Usage: $0 [options] command [service_name]"
    echo ""
    echo "Commands:"
    echo "  build              Build the Docker image"
    echo "  start              Start the container"
    echo "  stop               Stop the container"
    echo "  status             Check status of the container"
    echo "  logs [service]     View logs (all services, or one named service)"
    echo "  clean              Remove containers, images and dangling volumes"
    echo ""
    echo "Options:"
    echo "  -h, --help         Show this help message"
    echo "  -f, --file         Specify a different docker-compose.yml path"
    echo "                     (default: code/backend/docker-compose.yml)"
    echo ""
    echo "Examples:"
    echo "  $0 build                   # Build the Docker image"
    echo "  $0 start                   # Start the container"
    echo "  $0 logs                    # View logs from all services"
    echo "  $0 logs api                # View logs from the 'api' service only"
}

# Parse command line arguments
COMMAND=""
SERVICE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        build|start|stop|status|clean)
            COMMAND="$1"
            shift
            ;;
        logs)
            COMMAND="$1"
            shift
            # The service name is optional -- don't assume $1 exists.
            if [[ $# -gt 0 ]]; then
                SERVICE="$1"
                shift
            fi
            ;;
        *)
            print_error "Unknown option or command: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if Docker (and a compose implementation) is installed
check_docker

# Execute the specified command
case "$COMMAND" in
    build)
        build_images
        ;;
    start)
        start_containers
        ;;
    stop)
        stop_containers
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs "$SERVICE"
        ;;
    clean)
        clean_docker
        ;;
    "")
        show_help
        ;;
    *)
        show_help
        ;;
esac

exit 0
