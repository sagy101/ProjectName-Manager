# Command System

This document explains how {ProjectName} Manager's dynamic command generation system works and how to configure it. For a higher-level overview of where command generation fits into the overall system, see the [System Architecture](architecture.md#command-generation--execution) document.

## Overview

The command system generates terminal commands based on the current configuration state. Commands are defined in JSON configuration files and can be dynamically modified based on:

- Section enable/disable states (for both top-level and sub-sections)
- Deployment option selections
- Path verification results
- Sub-section configurations
- Git branch information

Both top-level sections and their sub-sections can have dedicated commands that open in separate terminal tabs.

## Command Configuration

Commands are defined in `src/configurationSidebarCommands.json`:

```json
[
  {
    "sectionId": "frontend",
    "conditions": {
      "enabled": true
    },
    "command": {
      "base": "cd frontend && ",
      "modifiers": [
        {
          "condition": "deploymentType === 'container'",
          "append": "docker-compose up"
        },
        {
          "condition": "deploymentType === 'process'",
          "append": "npm start"
        },
        {
          "condition": "mode === 'run'",
          "append": " --run"
        }
      ],
      "postModifiers": " --verbose",
      "prefix": "nvm use <version> && ",
      "tabTitle": {
        "base": "Frontend",
        "conditionalAppends": [
          {
            "condition": "mode === 'run'",
            "append": " (Running)"
          },
          {
            "condition": "mode === 'suspend'",
            "append": " (Suspended)"
          }
        ]
      }
    }
  }
]
```

## Command Properties

### Basic Properties

- **`sectionId`** (string, required): ID that links this command definition. It can be:
    - The `id` of a top-level section defined in `src/configurationSidebarSections.json` (for commands run in main tabs).
    - The `id` of a sub-section defined within a top-level section in `src/configurationSidebarSections.json` (for commands run in main tabs).
    - The `commandId` of a `customButton` defined in `src/configurationSidebarSections.json` (for commands typically run in floating terminals).
- **`conditions`** (object, required): Conditions that must be met for the command to be generated (primarily applicable to main tab commands).
- **`command`** (object, required): Command configuration object.

### Command Object Properties

- **`base`** (string, required): Base command string
- **`associatedContainers`** (array): Array of container names or conditional container objects
  - Can be simple strings: `["container-name-1", "container-name-2"]`
  - Or conditional objects: `{ "name": "container-name", "condition": "deploymentType === 'container'" }`
- **`modifiers`** (array): Array of conditional modifiers
  - **`condition`** (string): Condition expression
  - **`append`** (string): Text to append if condition is true
  - **`replace`** (string): Replace entire command if condition is true
- **`postModifiers`** (string): Text always appended after modifiers
- **`prefix`** (string): Text prepended to the final command
- **`excludes`** (array): Array of exclusion conditions
- **`finalAppend`** (string): Text appended at the very end
- **`tabTitle`** (object or string): Terminal tab title configuration
- **`refreshConfig`** (object): Configuration for command modifications during refresh

## Separate Command Objects

Use separate command objects when handling multiple command variants. They:
- Provide better clarity and maintainability
- Avoid potential JavaScript evaluation errors
- Make it easier to debug and modify commands
- Ensure consistent behavior across different conditions

**Example (your-analytics-section):**
```json
[
  {
    "sectionId": "your-analytics-section",
    "conditions": {
      "enabled": true,
      "mode": "run"
    },
    "command": {
      "base": "cd your-analytics-section && npm run start -- --analytics-mode",
      "tabTitle": {
        "base": "Test Analytics (Running)"
      }
    }
  },
  {
    "sectionId": "your-analytics-section",
    "conditions": {
      "enabled": true,
      "mode": "suspend"
    },
    "command": {
      "base": "cd your-analytics-section && npm run suspend -- --analytics-mode",
      "tabTitle": {
        "base": "Test Analytics (Suspended)"
      }
    }
  }
]
```

