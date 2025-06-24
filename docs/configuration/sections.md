# Configuration Sections

> **Navigation:** [Configuration Guides](README.md) > Sections

This guide covers the UI structure and component configuration for {ProjectName} Manager sections, defined in `configurationSidebarSections.json`.

## File Structure

The sections configuration file defines:
- **Application Settings**: Global behavior configuration
- **Section Definitions**: UI structure and components for each section

```json
{
  "settings": {
    "projectName": "MyProject",
    "openDevToolsByDefault": false,
    "autoSetupTimeoutSeconds": 90
  },
  "sections": [
    {
      "id": "frontend",
      "title": "Frontend",
      "components": {
        "toggle": true,
        "infoButton": true,
        "deploymentOptions": true
      }
    }
  ]
}
```

## Application Settings

The `settings` object controls application-wide behavior:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `projectName` | string | "Project" | Display name shown in UI title and throughout application |
| `openDevToolsByDefault` | boolean | false | Auto-open Chrome Developer Tools on startup |
| `autoSetupTimeoutSeconds` | number | 60 | Timeout for Auto Setup commands in seconds |
| `loadingScreenTimeoutSeconds` | number | 15 | Maximum loading screen display time |
| `sidebarDefaultExpanded` | boolean | false | App Control Sidebar expanded by default |
| `terminalScrollback` | number | 1000 | Terminal scrollback buffer line limit |
| `maxFloatingTerminals` | number | 10 | Maximum concurrent floating terminals |
| `terminalFontSize` | number | 14 | Terminal font size in pixels |
| `configurationDefaultExpanded` | boolean | true | Configuration panel expanded by default |

### Example Settings
```json
{
  "settings": {
    "projectName": "ISO",
    "autoSetupTimeoutSeconds": 120,
    "maxFloatingTerminals": 15,
    "terminalFontSize": 16,
    "configurationDefaultExpanded": false
  }
}
```

## Section Properties

Each section has these top-level properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✓ | Unique identifier linking to commands and about info |
| `title` | string | ✓ | Display name in the UI |
| `testSection` | boolean | ✗ | Mark as test section (hidden by default) |
| `components` | object | ✓ | UI components configuration |

### Basic Section Example
```json
{
  "id": "frontend",
  "title": "Frontend Application",
  "testSection": false,
  "components": {
    "toggle": true,
    "infoButton": true
  }
}
```

## UI Components

Components define the interactive elements within each section:

### Toggle Component
Adds main enable/disable toggle for the section.

```json
"toggle": true
```

**Features**:
- Controls section enabled/disabled state
- Required for command execution
- Visual indicator of section status

### Info Button
Adds an information button showing section description and verification status.

```json
"infoButton": true
```

**Features**:
- Shows section description from about.json
- Displays verification status indicators
- Provides quick access to section details

### Git Branch Switcher
Adds a git branch selector dropdown.

```json
"gitBranch": true
```

**Features**:
- Lists available git branches
- Switches project to selected branch
- Cached for performance

### Deployment Options
Standardized container/process deployment selector.

```json
"deploymentOptions": true
```

**Features**:
- Two-button toggle: Container vs Process
- Consistent UI pattern across sections
- Sets `deploymentType` state property
- Used in command conditions

### Mode Selector
Multi-option selector for custom modes.

```json
"modeSelector": {
  "options": ["development", "staging", "production"],
  "labels": ["Development", "Staging", "Production"],
  "default": "development"
}
```

**Properties**:
- `options` (required): Array of mode values
- `labels` (optional): Display labels for options
- `default` (optional): Default selected mode

**State Property**: Sets `.mode` in section state

### Attach Toggle
Debugger attachment toggle with mutual exclusion support.

```json
"attachToggle": {
  "enabled": true,
  "mutuallyExclusiveWith": ["backend", "database"]
}
```

**Properties**:
- `enabled`: Whether attach toggle is available
- `mutuallyExclusiveWith`: Array of section IDs that can't be attached simultaneously

**State Property**: Sets `attachState.{sectionId}` boolean

### Input Fields
Text input for arbitrary values with conditional visibility.

```json
"inputField": {
  "id": "debugPort",
  "placeholder": "Enter attach port",
  "default": "9229",
  "visibleWhen": {
    "configKey": "attachState.frontend",
    "hasValue": true
  }
}
```

**Properties**:
- `id`: Field identifier (scoped to section)
- `placeholder`: Placeholder text
- `default`: Pre-filled default value
- `visibleWhen`: Conditional visibility configuration

**Usage in Commands**: Available as `${debugPort}` variable

### Dropdown Selectors
Dynamic dropdowns populated from command execution.

```json
"dropdownSelectors": [
  {
    "id": "kubectlContext",
    "command": "kubectl config get-contexts -o name",
    "parseResponse": "lines",
    "placeholder": "Select context...",
    "loadingText": "Loading contexts...",
    "errorText": "Error loading contexts",
    "noOptionsText": "No contexts found",
    "dependsOn": "gcloudProject"
  }
]
```

