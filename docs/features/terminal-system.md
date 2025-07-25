# Terminal System

> Comprehensive dual-terminal system with advanced process monitoring and management

<div align="center">
  <img src="../../assets/terminal.png" alt="Main Terminal Interface" width="100%">
  <p><em>Main tabbed terminals with integrated command execution and monitoring</em></p>
</div>

## Overview

{ProjectName} Manager features a sophisticated terminal system that goes beyond basic command execution. With both main tabbed terminals and floating terminals, plus advanced features like process monitoring and container management, it provides a complete terminal experience tailored for complex development environments.

### Terminal Types at a Glance

| Terminal Type | Purpose | Key Features |
|--------------|---------|--------------|
| **Main Terminals** | Primary service execution | Tabbed interface, read-only by default, container management |
| **Floating Terminals** | Auxiliary tasks & logs | Draggable windows, always writable, auto-minimize |

## Main Tabbed Terminals

These are the primary terminals for executing and monitoring your {ProjectName} configurations.

### Key Features

-   **Multiple Tabs**: Open multiple terminal sessions for main sections and sub-sections, managed within a tab bar.
-   **Read-Only by Default**: For safety during {ProjectName} runs, input to these terminals is disabled by default. Writable input can be enabled via the debug tools in the App Control Sidebar (this option is disabled if a {ProjectName} configuration is currently running).
-   **Interactive Command Execution**: When writable, allows direct interaction with the running process.
-   **Process Lifecycle Management**: Clean process handling, including associated Docker containers, with proper resource cleanup on tab close or application quit.
-   **Tab Information Panel**: Detailed insights into each tab's process.
-   **Conditional Command Refresh**: Ability to re-run commands with dynamic modifications.
-   **Tab Overflow Management**: Handles numerous tabs gracefully with a dropdown for overflowed tabs.
-   **Configurable Appearance**: Font size and scrollback buffer size are configurable via application settings.
-   **Enhanced Terminal Features**: WebGL acceleration, clipboard integration, clickable links, and search functionality.

### Tab Information Panel

Each **main terminal tab** includes an information panel that provides detailed insights into the running process and allows for command management.

#### Overview

The Tab Information Panel is accessible via the info button (ℹ) on each main terminal tab. It provides:
- Real-time process information
- Command visibility
- Command re-run capabilities with conditional modifications

#### Features

##### Basic Information
- **Tab Name**: The display name of the terminal tab
- **Terminal ID**: Unique identifier for the terminal session

##### Command Management
- **More Details**: Opens a popup displaying the full command and associated containers
- **Copy Command**: One-click copy of the command to clipboard
- **Refresh**: Kill and re-run the command with optional conditional modifications

##### Container Information
- **Associated Containers**: List of Docker containers managed by this tab
- **Container Status**: Real-time status for each container (running, stopped, etc.)
- **Automatic Management**: Containers are stopped when tab is closed or refreshed

#### Usage

1. **Opening the Panel**
   - Click the ℹ button on any terminal tab
   - The panel appears directly below the tab
   - Multiple panels can be open simultaneously

2. **Viewing Details**
   - Click "More Details" to see the full command and associated containers
   - Long commands are displayed with proper formatting
   - Container list shows name and current status
   - Copy button for easy command reuse

3. **Refreshing Tabs**
   - Click the 🔄 Refresh button to restart the command
   - The process is killed and restarted
   - Associated containers are stopped and restarted
   - Commands can be conditionally modified based on current configuration state

4. **Closing the Panel**
   - Click the × button in the panel header
   - Click anywhere outside the panel
   - The panel closes automatically when switching tabs

### Status Indicators

| Status | Color | Description |
|--------|-------|-------------|
| idle | Gray | Process not yet started |
| running | Green (pulsing) | Process actively executing |
| done | Blue | Process completed successfully |
| error | Red | Process encountered an error |
| initializing | Blue | Process is starting up |
| degraded | Orange | Process is running but some dependencies are not |

### Basic Status Detection

{ProjectName} Manager provides basic terminal status information:

#### Terminal Status Types

| Status | Description |
|--------|-------------|
| **running** | Terminal has an active process |
| **done** | Process completed successfully |
| **error** | Process encountered an error |
| **idle** | No active process in terminal |


### Container Status Indicators

| Status | Color | Description |
|--------|-------|-------------|
| Up X seconds/minutes/hours | Green | Container is running |
| Exited | Red | Container has stopped |
| Created | Yellow | Container created but not started |
| Paused | Orange | Container is paused |
| Unknown | Gray | Status cannot be determined |

