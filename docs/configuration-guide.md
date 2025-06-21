# Configuration Guide

> Complete guide to {ProjectName} Manager's JSON-based configuration system

## Table of Contents

- [Overview](#overview)
- [Configuration Files](#configuration-files)
  - [1. General Environment Verifications](#1-general-environment-verifications)
  - [2. Configuration Sidebar Sections](#2-configuration-sidebar-sections)
  - [3. Configuration Sidebar About](#3-configuration-sidebar-about)
  - [4. Configuration Sidebar Commands](#4-configuration-sidebar-commands)
- [State Management](#state-management)
- [Adding New Sections](#adding-new-sections)
- [Custom Sidebar Buttons and Floating Terminals](#custom-sidebar-buttons-and-floating-terminals)
- [Special Features](#special-features)
- [Best Practices](#best-practices)
- [Dropdown Selectors](#dropdown-selectors)

## Overview

{ProjectName} Manager uses a powerful JSON-based configuration system that allows complete customization without touching any code. This guide covers all aspects of configuration, from basic setup to advanced features.

### Configuration Files

The system uses four main configuration files:

| File | Purpose |
|------|---------|
| **`src/environment-verification/generalEnvironmentVerifications.json`** | System-wide environment checks |
| **`src/project-config/config/configurationSidebarSections.json`** | UI structure and components |
| **`src/project-config/config/configurationSidebarAbout.json`** | Section descriptions and verifications |
| **`src/project-config/config/configurationSidebarCommands.json`** | Command generation logic |

## Configuration Files

### 1. General Environment Verifications

**File**: `src/generalEnvironmentVerifications.json`

This file defines the verifications shown in the "General Environment" section at the top of the application. It now supports a header configuration with dropdown selectors.

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
        "noOptionsText": "No projects found",
        "commandOnChange": "gcloud config set project ${gcloudProject}"
      }
    ]
  },
  "categories": [
    {
      "category": {
        "title": "Cloud",
        "verifications": [
          {
            "id": "gcloudInstalled",
            "title": "gcloud CLI installed",
            "checkType": "commandSuccess",
            "command": "gcloud --version",
            "fixCommand": "curl https://sdk.cloud.google.com | bash && exec -l $SHELL"
          }
        ]
      }
    }
  ]
}
```

**Structure**:
- `header` (optional): Header configuration for the environment section
  - `title`: Display title for the section
  - `dropdownSelectors`: Array of dropdown selector configurations (see [Dropdown Selectors](#dropdown-selectors))
- `categories`: Array of verification categories
  - `category.title`: Display name for the category
  - `category.verifications`: Array of verification objects (see [Verification Types](verification-types.md))

#### Auto-Fix Commands

Verifications can include an optional `fixCommand` property that provides automatic remediation for failed checks. When a verification fails and has a `fixCommand`, an orange "Fix" button appears in the UI.

For detailed information about all verification types and fix command features, see [Verification Types](verification-types.md).

### 2. Configuration Sidebar Sections

**File**: `src/configurationSidebarSections.json`

Defines the UI structure and components for each section in the configuration sidebar. It also includes top-level display settings like `projectName`.

```json
{
  "settings": {
    "projectName": "MyProject",
    "openDevToolsByDefault": false,
    "autoSetupTimeoutSeconds": 90,

    "sidebarDefaultExpanded": false,
    "terminalScrollback": 1000,
    "maxFloatingTerminals": 10,
    "terminalFontSize": 14,
    "configurationDefaultExpanded": true
  },
  "sections": [
    {
      "id": "frontend",
      "title": "Frontend",
      "testSection": false,
      "components": {
        "toggle": true,
        "infoButton": true,
        "gitBranch": true,
        "deploymentOptions": true,
        "modeSelector": {
          "options": ["development", "staging", "production"],
          "labels": ["Development", "Staging", "Production"],
          "default": "development"
        },
        "attachToggle": {
          "enabled": true,
          "mutuallyExclusiveWith": ["backend"]
        },
        "subSections": [
          {
            "id": "frontend-sub",
            "title": "Frontend",
            "components": {
              "toggle": true
            }
          }
        ],
        "customButton": {
          "id": "viewFrontendLogs",
          "label": "View Frontend Logs",
          "commandId": "frontendLogCommand"
        }
      }
    }
  ]
}
```

**Application Settings**:

The `settings` object contains application-wide configuration options that control behavior, appearance, and limits across the entire application.

- **`projectName`** (string, default: "Project"): The display name shown in the UI title and throughout the application. This is customizable per installation - for example, the current configuration uses "ISO" as the project name for the Isolation project. You can change this to match your specific project name.

- **`openDevToolsByDefault`** (boolean, default: false): Whether to automatically open Chrome Developer Tools when the application starts. Useful for debugging during development.

- **`autoSetupTimeoutSeconds`** (number, default: 60): The timeout in seconds for Auto Setup commands. Commands that run longer than this will be automatically terminated. Configurable to accommodate different command complexity and system performance.

- **`loadingScreenTimeoutSeconds`** (number, default: 15): Maximum time to show the loading screen before timing out. If not specified, 15 seconds are used.

- **`sidebarDefaultExpanded`** (boolean, default: false): Whether the App Control Sidebar (floating terminal management sidebar) should be expanded by default when the application starts. When false, the sidebar starts collapsed.

- **`terminalScrollback`** (number, default: 1000): The number of lines to keep in terminal scrollback buffer. Higher values allow scrolling back through more command output history but use more memory.

- **`maxFloatingTerminals`** (number, default: 10): The maximum number of floating terminals that can be open simultaneously. When this limit is reached, attempting to open additional floating terminals will show a warning notification.

- **`terminalFontSize`** (number, default: 14): The font size in pixels for terminal text. Affects both main terminal tabs and floating terminals.

- **`configurationDefaultExpanded`** (boolean, default: true): Whether the ProjectConfiguration sidebar (main configuration panel) should be expanded by default when the application starts. When false, the configuration panel starts collapsed and can be expanded using the arrow button.

**Top-Level Section Properties**:
- `id` (string): A unique identifier for the section. Used to link commands and "About" info.
- `title` (string): The display name for the section in the UI.
- `testSection` (boolean): If `true`, marks the section as a test/development section. Test sections are hidden by default and can be toggled via the debug tools. Commands from hidden test sections are excluded from "Run {ProjectName}".
- `components` (object): Contains the definitions for the UI components to be rendered in this section.

**Section Components**:

#### Toggle
```json
"toggle": true
```
Adds a main enable/disable toggle for the section.

#### Info Button
```json
"infoButton": true
```
Adds an info button that shows section description and verification status.

#### Git Branch Switcher
```json
"gitBranch": true
```
Adds a git branch selector dropdown for the section's directory.

#### Deployment Options
```json
"deploymentOptions": true
```
Adds a standardized container/process deployment selector. When set to `true`, it adds a two-button toggle for selecting between container and process deployment modes. This is the preferred way to handle deployment type selection for consistency across the application.

The deploymentOptions is actually implemented using the ModeSelector component internally with fixed options for "Container" and "Process", providing a consistent UI pattern for deployment selection.

#### Mode Selector
```json
"modeSelector": {
  "options": ["development", "staging", "production"],
  "labels": ["Development", "Staging", "Production"],
  "default": "development"
}
```
Adds a multi-option selector for environment modes. The configuration supports:
- `options`: Array of mode values (required)
- `labels`: Array of display labels matching the options (optional, will capitalize options if not provided)
- `default`: Default mode value (optional)

Use this for any custom mode selection beyond the standard container/process deployment options. While both deploymentOptions and modeSelector use the same underlying ModeSelector component, they serve different purposes in the configuration:
- `deploymentOptions`: Specifically for container/process selection, using the `.deploymentType` state property
- `modeSelector`: For any other type of mode selection, using the `.mode` state property

These should be used correctly in the command conditions:
```json
{
  "conditions": {
    "deploymentType": "container" // For deploymentOptions
  }
}
```
```json
{
  "conditions": {
    "mode": "development" // For modeSelector
  }
}
```

#### Attach Toggle
```json
"attachToggle": {
  "enabled": true,
  "mutuallyExclusiveWith": ["other-section-id"]
}
```
Adds an attach debugger toggle. Can be mutually exclusive with other sections.

#### Sub-sections
```json
"subSections": [
  {
    "id": "frontend-sub",
    "title": "Frontend Features",
    "components": {
      "toggle": true,
      "modeSelector": {
        "options": ["optionA", "optionB"],
        "labels": ["Option A", "Option B"]
      },
      "dropdownSelectors": [
        {
          "id": "subSectionDropdownExample",
          "command": "echo \"SubVal1\nSubVal2\"",
          "parseResponse": "lines",
          "placeholder": "Select sub-value...",
          "dependsOn": "mainSectionDropdownId"
        }
      ]
    }
  }
]
```
Adds collapsible sub-sections with their own components, including toggles, deployment options, and even their own dropdown selectors.

#### Dropdown Selectors
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
Adds generic dropdown selectors that execute commands and populate options dynamically. See [Dropdown Selectors](#dropdown-selectors) for detailed configuration.

#### Test Section Flag
```json
"testSection": true
```
Marks a section as a test/development section. Test sections are hidden by default and can be shown/hidden via the debug tools in the **App Control Sidebar**. Commands from hidden test sections are excluded when "Run {ProjectName}" is pressed.

## Custom Sidebar Buttons and Floating Terminals

You can add custom buttons to any section in the sidebar that, when clicked, will execute a predefined command in a new **floating terminal**. These floating terminals are independent windows that are draggable, resizable, have minimize/close controls, and are managed via the **App Control Sidebar** (located on the right edge of the application). If "No Run Mode" is active, the command will be displayed in the floating terminal but not executed.

Custom buttons can be defined in two ways:

**Single Button**: Add a `customButton` object to the `components` of a section:
```json
"customButton": {
  "id": "myButton",
  "label": "View Logs", 
  "commandId": "myLogCommand"
}
```

**Multiple Buttons**: Add a `customButtons` array to the `components` of a section:
```json
"customButtons": [
  {
    "id": "button1",
    "label": "Run Storybook",
    "commandId": "runStorybook"
  }
]
```

### Custom Button Properties:

-   `id` (string, required): A unique identifier for this button instance.
-   `label` (string, required): The text that will be displayed on the button.
-   `commandId` (string, required): This is a crucial identifier that links this button to its command definition and its "About" information.

### Linking to Commands:

The `commandId` from your `customButton` configuration maps to an entry in `src/configurationSidebarCommands.json`. In this file, you need an object where the `id` property matches your `customButton.commandId`.

This command object defines:
-   `command.base` (string): The actual shell command to be executed in the floating terminal.
-   `command.tabTitle` (string): The title that will be displayed in the title bar of the floating terminal.

### Linking to "About" Information:

Similarly, the `commandId` can map to an entry in `src/configurationSidebarAbout.json`. An object in this file with a `sectionId` matching your `customButton.commandId` will provide the content for the "About" box associated with that floating terminal.

This "About" object typically contains:
-   `description` (string): A text description of what the command or terminal does.
-   `verifications` (array, optional): An array of verification objects (though less common for simple custom commands).

### Example:

Let's say you want to add a button to the "alpha + MariaDB" section to quickly view its specific logs.

**1. In `src/configurationSidebarSections.json` (inside the "alpha" section's `components`):**
```json
{
  "id": "alpha",
  "title": "alpha + MariaDB",
  "components": {
    // ... other components ...
    "customButton": {
      "id": "alphaViewLogsButton",
      "label": "View alpha Logs",
      "commandId": "alphaLogViewerCommand"
    }
  }
}
```

**2. In `src/configurationSidebarCommands.json`:**
```json
[
  // ... other commands ...
  {
    "id": "alphaLogViewerCommand",
    "command": {
      "base": "tail -f /var/log/alpha.log", // Example command
      "tabTitle": "alpha Logs"
    }
  }
]
```

**3. In `src/configurationSidebarAbout.json`:**
```json
[
  // ... other about entries ...
  {
    "sectionId": "alphaLogViewerCommand",
    "description": "Displays live logs from the main alpha service.",
    "verifications": []
  }
]
```

With this setup:
- A "View alpha Logs" button will appear in the "alpha + MariaDB" section.
- Clicking it will open a floating terminal titled "alpha Logs" running `tail -f /var/log/alpha.log`.
- The "About" information for this terminal (accessible via the **App Control Sidebar**) will show the description "Displays live logs from the main alpha service."

### 3. Configuration Sidebar About

**File**: `src/configurationSidebarAbout.json`

Contains section descriptions and verification definitions.

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

**Properties**:
- `sectionId`: Must match the ID in `configurationSidebarSections.json`
- `directoryPath`: Relative path to the section's directory (optional if `skipVerification` is true)
- `description`: Text shown in the info popup
- `verifications`: Array of verification objects for this section (optional if `skipVerification` is true)
- `skipVerification`: Boolean flag to skip all verifications for this section (optional, defaults to false)

### 4. Configuration Sidebar Commands

**File**: `src/configurationSidebarCommands.json`

Defines command generation logic for each top-level section and also for individual sub-sections if they need to run their own commands in separate tabs. The command `id` should match an `id` from `configurationSidebarSections.json` (for a top-level section) or a `subSection.id` (for a sub-section within a top-level section).

Commands should be defined using separate command objects for each variant. This approach provides better reliability, maintainability, and clarity.

```json
[
  {
    "id": "your-section",
    "conditions": {
      "enabled": true,
      "deploymentType": "container"
    },
    "command": {
      "base": "cd your-section && docker-compose up",
      "prefix": "nvm use 16 && ",
      "tabTitle": "Your Section (Container)"
    }
  },
  {
    "id": "your-section",
    "conditions": {
      "enabled": true,
      "deploymentType": "process"
    },
    "command": {
      "base": "cd your-section && npm start",
      "prefix": "nvm use 16 && ",
      "tabTitle": "Your Section (Process)"
    }
  }
]
```

**Command Structure**:
- `id`: ID of the section or sub-section (must match an ID from `configurationSidebarSections.json`)
- `conditions`: Object with condition properties that must all be true for the command to be generated
- `command`: Command configuration object

**Command Object Properties**:
- `base`: Base command string
- `associatedContainers`: Array of Docker containers managed by this tab
  - Simple strings: `["container1", "container2"]`
  - Conditional objects: `{ "name": "container", "condition": "expression" }`
- `modifiers`: Array of conditional modifiers that modify the command
- `postModifiers`: String always appended after modifiers
- `excludes`: Array of exclusion conditions (typically for `-x` flags)
- `finalAppend`: String appended at the very end
- `prefix`: String prepended to the entire command
- `tabTitle`: Terminal tab title configuration
- `refreshConfig`: Configuration for command modifications during refresh

**Condition Evaluation**:
Conditions in the `conditions` object are simple key-value pairs:
- `"enabled": true` - The section must be enabled
- `"deploymentType": "container"` - The deployment type must match
- `"mode": "production"` - The mode must match

For more complex conditions in modifiers, use JavaScript expressions:
- `"condition": "mode === 'development' && debugEnabled"`
- `"condition": "attachState.frontend === true"`
- `"condition": "frontendConfig.enabled && frontendConfig.deploymentType === 'dev'"`

**Associated Containers**:
When a tab with associated containers is:
- **Opened**: Containers are tracked by the terminal
- **Closed**: All associated containers are stopped
- **Refreshed**: Containers are stopped and restarted
- **Application Exit**: All containers are gracefully stopped

## State Management

The application maintains state for each section:

```javascript
{
  sections: {
    frontend: {
      enabled: true,
      pathStatus: 'valid',
      gitBranch: 'main',
      deploymentType: 'normal',
      mode: 'development',
      attachState: false,
      frontendConfig: {
        enabled: true,
        deploymentType: 'option1'
      }
    }
  }
}
```

## Adding New Sections

Adding a new section requires updating three JSON files. No code changes needed! Both top-level sections and their sub-sections can have their own command definitions in `configurationSidebarCommands.json` to open dedicated terminal tabs. Custom buttons can also be added to trigger floating terminals.

### Step-by-Step Guide

#### 1. Add UI Structure (`configurationSidebarSections.json`)

Define the main section, any sub-sections, and components like `customButton`.

```json
{
  "settings": {
    "projectName": "YourProject"
    // Additional settings available - see Configuration Guide for complete list
  },
  "sections": [
    {
      "id": "your-main-section",
      "title": "Your Main Section",
      "components": {
        "toggle": true,
        "infoButton": true,
        "gitBranch": true,
        "deploymentOptions": true,
        "modeSelector": {
          "options": ["run", "suspend"],
          "labels": ["Run", "Suspend"],
          "default": "suspend"
        },
        "attachToggle": {
          "enabled": true,
          "mutuallyExclusiveWith": ["other-section-id"]
        },
        "subSections": [
          {
            "id": "your-subsection-id",
            "title": "My Sub-Section with Dropdown",
            "components": {
              "toggle": true,
              "dropdownSelectors": [
                {
                  "id": "mySubDropdown",
                  "command": "echo \"SubOption1\nSubOption2\"",
                  "placeholder": "Select sub option..."
                }
              ]
            }
          }
        ],
        "logsButton": true,
        "customButton": {
          "id": "myCustomLogButton",
          "label": "View Specific Logs",
          "commandId": "myCustomLogCommand"
        }
      }
    }
  ]
}
```

#### 2. Add Description and Verifications (`configurationSidebarAbout.json`)

Provide "About" info for your `customButton`'s `commandId` if it opens a floating terminal.
```json
{
  "sectionId": "your-main-section",
  "directoryPath": "your-main-section",
  "description": "Description of what this section does and its purpose.",
  "verifications": [
    {
      "id": "yourSectionDirExists",
      "title": "./your-main-section directory exists",
      "checkType": "pathExists",
      "pathValue": "./your-main-section",
      "pathType": "directory"
    }
  ]
},
{
  "sectionId": "myCustomLogCommand",
  "description": "Displays specific logs for My Custom Log Button.",
  "verifications": []
}
```

#### 3. Add Command Logic (`configurationSidebarCommands.json`)

Define commands for main sections and for `customButton` actions.

```json
[
  {
    "sectionId": "your-section",
    "conditions": {
      "enabled": true,
      "deploymentType": "container"
    },
    "command": {
      "base": "cd your-section && docker-compose up",
      "prefix": "nvm use 16 && ",
      "tabTitle": "Your Section (Container)"
    }
  },
  {
    "sectionId": "your-section", 
    "conditions": {
      "enabled": true,
      "deploymentType": "process"
    },
    "command": {
      "base": "cd your-section && npm start",
      "prefix": "nvm use 16 && ",
      "tabTitle": "Your Section (Process)"
    }
  },
  {
    "sectionId": "myCustomLogCommand",
    "command": {
      "base": "tail -f /var/log/specific.log",
      "tabTitle": "Specific Logs"
    }
  }
]
```

##### Full Example with All Features

```json
{
  "sectionId": "your-main-section-or-subsection-id", // Can be a top-level sectionId or a subSectionId
  "conditions": {
    "enabled": true,
    "deploymentType": "container"
  },
  "command": {
    "base": "cd your-section && docker-compose up",
    "associatedContainers": [
      "container-name-1",
      "container-name-2",
      { "name": "conditional-container", "condition": "deploymentType === 'container'" }
    ],
    "postModifiers": " --verbose",
    "prefix": "nvm use 16 && ",
    "tabTitle": {
      "base": "Your Main Section",
      "conditionalAppends": [
        {
          "condition": "mode === 'development'",
          "append": " (Dev)"
        },
        {
          "condition": "mode === 'staging'",
          "append": " (Staging)"
        }
      ]
    },
    "refreshConfig": {
      "prependCommands": [
        {
          "command": "make build && ",
          "condition": "needsRebuild === true"
        }
      ]
    }
  }
}
```

**Note:** For sections with complex conditions or commands that differ significantly between modes (like `url-intelligence-sub`), use separate command objects instead of modifiers to avoid JavaScript evaluation errors.

#### 4. Create Directory Structure

```bash
mkdir your-main-section
cd your-main-section
git init
# Add your project files
```

The section will automatically appear in the UI with full functionality.

### Available Components

<details>
<summary>Click to expand complete component reference</summary>

| Component | Description | Options |
|-----------|-------------|---------|
| `toggle` | Main enable/disable toggle | `true/false` |
| `infoButton` | Shows section description | `true/false` |
| `gitBranch` | Git branch switcher | `true/false` |
| `deploymentOptions` | Standardized container/process selector | `true` or `[{ value: "container", status?: "TBD" }, { value: "process" }]` |
| `modeSelector` | Custom multi-option mode selector | `{ options: (string[] \| { value: string, status?: "TBD" }[]), labels?: string[], default: "" }` |
| `attachToggle` | Attach debugger toggle | `{ enabled: true, mutuallyExclusiveWith: [] }` |
| `dropdownSelectors` | Generic command-driven dropdowns with default value support | Array of dropdown configs |
| `subSections` | Nested sub-sections | Array of sub-section configs |
| `customButton` | Button to trigger actions, often opening a floating terminal (e.g., for logs) | `{ id: "", label: "", commandId: "" }` |
| `testSection` | Mark as test/development section (hidden by default) | `true/false` |

</details>

## Special Features

### Skip Verification

For sections that don't require path or verification checks (like UI-only sections), you can use the `skipVerification` flag:

```json
{
  "sectionId": "frontend",
  "skipVerification": true,
  "description": "Frontend section without specific path verification."
}
```

This will:
- Skip all verification checks for the section
- Show the section as always valid in the UI
- Not require `directoryPath` or `verifications` properties

## Best Practices

### Naming Conventions
- Use kebab-case for `id` in JSON files
- Use camelCase for state property names (automatically converted)
- Use descriptive, unique IDs for verifications and commands

### Command Design
- Keep commands focused and single-purpose
- Use meaningful tab titles that include context
- Include proper error handling in commands
- Test commands manually before adding to configuration

### Verification Strategy
- Include essential path and tool checks
- Use appropriate check types for different scenarios
- Provide clear, descriptive titles
- Test verification logic thoroughly

### UI Components
- Only include components that add value
- Use deployment options when multiple modes are available
- Group related functionality in sub-sections
- Provide helpful button labels and variants

## Dropdown Selectors

Dropdown selectors provide a generic, JSON-configurable way to create dynamic dropdowns that execute commands and populate options. They can be used in both environment verification headers and configuration sections.

### Configuration Properties

<details>
<summary>Click to expand detailed configuration options</summary>

```json
{
  "id": "uniqueDropdownId",
  "command": "shell command to execute",
  "parseResponse": "lines|json|function",
  "placeholder": "Select option...",
  "loadingText": "Loading options...",
  "errorText": "Error loading options",
  "noOptionsText": "No options available",
  "dependsOn": "otherDropdownId",
  "commandArgs": {
    "argName": "argValue"
  },
  "defaultValue": {
    "exact": "exact match string",
    "contains": "substring to match"
  },
  "commandOnChange": "shell command to execute when value changes"
}
```

**Required Properties:**
- `id`: Unique identifier for the dropdown
- `command`: Shell command to execute for fetching options

**Optional Properties:**
- `parseResponse`: How to parse command output (default: "lines")
- `placeholder`: Text shown when no option is selected
- `loadingText`: Text shown while loading options
- `errorText`: Text shown when command fails
- `noOptionsText`: Text shown when no options are available
- `dependsOn`: ID of another dropdown that this one depends on
- `commandArgs`: Object with command arguments
- `defaultValue`: Object specifying default selection behavior
  - `exact`: Exact string match for default selection
  - `contains`: Substring match for default selection (first match is selected)
  - If both `exact` and `contains` are provided, `exact` takes precedence
  - If no match is found, falls back to first option or placeholder
- `commandOnChange`: Shell command to execute when dropdown value changes
  - Variables can be referenced using `${dropdownId}` syntax
  - Executed automatically when user selects a different option
  - Provides user feedback via notifications (success/error messages)
  - Non-blocking: command failures don't prevent dropdown value changes

**Default Selection Behavior:**
1. If `defaultValue` is provided:
   - First tries to find an exact match using `defaultValue.exact`
   - If no exact match, looks for first option containing `defaultValue.contains`
   - If no match is found, falls back to first option or placeholder
2. If no `defaultValue` is provided:
   - Selects the first option by default
3. If `value` prop is provided (controlled component):
   - Ignores `defaultValue` and uses the provided value

</details>

**Example with Default Value:**
```json
{
  "id": "kubectlContext",
  "command": "kubectl config get-contexts -o name",
  "parseResponse": "lines",
  "placeholder": "Select context...",
  "defaultValue": {
    "contains": "gke"  // Will select first context containing "gke"
  }
}
```

**Example with Command on Change:**
```json
{
  "id": "gcloudProject",
  "command": "gcloud projects list --format=\"value(projectId)\"",
  "parseResponse": "lines",
  "placeholder": "Select project...",
  "defaultValue": {
    "contains": "dev"
  },
  "commandOnChange": "gcloud config set project ${gcloudProject}"
}
```

**Command on Change Features:**
- **Variable Substitution**: Use `${dropdownId}` to reference the selected value
- **Multiple Variable Support**: Can reference other dropdown values like `${kubectlContext}`
- **Environment Variables**: Standard environment variable resolution is supported
- **User Feedback**: Success/failure notifications are automatically shown
- **Error Handling**: Command failures are logged but don't block dropdown operations
- **Performance**: Commands are executed asynchronously without blocking the UI

#### Marking Options as "TBD" (To Be Determined)

You can mark a specific mode or deployment option as "not yet implemented" by changing the `options` array from a simple array of strings to an array of objects. This allows you to visually disable an option while keeping it in the UI as a placeholder for a future feature.

-   **`value`**: The actual value of the option (e.g., "container", "run").
-   **`status`**: (Optional) Set to `"TBD"` to mark the option as not yet implemented.

When an option is marked as "TBD":
-   It will be visually grayed out and will show a "wrench" icon.
-   The default selection will automatically skip over it.
-   Clicking it will show an informative notification to the user without changing the current selection.

**Example:**
```json
"deploymentOptions": [
  { "value": "container", "status": "TBD" },
  { "value": "process" }
],
"modeSelector": {
  "options": [
    { "value": "run" },
    { "value": "suspend" },
    { "value": "debug", "status": "TBD" }
  ],
  "default": "run"
}
```

### `attachToggle`
```json
"attachToggle": {
  "enabled": true,
  "mutuallyExclusiveWith": ["other-section-id"]
}
```
Adds an attach debugger toggle. Can be mutually exclusive with other sections.

## Related Documentation

- [Getting Started](getting-started.md) - Initial configuration setup
- [Command System](command-system.md) - Command generation from configuration
- [Verification Types](verification-types.md) - Environment verification configuration
- [Architecture Overview](architecture-overview.md) - How configuration drives the system
- [Adding New Sections](#adding-new-sections) - Step-by-step guide for new sections