**Properties**:
- `id`: Unique identifier for the dropdown
- `command`: Shell command to execute for options
- `parseResponse`: How to parse command output ("lines", "json", "space")
- `placeholder`: Default text when no selection
- `loadingText`: Text shown while loading
- `errorText`: Text shown on command failure
- `noOptionsText`: Text shown when no options available
- `dependsOn`: ID of another dropdown this depends on

> **Detailed Information**: See [Dropdown Configuration Guide](dropdowns.md)

### Custom Buttons
Buttons that trigger floating terminal commands.

**Single Button**:
```json
"customButton": {
  "id": "viewLogs",
  "label": "View Logs",
  "commandId": "logViewerCommand"
}
```

**Multiple Buttons**:
```json
"customButtons": [
  {
    "id": "storybook",
    "label": "Run Storybook", 
    "commandId": "storybookCommand"
  },
  {
    "id": "tests",
    "label": "Run Tests",
    "commandId": "testCommand"
  }
]
```

**Properties**:
- `id`: Unique button identifier
- `label`: Button display text
- `commandId`: Links to command in commands.json

## Sub-sections

Sections can contain collapsible sub-sections with their own components:

```json
"subSections": [
  {
    "id": "frontend-features",
    "title": "Frontend Features",
    "components": {
      "toggle": true,
      "modeSelector": {
        "options": ["basic", "advanced"],
        "labels": ["Basic", "Advanced"],
        "default": "basic"
      },
      "dropdownSelectors": [
        {
          "id": "featureSet",
          "command": "echo \"feature1\nfeature2\"",
          "parseResponse": "lines",
          "placeholder": "Select feature set..."
        }
      ]
    }
  }
]
```

**Sub-section Properties**:
- Same component system as main sections
- Can have their own dropdown selectors
- Independent state management
- Can trigger their own commands

## Test Sections

Sections marked as test sections are hidden by default:

```json
{
  "id": "test-analytics",
  "title": "Test Analytics",
  "testSection": true,
  "components": {
    "toggle": true
  }
}
```

**Test Section Behavior**:
- Hidden by default in UI
- Can be shown/hidden via debug menu in App Control Sidebar
- Commands excluded from "Run {ProjectName}" when hidden
- Useful for development and debugging

## Complete Section Example

Here's a comprehensive example showing all available components:

```json
{
  "id": "full-example",
  "title": "Full Example Section",
  "testSection": false,
  "components": {
    "toggle": true,
    "infoButton": true,
    "gitBranch": true,
    "deploymentOptions": true,
    "modeSelector": {
      "options": ["dev", "staging", "prod"],
      "labels": ["Development", "Staging", "Production"],
      "default": "dev"
    },
    "attachToggle": {
      "enabled": true,
      "mutuallyExclusiveWith": ["other-section"]
    },
    "inputField": {
      "id": "customPort",
      "placeholder": "Enter port number",
      "default": "3000",
      "visibleWhen": {
        "configKey": "mode",
        "hasValue": "dev"
      }
    },
    "dropdownSelectors": [
      {
        "id": "environment",
        "command": "echo \"local\nstaging\nproduction\"",
        "parseResponse": "lines",
        "placeholder": "Select environment..."
      }
    ],
    "customButtons": [
      {
        "id": "logs",
        "label": "View Logs",
        "commandId": "logCommand"
      },
      {
        "id": "metrics",
        "label": "View Metrics", 
        "commandId": "metricsCommand"
      }
    ],
    "subSections": [
      {
        "id": "advanced-config",
        "title": "Advanced Configuration",
        "components": {
          "toggle": true,
          "modeSelector": {
            "options": ["simple", "advanced"],
            "default": "simple"
          }
        }
      }
    ]
  }
}
```

## State Management

Each section maintains state based on its components:

```javascript
{
  sectionId: {
    enabled: boolean,           // From toggle
    deploymentType: string,     // From deploymentOptions
    mode: string,              // From modeSelector
    attachState: boolean,      // From attachToggle
    customPort: string,        // From inputField
    environment: string,       // From dropdown
    gitBranch: string,        // From gitBranch
    pathStatus: string        // From verification
  }
}
```

## Best Practices

### Component Selection
- **Use `deploymentOptions`** for container vs process selection
- **Use `modeSelector`** for custom mode selection
- **Use `dropdownSelectors`** for dynamic data from commands
- **Use `inputField`** for user-provided values
- **Use `customButtons`** for auxiliary actions

### Naming Conventions
- **Section IDs**: Use kebab-case (e.g., "frontend-app")
- **Component IDs**: Use camelCase (e.g., "debugPort")  
- **Command IDs**: Use descriptive names (e.g., "frontendLogCommand")

### State Design
- **Keep state simple**: Avoid complex nested objects
- **Use consistent naming**: Match component IDs to state properties
- **Plan for commands**: Consider how state will be used in command conditions

## Related Documentation

- [Command Configuration](commands.md) - How sections trigger commands
- [Dropdown Configuration](dropdowns.md) - Dynamic dropdown setup
- [Configuration Examples](examples.md) - Complete working examples
- [Architecture Overview](../architecture/overview.md) - How sections fit into the system 