#!/bin/bash

# Linting and Fixing Script for Fluxora Project (Python, JavaScript, YAML, Terraform)

set -euo pipefail # Exit on error, exit on unset variable, and fail on pipe errors

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_DIR}/code/backend"
cd "$PROJECT_DIR"

echo "----------------------------------------"
echo "Starting linting and fixing process for Fluxora..."
echo "----------------------------------------"

# --- Configuration ---
PYTHON_LINTERS="black isort flake8 pylint nbqa"
NPM_LINTERS="eslint prettier"

# Define directories to process (relative to $PROJECT_DIR)
PYTHON_DIRECTORIES=(
  "code"
  "scripts"
  "notebooks"
)

JS_DIRECTORIES=(
  "mobile-frontend"
  "web-frontend"
)

YAML_DIRECTORIES=(
  "config"
  "infrastructure"
  "tools"
  ".github/workflows"
)

TERRAFORM_DIRECTORIES=(
  "infrastructure/terraform"
)

# --- Utility Functions ---

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Resolves a Python interpreter, preferring the backend's own venv so
# linting tools don't need a global/sudo install.
backend_python() {
  if [ -x "${BACKEND_DIR}/venv/bin/python" ]; then
    echo "${BACKEND_DIR}/venv/bin/python"
  elif [ -x "${BACKEND_DIR}/.venv/bin/python" ]; then
    echo "${BACKEND_DIR}/.venv/bin/python"
  else
    command -v python3
  fi
}
PYTHON_BIN="$(backend_python)"

# Function to install Python dependencies
install_python_deps() {
  echo "Checking for Python linting tools..."
  local all_present=true
  for tool in black isort flake8 pylint nbqa; do
    if ! "$PYTHON_BIN" -m "$tool" --version &>/dev/null; then
      all_present=false
      break
    fi
  done
  if [ "$all_present" = true ]; then
    echo "Python linters appear to be installed. Skipping installation."
    return 0
  fi

  echo "Installing/Updating Python linting tools: $PYTHON_LINTERS"
  # shellcheck disable=SC2086 # intentional word-splitting: multiple package names
  "$PYTHON_BIN" -m pip install --upgrade $PYTHON_LINTERS || {
    echo "Error: Failed to install Python dependencies. Check your pip installation and permissions."
    exit 1
  }
}

# Function to install Node dependencies
install_node_deps() {
  echo "Checking for Node linting tools..."
  if command_exists npm; then
    return 0
  fi
  echo "Error: npm is required but not installed. Please install Node.js and npm."
  exit 1
}

# --- Tool Availability Checks ---

TERRAFORM_AVAILABLE=false
if command_exists terraform; then
  echo "terraform is installed."
  TERRAFORM_AVAILABLE=true
else
  echo "Warning: terraform is not installed. Terraform validation will be limited."
fi

YAMLLINT_AVAILABLE=false
if command_exists yamllint; then
  echo "yamllint is installed."
  YAMLLINT_AVAILABLE=true
else
  echo "Warning: yamllint is not installed. YAML validation will be limited."
fi

# --- Dependency Installation ---
install_python_deps
install_node_deps

# --- Linting Process ---

# 1. Python Linting
echo "----------------------------------------"
echo "Running Python linting tools..."

# 1.1 Run Black (code formatter)
echo "Running Black code formatter..."
for dir in "${PYTHON_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    echo "Formatting Python files in $dir..."
    "$PYTHON_BIN" -m black "$dir" || echo "Black encountered issues in $dir. Please review the above errors."
  else
    echo "Directory $dir not found. Skipping Black formatting for this directory."
  fi
done
echo "Black formatting completed."

# 1.2 Run isort (import sorter)
echo "Running isort to sort imports..."
for dir in "${PYTHON_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    echo "Sorting imports in Python files in $dir..."
    # --profile black keeps isort compatible with black's formatting --
    # otherwise the two disagree over import grouping/trailing commas.
    "$PYTHON_BIN" -m isort --profile black "$dir" || echo "isort encountered issues in $dir. Please review the above errors."
  else
    echo "Directory $dir not found. Skipping isort for this directory."
  fi
done
echo "Import sorting completed."

# 1.2.1 Re-run Black as a safety net in case isort's changes shifted
# anything black would otherwise have formatted differently.
echo "Re-running Black after isort..."
for dir in "${PYTHON_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    "$PYTHON_BIN" -m black "$dir" || echo "Black encountered issues in $dir. Please review the above errors."
  fi
