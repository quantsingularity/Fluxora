#!/bin/bash

# dev_tools.sh (a.k.a. the dev workflow helper)
# Automates common development tasks for Fluxora:
# - Code formatting and linting
# - Git operations
# - Database migrations (Alembic)

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
BACKEND_DIR="${PROJECT_DIR}/code/backend"
ML_CORE_DIR="${PROJECT_DIR}/code/ml_core"

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

# Resolves the backend's Python interpreter, preferring its own venv.
backend_python() {
    if [ -x "${BACKEND_DIR}/venv/bin/python" ]; then
        echo "${BACKEND_DIR}/venv/bin/python"
    elif [ -x "${BACKEND_DIR}/.venv/bin/python" ]; then
        echo "${BACKEND_DIR}/.venv/bin/python"
    else
        command -v python3
    fi
}

# Function to format Python code
format_python() {
    print_section "Formatting Python Code"

    if ! check_directory "$BACKEND_DIR"; then
        print_warning "Backend directory (code/backend) not found, skipping..."
        return 0
    fi

    local py
    py="$(backend_python)"
    if [ -z "$py" ]; then
        print_error "No Python interpreter found"
        print_warning "Please run ./setup_environment.sh first"
        return 1
    fi

    # Check if black is installed
    if ! "$py" -m black --version &> /dev/null; then
        print_warning "Installing black formatter..."
        "$py" -m pip install black
    fi

    # Format Python code with black (backend app/tests + ml_core)
    print_warning "Formatting Python code with black..."
    "$py" -m black "${BACKEND_DIR}/app" "${BACKEND_DIR}/tests" "$ML_CORE_DIR"

    # Check if isort is installed
    if ! "$py" -m isort --version &> /dev/null; then
        print_warning "Installing isort..."
        "$py" -m pip install isort
    fi

    # Sort imports with isort. --profile black keeps isort's formatting
    # compatible with black's (otherwise the two fight over import
    # grouping/trailing commas and the result fails `black --check`).
    print_warning "Sorting imports with isort..."
    "$py" -m isort --profile black "${BACKEND_DIR}/app" "${BACKEND_DIR}/tests" "$ML_CORE_DIR"

    # Re-run black in case isort's changes shifted any formatting.
    "$py" -m black "${BACKEND_DIR}/app" "${BACKEND_DIR}/tests" "$ML_CORE_DIR"

    print_success "Python code formatting completed"
}

# Function to lint Python code
lint_python() {
    print_section "Linting Python Code"

    if ! check_directory "$BACKEND_DIR"; then
        print_warning "Backend directory (code/backend) not found, skipping..."
        return 0
    fi

    local py
    py="$(backend_python)"
    if [ -z "$py" ]; then
        print_error "No Python interpreter found"
        print_warning "Please run ./setup_environment.sh first"
        return 1
    fi

    # Check if flake8 is installed
    if ! "$py" -m flake8 --version &> /dev/null; then
        print_warning "Installing flake8..."
        "$py" -m pip install flake8
    fi

    # Lint Python code with flake8. Line length matches black's default
    # (88) -- otherwise flake8's own default (79) flags almost every line
    # in code that's already correctly black-formatted.
    print_warning "Linting Python code with flake8..."
    "$py" -m flake8 --max-line-length=88 "${BACKEND_DIR}/app" "$ML_CORE_DIR"

    print_success "Python code linting completed"
}

# Function to format JavaScript/TypeScript code
format_js() {
    print_section "Formatting JavaScript/TypeScript Code"

    for name in web-frontend mobile-frontend; do
        local dir="${PROJECT_DIR}/${name}"
        if ! check_directory "$dir"; then
            print_warning "${name} directory not found, skipping..."
            continue
        fi

        if ! command -v node &> /dev/null; then
            print_error "Node.js is not installed"
            print_warning "Please run ./setup_environment.sh first"
            continue
        fi

        if [ ! -d "${dir}/node_modules" ]; then
            print_error "Node.js dependencies not installed for ${name}"
            print_warning "Please run ./setup_environment.sh first"
            continue
        fi

        print_warning "Formatting ${name} code with Prettier..."
        (cd "$dir" && npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,css,scss,md}") || \
            print_warning "Prettier reported issues in ${name} (see output above)"

        print_success "${name} code formatting completed"
    done
}

# Function to lint JavaScript/TypeScript code
lint_js() {
    print_section "Linting JavaScript/TypeScript Code"

    for name in web-frontend mobile-frontend; do
        local dir="${PROJECT_DIR}/${name}"
        if ! check_directory "$dir"; then
            print_warning "${name} directory not found, skipping..."
            continue
        fi

        if ! command -v node &> /dev/null; then
            print_error "Node.js is not installed"
            print_warning "Please run ./setup_environment.sh first"
            continue
        fi

        if [ ! -d "${dir}/node_modules" ]; then
            print_error "Node.js dependencies not installed for ${name}"
            print_warning "Please run ./setup_environment.sh first"
            continue
        fi

        # Not every frontend in this repo has its own ESLint config yet --
        # check first rather than letting `npx eslint` hard-fail.
        if ! ls "${dir}"/.eslintrc* &> /dev/null && [ ! -f "${dir}/eslint.config.js" ]; then
            print_warning "No ESLint config found in ${name}, skipping..."
            continue
        fi

        print_warning "Linting ${name} code with ESLint..."
        (cd "$dir" && npx eslint "src/**/*.{js,jsx,ts,tsx}") || \
            print_warning "ESLint found issues in ${name} (see output above)"

        print_success "${name} code linting completed"
    done
}

