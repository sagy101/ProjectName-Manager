# Verification Types Reference

> Comprehensive reference for all verification types in {ProjectName} Manager's environment verification system

## Overview

This document provides a complete reference for all verification types supported by {ProjectName} Manager. Verifications are checks that validate the presence and configuration of tools, paths, environment variables, and other dependencies required for your development environment.

### Key Features

- **Multiple Check Types**: Command success, output validation, path existence, environment variables
- **Auto-Fix Commands**: One-click remediation for failed verifications
- **Category Organization**: Group related verifications together
- **Dynamic Environment Selection**: Header dropdowns for environment configuration

For a higher-level overview of the verification system, see the [System Architecture](architecture-details.md#environment-verification-system) document.

## Verification Structure

All verifications share a common base structure:

```json
{
  "id": "uniqueIdentifier",
  "title": "Human-readable description",
  "checkType": "verificationType",
  "fixCommand": "command to fix this verification (optional)"
  // Additional properties based on checkType
}
```

**Common Properties:**
- `id` (string, required): Unique identifier for the verification
- `title` (string, required): Human-readable description shown in the UI
- `checkType` (string, required): Type of verification to perform
- `fixCommand` (string, optional): Command to automatically fix failed verifications

## File Structure

The `generalEnvironmentVerifications.json` file now supports an optional header configuration:

```json
{
  "header": {
    "title": "General Environment",
    "dropdownSelectors": [
      {
        "id": "gcloudProject",
        "command": "gcloud projects list --format=\"value(projectId)\"",
        "parseResponse": "lines",
        "placeholder": "Select project...",
        "loadingText": "Loading projects...",
        "errorText": "Error loading projects",
        "noOptionsText": "No projects found"
      }
    ]
  },
  "categories": [
    {
      "category": {
        "title": "Category Name",
        "verifications": [
          // Verification objects
        ]
      }
    }
  ]
}
```

**Header Configuration**:
- `header` (optional): Configures the environment section header
  - `title`: Display title for the environment section
  - `dropdownSelectors`: Array of dropdown selector configurations for global environment settings

For detailed information about dropdown selectors, see the [Configuration Guide](configuration-guide.md#dropdown-selectors).

## Verification Types

### 1. Command Success (`commandSuccess`)

Checks if a command executes successfully (exit code 0).

**Properties:**
- `command` (string, required): Command to execute

**Example:**
```json
{
  "id": "nodeInstalled",
  "title": "Node.js installed",
  "checkType": "commandSuccess",
  "command": "node --version"
}
```

**Use Cases:**
- Checking if tools are installed and accessible
- Verifying basic command availability
- Testing simple command execution

### 2. Output Contains (`outputContains`)

Verifies that command output contains specific text. This check is highly flexible and supports both single string and array values for `expectedValue`.

**Properties:**
- `command` (string, required): Command to execute
- `expectedValue` (string or array of strings, optional): The text to find in the output.
  - **As a string:** Checks if this exact string is present.
  - **As an array:** Checks if *any* of the strings in the array are present. This is ideal for dynamic version checking.
  - If empty or not provided: Checks for any non-empty output.
- `outputStream` (string, optional): Which output stream to check (`"stdout"`, `"stderr"`, or `"any"`).
- `versionId` (string, optional): When using an array for `expectedValue`, the first matched value will be captured and stored with this ID for use in command generation (e.g., `${nodeVersion}`).

**Examples:**

**Basic String Check:**
```json
{
  "id": "gcloudVersionCheck",
  "title": "gcloud CLI Installed",
  "checkType": "outputContains",
  "command": "gcloud --version",
  "expectedValue": "Google Cloud SDK"
}
```

**Dynamic Version Checking with an Array:**
```json
{
  "id": "nodeVersionCheck",
  "title": "Node.js (15 or 16)",
  "checkType": "outputContains",
  "command": "nvm ls",
  "expectedValue": ["v15.", "v16."],
  "versionId": "nodeVersion"
}
```
*In this example, if `nvm ls` finds `v18.`, that value will be stored as `nodeVersion` and can be used in commands like `nvm use ${nodeVersion}`.*

**Java Version Check (stderr):**
```json
{
  "id": "javaVersion",
  "title": "Java 17 installed",
  "checkType": "outputContains",
  "command": "java -version",
  "expectedValue": "openjdk version \"17.",
  "outputStream": "stderr"
}
```

**Use Cases:**
- Verifying specific tool versions
- Checking if a tool is installed (any output)
- Checking configuration output
- Validating command responses

### 3. Environment Variable Exists (`envVarExists`)

Checks if an environment variable is set (has any value).

**Properties:**
- `variableName` (string, required): Name of the environment variable

**Example:**
```json
{
  "id": "homeSet",
  "title": "$HOME environment variable set",
  "checkType": "envVarExists",
  "variableName": "HOME"
}
```

**Use Cases:**
- Verifying required environment variables are set
- Checking shell configuration
- Validating development environment setup

### 4. Environment Variable Equals (`envVarEquals`)

Checks if an environment variable has a specific value.

**Properties:**
- `variableName` (string, required): Name of the environment variable
- `expectedValue` (string, required): Expected value of the variable

**Example:**
```json
{
  "id": "nodeEnv",
  "title": "NODE_ENV set to development",
  "checkType": "envVarEquals",
  "variableName": "NODE_ENV",
  "expectedValue": "development"
}
```

**Use Cases:**
- Verifying specific environment configurations
- Checking deployment environment settings
- Validating configuration values

### 5. Path Exists (`pathExists`)

Checks if a file or directory exists at the specified path.

**Properties:**
- `pathValue` (string, required): Path to check (supports environment variable substitution)
- `pathType` (string, optional): Type of path to expect
  - `"directory"`: Must be a directory
  - `"file"`: Must be a file
  - If not specified: Can be either file or directory

**Environment Variable Substitution:**
- `$HOME`: User's home directory
- `$GOPATH`: Go workspace path (if set)

**Examples:**

**Directory check:**
```json
{
  "id": "projectDir",
  "title": "./frontend directory exists",
  "checkType": "pathExists",
  "pathValue": "./frontend",
  "pathType": "directory"
}
```

**File check:**
```json
{
  "id": "gradlewExists",
  "title": "gradlew exists",
  "checkType": "pathExists",
  "pathValue": "./gradlew",
  "pathType": "file"
}
```

**File check with environment variable:**
```json
{
  "id": "bashProfile",
  "title": "Bash profile exists",
  "checkType": "pathExists",
  "pathValue": "$HOME/.bash_profile",
  "pathType": "file"
}
```

**Any path type:**
```json
{
  "id": "configExists",
  "title": "Configuration file or directory exists",
  "checkType": "pathExists",
  "pathValue": "./config"
}
```

**Use Cases:**
- Verifying project directory structure
- Checking for configuration files
- Validating installation paths
- Checking for build scripts (e.g., gradlew, package.json)
- Verifying tool installations in specific locations

## Platform-Specific Considerations

### Java Version Detection

Java outputs version information to stderr, not stdout:

```json
{
  "id": "javaInstalled",
  "title": "Java installed",
  "checkType": "outputContains",
  "command": "java -version",
  "expectedValue": "openjdk version",
  "outputStream": "stderr"
}
```

### Command Timeouts

All commands have a 5-second timeout to prevent hanging. Long-running commands should be avoided in verifications.

## Verification Results

Each verification returns one of three states:

- **`valid`**: Verification passed successfully
- **`invalid`**: Verification failed
- **`waiting`**: Verification is in progress

## Best Practices

### Command Design
- Use simple, fast commands when possible
- Avoid commands that require user interaction
- Test commands manually before adding to configuration
- Consider platform differences (macOS, Linux, Windows)

### Output Matching
- Use specific but flexible matching strings
- Account for version number variations
- Consider locale and language differences
- Test with different tool versions

### Path Verification
- Use relative paths for project structure
- Use environment variables for user-specific paths
- Specify `pathType` when the distinction matters
- Test paths on different operating systems

### Environment Variables
- Check for existence before checking specific values
- Use descriptive variable names
- Document expected values in verification titles
- Consider case sensitivity

## Error Handling

The verification system handles various error conditions:

- **Command not found**: Returns `invalid`
- **Command execution timeout**: Returns `invalid`
- **Permission denied**: Returns `invalid`
- **Path access errors**: Returns `invalid`
- **Environment variable not set**: Returns `invalid`

## Examples by Use Case

### Development Tools
```json
[
  {
    "id": "gitInstalled",
    "title": "Git installed",
    "checkType": "commandSuccess",
    "command": "git --version"
  },
  {
    "id": "dockerInstalled",
    "title": "Docker installed",
    "checkType": "commandSuccess",
    "command": "docker --version"
  },
  {
    "id": "yarnInstalled",
    "title": "Yarn package manager",
    "checkType": "commandSuccess",
    "command": "yarn --version"
  }
]
```

### Version-Specific Checks
```json
[
  {
    "id": "pythonVersion",
    "title": "Python 3.9+ installed",
    "checkType": "outputContains",
    "command": "python3 --version",
    "expectedValue": "Python 3.9"
  },
  {
    "id": "goVersion",
    "title": "Go 1.19+ installed",
    "checkType": "outputContains",
    "command": "go version",
    "expectedValue": "go1.19"
  }
]
```

### Project Structure
```json
[
  {
    "id": "srcDir",
    "title": "Source directory exists",
    "checkType": "pathExists",
    "pathValue": "./src",
    "pathType": "directory"
  },
  {
    "id": "packageJson",
    "title": "package.json exists",
    "checkType": "pathExists",
    "pathValue": "./package.json",
    "pathType": "file"
  }
]
```

### Environment Configuration
```json
[
  {
    "id": "pathSet",
    "title": "PATH environment variable",
    "checkType": "envVarExists",
    "variableName": "PATH"
  },
  {
    "id": "debugMode",
    "title": "Debug mode enabled",
    "checkType": "envVarEquals",
    "variableName": "DEBUG",
    "expectedValue": "true"
  }
]
```

## Troubleshooting

### Common Issues

1. **Command not found**: Ensure the tool is installed and in PATH
2. **Permission denied**: Check file/directory permissions
3. **Unexpected output**: Verify the expected value matches actual output
4. **Environment variables**: Ensure variables are set in the correct scope

### Debugging Tips

1. Test commands manually in a terminal
2. Check both stdout and stderr output
3. Verify environment variable values with `echo $VARIABLE_NAME`
4. Use the application's debug panel to test verification states
5. Check console logs for detailed error messages

### Platform Considerations

- **Windows**: Use appropriate commands (e.g., `where` instead of `which`)
- **macOS**: Consider Homebrew installation paths
- **Linux**: Account for different distributions and package managers
- **Shells**: Test with different shells (bash, zsh, fish)

`outputContains` checks are powerful for validating versions or specific configurations.

```json
{
  "id": "gcloudVersionCheck",
  "title": "gcloud CLI Installed",
  "checkType": "outputContains",
  "command": "gcloud --version",
  "expectedValue": "Google Cloud SDK",
  "outputStream": "stdout"
}
```

#### Dynamic Version Checking with Arrays

You can provide an array of strings for `expectedValue`. The verification will pass if any one of the strings is found in the command's output. This is useful for supporting multiple acceptable versions of a tool.

When combined with the `versionId` property, the first value from the array that is found in the output will be captured and can be used as a variable in the command generation system.

```json
{
  "id": "nodeVersionCheck",
  "title": "Node.js (15 or 16)",
  "checkType": "outputContains",
  "command": "nvm ls",
  "expectedValue": ["v15.", "v16."],
  "versionId": "nodeVersion",
  "outputStream": "stdout"
}
```

In this example, if `nvm ls` outputs a line containing `v18.12.1`, the check will pass, and the value `v18.` will be stored with the ID `nodeVersion`. This can then be used in `configurationSidebarCommands.json` like so: `nvm use ${nodeVersion}`.

### `envVarExists`

Checks if an environment variable is set (has any value).

**Properties:**
- `variableName` (string, required): Name of the environment variable

**Example:**
```json
{
  "id": "homeSet",
  "title": "$HOME environment variable set",
  "checkType": "envVarExists",
  "variableName": "HOME"
}
```

**Use Cases:**
- Verifying required environment variables are set
- Checking shell configuration
- Validating development environment setup

### `envVarEquals`

Checks if an environment variable has a specific value.

**Properties:**
- `variableName` (string, required): Name of the environment variable
- `expectedValue` (string, required): Expected value of the variable

**Example:**
```json
{
  "id": "nodeEnv",
  "title": "NODE_ENV set to development",
  "checkType": "envVarEquals",
  "variableName": "NODE_ENV",
  "expectedValue": "development"
}
```

**Use Cases:**
- Verifying specific environment configurations
- Checking deployment environment settings
- Validating configuration values

### `pathExists`

Checks if a file or directory exists at the specified path.

**Properties:**
- `pathValue` (string, required): Path to check (supports environment variable substitution)
- `pathType` (string, optional): Type of path to expect
  - `"directory"`: Must be a directory
  - `"file"`: Must be a file
  - If not specified: Can be either file or directory

**Environment Variable Substitution:**
- `$HOME`: User's home directory
- `$GOPATH`: Go workspace path (if set)

**Examples:**

**Directory check:**
```json
{
  "id": "projectDir",
  "title": "./frontend directory exists",
  "checkType": "pathExists",
  "pathValue": "./frontend",
  "pathType": "directory"
}
```

**File check:**
```json
{
  "id": "gradlewExists",
  "title": "gradlew exists",
  "checkType": "pathExists",
  "pathValue": "./gradlew",
  "pathType": "file"
}
```

**File check with environment variable:**
```json
{
  "id": "bashProfile",
  "title": "Bash profile exists",
  "checkType": "pathExists",
  "pathValue": "$HOME/.bash_profile",
  "pathType": "file"
}
```

**Any path type:**
```json
{
  "id": "configExists",
  "title": "Configuration file or directory exists",
  "checkType": "pathExists",
  "pathValue": "./config"
}
```

**Use Cases:**
- Verifying project directory structure
- Checking for configuration files
- Validating installation paths
- Checking for build scripts (e.g., gradlew, package.json)
- Verifying tool installations in specific locations

## Auto-Fix Commands

Verifications can include an optional `fixCommand` property that provides automatic remediation for failed checks. When a verification fails and has a `fixCommand`, an orange "Fix" button appears in the UI.

### Fix Command Features

- **One-Click Fix**: Orange "Fix" button appears next to invalid verifications
- **Confirmation Prompt**: Users must confirm the fix command before it runs
- **Floating Terminal**: Fix commands run in dedicated floating terminals
- **Auto-Close**: Terminals close automatically when command completes (if minimized)
- **Re-Validation**: Verification automatically re-runs after fix completes
- **Safety Features**: Close button disabled for 20 seconds to prevent accidental closure
- **Smart Notifications**: Success/failure feedback after fix attempts

### Fix Command Examples

**Directory Creation:**
```json
{
  "id": "projectDirExists",
  "title": "./my-project directory exists",
  "checkType": "pathExists",
  "pathValue": "./my-project",
  "pathType": "directory",
  "fixCommand": "mkdir -p ./my-project"
}
```

**Package Installation:**
```json
{
  "id": "dockerInstalled",
  "title": "Docker installed",
  "checkType": "commandSuccess",
  "command": "docker --version",
  "fixCommand": "brew install docker"
}
```

**Complex Multi-Step Fix:**
```json
{
  "id": "gradlewExists",
  "title": "gradlew exists",
  "checkType": "pathExists",
  "pathValue": "./project/gradlew",
  "pathType": "file",
  "fixCommand": "cd ./project && gradle wrapper && chmod +x ./gradlew"
}
```

**Environment Setup:**
```json
{
  "id": "nodeVersionCorrect",
  "title": "Node.js 16.x",
  "checkType": "outputContains",
  "command": "node --version",
  "expectedValue": "v16.",
  "fixCommand": "nvm install 16 && nvm use 16"
}
```

### Best Practices for Fix Commands

1. **Idempotent**: Commands should be safe to run multiple times
2. **Non-Interactive**: Avoid commands that require user input
3. **Platform Aware**: Consider using platform-specific commands when needed
4. **Error Handling**: Commands should handle common error cases gracefully
5. **Side Effects**: Be mindful of commands that modify global system state

## Related Documentation

- [Configuration Guide](configuration-guide.md) - How to configure verifications
- [Auto Setup Guide](auto-setup-guide.md) - Using fix commands with Auto Setup
- [Getting Started](getting-started.md) - First-time setup and verification
- [Architecture Details](architecture-details.md#environment-verification-system) - Technical implementation
