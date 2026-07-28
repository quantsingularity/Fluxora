#!/bin/bash

# test_api.sh (a.k.a. the API tester)
# Tests API endpoints and generates example requests for Fluxora
#
# This script:
# - Tests API connectivity
# - Generates example API requests for common operations
# - Validates API responses
# - Creates a collection of example requests
#
# Talks to the real Fluxora API (see code/backend/app/api/v1/*.py):
#   POST /v1/auth/register, POST /v1/auth/token (form-urlencoded),
#   GET/POST /v1/data/, GET /v1/analytics/summary, GET /v1/predictions/

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
API_HOST="localhost"
API_PORT="8000"
API_BASE_URL="http://${API_HOST}:${API_PORT}"
OUTPUT_DIR="${SCRIPT_DIR}/api_examples"
TEST_EMAIL="apitester@example.com"
TEST_PASSWORD="test-password-123"
VERBOSE=false

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

# Function to print verbose messages
print_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "$1"
    fi
}

# Function to check if curl is installed
check_curl() {
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed"
        print_warning "Please install curl to use this script"
        exit 1
    fi
}

# Extracts a JSON field's string/number value from a response body without
# requiring a JSON parser to be installed (jq is not a project dependency).
json_field() {
    local json="$1"
    local field="$2"
    echo "$json" | grep -o "\"${field}\":[^,}]*" | head -1 | sed -E 's/^"[^"]+":\s*"?//; s/"?$//'
}

# Function to check if API is running
check_api() {
    print_section "Checking API Availability"

    print_warning "Testing connection to API at ${API_BASE_URL}..."

    if curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/health" | grep -q "200"; then
        print_success "API is running and healthy"
        return 0
    else
        print_error "API is not available at ${API_BASE_URL}"
        print_warning "Make sure the API server is running (use start_services.sh)"
        return 1
    fi
}

# Function to ensure output directory exists
ensure_output_dir() {
    if [ ! -d "$OUTPUT_DIR" ]; then
        print_warning "Creating output directory: ${OUTPUT_DIR}"
        mkdir -p "$OUTPUT_DIR"
    fi
}

# Function to register (if needed) and authenticate, returning the access token
get_auth_token() {
    print_section "Authenticating" >&2

    print_warning "Registering ${TEST_EMAIL} (if not already registered)..." >&2
    local register_response
    register_response=$(curl -s -X POST "${API_BASE_URL}/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"${TEST_PASSWORD}\"}")
    print_verbose "Register response: $register_response" >&2

    print_warning "Requesting an access token for ${TEST_EMAIL}..." >&2

    # The real login endpoint is OAuth2's standard password flow: a
    # form-urlencoded body (not JSON), with the email in a field literally
    # named "username" -- see app/api/v1/auth.py::login_for_access_token.
    local response
    response=$(curl -s -X POST "${API_BASE_URL}/v1/auth/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        --data-urlencode "username=${TEST_EMAIL}" \
        --data-urlencode "password=${TEST_PASSWORD}")

    print_verbose "Token response: $response" >&2

    # The real response has "access_token" / "refresh_token" / "token_type"
    # fields -- there is no field simply named "token".
    local token
    token=$(json_field "$response" "access_token")

    if [ -n "$token" ]; then
        print_success "Access token obtained" >&2

        cat > "${OUTPUT_DIR}/auth_example.sh" << EOF
#!/bin/bash
# Example: Register, then authenticate and get an access token

curl -X POST "${API_BASE_URL}/v1/auth/register" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com", "password": "a-secure-password"}'

curl -X POST "${API_BASE_URL}/v1/auth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  --data-urlencode "username=you@example.com" \\
  --data-urlencode "password=a-secure-password"
# => {"access_token": "...", "refresh_token": "...", "token_type": "bearer"}
EOF
        chmod +x "${OUTPUT_DIR}/auth_example.sh"

        echo "$token"
        return 0
    else
        print_error "Failed to obtain an access token" >&2
        return 1
    fi
}

# Function to test the data endpoints (create + list)
test_data_endpoints() {
    print_section "Testing Data Endpoints"

    local token=$1

    print_warning "Creating an energy data record..."
    local create_response
    create_response=$(curl -s -X POST "${API_BASE_URL}/v1/data/" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${token}" \
        -d '{
            "consumption_kwh": 12.5,
            "cost_usd": 1.5,
            "temperature_c": 21.0,
            "humidity_percent": 45.0
        }')
    print_verbose "Response: $create_response"

    if echo "$create_response" | grep -q '"consumption_kwh"'; then
        print_success "Data record created successfully"
    else
        print_error "Failed to create data record"
        return 1
    fi

    print_warning "Listing energy data records..."
    local list_response
    list_response=$(curl -s -X GET "${API_BASE_URL}/v1/data/?limit=10" \
        -H "Authorization: Bearer ${token}")
    print_verbose "Response: $list_response"

    if echo "$list_response" | grep -q '"consumption_kwh"'; then
        print_success "Data listing successful"
    else
        print_error "Data listing failed"
        return 1
    fi

    cat > "${OUTPUT_DIR}/data_example.sh" << EOF
#!/bin/bash
# Example: Create and list energy data records
# Requires: export API_TOKEN="<access_token from auth_example.sh>"

curl -X POST "${API_BASE_URL}/v1/data/" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \$API_TOKEN" \\
  -d '{
    "consumption_kwh": 12.5,
    "cost_usd": 1.5,
    "temperature_c": 21.0,
    "humidity_percent": 45.0
  }'

curl -X GET "${API_BASE_URL}/v1/data/?limit=10" \\
  -H "Authorization: Bearer \$API_TOKEN"

# Query a specific time range:
curl -X GET "${API_BASE_URL}/v1/data/query?start_time=2026-01-01T00:00:00&end_time=2026-12-31T23:59:59" \\
  -H "Authorization: Bearer \$API_TOKEN"
EOF
    chmod +x "${OUTPUT_DIR}/data_example.sh"

    return 0
}

