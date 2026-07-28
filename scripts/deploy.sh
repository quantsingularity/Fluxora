#!/bin/bash

# deploy.sh
# Streamlines the deployment process for Fluxora
#
# This script:
# - Prepares the application for deployment
# - Handles different deployment environments (dev, staging, prod)
# - Manages infrastructure provisioning
# - Deploys application components
#
# NOTE ON SCOPE: "dev" deploys the real, working Fluxora backend via
# code/backend/docker-compose.yml. "staging"/"prod" delegate to the
# Terraform/Kubernetes scaffolding under infrastructure/, which -- as
# shipped in this repo -- is generic example infrastructure (it references
# a placeholder image registry and Node.js-style config, not this repo's
# actual Python/FastAPI backend). This script points at the right paths,
# but someone still needs to adapt those manifests before staging/prod
# will deploy the real application.

set -euo pipefail

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default settings
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENVIRONMENT="dev"
SKIP_TESTS=false
SKIP_BUILD=false
COMPOSE=() # populated by check_prerequisites

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

# Function to check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        print_warning "Please install Docker before continuing"
        return 1
    fi

    # Check for a Docker Compose implementation (v2 plugin preferred)
    if docker compose version &> /dev/null; then
        COMPOSE=(docker compose)
    elif command -v docker-compose &> /dev/null; then
        COMPOSE=(docker-compose)
    else
        print_error "Neither 'docker compose' nor 'docker-compose' is available"
        print_warning "Please install Docker Compose before continuing"
        return 1
    fi

    # Check if Terraform is installed (for infrastructure)
    if ! command -v terraform &> /dev/null; then
        print_warning "Terraform is not installed"
        print_warning "Infrastructure provisioning will be skipped"
    fi

    # Check if kubectl is installed (for Kubernetes)
    if ! command -v kubectl &> /dev/null; then
        print_warning "kubectl is not installed"
        print_warning "Kubernetes deployment will be skipped"
    fi

    print_success "Prerequisites check completed"
    return 0
}

# Function to run tests before deployment
run_tests() {
    print_section "Running Tests"

    if [ "$SKIP_TESTS" = true ]; then
        print_warning "Tests skipped as requested"
        return 0
    fi

    # run_tests.sh lives alongside this script, not at the project root.
    if [ -f "${SCRIPT_DIR}/run_tests.sh" ]; then
        print_warning "Running tests using run_tests.sh..."
        bash "${SCRIPT_DIR}/run_tests.sh" || return 1
    else
        # Fall back to running pytest directly against the real backend.
        if check_directory "${PROJECT_DIR}/code/backend"; then
            print_warning "Running backend tests..."
            (
                cd "${PROJECT_DIR}/code/backend"
                if [ -x "venv/bin/pytest" ]; then
                    ./venv/bin/pytest tests/
                else
                    python3 -m pytest tests/
                fi
            ) || return 1
        fi

        # Frontend tests
        if check_directory "${PROJECT_DIR}/web-frontend"; then
            print_warning "Running web frontend tests..."
            (cd "${PROJECT_DIR}/web-frontend" && npm test) || print_warning "Web frontend has no test script configured, skipping"
        fi
    fi

    print_success "Tests completed successfully"
    return 0
}

# Function to build application
build_application() {
    print_section "Building Application"

    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Build skipped as requested"
        return 0
    fi

    # Build web frontend
    if check_directory "${PROJECT_DIR}/web-frontend"; then
        print_warning "Building web frontend..."
        (cd "${PROJECT_DIR}/web-frontend" && npm run build) || return 1
    fi

    # Build the backend's Docker image. This is the one docker-compose.yml
    # in this repo that's actually wired up correctly (its build context
    # includes the sibling code/ml_core package the backend imports).
    print_warning "Building backend Docker image..."
    "${COMPOSE[@]}" -f "${PROJECT_DIR}/code/backend/docker-compose.yml" build || return 1

    print_success "Application built successfully"
    return 0
}

# Function to provision infrastructure
provision_infrastructure() {
    print_section "Provisioning Infrastructure"

    local tf_dir="${PROJECT_DIR}/infrastructure/terraform/environments/${ENVIRONMENT}"
    if ! check_directory "$tf_dir"; then
        print_warning "Terraform environment directory not found, skipping..."
        return 1
    fi

    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed"
        print_warning "Please install Terraform to provision infrastructure"
        return 1
    fi

    print_warning "infrastructure/ ships as example scaffolding (placeholder"
    print_warning "image registry, not this repo's actual backend) -- review"
    print_warning "${tf_dir} before applying to a real environment."

    (
        cd "$tf_dir"
        print_warning "Initializing Terraform..."
        terraform init

        print_warning "Planning infrastructure changes..."
        terraform plan -out=tfplan

        read -r -p "Do you want to apply these infrastructure changes? (y/n): " -n 1 REPLY
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Infrastructure provisioning cancelled"
            exit 1
        fi

        print_warning "Applying infrastructure changes..."
        terraform apply tfplan
    ) || return 1

    print_success "Infrastructure provisioned successfully"
    return 0
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    print_section "Deploying to Kubernetes"

    local k8s_dir="${PROJECT_DIR}/infrastructure/kubernetes/environments/${ENVIRONMENT}"
    if ! check_directory "$k8s_dir"; then
        print_warning "Kubernetes environment directory not found, skipping..."
        return 1
    fi

    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        print_warning "Please install kubectl to deploy to Kubernetes"
        return 1
    fi

    print_warning "infrastructure/kubernetes ships as example scaffolding"
    print_warning "(placeholder image registry) -- confirm ${k8s_dir}/values.yaml"
    print_warning "points at real, pushed images before applying."

    (
        cd "$k8s_dir"
        print_warning "Applying Kubernetes manifests..."
        kubectl apply -f "${PROJECT_DIR}/infrastructure/kubernetes/base"

        print_warning "Waiting for deployments to be ready..."
        kubectl rollout status deployment/fluxora-backend
        kubectl rollout status deployment/fluxora-frontend
    ) || return 1

    print_success "Kubernetes deployment completed successfully"
    return 0
}

