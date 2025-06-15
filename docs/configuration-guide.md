# Configuration Guide

This guide provides detailed information about configuring {ProjectName} Manager through its JSON-based configuration system.

## Overview

{ProjectName} Manager uses four main configuration files to define its behavior:

1. **`generalEnvironmentVerifications.json`** - General environment tool verifications
2. **`configurationSidebarSections.json`** - UI structure, components, and display settings (like `projectName`)
3. **`configurationSidebarAbout.json`** - Section descriptions, verifications, and "About" info for floating terminal commands
4. **`configurationSidebarCommands.json`** - Command generation logic for main sections and custom button actions

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
        "noOptionsText": "No projects found"
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

Verifications can include an optional `fixCommand` property that provides automatic remediation for failed checks:

```json
{
  "id": "nodeVersionCheck",
  "title": "Node.js 16.x",
  "checkType": "outputContains", 
  "command": "node --version",
  "expectedValue": "v16.",
  "fixCommand": "nvm install 16 && nvm use 16"
}
```

**Fix Command Features:**
- Appears as orange "Fix" button next to invalid verifications
- Runs in dedicated floating terminal with auto-close functionality
- Automatically re-runs verification after command completes
- Close button disabled for 20 seconds to prevent accidental closure
- Provides success/failure notifications

For detailed information about verification types and fix commands, see [Verification Types](verification-types.md).

### 2. Configuration Sidebar Sections

**File**: `src/configurationSidebarSections.json`

Defines the UI structure and components for each section in the configuration sidebar. It also includes top-level display settings like `projectName`.

```json
{
  "displaySettings": {
    "projectName": "MyProject"
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

**Component Types**:

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
Marks a section as a test/development section. Test sections are hidden by default and can be shown/hidden via the debug tools in the **App Control Sidebar**. Commands from hidden test sections are excluded when "Run {ProjectName}" (e.g., "Run {ProjectName}") is pressed.

## Custom Sidebar Buttons and Floating Terminals

You can add custom buttons to any section in the sidebar that, when clicked, will execute a predefined command in a new **floating terminal**. These floating terminals are independent windows that are draggable, resizable, have minimize/close controls, and are managed via the **App Control Sidebar** (located on the right edge of the application). If "No Run Mode" is active, the command will be displayed in the floating terminal but not executed.

To define a custom button, add a `customButton` object to the `components` array of a section within `src/configurationSidebarSections.json`.

### `customButton` Object Properties:

-   `id` (string, required): A unique identifier for this button instance.
-   `label` (string, required): The text that will be displayed on the button.
-   `commandId` (string, required): This is a crucial identifier that links this button to its command definition and its "About" information.

### Linking to Commands:

The `commandId` from your `customButton` configuration maps to an entry in `src/configurationSidebarCommands.json`. In this file, you need an object where the `sectionId` property matches your `customButton.commandId`.

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
    "sectionId": "alphaLogViewerCommand",
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

Defines command generation logic for each top-level section and also for individual sub-sections if they need to run their own commands in separate tabs. The `sectionId` in a command definition should match an `id` from `configurationSidebarSections.json` (for a top-level section) or a `subSection.id` (for a sub-section within a top-level section).

Commands should be defined using separate command objects for each variant. This approach provides better reliability, maintainability, and clarity.

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
  }
]
```

**Command Structure**:
- `sectionId`: ID of the section or sub-section (must match an ID from `configurationSidebarSections.json`)
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

## Dynamic Section Addition

To add a new section:

1. **Add to `configurationSidebarSections.json`**:
   Here you define the main section. If it has sub-sections, you define them here too. Sub-sections can have their own toggles, deployment options, and dropdown selectors.
   ```json
   {
     "id": "sub-feature-id",
     "title": "My Sub Feature",
     "components": {
       "toggle": true,
       "deploymentOptions": ["sub-option1", "sub-option2"],
       "dropdownSelectors": [
         {
           "id": "mySubDropdown",
           "command": "echo \"Data1\nData2\"",
           "placeholder": "Choose sub-data..."
         }
       ]
     }
   }
   ```

2. **Add to `configurationSidebarAbout.json`**:
   ```json
   {
     "sectionId": "my-new-section",
     "directoryPath": "my-new-section",
     "description": "Description of my new section.",
     "verifications": []
   }
   ```
   
   Or for sections without path verification:
   ```json
   {
     "sectionId": "my-new-section",
     "skipVerification": true,
     "description": "Description of my new section."
   }
   ```

3. **Add to `configurationSidebarCommands.json`**:
   Define command logic. The `sectionId` here can be the ID of your new top-level section, or the ID of a sub-section if it needs its own command tab.
   ```json
   {
     "sectionId": "my-new-section",
     "conditions": {
       "enabled": true
     },
     "command": {
       "base": "cd my-new-section && npm start",
       "associatedContainers": ["my-container"],
       "modifiers": [
         {
           "condition": "deploymentType === 'container'",
           "append": " --container-mode"
         }
       ],
       "tabTitle": "My New Section"
     }
   }
   ```

4. **Create the directory**:
   ```bash
   mkdir my-new-section-or-subsection-id
   cd my-new-section-or-subsection-id
   git init
   ```

The section will automatically appear in the UI with full functionality.

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
- Use kebab-case for `sectionId` in JSON files
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

## Troubleshooting Configuration

### Common Issues

1. **Section not appearing**: Check that `sectionId` matches across all three configuration files
2. **Commands not generating**: Verify condition expressions and state property names
3. **Verifications failing**: Test verification commands manually and check paths
4. **UI components not working**: Ensure component definitions are valid JSON

### Debugging Tips

1. Check browser console for JavaScript errors
2. Use the application's debug panel to test verification states
3. Verify JSON syntax with a JSON validator
4. Test commands in a terminal before adding to configuration

## Dropdown Selectors

Dropdown selectors provide a generic, JSON-configurable way to create dynamic dropdowns that execute commands and populate options. They can be used in both environment verification headers and configuration sections.

### Configuration Properties

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
  }
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

**Default Selection Behavior:**
1. If `defaultValue` is provided:
   - First tries to find an exact match using `defaultValue.exact`
   - If no exact match, looks for first option containing `defaultValue.contains`
   - If no match is found, falls back to first option or placeholder
2. If no `defaultValue` is provided:
   - Selects the first option by default
3. If `value` prop is provided (controlled component):
   - Ignores `defaultValue` and uses the provided value

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