done

# 1.3 Run flake8 (linter)
echo "Running flake8 linter..."
for dir in "${PYTHON_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    echo "Linting Python files in $dir with flake8..."
    # max-line-length matches black's default (88); flake8's own default
    # (79) flags almost every line in code that's already black-formatted.
    "$PYTHON_BIN" -m flake8 --max-line-length=88 "$dir" || echo "Flake8 found issues in $dir. Please review the above warnings/errors."
  else
    echo "Directory $dir not found. Skipping flake8 for this directory."
  fi
done
echo "Flake8 linting completed."

# 1.4 Run pylint (more comprehensive linter)
echo "Running pylint for more comprehensive linting..."
PYLINT_DISABLED_CHECKS="C0111,C0103,C0303,W0621,C0301,W0612,W0611,R0913,R0914,R0915"
for dir in "${PYTHON_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    echo "Linting Python files in $dir with pylint..."
    find "$dir" -type f -name "*.py" -print0 | xargs -0 --no-run-if-empty "$PYTHON_BIN" -m pylint --disable="$PYLINT_DISABLED_CHECKS" || echo "Pylint found issues in $dir. Please review the above warnings/errors."
  else
    echo "Directory $dir not found. Skipping pylint for this directory."
  fi
done
echo "Pylint linting completed."

# 1.5 Run linting on Jupyter notebooks
echo "Running linting on Jupyter notebooks..."
if [ -d "notebooks" ]; then
  echo "Formatting Jupyter notebooks with Black..."
  "$PYTHON_BIN" -m nbqa black notebooks || echo "Black encountered issues with notebooks. Please review the above errors."

  echo "Sorting imports in Jupyter notebooks with isort..."
  "$PYTHON_BIN" -m nbqa isort notebooks || echo "isort encountered issues with notebooks. Please review the above errors."

  echo "Linting Jupyter notebooks with flake8..."
  "$PYTHON_BIN" -m nbqa flake8 notebooks || echo "flake8 found issues in notebooks. Please review the above warnings/errors."
else
  echo "Directory notebooks not found. Skipping notebook linting."
fi
echo "Jupyter notebook linting completed."

# 2. JavaScript/TypeScript Linting
echo "----------------------------------------"
echo "Running JavaScript/TypeScript linting tools..."

# Each frontend manages its own toolchain and config (package.json,
# node_modules, .eslintrc*) -- there's no single shared root config for
# this monorepo, so we lint from *inside* each frontend directory (so npx
# resolves each one's own locally-installed eslint/prettier and config)
# rather than a repo-wide config that would only fit one of them.
# NOTE: as of this fix, web-frontend has its own working ESLint config;
# mobile-frontend does not yet, so its ESLint step is skipped below rather
# than failing or being pointed at a mismatched/auto-generated config.

# 2.1 Run ESLint
echo "Running ESLint for JavaScript/TypeScript files..."
for dir in "${JS_DIRECTORIES[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "Directory $dir not found. Skipping ESLint for this directory."
    continue
  fi
  if [ ! -d "$dir/node_modules" ]; then
    echo "$dir has no node_modules (run npm install there first). Skipping ESLint."
    continue
  fi
  if ! ls "$dir"/.eslintrc* &>/dev/null && [ ! -f "$dir/eslint.config.js" ]; then
    echo "$dir has no ESLint config. Skipping ESLint for this directory."
    continue
  fi

  echo "Linting JavaScript/TypeScript files in $dir with ESLint..."
  (cd "$dir" && npx eslint src --ext .js,.jsx,.ts,.tsx --fix) || echo "ESLint found issues in $dir. Please review the above warnings/errors."
done
echo "ESLint linting completed."

# 2.2 Run Prettier
echo "Running Prettier for JavaScript/TypeScript files..."
for dir in "${JS_DIRECTORIES[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "Directory $dir not found. Skipping Prettier for this directory."
    continue
  fi
  if [ ! -d "$dir/node_modules" ]; then
    echo "$dir has no node_modules (run npm install there first). Skipping Prettier."
    continue
  fi

  echo "Formatting JavaScript/TypeScript files in $dir with Prettier..."
  (cd "$dir" && npx prettier --write "src/**/*.{js,jsx,ts,tsx}") || echo "Prettier encountered issues in $dir. Please review the above errors."
done
echo "Prettier formatting completed."

# 3. YAML Linting
echo "----------------------------------------"
echo "Running YAML linting tools..."