# Function to test the analytics endpoint
test_analytics() {
    print_section "Testing Analytics Endpoint"

    local token=$1

    print_warning "Requesting analytics summary..."
    local response
    response=$(curl -s -X GET "${API_BASE_URL}/v1/analytics/summary" \
        -H "Authorization: Bearer ${token}")
    print_verbose "Response: $response"

    if echo "$response" | grep -q '"total_consumption_kwh"'; then
        print_success "Analytics summary request successful"
    else
        print_error "Analytics summary request failed"
        return 1
    fi

    cat > "${OUTPUT_DIR}/analytics_example.sh" << EOF
#!/bin/bash
# Example: Fetch analytics
# Requires: export API_TOKEN="<access_token from auth_example.sh>"

curl -X GET "${API_BASE_URL}/v1/analytics/summary" \\
  -H "Authorization: Bearer \$API_TOKEN"

curl -X GET "${API_BASE_URL}/v1/analytics/?period=month" \\
  -H "Authorization: Bearer \$API_TOKEN"
EOF
    chmod +x "${OUTPUT_DIR}/analytics_example.sh"

    return 0
}

# Function to test the prediction endpoint
test_prediction() {
    print_section "Testing Prediction Endpoint"

    local token=$1

    print_warning "Requesting a 3-day forecast..."

    # The real prediction endpoint is a GET with a `days` query parameter
    # (not a POST with a meter_id/historical_load body -- there is no
    # per-meter concept anywhere in this API).
    local response
    response=$(curl -s -X GET "${API_BASE_URL}/v1/predictions/?days=3" \
        -H "Authorization: Bearer ${token}")

    print_verbose "Response: $response"

    if echo "$response" | grep -q '"predicted_consumption"'; then
        print_success "Prediction request successful"

        cat > "${OUTPUT_DIR}/prediction_example.sh" << EOF
#!/bin/bash
# Example: Get a forecast
# Requires: export API_TOKEN="<access_token from auth_example.sh>"

curl -X GET "${API_BASE_URL}/v1/predictions/?days=7" \\
  -H "Authorization: Bearer \$API_TOKEN"

# Admins only -- (re)trains the forecasting model on the current database:
# curl -X POST "${API_BASE_URL}/v1/predictions/train" \\
#   -H "Authorization: Bearer \$API_TOKEN"
EOF
        chmod +x "${OUTPUT_DIR}/prediction_example.sh"

        return 0
    else
        print_error "Prediction request failed"
        return 1
    fi
}

