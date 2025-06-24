# Environment Verification

> Comprehensive environment validation system with auto-fix capabilities

## Overview

The Environment Verification system validates the presence and configuration of tools, paths, environment variables, and other dependencies required for your development environment. It provides real-time checks with one-click auto-fix capabilities.

### Key Features

- **Multiple Check Types**: Command success, output validation, path existence, environment variables
- **Auto-Fix Commands**: One-click remediation for failed verifications
- **Category Organization**: Group related verifications together
- **Dynamic Environment Selection**: Header dropdowns for environment configuration
- **Real-Time Updates**: Continuous monitoring with visual indicators

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

The `generalEnvironmentVerifications.json` file supports an optional header configuration:

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

Verifies that command output contains specific text. This check supports both single string and array values for `expectedValue`.

**Properties:**
- `command` (string, required): Command to execute
- `expectedValue` (string or array of strings, optional): The text to find in the output.
  - **As a string:** Checks if this exact string is present.
  - **As an array:** Checks if *any* of the strings in the array are present. Ideal for dynamic version checking.
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

## See Also

- [Auto Setup](auto-setup.md) - Automated environment setup using fix commands
- [Configuration Commands Guide](../configuration/commands.md) - Setting up fix commands
- [Configuration Dropdowns Guide](../configuration/dropdowns.md) - Dynamic dropdown configuration 