# 3.1 Run yamllint if available
if [ "$YAMLLINT_AVAILABLE" = true ]; then
  echo "Running yamllint for YAML files..."
  for dir in "${YAML_DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
      echo "Linting YAML files in $dir with yamllint..."
      yamllint "$dir" || echo "yamllint found issues in $dir. Please review the above warnings/errors."
    else
      echo "Directory $dir not found. Skipping yamllint for this directory."
    fi
  done
  echo "yamllint completed."
else
  echo "Skipping yamllint (not installed)."

  # 3.2 Basic YAML validation using Python
  echo "Performing basic YAML validation using Python..."
  if ! "$PYTHON_BIN" -c "import yaml" 2>/dev/null; then
    "$PYTHON_BIN" -m pip install --upgrade pyyaml
  fi

  for dir in "${YAML_DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
      echo "Validating YAML files in $dir..."
      # safe_load_all (not safe_load) because Kubernetes-style manifests
      # commonly use `---`-separated multi-document YAML streams; safe_load
      # alone raises a false-positive "expected a single document" error
      # on every one of those perfectly valid files.
      find "$dir" -type f \( -name "*.yaml" -o -name "*.yml" \) -exec "$PYTHON_BIN" -c "import yaml,sys; list(yaml.safe_load_all(open(sys.argv[1])))" {} \; || echo "YAML validation found issues in $dir. Please review the above errors."
    else
      echo "Directory $dir not found. Skipping YAML validation for this directory."
    fi
  done
  echo "Basic YAML validation completed."
fi

# 4. Terraform Linting
echo "----------------------------------------"
echo "Running Terraform linting tools..."

if [ "$TERRAFORM_AVAILABLE" = true ]; then
  echo "Running terraform fmt for Terraform files..."
  for dir in "${TERRAFORM_DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
      echo "Formatting Terraform files in $dir..."
      terraform fmt -recursive "$dir" || echo "terraform fmt encountered issues in $dir. Please review the above errors."
    else
      echo "Directory $dir not found. Skipping terraform fmt for this directory."
    fi
  done
  echo "terraform fmt completed."

  echo "Running terraform validate for Terraform files..."
  for dir in "${TERRAFORM_DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
      echo "Validating Terraform files in $dir..."
      (cd "$dir" && terraform init -backend=false && terraform validate) || echo "terraform validate encountered issues in $dir. Please review the above errors."
    else
      echo "Directory $dir not found. Skipping terraform validate for this directory."
    fi
  done
  echo "terraform validate completed."
else
  echo "Skipping Terraform linting (terraform not installed)."
fi

# 5. Common Fixes for All File Types
echo "----------------------------------------"
echo "Applying common fixes to all file types..."

# Bug fix: the original built this find expression by gluing together a
# single quoted string ("*/node_modules/* -not -path */venv/* -not -path
# */dist/*") and passing the WHOLE thing as one argument to a single
# `-not -path`. find matched that literal (nonsensical) string instead of
# excluding node_modules/venv/dist, so those directories were never
# actually excluded from the trailing-whitespace/newline fixes below.
# Using real arrays for both the name patterns and the exclusions avoids
# that, and avoids unquoted-variable word-splitting/glob-expansion risk.
FILE_NAME_ARGS=(
  -name "*.py" -o -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx"
  -o -name "*.yaml" -o -name "*.yml" -o -name "*.tf" -o -name "*.tfvars"
)
EXCLUDE_ARGS=(
  -not -path "*/node_modules/*"
  -not -path "*/venv/*"
  -not -path "*/.venv/*"
  -not -path "*/dist/*"
  -not -path "*/.git/*"
  -not -path "*/htmlcov/*"
  -not -path "*/.pytest_cache/*"
)

# 5.1 Fix trailing whitespace
echo "Fixing trailing whitespace..."
find . -type f \( "${FILE_NAME_ARGS[@]}" \) "${EXCLUDE_ARGS[@]}" -exec sed -i 's/[ \t]*$//' {} \;
echo "Fixed trailing whitespace."

# 5.2 Ensure newline at end of file
echo "Ensuring newline at end of files..."
find . -type f \( "${FILE_NAME_ARGS[@]}" \) "${EXCLUDE_ARGS[@]}" -exec sh -c '[ -n "$(tail -c1 "$1")" ] && echo "" >> "$1"' sh {} \;
echo "Ensured newline at end of files."

echo "----------------------------------------"
echo "Linting and fixing process for Fluxora completed!"
echo "----------------------------------------"
