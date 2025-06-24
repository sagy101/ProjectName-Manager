# Configuration Commands

> **Navigation:** [Configuration Guides](README.md) > Commands

This guide covers command generation and execution configuration for {ProjectName} Manager, defined in `configurationSidebarCommands.json`.

## Overview

The commands configuration defines how terminal commands are generated based on the current application state. Commands are dynamically constructed using conditions, modifiers, and state variables.

## Basic Command Structure

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
  }
]
```

## Command Properties

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Section or sub-section ID from sections.json |
| `conditions` | object | Conditions that must be met for command selection |
| `command` | object | Command configuration object |

### Command Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `base` | string | Base command string |
| `tabTitle` | string/object | Terminal tab title |
| `prefix` | string | Text prepended to entire command |
| `postModifiers` | string | Text appended after modifiers |
| `finalAppend` | string | Text appended at very end |
| `associatedContainers` | array | Docker containers managed by this tab |
| `modifiers` | array | Conditional command modifiers |
| `excludes` | array | Exclusion conditions |
| `refreshConfig` | object | Command modifications during refresh |

## Condition Evaluation

Commands are selected based on matching conditions to current application state:

### Simple Conditions
```json
{
  "conditions": {
    "enabled": true,
    "deploymentType": "container",
    "mode": "development"
  }
}
```

**Available Condition Keys**:
- `enabled`: Section enabled state (boolean)
- `deploymentType`: "container" or "process"
- `mode`: Custom mode from modeSelector
- `attachState`: Debugger attachment state (boolean)
- Custom state from input fields and dropdowns

### Complex Conditions
For modifiers and advanced logic, use JavaScript expressions:

```json
{
  "condition": "mode === 'development' && attachState.frontend === true"
}
```

## Command Examples

### Container vs Process Commands
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
      "associatedContainers": ["frontend-app", "frontend-db"],
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
      "prefix": "nvm use 16 && ",
      "tabTitle": "Frontend (Process)"
    }
  }
]
```

### Mode-Based Commands
```json
[
  {
    "id": "api",
    "conditions": {
      "enabled": true,
      "mode": "development"
    },
    "command": {
      "base": "cd api && npm run dev",
      "postModifiers": " --watch",
      "tabTitle": "API (Development)"
    }
  },
  {
    "id": "api", 
    "conditions": {
      "enabled": true,
      "mode": "production"
    },
    "command": {
      "base": "cd api && npm start",
      "tabTitle": "API (Production)"
    }
  }
]
```

### Commands with Variable Substitution
```json
{
  "id": "debug-service",
  "conditions": {
    "enabled": true,
    "attachState": true
  },
  "command": {
    "base": "cd service && node --inspect=${debugPort} app.js",
    "tabTitle": "Service (Debug Port ${debugPort})"
  }
}
```

**Available Variables**:
- Input field values: `${fieldId}`
- Dropdown selections: `${dropdownId}`
- Environment variables: `${ENV_VAR}`
- Git branch: `${gitBranch}`

## Tab Title Configuration

### Simple Tab Titles
```json
{
  "tabTitle": "Frontend Application"
}
```

### Dynamic Tab Titles
```json
{
  "tabTitle": {
    "base": "Frontend",
    "conditionalAppends": [
      {
        "condition": "mode === 'development'",
        "append": " (Dev)"
      },
      {
        "condition": "mode === 'production'",
        "append": " (Prod)"
      },
      {
        "condition": "deploymentType === 'container'",
        "append": " [Container]"
      }
    ]
  }
}
```

### Tab Titles with Variables
```json
{
  "tabTitle": "API Server (Port ${serverPort})"
}
```

## Associated Containers

Commands can manage Docker containers tied to their terminal lifecycle:

### Simple Container List
```json
{
  "associatedContainers": ["frontend-app", "frontend-db", "redis-cache"]
}
```

### Conditional Containers
```json
{
  "associatedContainers": [
    "frontend-app",
    {
      "name": "frontend-dev-tools",
      "condition": "mode === 'development'"
    },
    {
      "name": "frontend-cache",
      "condition": "deploymentType === 'container'"
    }
  ]
}
```

**Container Lifecycle**:
- **Tab Opened**: Containers are tracked
- **Tab Closed**: All associated containers are stopped
- **Tab Refreshed**: Containers are stopped and restarted
- **App Exit**: All containers are gracefully stopped

