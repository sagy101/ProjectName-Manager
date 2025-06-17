#!/bin/bash

# Setup a comprehensive mock environment for running E2E tests locally.
# This mirrors the environment created in the GitHub Actions workflow.

set -e

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
parent_dir="$(dirname "$repo_root")"

# Go to parent directory to create sibling project folders
cd "$parent_dir"

echo "Creating mock project directories..."
mkdir -p ./weblifemirror/agent \
    ./threatintelligence/threat-intelligence \
    ./threatintelligence/url-intelligence \
    ./infrastructure \
    ./activity-logger \
    ./rule-engine \
    ./gopm
# Note: test-analytics is intentionally NOT created

# Create mock gradlew files
for path in \
    ./weblifemirror/gradlew \
    ./threatintelligence/threat-intelligence/gradlew \
    ./threatintelligence/url-intelligence/gradlew \
    ./activity-logger/gradlew
do
    touch "$path"
    chmod +x "$path"
done

# Return to repository root
cd "$repo_root"

# Create mock bin directory and add to PATH when GITHUB_PATH is set
mkdir -p ./mock_bin
if [ -n "$GITHUB_PATH" ]; then
  echo "$(pwd)/mock_bin" >> "$GITHUB_PATH"
fi

# Create Go environment directories
GOPM_HOME="${GOPM_HOME:-$repo_root/gopm}"
mkdir -p "$HOME/go/bin" "$GOPM_HOME"

# Helper to create simple mock executables
create_mock() {
    local file=$1
    shift
    printf '#!/bin/bash\n%s\n' "$*" > "./mock_bin/$file"
    chmod +x "./mock_bin/$file"
}

create_mock gcloud 'echo "Google Cloud SDK 450.0.0"'
create_mock kubectl 'echo "Client Version: v1.28.4"'
create_mock kubectx 'echo "mock-context"'
create_mock docker 'if [[ "$1" == "info" && "$2" == "--format" ]]; then
  echo "24.0.7"
elif [[ "$1" == "ps" ]]; then
  echo "CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS   NAMES"
else
  echo "Docker version 24.0.7, build afdd53b"
fi'
create_mock go 'echo "go version go1.21.4 linux/amd64"'
create_mock java 'echo "openjdk version \"17.0.8\" 2023-07-18" >&2'
create_mock brew 'echo "Homebrew 4.1.20"'
create_mock rdctl 'echo "rdctl version 1.10.1"'
create_mock chromium 'echo "Chromium 125.0.6422.141"'

# nvm wrapper - use real nvm if available
cat > ./mock_bin/nvm <<'NVMEOF'
#!/bin/bash
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
  nvm "$@"
else
  if [[ "$1" == "--version" ]]; then
    echo "0.39.7"
  elif [[ "$1" == "ls" ]]; then
    echo "       v15.5.1"
    echo "->     v22.16.0"
    echo "default -> 22.16.0 (-> v22.16.0)"
  else
    echo "Node Version Manager (v0.39.7)"
  fi
fi
NVMEOF
chmod +x ./mock_bin/nvm

echo "Mock environment setup complete.\nAdd $(pwd)/mock_bin to your PATH before running E2E tests."
