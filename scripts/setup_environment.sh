#!/bin/bash

# setup_environment.sh (a.k.a. the dependency installer)
# Installs dependencies for all Fluxora components:
# - Backend + ml_core (Python, via a venv in code/backend/venv)
# - Web Frontend (Node.js)
# - Mobile Frontend (React Native / Expo)
#
# Defaults to the actual Fluxora repository root (resolved relative to this
# script's own location) so it works whether you run it as
# `./setup_environment.sh` from inside scripts/, or `./scripts/setup_environment.sh`
# from the repo root. Use -d/--directory to point at a different checkout.

set -euo pipefail

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

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

# Function to install backend dependencies
install_backend_deps() {
    print_section "Installing Backend Dependencies"

    local backend_dir="${PROJECT_DIR}/code/backend"
    if ! check_directory "$backend_dir"; then
        print_warning "Backend directory (code/backend) not found, skipping..."
        return 0
    fi

    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install it before continuing."
        return 1
    fi

    cd "$backend_dir"

    # Check if virtualenv exists, create if not
    if [ ! -d "venv" ]; then
        print_warning "Creating Python virtual environment..."
        python3 -m venv venv
    fi

    # Upgrade pip
    print_warning "Upgrading pip..."
    ./venv/bin/pip install --upgrade pip

    # Install requirements
    if [ -f "requirements.txt" ]; then
        print_warning "Installing Python dependencies from requirements.txt..."
        ./venv/bin/pip install -r requirements.txt
    else
        print_error "requirements.txt not found in ${backend_dir}"
        return 1
    fi

    # Install development requirements if available
    if [ -f "requirements-dev.txt" ]; then
        print_warning "Installing development dependencies..."
        ./venv/bin/pip install -r requirements-dev.txt
    fi

    print_success "Backend dependencies installed successfully (venv at ${backend_dir}/venv)"
}

# Function to install web frontend dependencies
install_web_frontend_deps() {
    print_section "Installing Web Frontend Dependencies"

    if ! check_directory "${PROJECT_DIR}/web-frontend"; then
        print_warning "Web frontend directory not found, skipping..."
        return 0
    fi

    cd "${PROJECT_DIR}/web-frontend"

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ before continuing."
        return 1
    fi

    # Install dependencies
    if [ -f "package.json" ]; then
        print_warning "Installing Node.js dependencies..."
        npm install
    else
        print_error "package.json not found in ${PROJECT_DIR}/web-frontend"
        return 1
    fi

    print_success "Web frontend dependencies installed successfully"
}

# Function to install mobile frontend dependencies
install_mobile_frontend_deps() {
    print_section "Installing Mobile Frontend Dependencies"

    if ! check_directory "${PROJECT_DIR}/mobile-frontend"; then
        print_warning "Mobile frontend directory not found, skipping..."
        return 0
    fi

    cd "${PROJECT_DIR}/mobile-frontend"

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ before continuing."
        return 1
    fi

    # Install dependencies
    if [ -f "package.json" ]; then
        print_warning "Installing Node.js dependencies..."
        npm install
    else
        print_error "package.json not found in ${PROJECT_DIR}/mobile-frontend"
        return 1
    fi

    # This is an Expo-managed project (see package.json's "expo" scripts) --
    # `npx expo` is used on demand by start_services.sh and doesn't need a
    # separate global CLI install, unlike bare React Native CLI projects.
    print_success "Mobile frontend dependencies installed successfully"
}

# Function to install all dependencies
install_all_deps() {
    print_section "Installing All Dependencies"

    local had_failure=false
    install_backend_deps || had_failure=true
    install_web_frontend_deps || had_failure=true
    install_mobile_frontend_deps || had_failure=true

    print_section "Dependency Installation Complete"
    if [ "$had_failure" = true ]; then
        print_warning "One or more components were skipped or failed -- see messages above."
    else
        print_success "All dependencies have been installed successfully"
    fi

    echo -e "\nNext steps:"
    echo "1. Run ./start_services.sh to start all required services"
    echo "2. Access the API at http://localhost:8000 and the web app at http://localhost:3000"
}

# Function to display help message
show_help() {
    echo "Dependency Installer for Fluxora"
    echo ""
    echo "Usage: $0 [options] [component]"
    echo ""
    echo "Components:"
    echo "  backend            Install backend + ml_core dependencies (Python venv)"
    echo "  web                Install web frontend dependencies"
    echo "  mobile             Install mobile frontend dependencies"
    echo "  all                Install all dependencies (default)"
    echo ""
    echo "Options:"
    echo "  -h, --help         Show this help message"
    echo "  -d, --directory    Specify Fluxora project directory (default: repo root, auto-detected)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Install all dependencies"
    echo "  $0 backend                   # Install only backend dependencies"
    echo "  $0 -d /path/to/fluxora web   # Install web frontend dependencies in specific directory"
}

# Parse command line arguments
COMPONENT="all"

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
        backend|web|mobile|all)
            COMPONENT="$1"
            shift
            ;;
        *)
            print_error "Unknown option or component: $1"
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

# Execute based on component
case $COMPONENT in
    backend)
        install_backend_deps
        ;;
    web)
        install_web_frontend_deps
        ;;
    mobile)
        install_mobile_frontend_deps
        ;;
    all)
        install_all_deps
        ;;
esac

exit 0