## Command Modifiers

Modifiers allow conditional command modification:

```json
{
  "command": {
    "base": "cd frontend && npm start",
    "modifiers": [
      {
        "condition": "mode === 'development'",
        "append": " --watch"
      },
      {
        "condition": "debugPort",
        "append": " --inspect=${debugPort}"
      },
      {
        "condition": "attachState.frontend === true",
        "prepend": "NODE_OPTIONS='--inspect' "
      }
    ]
  }
}
```

### Modifier Properties
- `condition`: JavaScript expression that must be true
- `append`: Text to append to command
- `prepend`: Text to prepend to command

## Refresh Configuration

Commands can be modified during terminal refresh:

```json
{
  "refreshConfig": {
    "prependCommands": [
      {
        "command": "make clean && make build && ",
        "condition": "needsRebuild === true"
      },
      {
        "command": "npm install && ",
        "condition": "packageJsonChanged === true"
      }
    ]
  }
}
```

**Refresh Features**:
- **Prepend Commands**: Commands executed before main command on refresh
- **Conditional Execution**: Only execute when conditions are met
- **Build Optimization**: Rebuild only when necessary

## Custom Button Commands

Commands for floating terminal buttons:

```json
{
  "id": "viewFrontendLogs",
  "command": {
    "base": "tail -f frontend/logs/app.log",
    "tabTitle": "Frontend Logs"
  }
}
```

**Custom Button Features**:
- No conditions required (always available when button clicked)
- Open in floating terminals
- Independent of section state

## Sub-section Commands

Sub-sections can have their own commands:

```json
{
  "id": "frontend-features", // Sub-section ID
  "conditions": {
    "enabled": true,
    "featureMode": "advanced"
  },
  "command": {
    "base": "cd frontend && npm run features:advanced",
    "tabTitle": "Frontend Features (Advanced)"
  }
}
```

## Command Generation Process

1. **State Evaluation**: Current application state is collected
2. **Condition Matching**: Commands with matching conditions are identified
3. **Variable Substitution**: Variables are resolved from state
4. **Modifier Application**: Conditional modifiers are applied
5. **Final Assembly**: Command parts are assembled in order

### Assembly Order
```
[prefix] + [base] + [modifiers] + [postModifiers] + [finalAppend]
```

## Excludes and Special Conditions

### Exclude Patterns
```json
{
  "excludes": [
    {
      "condition": "mode === 'production'",
      "append": " -x test"
    }
  ]
}
```

**Use Cases**:
- Exclude test files in production
- Skip development-only features
- Remove debug flags in certain modes

## Best Practices

### Command Design
- **Separate Commands**: Create separate command objects for significantly different conditions
- **Clear Conditions**: Use simple, explicit conditions when possible
- **Meaningful Titles**: Include context in tab titles
- **Error Handling**: Consider command failure scenarios

### State Management
- **Consistent Naming**: Match state properties to component IDs
- **Simple Conditions**: Prefer simple equality checks over complex expressions
- **Variable Usage**: Use variables for user-provided values

### Container Management
- **Logical Grouping**: Associate containers that belong together
- **Conditional Containers**: Use conditions for optional containers
- **Cleanup Strategy**: Ensure containers are properly stopped

### Performance Considerations
- **Avoid Complex Logic**: Keep conditions simple for better performance
- **Cache-Friendly**: Design commands to work well with caching
- **Minimal Rebuilds**: Use refresh config judiciously

## Testing Commands

### Validation Steps
1. **Syntax Check**: Ensure JSON is valid
2. **Condition Logic**: Test all condition combinations
3. **Variable Resolution**: Verify variables resolve correctly
4. **Container Lifecycle**: Test container start/stop behavior
5. **Error Scenarios**: Test failure conditions

### Common Issues
- **Missing Conditions**: Commands not appearing when expected
- **Variable Errors**: Undefined variables causing command failures
- **Container Conflicts**: Multiple commands managing same containers
- **State Inconsistency**: State not matching expected values

## Related Documentation

- [Section Configuration](sections.md) - UI components that drive command conditions
- [Dropdown Configuration](dropdowns.md) - Dynamic values used in commands
- [Configuration Examples](examples.md) - Complete working examples
- [Architecture Overview](../architecture/overview.md) - How commands fit into the system
- [Terminal Features](../features/terminal-system.md) - Terminal system capabilities 