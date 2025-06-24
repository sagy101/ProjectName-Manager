# Configuration Overview

> **Navigation:** [Configuration Guides](README.md) > Overview

This guide provides an introduction to {ProjectName} Manager's powerful JSON-based configuration system that allows complete customization without touching any code.

## Configuration System Principles

- **JSON-Driven**: All functionality defined through JSON configuration files
- **No Code Changes**: Complete customization without modifying application code
- **Modular Design**: Separate files for different concerns (UI, commands, verifications)
- **Dynamic Behavior**: Commands and UI generated based on current state

## Configuration Files Overview

The system uses four main configuration files:

| File | Purpose | Location |
|------|---------|----------|
| **Sections** | UI structure and components | `src/project-config/config/configurationSidebarSections.json` |
| **Commands** | Command generation logic | `src/project-config/config/configurationSidebarCommands.json` |
| **About** | Section descriptions and verifications | `src/project-config/config/configurationSidebarAbout.json` |
| **Environment** | System-wide environment checks | `src/environment-verification/generalEnvironmentVerifications.json` |

## Quick Start Example

Here's a simple example showing how all four files work together:

### 1. Define Section Structure (Sections.json)
```json
{
  "settings": {
    "projectName": "MyProject"
  },
  "sections": [
    {
      "id": "frontend",
      "title": "Frontend",
      "components": {
        "toggle": true,
        "deploymentOptions": true,
        "infoButton": true
      }
    }
  ]
}
```

### 2. Define Commands (Commands.json)
```json
[
  {
    "id": "frontend",
    "conditions": {
      "enabled": true,
      "deploymentType": "container"
    },
    "command": {
      "base": "cd frontend && docker-compose up",
      "tabTitle": "Frontend (Container)"
    }
  },
  {
    "id": "frontend",
    "conditions": {
      "enabled": true,
      "deploymentType": "process"
    },
    "command": {
      "base": "cd frontend && npm start",
      "tabTitle": "Frontend (Process)"
    }
  }
]
```

### 3. Define Section Information (About.json)
```json
[
  {
    "sectionId": "frontend",
    "directoryPath": "frontend",
    "description": "Frontend application with React and modern build tools.",
    "verifications": [
      {
        "id": "frontendDirExists",
        "title": "./frontend directory exists",
        "checkType": "pathExists",
        "pathValue": "./frontend",
        "pathType": "directory"
      }
    ]
  }
]
```

### 4. Add Environment Checks (Environment.json)
```json
{
  "categories": [
    {
      "category": {
        "title": "Development Tools",
        "verifications": [
          {
            "id": "nodeInstalled",
            "title": "Node.js installed",
            "checkType": "commandSuccess",
            "command": "node --version",
            "fixCommand": "brew install node"
          }
        ]
      }
    }
  ]
}
```

## How It Works

### 1. Application Startup
1. Configuration files are loaded and parsed
2. Environment verifications run in parallel
3. UI renders based on section definitions
4. Initial state is established

### 2. User Interaction
1. User enables a section via toggle
2. Current state (deployment type, mode, etc.) is evaluated
3. Matching command is found based on conditions
4. Command is generated and executed in terminal

### 3. Dynamic Updates
1. User changes deployment type or mode
2. Commands are regenerated with new conditions
3. UI updates reflect current state
4. Environment verifications refresh as needed

## Key Configuration Concepts

### State-Based Commands
Commands are generated based on the current application state:

```json
{
  "id": "frontend",
  "conditions": {
    "enabled": true,           // Section is enabled
    "deploymentType": "container",  // Container deployment selected
    "mode": "development"      // Development mode selected
  },
  "command": {
    "base": "cd frontend && docker-compose -f docker-compose.dev.yml up"
  }
}
```

### Component System
UI components are declared in the sections file:

- **`toggle`**: Enable/disable section
- **`deploymentOptions`**: Container vs Process selection
- **`modeSelector`**: Custom mode selection (dev/staging/prod)
- **`dropdownSelectors`**: Dynamic dropdowns populated from commands
- **`inputField`**: Text input fields
- **`customButton`**: Buttons that open floating terminals

### Verification System
Two types of verifications ensure environment readiness:

1. **General Environment**: System-wide checks (Node.js, Docker, etc.)
2. **Section-Specific**: Per-section checks (directory exists, files present)

### Application Settings
Global settings control application behavior:

```json
{
  "settings": {
    "projectName": "MyProject",
    "autoSetupTimeoutSeconds": 90,
    "maxFloatingTerminals": 10,
    "terminalFontSize": 14,
    "configurationDefaultExpanded": true
  }
}
```

## Advanced Features

### Conditional Components
Components can be shown/hidden based on conditions:

```json
"inputField": {
  "id": "debugPort",
  "placeholder": "Enter port",
  "visibleWhen": {
    "configKey": "attachState.frontend",
    "hasValue": true
  }
}
```

### Sub-sections
Sections can contain nested sub-sections:

```json
"subSections": [
  {
    "id": "frontend-features",
    "title": "Frontend Features",
    "components": {
      "toggle": true,
      "modeSelector": {
        "options": ["basic", "advanced"],
        "default": "basic"
      }
    }
  }
]
```

### Test Sections
Sections can be marked as test-only:

```json
{
  "id": "test-section",
  "title": "Test Section",
  "testSection": true,
  "components": {
    "toggle": true
  }
}
```

Test sections are hidden by default and can be toggled via the debug menu.

## Best Practices

### File Organization
- **One concern per file**: Don't mix UI structure with command logic
- **Consistent naming**: Use the same IDs across all files
- **Logical grouping**: Group related sections together

### Command Design
- **Separate command objects**: Create separate commands for different conditions rather than complex logic in one command
- **Clear conditions**: Make conditions explicit and easy to understand
- **Descriptive tab titles**: Use clear, descriptive terminal tab titles

### Verification Strategy
- **Essential checks only**: Include verifications that are truly necessary
- **Provide fix commands**: Include `fixCommand` for auto-remediation when possible
- **Clear error messages**: Use descriptive titles for verification failures

## Next Steps

- **Section Configuration**: Learn about [UI structure and components](sections.md)
- **Command System**: Understand [command generation and execution](commands.md)
- **Dropdown Setup**: Configure [dynamic dropdown selectors](dropdowns.md)
- **Working Examples**: See [complete configuration examples](examples.md)

## Related Documentation

- [Getting Started Guide](../../getting-started.md) - Basic setup and installation
- [Architecture Overview](../architecture/overview.md) - How the configuration system fits into the overall architecture
- [Feature Guides](../features/) - Detailed guides for specific features 