**Example (url-intelligence-sub):**
```json
[
  {
    "sectionId": "url-intelligence-sub",
    "conditions": {
      "enabled": true,
      "url-intelligenceConfig.enabled": true,
      "url-intelligenceConfig.deploymentType": "mock"
    },
    "command": {
      "base": "cd ./ThreatIntelligenceMock && node inteligence.js",
      "prefix": "nvm use <version> && ",
      "tabTitle": {
        "base": "URL Intelligence (Mock)"
      }
    }
  },
  {
    "sectionId": "url-intelligence-sub",
    "conditions": {
      "enabled": true,
      "url-intelligenceConfig.enabled": true,
      "url-intelligenceConfig.deploymentType": "process"
    },
    "command": {
      "base": "kubectx ${kubectlContext} && PROOFPOINT_AUTH_CLIENT_SECRET=$(./infrastructure/scripts/decode-secret.sh default env-url-intelligence client_secret) PROOFPOINT_AUTH_CLIENT_ID=$(./infrastructure/scripts/decode-secret.sh default env-url-intelligence client_id) PROOFPOINT_SCORER_CUSTOMER_ID=$(./infrastructure/scripts/decode-secret.sh default env-url-intelligence customer_id) cd ./threatintelligence/url-intelligence && ./gradlew bootRun --args='--spring.profiles.active=staging --proofpoint.proxy.url= --server.port=8083 --threatintelligence.url=http://127.0.0.1:8084'",
      "prefix": "nvm use <version> && ",
      "tabTitle": {
        "base": "URL Intelligence (Process)"
      }
    }
  },
  {
    "sectionId": "url-intelligence-sub",
    "conditions": {
      "enabled": true,
      "url-intelligenceConfig.enabled": true,
      "url-intelligenceConfig.deploymentType": "forwarding",
      "urlIntelPodSelected": true
    },
    "command": {
      "base": "cd ./threatintelligence && kubectx ${kubectlContext} && kubectl port-forward ${urlIntelPod} 8083:8080",
      "prefix": "nvm use <version> && ",
      "tabTitle": {
        "base": "URL Intelligence",
        "conditionalAppends": [
          {
            "condition": "url-intelligenceConfig.deploymentType === 'forwarding' && urlIntelPodSelected === true",
            "append": " (Forwarding ${urlIntelPod})"
          }
        ]
      }
    }
  }
]
```

### Refresh Configuration

The `refreshConfig` object allows commands to be dynamically modified when refreshed (re-run) from the Tab Information Panel:

```json
"refreshConfig": {
  "prependCommands": [
    {
      "condition": "mode === 'development'",
      "command": "echo 'Dev refresh' && "
    },
    {
      "command": "clear && "  // No condition - always prepended
    }
  ],
  "appendCommands": [
    {
      "condition": "attachState.alpha === true",
      "command": " --debug-jvm"
    }
  ]
}
```

**Properties:**
- **`prependCommands`** (array): Commands to prepend to the original command
- **`appendCommands`** (array): Commands to append to the original command

Each command entry has:
- **`command`** (string, required): The command string to prepend/append
- **`condition`** (string, optional): JavaScript expression evaluated against config state. If omitted, the command always applies.

**Condition Behavior:**
- No `condition` property: Command always applies (treated as `true`)
- `condition: "true"`: Always applies
- `condition: "false"`: Never applies
- Any other string: Evaluated as JavaScript expression

### Tab Title Configuration

Tab titles can be static strings or dynamic objects:

```json
"tabTitle": {
  "base": "Frontend",
  "conditionalAppends": [
    {
      "condition": "deploymentType === 'container'",
      "append": " (Container)"
    },
    {
      "condition": "mode === 'production'",
      "append": " - Prod"
    }
  ]
}
```

## State Management

The command system evaluates conditions against the application state. The `configState` object holds the current configuration for all sections and their sub-sections.

**Example `configState` Structure:**
```javascript
{
  "alpha": { // Top-level section
    "enabled": true,
    "deploymentType": "process", // Example property for the top-level section
    "frontendConfig": { // Sub-section config object (named {subSectionId}Config)
      "enabled": true,
      "deploymentType": "dev"
    },
    "anotherSubConfig": {
      "enabled": false,
      "someProperty": "value"
    }
    // ... other global dropdown values like gcloudProject can also be here ...
  },
  "beta": { // Another top-level section
    "enabled": false,
    // ... its properties ...
  },
  "attachState": { // Global attach state for debuggers
    "alpha": false,
    "sigma": true
  }
  // ... other global states ...
}
```

## Condition Evaluation

Conditions are JavaScript expressions evaluated against the `configState` and `attachState`.

### Available Context for Conditions

When defining conditions in `configurationSidebarCommands.json` for a command associated with a `sectionId`:

1.  **Direct Properties of the `sectionId`'s Config Object**:
    *   If `sectionId` refers to a **top-level section** (e.g., `"alpha"`), simple keys like `"enabled"` or `"deploymentType"` refer to `configState.alpha.enabled` or `configState.alpha.deploymentType`.
    *   If `sectionId` refers to a **sub-section** (e.g., `"frontend"`, which is a sub-section of `"alpha"`), simple keys like `"enabled"` or `"deploymentType"` refer to properties within that sub-section's specific config object (e.g., `configState.alpha.frontendConfig.enabled` or `configState.alpha.frontendConfig.deploymentType`).
    *   **Dropdown Values for Sub-section Dropdowns**: If a dropdown is defined within a sub-section (e.g., `urlIntelPod` in `url-intelligence-sub` which is under `url-intelligence`), its value is stored directly on the parent section's config object (e.g., `configState['url-intelligence'].urlIntelPod`). Conditions for the sub-section command can reference this as `urlIntelPod` (if `sectionId` for the command is `url-intelligence-sub`, the variable resolver will check its parent `url-intelligence` for `urlIntelPod`). A boolean flag like `urlIntelPodSelected` is also available on the parent section's config: `configState['url-intelligence'].urlIntelPodSelected`.

