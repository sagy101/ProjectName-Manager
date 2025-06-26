#!/bin/bash

# Setup a comprehensive mock environment for running E2E tests locally.
# This mirrors the environment created in the GitHub Actions workflow.
# Now with dynamic mock generation based on JSON configuration files.

set -e

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
parent_dir="$(dirname "$repo_root")"

# Go to parent directory to create sibling project folders
cd "$parent_dir"

echo "Creating mock project directories..."
mkdir -p ./project-a/agent \
    ./project-c/subproject-a \
    ./project-c/subproject-b \
    ./project-infrastructure \
    ./project-d \
    ./project-e \
    ./project-b
# Note: project-f is intentionally NOT created

# Create mock gradlew files
for path in \
    ./project-a/gradlew \
    ./project-c/subproject-a/gradlew \
    ./project-c/subproject-b/gradlew \
    ./project-d/gradlew
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
GOPM_HOME="${GOPM_HOME:-$repo_root/project-b}"
mkdir -p "$HOME/go/bin" "$GOPM_HOME"

# Generate dynamic mocks from JSON configuration
echo "Generating dynamic mocks from JSON configuration..."
node "$script_dir/extract-mock-commands.js" "$repo_root" | while IFS= read -r line; do
    if [[ "$line" =~ ^MOCK_COMMAND:(.*)$ ]]; then
        # Start of a new mock command
        current_command="${BASH_REMATCH[1]}"
        mock_script=""
    elif [[ "$line" == "MOCK_COMMAND_END" ]]; then
        # End of mock command - write the script
        if [ -n "$current_command" ] && [ -n "$mock_script" ]; then
            echo "$mock_script" > "./mock_bin/$current_command"
            chmod +x "./mock_bin/$current_command"
        fi
        current_command=""
        mock_script=""
    elif [[ "$line" != "# Commands extracted from JSON files:" ]]; then
        # Accumulate script content
        if [ -n "$mock_script" ]; then
            mock_script="$mock_script$line"$'\n'
        else
            mock_script="$line"$'\n'
        fi
    fi
done

# Create special nvm wrapper - use real nvm if available, otherwise use mock
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

echo "Mock environment setup complete."
echo "Add $(pwd)/mock_bin to your PATH before running E2E tests."