### Conditional Tab Refresh

The refresh feature allows commands to be dynamically modified when re-running based on the current application state. This is configured through the `refreshConfig` property in `configurationSidebarCommands.json`.

### Configuration

Add a `refreshConfig` object to any command definition in `configurationSidebarCommands.json`:

```json
{
  "id": "alpha",
  "conditions": {
    "enabled": true
  },
  "command": {
    "base": "cd ./weblifealpha && ./gradlew bootRun",
    // ... other command properties ...
    "refreshConfig": {
      "prependCommands": [
        {
          "condition": "mode === 'development'",
          "command": "echo 'Refreshing in dev mode...' && "
        },
        {
          "command": "echo 'Always prepended' && "  // No condition = always runs
        }
      ],
      "appendCommands": [
        {
          "condition": "attachState.alpha === true",
          "command": " --debug-jvm"
        }
      ]
    }
  }
}
```

### refreshConfig Structure

| Property | Type | Description |
|----------|------|-------------|
| `prependCommands` | Array | Commands to prepend to the original command |
| `appendCommands` | Array | Commands to append to the original command |

Each command in the arrays has:
- `command` (string, required): The command string to prepend/append
- `condition` (string, optional): JavaScript expression evaluated against config state. If omitted, the command always applies.

### Condition Evaluation

Conditions are JavaScript expressions evaluated in the context of the current configuration state:

#### Available Context
- **Section state**: Properties from `configState[sectionId]` (e.g., `enabled`, `deploymentType`, `mode`)
- **Attach state**: `attachState.sectionId` for checking if debugger is attached
- **Sub-section state**: Properties like `frontendConfig.enabled`
- **Global dropdown values**: Any dropdown values from the configuration

#### Condition Examples

```javascript
// Simple boolean check
"enabled"

// Equality check
"deploymentType === 'container'"

// Attach state check
"attachState.alpha === true"

// Complex conditions
"mode === 'development' && frontendConfig.enabled"

// Negation
"!attachState['sigmagger']"
```

#### Special Conditions
- **No condition property**: Command always applies (treated as `true`)
- **`"true"`**: Always applies
- **`"false"`**: Never applies

### Refresh Behavior

When the Refresh button is clicked:

1. The current process is terminated (SIGKILL)
2. The terminal display is cleared
3. The original command is retrieved
4. `prependCommands` are evaluated and applied
5. `appendCommands` are evaluated and applied
6. The modified command is executed in the same terminal tab

### Examples

#### Always Prepend Build Step
```json
"refreshConfig": {
  "prependCommands": [
    {
      "command": "npm run build && "  // No condition - always runs
    }
  ]
}
```

#### Conditional Debug Mode
```json
"refreshConfig": {
  "appendCommands": [
    {
      "condition": "attachState.alpha === true",
      "command": " --debug-jvm"
    },
    {
      "condition": "attachState.alpha !== true",
      "command": " --production"
    }
  ]
}
```

#### Environment-Specific Refresh
```json
"refreshConfig": {
  "prependCommands": [
    {
      "condition": "mode === 'development'",
      "command": "export NODE_ENV=development && "
    },
    {
      "condition": "mode === 'production'",
      "command": "export NODE_ENV=production && "
    }
  ]
}
```

### Limitations

- Refresh is disabled in No Run Mode
- Conditions are evaluated synchronously
- Complex object navigation in conditions may require careful syntax
- The `mode` property is only available if the section has a `modeSelector` component

### Terminal Tab Management

### Tab Overflow

When multiple tabs are open:
- Visible tabs are shown in the tab bar
- Overflow tabs are accessible via dropdown (▼)
- Active tab is always kept visible
- Tab order can be rearranged by selection

### Tab States

Each tab maintains its own state:
- Command being executed
- Process status
- Output buffer
- Refresh count
- Start time

### Enhanced Terminal Features

{ProjectName} Manager includes advanced terminal enhancements powered by xterm.js addons:

#### Search Functionality
- **Keyboard Shortcut**: `Ctrl+F` (or `Cmd+F` on Mac) to open search
- **Navigation**: `Enter` for next match, `Shift+Enter` for previous match
- **Visual Interface**: Floating search bar with controls and status indicators
- **Case Sensitivity**: Configurable search options