# Function to create a README file with API documentation
create_api_readme() {
    print_section "Creating API Documentation"

    cat > "${OUTPUT_DIR}/README.md" << 'EOF'
# Fluxora API Examples

This directory contains example scripts for interacting with the real
Fluxora API. See `code/backend/app/api/v1/*.py` for the source of truth.

## Authentication

```bash
./auth_example.sh
```

Registers a demo account (harmless if it already exists) and requests an
access token. Note the login step uses a **form-urlencoded** body (OAuth2
password flow), not JSON, and the field is named `username` even though
its value is an email address. Save the printed `access_token` value:

```bash
export API_TOKEN="the-access-token-value"
```

Tokens expire -- use `POST /v1/auth/refresh` with your `refresh_token` to
get a new pair without logging in again.

## Managing Energy Data

```bash
./data_example.sh
```

Creates and lists energy readings via `/v1/data/`.

## Analytics

```bash
./analytics_example.sh
```

Fetches consumption/cost/efficiency rollups via `/v1/analytics/`.

## Predictions

```bash
./prediction_example.sh
```

Fetches a consumption forecast via `/v1/predictions/`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /health | GET | Check API health status |
| /v1/auth/register | POST | Create an account |
| /v1/auth/token | POST | Obtain an access/refresh token pair (form-urlencoded) |
| /v1/auth/refresh | POST | Exchange a refresh token for a new pair |
| /v1/auth/me | GET/PATCH/DELETE | View, update, or delete your own account |
| /v1/data/ | GET/POST | List or create energy readings |
| /v1/data/{id} | GET/PATCH/DELETE | Read, update, or delete one reading |
| /v1/data/query | GET | Query readings within a time range |
| /v1/analytics/ | GET | Consumption/cost/efficiency rollups (`?period=week|month|year`) |
| /v1/analytics/summary | GET | Overall summary stats |
| /v1/predictions/ | GET | Forecast future consumption (`?days=N`) |
| /v1/predictions/train | POST | (Re)train the forecasting model (admin only) |
| /v1/users/ | GET | List all accounts (admin only) |

## Request Headers

- `Content-Type: application/json` for JSON bodies (everything except login)
- `Authorization: Bearer <access_token>` on every authenticated request
EOF

    print_success "API documentation created at ${OUTPUT_DIR}/README.md"
}

# Function to run all tests
run_all_tests() {
    print_section "Running All API Tests"

    # Check if API is available
    if ! check_api; then
        return 1
    fi

    # Ensure output directory exists
    ensure_output_dir

    # Get authentication token
    local token
    token=$(get_auth_token)
    if [ -z "$token" ]; then
        return 1
    fi

    # Test data, analytics, and prediction endpoints
    test_data_endpoints "$token"
    test_analytics "$token"
    test_prediction "$token"

    # Create API documentation
    create_api_readme

    print_section "API Testing Complete"
    print_success "All API examples have been generated in ${OUTPUT_DIR}"

    echo -e "\nTo use these examples:"
    echo "1. Start the Fluxora API server (if not already running)"
    echo "2. Navigate to ${OUTPUT_DIR}"
    echo "3. Run the example scripts as described in README.md"
}

# Function to display help message
show_help() {
    echo "API Tester for Fluxora"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help         Show this help message"
    echo "  -H, --host         Specify API host (default: localhost)"
    echo "  -p, --port         Specify API port (default: 8000)"
    echo "  -o, --output       Specify output directory for examples (default: scripts/api_examples)"
    echo "  -v, --verbose      Enable verbose output"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run all tests with default settings"
    echo "  $0 -H api.example.com -p 443 # Test API at api.example.com:443"
    echo "  $0 -o ~/fluxora/api_examples # Save examples to specified directory"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -H|--host)
            API_HOST="$2"
            API_BASE_URL="http://${API_HOST}:${API_PORT}"
            shift 2
            ;;
        -p|--port)
            API_PORT="$2"
            API_BASE_URL="http://${API_HOST}:${API_PORT}"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if curl is installed
check_curl

# Run all tests
run_all_tests

exit 0
