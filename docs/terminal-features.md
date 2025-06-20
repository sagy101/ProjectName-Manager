# Terminal Features

> Comprehensive guide to {ProjectName} Manager's dual-terminal system

## Overview

{ProjectName} Manager features a sophisticated terminal system that goes beyond basic command execution. With both main tabbed terminals and floating terminals, plus advanced features like process monitoring and container management, it provides a complete terminal experience tailored for complex development environments.

### Terminal Types at a Glance

| Terminal Type | Purpose | Key Features |
|--------------|---------|--------------|
| **Main Terminals** | Primary service execution | Tabbed interface, read-only by default, container management |
| **Floating Terminals** | Auxiliary tasks & logs | Draggable windows, always writable, auto-minimize |

For architectural details, see the [System Architecture](architecture-details.md#terminal-system-architecture) document.

--- 

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

### Tab Information Panel

Each **main terminal tab** includes an information panel that provides detailed insights into the running process and allows for command management.

#### Overview

The Tab Information Panel is accessible via the info button (ℹ) on each main terminal tab. It provides:
- Real-time process information
- Command visibility
- Command re-run capabilities with conditional modifications

#### Features

##### Process Information
- **Tab Name**: The display name of the terminal tab
- **Terminal ID**: Unique identifier for the terminal session
- **Start Time**: When the command was initiated
- **Elapsed Time**: How long the process has been running
- **Status**: Current state (idle, running, done, error)
- **Section**: Which configuration section spawned this tab

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

### Real-Time Health Monitoring (Health Report)

The detailed status information described below is aggregated and displayed in the **Health Report**, which provides a centralized, at-a-glance view of the health of all services and their dependencies.

For a comprehensive guide to the Health Report and its features, see the [Health Report Guide](health-report.md).

### Process Monitoring and Status Detection

{ProjectName} Manager implements sophisticated real-time process monitoring to provide accurate status information and detailed process insights.

#### Real-Time Process Monitoring

The application continuously monitors all descendant processes of each terminal session:

- **Process Tree Discovery**: Uses system commands (`ps` on Unix) to discover all child processes
- **State Analysis**: Interprets process states to determine overall command status
- **Resource Tracking**: Monitors CPU usage, memory consumption, and process hierarchy
- **Intelligent Filtering**: Excludes shell utilities and monitoring commands from status calculations

#### Advanced Status Detection

Beyond basic running/stopped states, the system detects:

| Detailed Status | Description | Trigger |
|----------------|-------------|---------|
| **running** | Process actively executing | Any child process in 'R' state |
| **sleeping** | Process waiting for events | All processes in 'S' state |
| **waiting** | Process blocked on I/O | Any process in 'D' state |
| **paused** | Process suspended | Any process in 'T' state (Ctrl+Z) |
| **finishing** | Process terminating | Zombie processes detected |
| **stopped** | Process terminated by user | Ctrl+C or Ctrl+D detected |
| **error** | Process failed | Non-zero exit code |
| **done** | Process completed successfully | Zero exit code |

#### Control Character Detection

The system monitors input streams for control characters to accurately determine termination reasons:

- **Ctrl+C (`\x03`)**: Interrupt signal - process terminated by user
- **Ctrl+D (`\x04`)**: EOF signal - process terminated by end-of-file
- **Ctrl+Z (`\x1a`)**: Suspend signal - process paused (also detected via process state)

#### Exit Code Analysis

For processes that exit naturally (not killed by user):
- **Automatic Detection**: System injects exit code checking after process completion
- **Status Determination**: Distinguishes between successful completion (exit code 0) and errors (non-zero)
- **Detailed Reporting**: Provides specific exit codes for debugging

#### Process Information Display

The Tab Information Panel shows detailed process information:
- **Process Count**: Number of active child processes
- **Process States**: Individual state of each process
- **Resource Usage**: CPU and memory consumption
- **Command Hierarchy**: Parent-child process relationships

#### Performance Optimizations

- **Efficient Monitoring**: Only monitors when processes are active
- **State Caching**: Updates sent only when status actually changes
- **Resource Management**: Automatic cleanup when processes complete
- **Smart Filtering**: Avoids monitoring system utilities and shell commands

### Advanced Process Monitoring Details

The terminal system implements comprehensive process monitoring through multiple detection methods:

#### Process Tree Discovery
- **Method**: Uses `ps -ax -o pid,ppid,state,command,rss,pcpu` on Unix systems
- **Capability**: Discovers all descendant processes of the shell
- **Frequency**: Real-time monitoring every second
- **Filtering**: Intelligently filters out shell utilities and monitoring commands

#### Process State Detection
The system interprets Unix process states to provide accurate status information:

| State | Status | Description |
|-------|--------|-------------|
| `R`, `R+` | running | Process is running or runnable |
| `S`, `S+` | sleeping | Interruptible sleep (waiting for events) |
| `D` | waiting | Uninterruptible sleep (I/O operations) |
| `T` | paused | Stopped by signal (Ctrl+Z) |
| `Z` | finishing | Zombie process (terminated, not reaped) |
| `I` | idle | Idle kernel thread |

#### Control Character Detection
The system monitors input streams for control characters:

- **Ctrl+C (`\x03`)**: Interrupt signal - marks process as terminated by user
- **Ctrl+D (`\x04`)**: EOF signal - marks process as terminated by EOF
- **Ctrl+Z (`\x1a`)**: Suspend signal - detected via process state 'T'

#### Exit Code Capture
- **Method**: Injects `echo "EXIT_CODE:$?"` after natural process completion
- **Purpose**: Distinguishes between successful completion and error conditions
- **Pattern Matching**: Monitors output for `EXIT_CODE:(\d+)` pattern

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

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + T | New tab (context-dependent) |
| Ctrl/Cmd + W | Close current tab |
| Ctrl/Cmd + Tab | Next tab |
| Ctrl/Cmd + Shift + Tab | Previous tab |

*Note: Keyboard shortcuts may vary by platform*

--- 

## Floating Terminals

Floating terminals provide a flexible way to run and view specific commands or logs in separate, manageable windows.

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

--- 

## App Control Sidebar & Debug Tools

The **App Control Sidebar**, accessible from the right edge of the application, provides:
- **Auto Setup**: One-click automated environment setup (wrench icon)
- Management of active **Floating Terminals** (show, minimize, view "About" info, close)
- **Health Report**: Real-time status overview of all running services
- Access to **Debug Tools** via a gear icon at the bottom

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

## Troubleshooting

### Main Terminals Not Accepting Input
- Main terminals are read-only by default for safety
- Enable input via Debug Tools: App Control Sidebar -> Gear Icon -> "Terminals Read-Only" button
- This option is disabled when a {ProjectName} configuration is running

### Test Sections Not Showing
- Open debug panel (gear icon in App Control Sidebar)
- Click "Show Test Sections" button to toggle visibility
- Test sections are hidden by default to reduce clutter

### Terminal Process Issues
- If terminals show errors or don't display output, run `npm run rebuild`
- Check shell configuration and PTY permissions
- Review console logs for detailed error messages

## Related Documentation

- [Configuration Guide](configuration-guide.md) - Configuring terminal commands
- [Command System](command-system.md) - How commands are generated
- [Architecture Details](architecture-details.md#terminal-system-architecture) - Technical implementation
- [Getting Started](getting-started.md) - Basic terminal usage
- [Health Report](health-report.md) - Monitoring terminal status 