2.  **Properties of Other Top-Level Section Configs (Cross-Section References)**:
    *   Use the format `"sectionNameConfig.propertyName"` (e.g., `"alphaConfig.enabled"`). This will correctly resolve to `configState.alpha.enabled`.
    *   **Important**: For this format, `propertyName` typically refers to the `enabled` status of the top-level section, or other direct properties of that top-level section's config object.

3.  **Properties of Sub-Section Configs (Often for Cross-Section or Explicit Sub-Section Checks)**:
    *   Use the format `"subSectionNameConfig.propertyName"` (e.g., `"frontendConfig.enabled"` or `"frontendConfig.deploymentType"`).
    *   The system will find which top-level section contains the `subSectionNameConfig` object (e.g., `frontendConfig` is found within `configState.alpha`).
    *   It then accesses the `propertyName` from that nested object (e.g., `configState.alpha.frontendConfig.enabled`).

4.  **Attach State**: `"attachState.sectionId"` (e.g., `"attachState.alpha"`).

### Expression Examples

**For a command with `"sectionId": "alpha"`:**
```javascript
// Checks configState.alpha.enabled
"enabled": true

// Checks configState.alpha.frontendConfig.deploymentType
"frontendConfig.deploymentType": "dev"
```

**For a command with `"sectionId": "frontend"` (sub-section of `alpha`):**
```javascript
// Checks configState.alpha.enabled (parent section enabled status)
"alphaConfig.enabled": true

// Checks configState.alpha.frontendConfig.enabled (sub-section's own enabled status)
"enabled": true 
// OR more explicitly if needed:
"frontendConfig.enabled": true

// Checks configState.alpha.frontendConfig.deploymentType
"deploymentType": "dev"
// OR more explicitly:
"frontendConfig.deploymentType": "dev"
```

**For a command with `"sectionId": "url-intelligence-sub"` (sub-section of `url-intelligence` with a dropdown `urlIntelPod`):**
```json
// "sectionId": "url-intelligence-sub"
"conditions": {
  // Checks configState['url-intelligence'].urlIntelPodSelected (boolean flag for the dropdown)
  "urlIntelPodSelected": true
}
```

## Command Generation Process

1. **Load Configuration**: Read command definitions from JSON
2. **Evaluate Conditions**: Check each command's conditions against current state
3. **Apply Modifiers**: Use deployment option to select appropriate command variant
4. **Generate Tab Titles**: Create descriptive titles for terminal tabs
5. **Return Command List**: Provide final commands for execution

## Advanced Examples

### Multi-Section Dependencies

Commands that depend on multiple sections:

```json
{
  "id": "fullStack",
  "baseCommand": "echo 'Starting full stack'",
  "title": "Start Full Stack",
  "conditions": {
    "frontendEnabled": "sections.frontend.enabled",
    "backendEnabled": "sections.backend.enabled",
    "bothValid": "sections.frontend.pathStatus === 'valid' && sections.backend.pathStatus === 'valid'"
  }
}
```

### Conditional Modifiers

Different modifiers based on sub-section state:

```json
{
  "id": "start",
  "baseCommand": "cd frontend && npm start",
  "title": "Start Frontend",
  "conditions": {
    "enabled": "sections.frontend.enabled"
  },
  "modifiers": {
    "normal": {
      "command": "sections.frontend.subSections.frontend.enabled ? 'cd frontend && npm run build && npm start' : 'cd frontend && npm start'",
      "tabTitle": "Frontend (Normal)"
    },
    "dev": {
      "command": "cd frontend && npm run dev",
      "tabTitle": "Frontend (Dev)"
    }
  }
}
```

### Environment-Specific Commands

Commands that vary based on environment:

```json
{
  "id": "deploy",
  "baseCommand": "cd frontend && npm run build",
  "title": "Deploy Frontend",
  "conditions": {
    "enabled": "sections.frontend.enabled",
    "validBranch": "sections.frontend.gitBranch === 'main' || sections.frontend.gitBranch === 'develop'"
  },
  "modifiers": {
    "staging": {
      "command": "cd frontend && npm run build:staging && npm run deploy:staging",
      "tabTitle": "Deploy Frontend (Staging)"
    },
    "production": {
      "command": "cd frontend && npm run build:prod && npm run deploy:prod",
      "tabTitle": "Deploy Frontend (Production)"
    }
  }
}
```

## Tab Title Generation

Tab titles are generated using the following priority:

1. **Modifier tab title**: If a modifier specifies `tabTitle`
2. **Generated title**: Combination of command title and deployment option
3. **Default title**: Command title only

**Examples:**
- `"Frontend (Container)"` - From modifier
- `"Start Frontend - Container"` - Generated
- `"Start Frontend"` - Default

## Error Handling

The command system handles various error conditions:

### Invalid Conditions
- Syntax errors in condition expressions
- References to non-existent state properties
- Type mismatches in comparisons

### Missing Modifiers
- Deployment option not defined in modifiers
- Falls back to `baseCommand`

### State Inconsistencies
- Section enabled but path invalid
- Commands may be excluded from generation

## Best Practices

### Command Design

1. **Keep commands focused**: Each command should have a single, clear purpose
2. **Use meaningful titles**: Titles should clearly describe what the command does
3. **Include context in tab titles**: Help users identify different command variants
4. **Test commands manually**: Verify commands work before adding to configuration

### Condition Writing

1. **Use clear expressions**: Make conditions easy to understand and maintain
2. **Check required dependencies**: Ensure all necessary conditions are met
3. **Handle edge cases**: Consider what happens when sections are disabled
4. **Use consistent naming**: Follow established patterns for state properties

### Modifier Strategy

1. **Provide meaningful variants**: Each modifier should offer distinct functionality
2. **Use descriptive keys**: Modifier keys should clearly indicate their purpose
3. **Include helpful tab titles**: Make it easy to distinguish between variants
4. **Test all combinations**: Verify each modifier works correctly

## Debugging Commands

### Common Issues

1. **Commands not appearing**: Check condition expressions and state values
2. **Wrong command variant**: Verify modifier keys match deployment options
3. **Incorrect tab titles**: Check modifier `tabTitle` properties
4. **State not updating**: Ensure state changes trigger command regeneration

### Debugging Tools

1. **Browser Console**: Check for JavaScript errors in condition evaluation
2. **State Inspector**: Use React DevTools to examine application state
3. **Manual Testing**: Test commands in terminal before adding to configuration
4. **Debug Panel**: Use application's debug tools to test different states

## Integration with Terminal

Generated commands are executed in the integrated terminal system. Variable substitution (e.g., `${kubectlContext}`, `${urlIntelPod}`) occurs before execution, drawing values from the relevant section or parent section's configuration state, or global dropdowns.

### Dropdown Integration

Commands can reference dropdown values using variable substitution:
- **Global Dropdowns**: Values from environment verification dropdowns (e.g., `${gcloudProject}`)
- **Section Dropdowns**: Values from dropdowns within configuration sections
- **Automatic Updates**: Commands are regenerated when dropdown values change
- **Command-on-Change**: Dropdowns can execute commands automatically when values change (see [Configuration Guide](configuration-guide.md#dropdown-selectors))

1. **Tab Creation**: Each command gets its own terminal tab
2. **Process Management**: Commands run as separate PTY processes
3. **Output Handling**: Real-time output streaming to terminal UI
4. **Cleanup**: Automatic process cleanup when tabs are closed
5. **Container Management**: Associated containers are tracked and managed with tab lifecycle

## Container Management

{ProjectName} Manager can automatically manage Docker containers associated with terminal tabs through the `associatedContainers` property.

### Configuration

Define associated containers in your command configuration:

```json
{
  "sectionId": "backend",
  "conditions": {
    "enabled": true
  },
  "command": {
    "base": "cd backend && ./gradlew bootRun",
    "associatedContainers": [
      "database",
      "redis",
      { "name": "elasticsearch", "condition": "searchEnabled === true" }
    ]
  }
}
```

### Container Lifecycle

Associated containers are managed throughout the tab lifecycle:

1. **Tab Open**: Containers are tracked when the tab starts
2. **Tab Close**: Containers are automatically stopped
3. **Tab Refresh**: Containers are stopped and restarted with the refreshed command
4. **Kill All**: All containers across all tabs are stopped
5. **Application Exit**: All running containers are gracefully stopped

### Container Status

Container status is available in the Tab Information Panel:
- View list of associated containers
- Check running status for each container
- See real-time status updates

### Examples

**Simple Container List:**
```json
"associatedContainers": ["mysql", "redis", "rabbitmq"]
```

**Conditional Containers:**
```json
"associatedContainers": [
  "nginx",
  { "name": "mongo", "condition": "dbType === 'mongo'" },
  { "name": "postgres", "condition": "dbType === 'postgres'" }
]
```

**Mixed Deployment Modes:**
```json
{
  "sectionId": "your-section-beta",
  "conditions": {
    "enabled": true,
    "deploymentType": "container"
  },
  "command": {
    "base": "cd ./your-service-path && ./build-script.sh",
    "associatedContainers": ["your-agent-container"]
  }
}
```