#### Performance & Rendering
- **WebGL Acceleration**: Hardware-accelerated rendering for smoother performance
- **Optimized Scrolling**: Enhanced performance with large terminal outputs
- **Reduced CPU Usage**: More efficient rendering engine

#### Link Detection
- **Auto-Detection**: URLs in terminal output become automatically clickable
- **Visual Styling**: Links highlighted in blue with hover effects
- **External Opening**: URLs open in default system browser

#### Clipboard Integration
- **Enhanced Copy/Paste**: Improved clipboard operations across platforms
- **Visual Selection**: Custom highlighting for selected text
- **Cross-Platform**: Consistent behavior on all operating systems

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + T | New tab (context-dependent) |
| Ctrl/Cmd + W | Close current tab |
| Ctrl/Cmd + Tab | Next tab |
| Ctrl/Cmd + Shift + Tab | Previous tab |
| Ctrl/Cmd + F | Open terminal search |
| Enter (in search) | Find next match |
| Shift + Enter (in search) | Find previous match |
| Escape (in search) | Close search |

*Note: Keyboard shortcuts may vary by platform*

## Floating Terminals

Floating terminals provide a flexible way to run and view specific commands or logs in separate, manageable windows.

<div align="center">
  <img src="../../assets/floating_terminal.png" alt="Floating Terminal Window" width="80%">
  <p><em>Floating terminal window with draggable interface for auxiliary tasks</em></p>
</div>

### Key Features

-   **Purpose-Driven**: Typically launched by `customButton` components within configuration sections for tasks like viewing specific logs or running utility scripts.
-   **Independent Windows**: Each floating terminal appears in its own window.
-   **Draggable & Resizable**: Windows can be freely moved and resized on the screen.
-   **Window Controls**: Include a title bar with Minimize and Close buttons.
-   **Always Writable**: Input is enabled by default, allowing interaction if the command expects it (unless in "No Run Mode").
-   **"No Run Mode" Aware**: If "No Run Mode" is active in the application's debug settings, the floating terminal will display the command that would have run but will not execute it.
-   **Configurable Limits**: Maximum number of concurrent floating terminals is configurable (default 10, set via `maxFloatingTerminals` setting). Attempting to exceed this limit shows a warning notification.
-   **Configurable Appearance**: Font size and scrollback buffer size match the main terminal settings.
-   **Management**: Listed and managed via the **App Control Sidebar** (right edge of the application). From the sidebar, you can:
    -   Show/focus a terminal.
    -   Minimize/restore a terminal.
    -   Close a terminal.
    -   View "About" information for the terminal's command.

### "About" Information for Floating Terminals

Basic information about a floating terminal's purpose and command can be accessed via the **App Control Sidebar**. This information is typically derived from the `description` field associated with the `commandId` (from the `customButton` that launched it) in the `configurationSidebarAbout.json` file. This is a simpler view compared to the comprehensive Tab Information Panel available for main tabbed terminals.

## App Control Sidebar & Debug Tools

The **App Control Sidebar**, accessible from the right edge of the application, provides:
- **Auto Setup**: One-click automated environment setup (wrench icon)
- Management of active **Floating Terminals** (show, minimize, view "About" info, close)
- **Health Report**: Real-time status overview of all running services
- Access to **Debug Tools** via a gear icon at the bottom

When any debug options are active, the gear icon will show an orange border.

<div align="center">
  <img src="../../assets/debug_menu.png" alt="Debug Tools Menu" width="60%">
  <p><em>Debug tools menu with developer utilities and execution modes</em></p>
</div>

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
- **Terminal Input Mode**: Toggle the main tabbed terminals between read-only (default) and writable. Disabled when a {ProjectName} configuration is running.

## Performance Considerations

### Large Output Handling
- Terminal buffers are limited to prevent memory issues
- Old output is automatically trimmed
- Scrollback is preserved within configurable limits (default 1000 lines, configurable via `terminalScrollback` setting)

### Multiple Tabs
- Each tab runs in its own PTY process
- Inactive tabs continue running in background
- Output is buffered for inactive tabs

### Refresh Optimization
- Commands are killed cleanly before restart
- Resources are properly cleaned up
- Rapid refresh is throttled to prevent issues

## See Also

- [Configuration Commands Guide](../configuration/commands.md) - Configuring terminal commands
- [Auto Setup](auto-setup.md) - Automated command execution
- [Health Report](health-report.md) - Monitoring terminal status
- [Architecture Communication Guide](../architecture/communication.md) - Technical implementation 