# Function to run database migrations (Alembic, not Django)
run_migrations() {
    print_section "Running Database Migrations"

    if ! check_directory "$BACKEND_DIR"; then
        print_warning "Backend directory (code/backend) not found, skipping..."
        return 0
    fi

    local py
    py="$(backend_python)"
    if [ -z "$py" ]; then
        print_error "No Python interpreter found"
        print_warning "Please run ./setup_environment.sh first"
        return 1
    fi

    print_warning "Running Alembic migrations (alembic upgrade head)..."
    (cd "$BACKEND_DIR" && "$py" -m alembic upgrade head)

    print_success "Database migrations completed"
}

# Function to create a new migration
create_migration() {
    print_section "Creating New Database Migration"

    if ! check_directory "$BACKEND_DIR"; then
        print_warning "Backend directory (code/backend) not found, skipping..."
        return 0
    fi

    local py
    py="$(backend_python)"
    if [ -z "$py" ]; then
        print_error "No Python interpreter found"
        print_warning "Please run ./setup_environment.sh first"
        return 1
    fi

    # Get migration message
    read -r -p "Enter migration message: " MIGRATION_MESSAGE

    print_warning "Autogenerating migration: ${MIGRATION_MESSAGE}..."
    (cd "$BACKEND_DIR" && "$py" -m alembic revision --autogenerate -m "$MIGRATION_MESSAGE")

    print_success "Migration created successfully in code/backend/migrations/versions/"
}

# Function to create a git commit
git_commit() {
    print_section "Creating Git Commit"

    cd "$PROJECT_DIR"

    if [ ! -d ".git" ]; then
        print_error "Git repository not initialized"
        print_warning "Please run 'git init' first"
        return 1
    fi

    # `git diff --quiet` only looks at tracked files, so a brand-new
    # untracked file would be missed entirely and this would falsely
    # report "no changes". `git status --porcelain` catches everything.
    if [ -z "$(git status --porcelain)" ]; then
        print_warning "No changes to commit"
        return 1
    fi

    print_warning "Adding all changes..."
    git add .

    read -r -p "Enter commit message: " COMMIT_MESSAGE

    print_warning "Creating commit..."
    git commit -m "$COMMIT_MESSAGE"

    print_success "Commit created successfully"
}

# Function to create a git branch
git_branch() {
    print_section "Creating Git Branch"

    cd "$PROJECT_DIR"

    if [ ! -d ".git" ]; then
        print_error "Git repository not initialized"
        print_warning "Please run 'git init' first"
        return 1
    fi

    read -r -p "Enter branch name: " BRANCH_NAME

    print_warning "Creating branch ${BRANCH_NAME}..."
    git checkout -b "$BRANCH_NAME"

    print_success "Branch created successfully"
}

# Function to format all code
format_all() {
    print_section "Formatting All Code"
    format_python
    format_js
    print_success "All code formatting completed"
}

# Function to lint all code
lint_all() {
    print_section "Linting All Code"
    lint_python
    lint_js
    print_success "All code linting completed"
}

# Function to display help message
show_help() {
    echo "Development Workflow Helper for Fluxora"
    echo ""
    echo "Usage: $0 [options] command"
    echo ""
    echo "Commands:"
    echo "  format-py          Format Python code (black + isort)"
    echo "  lint-py            Lint Python code (flake8)"
    echo "  format-js          Format JavaScript/TypeScript code (Prettier)"
    echo "  lint-js            Lint JavaScript/TypeScript code (ESLint)"
    echo "  format-all         Format all code"
    echo "  lint-all           Lint all code"
    echo "  migrate            Run database migrations (alembic upgrade head)"
    echo "  make-migration     Create a new database migration (alembic revision --autogenerate)"
    echo "  commit             Create a git commit"
    echo "  branch             Create a git branch"
    echo ""
    echo "Options:"
    echo "  -h, --help         Show this help message"
    echo "  -d, --directory    Specify Fluxora project directory (default: repo root, auto-detected)"
    echo ""
    echo "Examples:"
    echo "  $0 format-all                  # Format all code"
    echo "  $0 migrate                     # Apply pending Alembic migrations"
}

# Parse command line arguments
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--directory)
            PROJECT_DIR="$2"
            BACKEND_DIR="${PROJECT_DIR}/code/backend"
            ML_CORE_DIR="${PROJECT_DIR}/code/ml_core"
            shift 2
            ;;
        format-py|lint-py|format-js|lint-js|format-all|lint-all|migrate|make-migration|commit|branch)
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

# Check if command is provided
if [ -z "$COMMAND" ]; then
    print_error "No command specified"
    show_help
    exit 1
fi

# Execute based on command
case $COMMAND in
    format-py)
        format_python
        ;;
    lint-py)
        lint_python
        ;;
    format-js)
        format_js
        ;;
    lint-js)
        lint_js
        ;;
    format-all)
        format_all
        ;;
    lint-all)
        lint_all
        ;;
    migrate)
        run_migrations
        ;;
    make-migration)
        create_migration
        ;;
    commit)
        git_commit
        ;;
    branch)
        git_branch
        ;;
esac

exit 0