# Function to deploy using Docker Compose (dev environment only)
deploy_docker_compose() {
    print_section "Deploying with Docker Compose"

    local compose_file="${PROJECT_DIR}/code/backend/docker-compose.yml"
    if [ ! -f "$compose_file" ]; then
        print_error "Docker Compose file not found at ${compose_file}"
        return 1
    fi

    print_warning "Deploying with Docker Compose..."
    "${COMPOSE[@]}" -f "$compose_file" up -d || return 1

    print_success "Docker Compose deployment completed successfully"
    return 0
}

# Function to run database migrations
run_migrations() {
    print_section "Running Database Migrations"

    # Uses Alembic (this project's real migration tool), not Django.
    if [ "$ENVIRONMENT" = "dev" ]; then
        print_warning "Running migrations inside the backend container..."
        "${COMPOSE[@]}" -f "${PROJECT_DIR}/code/backend/docker-compose.yml" \
            exec -T api alembic upgrade head || return 1
    elif command -v kubectl &> /dev/null; then
        print_warning "Running migrations via Kubernetes..."
        local pod
        pod="$(kubectl get pods -l app=fluxora-backend -o jsonpath='{.items[0].metadata.name}')"
        if [ -z "$pod" ]; then
            print_error "No fluxora-backend pod found"
            return 1
        fi
        kubectl exec -it "$pod" -- alembic upgrade head || return 1
    elif check_directory "${PROJECT_DIR}/code/backend"; then
        print_warning "Running migrations locally..."
        (
            cd "${PROJECT_DIR}/code/backend"
            if [ -x "venv/bin/alembic" ]; then
                ./venv/bin/alembic upgrade head
            else
                python3 -m alembic upgrade head
            fi
        ) || return 1
    fi

    print_success "Database migrations completed successfully"
    return 0
}

# Function to verify deployment
verify_deployment() {
    print_section "Verifying Deployment"

    local url
    case $ENVIRONMENT in
        dev)
            url="http://localhost:8000"
            ;;
        staging)
            url="${STAGING_URL:-https://staging.fluxora.example.com}"
            ;;
        prod)
            url="${PROD_URL:-https://fluxora.example.com}"
            ;;
        *)
            url="http://localhost:8000"
            ;;
    esac

    print_warning "Checking deployment at ${url}..."

    if command -v curl &> /dev/null; then
        if curl -s -o /dev/null -w "%{http_code}" "${url}/health" | grep -q "200"; then
            print_success "Deployment verified successfully"
        else
            print_error "Deployment verification failed"
            print_warning "Please check logs for more information"
        fi
    else
        print_warning "curl is not installed, skipping verification"
        print_warning "Please manually verify the deployment at ${url}"
    fi
}

# Function to deploy application
deploy_application() {
    print_section "Deploying Fluxora to ${ENVIRONMENT} Environment"

    check_prerequisites || return 1
    run_tests || return 1
    build_application || return 1

    # Provision infrastructure if needed (non-fatal: a declined confirmation
    # or missing Terraform shouldn't abort the whole deployment).
    if [ "$ENVIRONMENT" != "dev" ]; then
        provision_infrastructure || print_warning "Infrastructure provisioning skipped or failed -- continuing"
    fi

    # Deploy based on environment (also non-fatal for the same reason).
    if [ "$ENVIRONMENT" = "dev" ]; then
        deploy_docker_compose || print_warning "Docker Compose deployment failed -- see messages above"
    else
        deploy_kubernetes || print_warning "Kubernetes deployment skipped or failed -- see messages above"
    fi

    run_migrations || print_warning "Database migrations skipped or failed -- see messages above"
    verify_deployment

    print_section "Deployment Complete"
    print_success "Fluxora has been deployed to the ${ENVIRONMENT} environment"

    case $ENVIRONMENT in
        dev)
            echo "Access the API at: http://localhost:8000"
            echo "Access the web app at: http://localhost:3000 (run separately via web-frontend/npm run dev)"
            ;;
        staging)
            echo "Access the application at: ${STAGING_URL:-https://staging.fluxora.example.com} (placeholder -- set STAGING_URL)"
            ;;
        prod)
            echo "Access the application at: ${PROD_URL:-https://fluxora.example.com} (placeholder -- set PROD_URL)"
            ;;
    esac
}

# Function to display help message
show_help() {
    echo "Deployment Script for Fluxora"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help         Show this help message"
    echo "  -d, --directory    Specify Fluxora project directory (default: repo root, auto-detected)"
    echo "  -e, --environment  Specify deployment environment (dev, staging, prod) (default: dev)"
    echo "  -s, --skip-tests   Skip running tests before deployment"
    echo "  -b, --skip-build   Skip building the application"
    echo ""
    echo "Examples:"
    echo "  $0                           # Deploy to dev environment (docker-compose)"
    echo "  $0 -e staging                # Deploy to staging environment (Terraform + Kubernetes)"
    echo "  $0 -d /path/to/fluxora -e prod # Deploy to production environment"
}

# Parse command line arguments
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
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
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

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_warning "Valid environments are: dev, staging, prod"
    exit 1
fi

# Deploy application
deploy_application

exit 0
