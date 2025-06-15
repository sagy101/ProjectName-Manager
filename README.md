# {ProjectName} Manager

> **Note:** The Electron app requires Node.js **22.16.0**. Terminal commands for Isolation Project can run on Node.js **15** or **16**. It is recommended to use [nvm](https://github.com/nvm-sh/nvm) to manage multiple Node.js versions. Once you have `nvm` installed, you can run `nvm use` in the project directory to automatically switch to the correct version for the Electron runtime.

[![Electron](https://img.shields.io/badge/Electron-30.0.1-47848F?style=flat&logo=electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Latest-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)](https://github.com/electron/electron)

A powerful, modular desktop application for managing {ProjectName} environments with integrated terminal support, environment verification, and dynamic configuration management.

This project is also an experiment in "vibe coding" mixed with solid code practices. I explored a variety of AI tools and language models to see how they complement traditional development. Details can be found in the [AI Coding Experiment](docs/llm-experiments.md) document.

## 🚀 Features

- **Dynamic Environment Verification**: JSON-configurable verification system for tools and dependencies
  - **Auto-Fix Commands**: One-click fix buttons for failed verifications with automatic re-validation
- **Generic Dropdown Selectors**: Command-driven dropdowns with dependency chains and default value selection (e.g., gcloud projects, kubectl contexts)
- **Header Configuration**: Configurable environment section headers with integrated dropdowns
- **Integrated Terminal**: Full PTY terminal support with tab management for main tasks
  - **Read-Only Main Terminals**: Main execution terminals are read-only by default for safety, with a debug option to enable input
- **Floating Terminals**: Draggable, resizable, and minimizable floating terminals for specific tasks (e.g., viewing logs via custom buttons)
  - **Fix Command Terminals**: Special floating terminals that auto-close when fix commands complete
- **App Control Sidebar**: Centralized sidebar for managing floating terminals and accessing debug/developer tools
- **Tab Information Panel**: Detailed tab info for main terminals with command viewing and conditional refresh
- **Conditional Command Refresh**: Re-run main terminal commands with dynamic modifications based on current state
- **Associated Containers Management**: Automatic Docker container lifecycle management tied to terminal tabs
- **Modular Configuration**: Add new sections and verifications without code changes
  - **Sub-section Command Generation**: Sub-sections can define and run their own independent commands in separate tabs
- **Git Integration**: Branch switching and repository management
- **Real-time Status Updates**: Live monitoring of environment states
- **Test Section Management**: Hide/show test sections via the debug tools in the App Control Sidebar. Commands from hidden test sections are excluded from "Run {ProjectName}"
- **No Run Mode**: Preview commands without execution in both main and floating terminals
- **No Special Cases**: All sections handled uniformly through JSON configuration
- **Cross-platform**: Works on macOS, Linux, and Windows

## 🔧 Table of Contents

- [Quick Start](#🏃-quick-start)
- [Configuration](#⚙️-configuration)
  - [Custom Buttons & Floating Terminals](#custom-buttons--floating-terminals)
- [Adding New Sections](#🔧-adding-new-sections)
- [Environment Verification](#🔍-environment-verification)
- [Terminal Integration](#💻-terminal-integration)
  - [Main Terminals](#main-terminals)
  - [Floating Terminals](#floating-terminals)
- [App Control Sidebar & Debug Tools](#🛠️-app-control-sidebar--debug-tools)
- [Development](#🛠️-development)
- [Troubleshooting](#🐛-troubleshooting)
- [Configuration Export/Import](#configuration-exportimport)

## 🏃 Quick Start

### Prerequisites

- Node.js 22.16.0 for the Electron app
- Node.js 15 or 16 for command execution
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd {project-name}-manager

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Start the application
npm start
```

### Development Mode

```bash
# Build and watch for changes
npm run watch

# In another terminal, start the app
npm start
```

## ⚙️ Configuration

{ProjectName} Manager uses a modular JSON-based configuration system. All configurations are stored in the `src/` directory:

<details>
<summary><strong>Configuration Files Overview</strong></summary>

| File | Purpose |
|------|---------|
| `generalEnvironmentVerifications.json` | General environment tool verifications with header configuration |
| `configurationSidebarSections.json` | UI structure, components, dropdown selectors, custom buttons, and display settings (like `projectName`) |
| `configurationSidebarAbout.json` | Section descriptions, verifications, and "About" info for floating terminal commands |
| `configurationSidebarCommands.json` | Command generation logic for main sections and floating terminal custom buttons |

</details>

### Key Configuration Concepts

- **Sections**: Logical groupings of related functionality (e.g., frontend, backend, cloud)
- **Verifications**: Checks for required tools, paths, or environment variables
- **Commands**: Dynamic command generation based on configuration state for main tasks and floating terminals
- **Components**: UI elements like toggles, buttons, and dropdowns
- **Custom Buttons**: Buttons within sections that can trigger actions, typically opening a floating terminal with a specific command
- **Dropdown Selectors**: Generic command-driven dropdowns with dependency support
- **Header Configuration**: Configurable environment section headers with integrated controls
- **Test Sections**: Sections marked for development/testing that can be hidden/shown via debug tools. Commands from hidden test sections are excluded from "Run {ProjectName}"

### Custom Buttons & Floating Terminals
You can add `customButton` entries to sections in `configurationSidebarSections.json`. These buttons can execute predefined commands (from `configurationSidebarCommands.json`) in new **floating terminals**. These terminals are draggable, resizable, have minimize/close buttons, and are managed via the **App Control Sidebar**.

See [docs/configuration-guide.md](docs/configuration-guide.md) for details on configuring `customButton` and linking them to commands and "About" information.

## 🔧 Adding New Sections

Adding a new section requires updating three JSON files. No code changes needed! Both top-level sections and their sub-sections can have their own command definitions in `configurationSidebarCommands.json` to open dedicated terminal tabs. Custom buttons can also be added to trigger floating terminals.

<details>
<summary><strong>Step-by-Step Guide</strong></summary>

### 1. Add UI Structure (`configurationSidebarSections.json`)

Define the main section, any sub-sections, and components like `customButton`.

```json
{
  "displaySettings": {
    "projectName": "YourProject"
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

### 2. Add Description and Verifications (`configurationSidebarAbout.json`)

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

### 3. Add Command Logic (`configurationSidebarCommands.json`)

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

#### Full Example with All Features

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

### 4. Create Directory Structure

```bash
mkdir your-main-section
cd your-main-section
git init
# Add your project files
```

</details>

### Component Options

<details>
<summary><strong>Available Components</strong></summary>

| Component | Description | Options |
|-----------|-------------|---------|
| `toggle` | Main enable/disable toggle | `true/false` |
| `infoButton` | Shows section description | `true/false` |
| `gitBranch` | Git branch switcher | `true/false` |
| `deploymentOptions` | Standardized container/process selector | `true` or `[{ value: "container", status?: "TBD" }, { value: "process" }]` |
| `modeSelector` | Custom multi-option mode selector | `{ options: (string[] | { value: string, status?: "TBD" }[]), labels?: string[], default: "" }` |
| `attachToggle` | Attach debugger toggle | `{ enabled: true, mutuallyExclusiveWith: [] }` |
| `dropdownSelectors` | Generic command-driven dropdowns with default value support | Array of dropdown configs |
| `subSections` | Nested sub-sections | Array of sub-section configs |
| `customButton` | Button to trigger actions, often opening a floating terminal (e.g., for logs) | `{ id: "", label: "", commandId: "" }` |
| `testSection` | Mark as test/development section (hidden by default) | `true/false` |

</details>

## 🔍 Environment Verification

The verification system supports multiple check types for comprehensive environment validation, with optional auto-fix capabilities.

### Auto-Fix Commands

Failed verifications can include fix commands that automatically attempt to resolve issues:

```json
{
  "id": "mirrorDirExists",
  "title": "./weblifemirror directory exists",
  "checkType": "pathExists", 
  "pathValue": "./weblifemirror",
  "pathType": "directory",
  "fixCommand": "mkdir -p ./weblifemirror"
}
```

**Fix Command Features:**
- **One-Click Fix**: Orange "Fix" button appears next to invalid verifications
- **Floating Terminal**: Fix commands run in dedicated floating terminals
- **Auto-Close**: Terminals close automatically when command completes (if minimized)
- **Re-Validation**: Verification automatically re-runs after fix completes
- **Safety Features**: Close button disabled for 20 seconds to prevent accidental closure
- **Smart Notifications**: Success/failure feedback after fix attempts

<details>
<summary><strong>Verification Types</strong></summary>

### Command Success (`commandSuccess`)
Checks if a command executes successfully:
```json
{
  "id": "nodeInstalled",
  "title": "Node.js installed",
  "checkType": "commandSuccess",
  "command": "node --version"
}
```

### Output Contains (`outputContains`)
Verifies command output contains specific text. Can also check for one of multiple values and capture the found value.
```json
{
  "id": "nodeVersionCheck",
  "title": "Node.js 15.x or 16.x",
  "checkType": "outputContains",
  "command": "nvm ls",
  "expectedValue": ["v15.", "v16."],
  "versionId": "nodeVersion",
  "outputStream": "stderr"
}
```

### Environment Variable Checks
```json
{
  "id": "homeSet",
  "title": "$HOME environment variable set",
  "checkType": "envVarExists",
  "variableName": "HOME"
}
```

### Path Existence
```json
{
  "id": "projectDir",
  "title": "Project directory exists",
  "checkType": "pathExists",
  "pathValue": "./my-project",
  "pathType": "directory"
}
```

</details>

For complete verification reference, see [docs/verification-types.md](docs/verification-types.md).

## 💻 Terminal Integration

{ProjectName} Manager provides a rich terminal experience.

### Main Terminals
- **Multiple Tabs**: For commands related to main configuration sections.
- **Read-Only by Default**: Input is disabled by default for safety. Can be enabled via debug tools.
- **Tab Information Panel**: Detailed info, command viewing, and conditional refresh.
- **Process & Container Management**: Lifecycle tied to tabs.

### Floating Terminals
- Typically launched by **Custom Buttons** in configuration sections (e.g., "View Logs").
- **Draggable & Resizable**: Windows can be moved and resized.
- **Minimize & Close**: Standard window controls.
- **Always Writable**: Input is enabled for interaction.
- **"No Run Mode" Aware**: Will display commands instead of executing if "No Run Mode" is active.
- Managed via the **App Control Sidebar**.

For detailed documentation on terminal features, see [Terminal Features Guide](docs/terminal-features.md).

## 🛠️ App Control Sidebar & Debug Tools
The **App Control Sidebar**, accessible from the right edge of the application, provides:
- Management of active **Floating Terminals** (show, minimize, view "About" info, close).
- Access to **Debug Tools** via a gear icon at the bottom.

When any debug options are active, the gear icon will show an orange border.

### Debug Tools Features (within App Control Sidebar)

**Developer Utilities**
- **Open Dev Tools**: Opens Chrome Developer Tools.
- **Reload App**: Reloads the entire application.
- **Export Environment**: Exports comprehensive environment verification data including command outputs and system information.
- **Toggle All Verifications**: Toggles all visible verification statuses between valid/invalid for testing purposes.
  - If any verifications are invalid, sets all to valid. Otherwise sets all to invalid.
  - Only affects verifications from visible sections (respects test section visibility).

**Visibility Options**
- **Show/Hide Test Sections**: Toggle visibility of sections marked `testSection: true`.
  - Hidden by default. Commands from hidden test sections are excluded when "Run {ProjectName}" is pressed.

**Execution Modes**
- **No Run Mode**: Commands are displayed but not executed in both main and floating terminals.
- **Terminal Input Mode**: Toggle the main tabbed terminals between read-only (default) and writable. Disabled when an {ProjectName} configuration is running.

## 🛠️ Development

### Project Structure

```
{ProjectName}-manager/
├── src/
│   ├── components/          # React components
│   ├── constants/           # Shared constants
│   ├── styles/              # CSS styles
│   ├── *.json              # Configuration files
│   └── renderer.jsx         # Main renderer entry
├── main.js                  # Electron main process
├── electron-preload.js      # Preload script
└── docs/                    # Documentation
```

### Building

```bash
# Development build
npm run build

# Watch mode for development
npm run watch
```

### Native Module Rebuilding

After installing new native dependencies:

```bash
npm run rebuild
```



## 🐛 Troubleshooting

<details>
<summary><strong>Common Issues</strong></summary>

### Terminal Not Working
- Ensure `node-pty` is properly rebuilt: `npm run rebuild`
- Check that your shell is properly configured
- Verify PTY permissions on your system

### Verification Failures
- Check that required tools are installed and in PATH
- Verify JSON configuration syntax
- Review console logs for detailed error messages

### Git Integration Issues
- Ensure git is installed and configured
- Check repository initialization in project directories
- Verify branch permissions and remote access

### Test Sections Not Showing
- Open debug panel (gear icon)
- Click "Show Test Sections" button
- Test sections are hidden by default

### Main Terminals Not Accepting Input
- Main terminals are read-only by default.
- Enable input via Debug Tools: App Control Sidebar -> Gear Icon -> "Terminals Read-Only" button. This is disabled if an {ProjectName} is running.

</details>


## 📚 Additional Documentation

- [System Architecture](docs/architecture.md) - Overview of the system design and component interactions
- [Configuration Guide](docs/configuration-guide.md) - Detailed configuration options
- [Verification Types](docs/verification-types.md) - Complete verification reference
- [Command System](docs/command-system.md) - Command generation and execution
- [Terminal Features](docs/terminal-features.md) - Tab information panel
- [AI Coding Experiment](docs/llm-experiments.md) - Overview of vibe coding with various tools and models

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- UI powered by [React](https://reactjs.org/)
- Terminal integration via [node-pty](https://github.com/microsoft/node-pty)
- Icons from [Heroicons](https://heroicons.com/)

---

<div align="center">
  <strong>{ProjectName} Manager</strong> - Streamlining environment management, one configuration at a time.
</div>

## Configuration Export/Import

The application supports exporting and importing your complete configuration, including:

- **Section Settings**: Which sections are enabled/disabled
- **Deployment Types**: Container vs Process deployment modes
- **Mode Selections**: Development, staging, production modes
- **Dropdown Values**: Selected cloud projects, kubectl contexts, etc.
- **Attach States**: Debug attach configurations
- **Git Branches**: Current git branch for each service (NEW!)

### How to Export Configuration

1. Click the **Export Config** button in the app control sidebar (right side)
2. Choose a location to save your configuration file
3. The exported JSON will include all current settings and git branches

### How to Export Environment Data

1. Click the **Export Environment** button in the app control sidebar (right side)
2. The app will generate a comprehensive JSON file containing:
   - Platform information (OS type, release, architecture)
   - All environment verification results (valid/invalid status)
   - Command outputs from verification checks
   - Discovered tool versions
   - Timestamp of the export
3. This is useful for debugging environment issues or sharing system state

### How to Import Configuration

1. Click the **Import Config** button in the app control sidebar
2. Select a previously exported configuration file
3. The app will:
   - Restore all configuration settings
   - Attempt to switch each service to its saved git branch
   - Show a notification with the results of branch switching

### Git Branch Import Behavior

When importing a configuration with git branches:

- ✅ **Success**: If the branch exists and checkout succeeds
- ⚠️ **Partial Success**: Some branches switch successfully, others fail
- ❌ **Failure**: Branch doesn't exist or git errors occur

The notification will show the count of successful vs total branch switches, e.g.:
- `Configuration imported with all git branches switched (4/4)`
- `Configuration imported with some git branches switched (2/4)`
- `Configuration imported but git branch switching failed`

### Example Exported Configuration

```json
{
  "configState": {
    "mirror": {
      "enabled": true,
      "mode": "suspend",
      "deploymentType": "container"
    }
  },
  "attachState": {
    "mirror": false
  },
  "globalDropdownValues": {
    "gcloudProject": "my-project-dev"
  },
  "gitBranches": {
    "mirror": "feature/new-api",
    "gopm": "main",
    "rule-engine": "develop"
  }
}
```

This ensures your entire development environment can be quickly replicated across different machines or shared with team members.
