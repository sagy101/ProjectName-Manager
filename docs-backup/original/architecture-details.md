# System Architecture - Detailed Documentation

This document provides comprehensive technical details of {ProjectName} Manager's architecture. For a high-level overview, see the [Architecture Overview](architecture-overview.md).

## Table of Contents

- [Implementation Details](#implementation-details)
- [Architecture Diagram](#architecture-diagram)
- [Main Process Modular Architecture](#main-process-modular-architecture)
- [Communication Flow](#communication-flow)
- [Environment Verification System](#environment-verification-system)
- [Auto Setup System](#auto-setup-system)
- [Terminal System Architecture](#terminal-system-architecture)
- [Command Generation & Execution](#command-generation--execution)
- [Configuration System](#configuration-system)
- [Caching & Performance](#caching--performance)
- [Safety & Debug Features](#safety--debug-features)
- [Data Flow Summary](#data-flow-summary)
- [Development Environment](#development-environment)
- [Performance Characteristics](#performance-characteristics)
- [Related Documentation](#related-documentation)

## Implementation Details

This document dives into the technical implementation of {ProjectName} Manager's architecture. The system is built on Electron with a React frontend and Node.js backend, following modular design principles throughout.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Electron Application"
        subgraph "Main Process (Node.js) - Modular Architecture"
            A[main.js<br/>Orchestration Layer] --> B[environmentVerification.js<br/>Environment Checks & Caching]
            A --> C[ptyManagement.js<br/>Terminal Process Management]
            A --> D[dropdownManagement.js<br/>Command Execution & Parsing]
            A --> E[containerManagement.js<br/>Docker Operations]
            A --> F[gitManagement.js<br/>Git Branch & Repo Operations]
            A --> G[configurationManagement.js<br/>Config Import/Export & Loading]
            A --> H[windowManagement.js<br/>Window Creation & Management]
        end
        
        subgraph "Preload Script"
            I[electron-preload.js<br/>IPC Bridge]
        end
        
        subgraph "Renderer Process (React) - Modular Architecture"
            J[App.jsx<br/>Composition Layer] --> K[ProjectConfiguration]
            J --> L[TerminalContainer]
            J --> M[EnvironmentVerification]
            J --> N[FloatingTerminals]
            J --> O[AppControlSidebar]
            J --> HR[HealthReportScreen]
            J --> AS[AutoSetupScreen]
            
            subgraph "Custom Hooks (Distributed)"
                Q[useAppState<br/>common/hooks/]
                R[useAppEffects<br/>common/hooks/]
                S[useAppEventHandlers<br/>common/hooks/]
                T[useFloatingTerminals<br/>floating-terminal/]
                U[useConfigurationManagement<br/>project-config/hooks/]
                V[useAutoSetup<br/>auto-setup/]
            end
            
            J -.->|Uses| Q
            J -.->|Uses| R
            J -.->|Uses| S
            J -.->|Uses| T
            J -.->|Uses| U
            J -.->|Uses| V
        end
    end
    
    subgraph "Configuration Files"
        P[project-config/config/configurationSidebarSections.json]
        Q[project-config/config/configurationSidebarCommands.json]
        R[project-config/config/configurationSidebarAbout.json]
        S[environment-verification/generalEnvironmentVerifications.json]
    end
    
    A -.->|IPC| I
    I -.->|Context Bridge| J
    J -.->|Reads| P
    J -.->|Reads| Q
    J -.->|Reads| R
    A -.->|Reads| S
```

## Main Process Modular Architecture

The main process has been refactored into a modular architecture for better maintainability, testing, and separation of concerns. Each module, located in `src/main-process/`, handles a specific domain of functionality:

### Core Modules

<details>
<summary>Click to expand detailed module descriptions</summary>

#### `main.js` - Orchestration Layer
- **Purpose**: Application lifecycle management and IPC handler registration
- **Responsibilities**: Window creation, IPC routing, startup coordination, modular IPC handler setup
- **Dependencies**: All other modules as imports
- **Modular Architecture**: Delegates IPC handler setup to specialized modules (e.g., `dropdownManagement.setupDropdownIpcHandlers()`)

#### `environmentVerification.js` - Environment Management
- **Purpose**: System environment checking and verification
- **Responsibilities**: Tool validation, path checking, environment variables, caching, command output capture
- **Key Functions**: `verifyEnvironment()`, `refreshEnvironmentVerification()`, `getEnvironmentVerification()`, `getEnvironmentExportData()`
- **Export Feature**: Captures and exports all verification command outputs with status for debugging

#### `ptyManagement.js` - Terminal Process Management
- **Purpose**: PTY (pseudo-terminal) process lifecycle management with advanced monitoring
- **Responsibilities**: Process spawning, I/O handling, cleanup, tracking, real-time status detection, control character monitoring
- **Key Functions**: `spawnPTY()`, `killProcess()`, `writeToPTY()`, `resizePTY()`, `startProcessMonitoring()`, `getChildProcesses()`, `interpretProcessState()`
- **Monitoring Features**: Process tree discovery, state interpretation, control character detection, exit code capture

#### `containerManagement.js` - Docker Operations
- **Purpose**: Docker container lifecycle management
- **Responsibilities**: Container status checking, stopping, event emission
- **Key Functions**: `getContainerStatus()`, `stopContainers()`, container status monitoring

#### `gitManagement.js` - Git Repository Operations
- **Purpose**: Git branch management and repository operations
- **Responsibilities**: Branch switching, listing, caching, path resolution
- **Key Functions**: `checkoutGitBranch()`, `listLocalGitBranches()`, `getGitBranch()`, cache management

#### `dropdownManagement.js` - Command Execution & Parsing
- **Purpose**: Dynamic dropdown population, command parsing, and change command execution
- **Responsibilities**: Command execution, response parsing, caching, dependency handling, IPC handler setup, change command execution
- **Key Functions**: `getDropdownOptions()`, `executeDropdownChangeCommand()`, `setupDropdownIpcHandlers()`, cache management
- **New Features**: Automatic command execution on dropdown value changes with variable substitution

#### `configurationManagement.js` - Configuration Management
- **Purpose**: Application configuration loading, import/export
- **Responsibilities**: File I/O, JSON parsing, dialog handling, settings management
- **Key Functions**: `loadAppSettings()`, `importConfiguration()`, `exportConfiguration()`, `getAboutConfig()`

#### `windowManagement.js` - Window Management
- **Purpose**: Electron window creation and management
- **Responsibilities**: Window options, DevTools handling, display settings integration
- **Key Functions**: `createWindow()`, window lifecycle management

</details>

### Benefits of Modular Architecture

- **Separation of Concerns**: Each module has a single, well-defined responsibility
- **Testability**: Individual modules can be tested in isolation with proper mocking
- **Maintainability**: Easier to locate and modify specific functionality
- **Reusability**: Modules can be imported and used across different parts of the application
- **Error Isolation**: Issues in one module don't cascade to others
- **Performance**: Lazy loading and efficient resource management per module

### Renderer Process Component Architecture

The renderer process is built with React and follows a modern, modular architecture centered around components and custom hooks. This mirrors the modularity of the main process, ensuring the codebase is scalable and maintainable.

#### Component Hierarchy
-   **Container Components**: High-level components like `ProjectConfiguration` and `TerminalContainer` manage state and orchestrate their children.
-   **Presentational Components**: Smaller, reusable components like `RunButton`, `TerminalPlaceholder`, and `ConfigSection` focus on rendering specific pieces of the UI.
-   **Custom Hooks**: Complex, reusable stateful logic is extracted into custom hooks for better organization and testability.

#### App Component Architecture

The main `App.jsx` component follows a clean, modular architecture using custom hooks:

```mermaid
graph TB
    subgraph "App.jsx - Refactored Architecture"
        A[App Component] --> B[useAppState]
        A --> C[useAppEffects]
        A --> D[useAppEventHandlers]
        A --> E[useFloatingTerminals]
        A --> F[useConfigurationManagement]
        A --> G[useFixCommands]
    end
    
    subgraph "Other Component Hooks"
        H[ProjectConfiguration] --> I[useProjectConfig]
        J[TerminalContainer] --> K[useTerminals]
        L[Various Components] --> M[useIpcListeners]
        L --> N[useTabManagement]
        L --> O[useTitleOverflow]
    end
    
    subgraph "App Hook Responsibilities"
        B --> P[State Management<br/>- All useState hooks<br/>- State initialization<br/>- Refs management]
        C --> Q[Side Effects<br/>- useEffect hooks<br/>- Event listeners<br/>- Loading process<br/>- Document title]
        D --> R[Event Handlers<br/>- User interactions<br/>- Callbacks<br/>- Notifications<br/>- Toggle functions]
        E --> S[Floating Terminals<br/>- Terminal lifecycle<br/>- Position management<br/>- Info panel state<br/>- Z-index handling]
        F --> T[Configuration<br/>- Import/Export<br/>- Git branch handling<br/>- Status screen management<br/>- File operations]
        G --> V[Fix Commands<br/>- Verification updates<br/>- Fix command execution<br/>- Toggle verifications<br/>- Auto re-validation]
    end
```

#### Custom Hooks Architecture

| Hook | Purpose | Key Responsibilities | Location |
|------|---------|---------------------|-----------|
| `useAppState` | State Management | All useState hooks, refs, initialization functions | `src/common/hooks/` |
| `useAppEffects` | Side Effects | useEffect hooks, event listeners, loading process, git refresh | `src/common/hooks/` |
| `useAppEventHandlers` | Event Handling | User interactions, callbacks, notifications, toggle functions | `src/common/hooks/` |
| `useFloatingTerminals` | Terminal Management | Floating terminal lifecycle, positioning, info panels | `src/floating-terminal/` |
| `useConfigurationManagement` | Configuration | Import/export, git operations, status screens | `src/project-config/hooks/` |
| `useFixCommands` | Fix Commands | Fix command execution, verification updates, toggle verifications | `src/project-config/hooks/` |
| `useAutoSetup` | Auto Setup | Priority-based command execution, progress tracking, smart terminal management | `src/auto-setup/` |

> **Note**: These hooks are feature-specific and located within their respective module directories, reflecting the modular architecture. The App component imports and orchestrates them, but each hook is maintained within its related feature domain.

#### Benefits of the Modular Architecture

- **Separation of Concerns**: Each hook has a single, well-defined responsibility
- **Testability**: Individual hooks can be tested in isolation with proper mocking
- **Maintainability**: Easier to locate and modify specific functionality
- **Reusability**: Hooks can be imported and used across different components
- **Readability**: Main App component is clean and focused on composition
- **Performance**: Better dependency management and reduced re-renders

#### File Structure

<details>
<summary>Click to expand complete file structure</summary>

```
src/
├── App.jsx
├── main-process/             # Main process modules
│   ├── configurationManagement.js
│   ├── containerManagement.js
│   ├── dropdownManagement.js
│   ├── environmentVerification.js
│   ├── gitManagement.js
│   ├── mainUtils.js
│   ├── ptyManagement.js
│   └── windowManagement.js
├── common/                   # Shared components, hooks, and styles
│   ├── components/
│   ├── hooks/
│   └── styles/
├── project-config/           # Project configuration UI and logic
│   ├── components/           # (Now named with .jsx, e.g., ProjectConfiguration.jsx)
│   ├── hooks/
│   ├── styles/
│   └── config/               # JSON configuration files
│       ├── configurationSidebarAbout.json
│       ├── configurationSidebarCommands.json
│       └── configurationSidebarSections.json
├── environment-verification/ # Environment verification UI and logic
│   ├── constants/
│   └── generalEnvironmentVerifications.json
├── terminal/                 # Main terminal components and hooks
│   ├── components/
│   └── useTerminals.js
├── floating-terminal/        # Floating terminal components and hooks
├── auto-setup/               # Auto-setup feature components and hooks
├── health-report/            # Health report feature components and hooks
├── tab-info/                 # Tab info panel components and hooks
├── loading-screen/           # Loading screen component and styles
├── import-status-screen/     # Import status screen component and styles
├── stopping-status/          # Stopping status screen component
├── renderer.jsx              # Renderer process entry point
└── styles.css                # Top-level CSS imports
```

</details>

This separation of concerns makes the UI code easier to test, debug, and maintain.

#### Testing Architecture

The App component maintains comprehensive test coverage with modern testing strategies:

- **Comprehensive Test Suite**: Extensive tests covering all functionality
- **Act Warning Suppression**: Proper handling of React's async testing warnings
- **Mock Strategy**: Strategic mocking of child components to focus on App logic
- **Timer Management**: Jest fake timers for testing loading processes
- **State Testing**: Verification of state management and event handling
- **Integration Testing**: End-to-end testing of component interactions

The modular hook architecture enables better unit testing of individual concerns while maintaining integration test coverage of the complete App component.

#### Broader Hook Ecosystem

Beyond the App component refactoring, the project employs a comprehensive hook-based architecture throughout, organized by feature:

- **App-specific hooks**: The 6 core hooks extracted from `App.jsx` are now located in `src/common/hooks`, `src/floating-terminal`, `src/project-config/hooks`, and `src/auto-setup`.
- **Feature-specific hooks**: Other components like `ProjectConfiguration` and `TerminalContainer` use their own dedicated hooks (`useProjectConfig`, `useTerminals`, etc.) located within their respective feature directories (e.g., `src/project-config/hooks/`, `src/terminal/`).
- **Shared utility hooks**: Common functionality like `useIpcListeners` is located in `src/common/hooks` and reused across components.
- **Separation of concerns**: Each hook focuses on a specific domain (IPC communication, tab management, UI utilities), and its location in the file system reflects its domain.

## Communication Flow

The application uses Electron's IPC (Inter-Process Communication) system for secure communication between the main process and renderer process.

```mermaid
sequenceDiagram
    participant UI as React UI
    participant Preload as electron-preload.js
    participant Main as main.js (Node.js)
    participant System as System/Docker/Git
    
    Note over UI,Main: 1. Environment Verification
    UI->>+Preload: getEnvironmentVerification()
    Preload->>+Main: IPC: get-environment-verification
    Main->>+System: Execute verification commands
    System-->>-Main: Command results
    Main-->>-Preload: Verification status cache
    Preload-->>-UI: Environment status
    
    Note over UI,Main: 2. Command Execution
    UI->>+Preload: ptySpawn(command, terminalId)
    Preload->>+Main: IPC: pty-spawn
    Main->>+System: spawn PTY process
    Main-->>UI: Real-time output via pty-output events
    
    Note over UI,Main: 3. Dynamic Dropdowns
    UI->>+Preload: getDropdownOptions(config)
    Preload->>+Main: IPC: get-dropdown-options
    Main->>+System: Execute dropdown command
    System-->>-Main: Options list
    Main-->>-Preload: Cached results
    Preload-->>-UI: Dropdown options
    
    Note over UI,Main: 4. Dropdown Value Changes
    UI->>+Preload: dropdownValueChanged(id, value, globalValues)
    Preload->>+Main: IPC: dropdown-value-changed
    Main->>+System: Execute commandOnChange (if configured)
    System-->>-Main: Command result
    Main-->>-UI: Notification (success/error)
```

### IPC Communication Patterns

1. **Request-Response**: For data fetching (environment verification, dropdown options)
2. **Event Streaming**: For real-time terminal output and process status updates
3. **Command Execution**: For terminal spawning and process management
4. **Cache Management**: For performance optimization and state synchronization

## Environment Verification System

The verification system provides comprehensive environment checking through a configurable JSON-based approach.

```mermaid
flowchart TD
    A[Application Startup] --> B[Load Configuration Files]
    B --> C[Initialize Environment Caches]
    C --> D{Start Verification Process}
    
    D --> E[General Tool Checks]
    D --> F[Section-Specific Checks]
    
    E --> G[Command Success Checks]
    E --> H[Output Contains Checks]
    E --> I[Path Existence Checks]
    E --> J[Environment Variable Checks]
    
    F --> K[Git Branch Detection]
    F --> L[Directory Validation]
    F --> M[Project-Specific Verifications]
    
    G --> N[Update Status Cache]
    H --> N
    I --> N
    J --> N
    K --> N
    L --> N
    M --> N
    
    N --> O[Send Results to UI]
    O --> P[Display Status Indicators]
    
    style N fill:#e1f5fe
    style O fill:#f3e5f5
    style P fill:#e8f5e8
```

### Verification Process

1. **Parallel Execution**: All verifications run concurrently for optimal performance
2. **Progress Tracking**: Real-time progress updates sent to UI
3. **Intelligent Caching**: Results cached with invalidation strategies
4. **Error Handling**: Graceful degradation for failed verifications

### Verification Types

- **commandSuccess**: Validates command execution without errors
- **outputContains**: Checks command output for specific content
- **pathExists**: Verifies file/directory existence
- **envVarExists/envVarEquals**: Environment variable validation

See [verification-types.md](verification-types.md) for detailed information.

## Auto Setup System

The Auto Setup system provides automated environment configuration by running fix commands in priority order. It builds on the Environment Verification System and Terminal System to provide one-click environment setup.

```mermaid
flowchart TD
    A[User Clicks Auto Setup] --> B[Scan All Verifications]
    B --> C[Collect Invalid Verifications with Fix Commands]
    C --> D[Group by Priority]
    D --> E[Display Auto Setup Screen]
    
    E --> F{User Starts Setup?}
    F -->|Yes| G[Execute Priority Group 1]
    F -->|No| H[Preview Mode]
    
    G --> I[Spawn Auto Setup Terminals]
    I --> J[Run Commands in Parallel]
    J --> K[Monitor Command Completion]
    K --> L{All Commands in Group Success?}
    
    L -->|Yes| M[Re-run Verifications]
    L -->|No| N[Stop on Failure]
    
    M --> O{More Priority Groups?}
    O -->|Yes| P[Execute Next Priority Group]
    O -->|No| Q[Auto Setup Complete]
    
    P --> G
    N --> R[Show Error State]
    R --> S[Allow Individual Retry]
    
    style G fill:#e3f2fd
    style I fill:#e8f5e8
    style Q fill:#e8f5e8
    style N fill:#ffebee
```

### Auto Setup Architecture

The Auto Setup system consists of several key components:

#### Core Components

| Component | Purpose | Key Responsibilities |
|-----------|---------|---------------------|
| `useAutoSetup` hook | State management | Command collection, execution tracking, terminal management |
| `AutoSetupScreen` | User interface | Progress display, command grouping, status visualization |
| `autoSetupUtils` | Utility functions | Command filtering, status calculation, priority sorting |
| `autoSetupConstants` | Constants | Status enums, configuration values |

#### Auto Setup Workflow

```mermaid
sequenceDiagram
    participant UI as AutoSetupScreen
    participant Hook as useAutoSetup
    participant Utils as autoSetupUtils
    participant Terminal as FloatingTerminal
    participant Verification as EnvironmentVerification
    
    Note over UI,Verification: 1. Setup Initialization
    UI->>Hook: openAutoSetup()
    Hook->>Utils: collectFixCommands()
    Utils->>Utils: Group by priority
    Utils-->>Hook: Command groups
    Hook-->>UI: Display grouped commands
    
    Note over UI,Verification: 2. Execution Phase
    UI->>Hook: startAutoSetup()
    Hook->>Hook: Execute priority group 1
    
    loop For each command in group
        Hook->>Terminal: Create auto setup terminal
        Terminal->>Terminal: Execute fix command
        Terminal-->>Hook: Command completion
        Hook->>Verification: Re-run verification
    end
    
    Hook->>Utils: calculateGroupStatus()
    Utils-->>Hook: Group complete
    Hook->>Hook: Move to next priority group
    
    Note over UI,Verification: 3. Completion
    Hook-->>UI: All groups complete
    UI->>UI: Show success state
```

#### Priority-Based Execution

The Auto Setup system organizes fix commands into priority groups for optimal execution order:

```mermaid
graph LR
    A[Priority 1<br/>System Tools] --> B[Priority 2<br/>Dev Environments]
    B --> C[Priority 3<br/>Cloud Tools] 
    C --> D[Priority 4<br/>Project Setup]
    D --> E[Priority 999<br/>No Priority Set]
    
    subgraph "Execution Rules"
        F[Sequential Groups]
        G[Parallel Within Group]
        H[Stop on Failure]
    end
    
    A -.-> F
    B -.-> G
    C -.-> H
```

#### Auto Setup Terminal Management

Auto Setup terminals have special characteristics:

- **Dedicated Terminals**: Each fix command runs in its own floating terminal
- **Auto-Minimized**: Start minimized to avoid UI clutter
- **Hidden from Sidebar**: Don't appear in regular terminal management
- **Special Configuration**: Tagged with `isAutoSetup: true` and `hideFromSidebar: true`
- **Completion Handling**: Auto-close on success, remain open on failure
- **High Z-Index**: Appear above the Auto Setup screen when viewed
- **Timeout Management**: Automatic 60-second timeout with process termination
- **Manual Control**: User can terminate long-running commands before timeout

#### Timeout & Visual Feedback System

The Auto Setup system provides comprehensive timeout management:

- **Automatic Timeouts**: All commands timeout after 60 seconds
- **Visual Countdown**: Live timer display (⏱ 45s) updates every second
- **Progressive Warnings**: Timer changes color and pulses when ≤10 seconds remain
- **Status Indicators**: Clear visual distinction between failed, timeout, and stopped commands
- **Manual Termination**: "Terminate" button available for running commands
- **Process Cleanup**: Proper process termination and resource cleanup

#### Integration with App Control Sidebar

The Auto Setup system integrates with the App Control Sidebar:

```mermaid
graph TB
    A[App Control Sidebar] --> B[Auto Setup Button 🔧]
    B --> C{Auto Setup Status}
    
    C -->|Idle| D[Blue Wrench Icon]
    C -->|Running| E[Blue Icon with Pulse Animation]
    C -->|Success| F[Green Icon]
    C -->|Failed| G[Red Icon]
    
    B --> H[Opens AutoSetupScreen]
    H --> I[Priority Groups Display]
    H --> J[Progress Tracking]
    H --> K[Individual Command Status]
```

#### Error Handling & Recovery

The Auto Setup system provides comprehensive error handling:

- **Flexible Failure Handling**: Execution stops when any command in a priority group fails, but users can choose to continue
- **Continue from Failure**: "Continue" button allows proceeding to next priority group despite failures
- **Individual Retry**: Failed commands can be retried without restarting
- **Manual Termination**: "Terminate" button allows stopping long-running commands
- **Automatic Timeouts**: Commands automatically timeout after 60 seconds with visual countdown
- **Terminal Access**: "View Terminal" shows command output for debugging
- **Status Persistence**: Failed states persist until manually resolved
- **Graceful Degradation**: Partial success scenarios are handled appropriately

See [auto-setup-guide.md](auto-setup-guide.md) for detailed usage information.

## Terminal System Architecture

The application features a sophisticated dual-terminal system with advanced process monitoring and status detection capabilities.

```mermaid
graph TB
    subgraph "Terminal System"
        A[Terminal Request] --> B{Terminal Type?}
        
        B -->|Main Terminal| C[Main Terminal Tab]
        B -->|Floating Terminal| D[Floating Terminal Window]
        
        C --> E[Read-Only by Default]
        C --> F[Associated with Configuration Sections]
        C --> G[Container Lifecycle Management]
        
        D --> H[Always Writable]
        D --> I[Draggable & Resizable]
        D --> J[Custom Button Triggered]
        
        E --> K[PTY Process Spawn]
        F --> K
        G --> K
        H --> K
        I --> K
        J --> K
        
        K --> L[node-pty Backend]
        L --> M[Real Terminal Emulation]
        M --> N[Live Output Streaming]
        M --> O[Process Monitoring]
        M --> P[Status Detection]
    end
    
    subgraph "Process Management & Monitoring"
        Q[Process Tree Discovery]
        R[Real-time Status Updates]
        S[Control Character Detection]
        T[Exit Code Capture]
        U[Container Status Monitoring]
        V[Cleanup on Exit]
    end
    
    subgraph "Status Detection Methods"
        W[ps Command Analysis]
        X[Input Stream Monitoring]
        Y[Output Pattern Matching]
        Z[Process State Interpretation]
    end
    
    K --> Q
    O --> R
    P --> S
    P --> T
    G --> U
    N --> V
    
    Q --> W
    S --> X
    T --> Y
    R --> Z
```

### Advanced Process Monitoring

The terminal system implements comprehensive process monitoring through multiple detection methods:

#### Process Tree Discovery
- **Method**: Uses `ps -ax -o pid,ppid,state,command,rss,pcpu` on Unix systems
- **Capability**: Discovers all descendant processes of the shell
- **Frequency**: Real-time monitoring every second
- **Filtering**: Intelligently filters out shell utilities and monitoring commands

#### Process State Detection
The system interprets Unix process states to provide accurate status information:

<details>
<summary>Click to expand process state reference</summary>

| State | Status | Description |
|-------|--------|-------------|
| `R`, `R+` | running | Process is running or runnable |
| `S`, `S+` | sleeping | Interruptible sleep (waiting for events) |
| `D` | waiting | Uninterruptible sleep (I/O operations) |
| `T` | paused | Stopped by signal (Ctrl+Z) |
| `Z` | finishing | Zombie process (terminated, not reaped) |
| `I` | idle | Idle kernel thread |

</details>

#### Control Character Detection
The system monitors input streams for control characters:

- **Ctrl+C (`\x03`)**: Interrupt signal - marks process as terminated by user
- **Ctrl+D (`\x04`)**: EOF signal - marks process as terminated by EOF
- **Ctrl+Z (`\x1a`)**: Suspend signal - detected via process state 'T'

#### Exit Code Capture
- **Method**: Injects `echo "EXIT_CODE:$?"` after natural process completion
- **Purpose**: Distinguishes between successful completion and error conditions
- **Pattern Matching**: Monitors output for `EXIT_CODE:(\d+)` pattern

### Terminal Lifecycle States

The terminal system tracks processes through these lifecycle states:

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> pending_spawn: Command Initiated
    pending_spawn --> running: PTY Spawned
    running --> sleeping: Process Waiting
    running --> paused: Ctrl+Z Pressed
    running --> waiting: I/O Operations
    sleeping --> running: Process Active
    paused --> running: fg Command
    running --> stopped: Ctrl+C/Ctrl+D
    running --> error: Exit Code ≠ 0
    running --> done: Exit Code = 0
    stopped --> [*]
    error --> [*]
    done --> [*]
```

### Status Communication Flow

```mermaid
sequenceDiagram
    participant UI as React UI
    participant PTY as PTY Manager
    participant Monitor as Process Monitor
    participant System as System (ps)
    
    Note over UI,System: Process Lifecycle Monitoring
    UI->>PTY: Spawn terminal process
    PTY->>Monitor: Start monitoring (shell PID)
    
    loop Every 1 second
        Monitor->>System: ps -ax (get process tree)
        System-->>Monitor: Process list with states
        Monitor->>Monitor: Filter & analyze processes
        Monitor->>UI: command-status-update event
    end
    
    Note over UI,System: Control Character Handling
    UI->>PTY: User input (Ctrl+C)
    PTY->>PTY: Mark ctrlCPressed = true
    
    Note over UI,System: Process Completion
    Monitor->>Monitor: No child processes detected
    alt Ctrl+C was pressed
        Monitor->>UI: command-finished (stopped)
    else Natural exit
        Monitor->>PTY: Inject exit code check
        PTY->>UI: command-finished (done/error)
    end
```

### Terminal Types

#### Main Terminals
- **Purpose**: Primary command execution for configuration sections
- **Safety**: Read-only by default (debug override available)
- **Features**: Tab management, container lifecycle tracking, advanced process monitoring
- **Status Display**: Real-time status indicators with detailed process information
- **Use Case**: Running main application services and processes

#### Floating Terminals
- **Purpose**: Auxiliary tasks and log viewing
- **Features**: Draggable, resizable, minimizable windows
- **Trigger**: Custom buttons in configuration sections
- **Monitoring**: Same advanced monitoring as main terminals
- **Use Case**: Viewing logs, running diagnostic commands, temporary tasks

### Performance Optimizations

- **Efficient Filtering**: Smart process filtering to avoid monitoring shell utilities
- **State Caching**: Only sends updates when process status actually changes
- **Resource Management**: Automatic cleanup of monitoring intervals
- **Memory Efficiency**: Minimal memory footprint for process tracking

See [terminal-features.md](terminal-features.md) for detailed information.

## Command Generation & Execution

Commands are dynamically generated based on current configuration state and user selections.

```mermaid
flowchart LR
    A[User Action] --> B[Read Configuration State]
    B --> C[Apply Conditional Logic]
    C --> D[Generate Base Command]
    D --> E[Apply Modifiers]
    E --> F[Add Prefixes/Suffixes]
    F --> G[Execute in PTY]
    
    subgraph "Configuration State"
        H[Section Enabled?]
        I[Deployment Type]
        J[Mode Selection]
        K[Dropdown Values]
        L[Git Branch]
    end
    
    B --> H
    B --> I
    B --> J
    B --> K
    B --> L
    
    subgraph "Command Processing"
        M[Environment Variable Resolution]
        N[Path Resolution]
        O[Container Name Generation]
        P[Tab Title Generation]
    end
    
    D --> M
    D --> N
    D --> O
    D --> P
```

### Command Processing Pipeline

1. **State Evaluation**: Current configuration state determines command variants
2. **Conditional Logic**: JSON-defined conditions control command selection
3. **Template Processing**: Environment variables and paths resolved
4. **Modifier Application**: Prefixes and post-modifiers applied
5. **Execution**: Commands run in appropriate terminal context

See [command-system.md](command-system.md) for detailed information.

## Configuration System

The entire application behavior is defined through JSON configuration files, enabling extensive customization without code changes.

```mermaid
graph TD
    A[JSON Configuration Files] --> B[project-config/config/configurationSidebarSections.json]
    A --> C[project-config/config/configurationSidebarCommands.json] 
    A --> D[project-config/config/configurationSidebarAbout.json]
    A --> E[environment-verification/generalEnvironmentVerifications.json]
    
    B --> F[UI Structure]
    B --> G[Component Definitions]
    B --> H[Dropdown Selectors]
    B --> I[Custom Buttons]
    
    C --> J[Command Logic]
    C --> K[Conditional Execution]
    C --> L[Container Associations]
    
    D --> M[Section Descriptions]
    D --> N[Verification Rules]
    D --> O[Help Information]
    
    E --> P[Tool Verification]
    E --> Q[Environment Checks]
    E --> R[System Requirements]
    
    F --> S[React Components]
    G --> S
    H --> T[Dynamic Dropdowns]
    I --> U[Floating Terminals]
    J --> V[Command Execution]
    K --> V
    L --> W[Docker Management]
    M --> X[Info Panels]
    N --> Y[Status Indicators]
    O --> X
    P --> Z[Environment Verification]
    Q --> Z
    R --> Z
```

### Configuration File Roles

| File | Purpose | Key Features |
|------|---------|-------------|
| `src/project-config/config/configurationSidebarSections.json` | UI structure and components | Sections, sub-sections, toggles, dropdowns, custom buttons |
| `src/project-config/config/configurationSidebarCommands.json` | Command generation logic | Conditional commands, modifiers, container associations |
| `src/project-config/config/configurationSidebarAbout.json` | Documentation and help | Section descriptions, verification details, help text |
| `src/environment-verification/generalEnvironmentVerifications.json` | Environment verification | Tool checks, system requirements, validation rules |

See [configuration-guide.md](configuration-guide.md) for detailed information.

## Caching & Performance

The application implements multiple caching layers for optimal performance:

```mermaid
sequenceDiagram
    participant UI as React UI
    participant Cache as Cache Layer
    participant Backend as Backend Process
    participant External as External Systems
    
    Note over UI,External: Initial Load
    UI->>Cache: Request data
    Cache->>Backend: Cache miss
    Backend->>External: Execute commands
    External-->>Backend: Results
    Backend->>Cache: Store results
    Cache-->>UI: Return data
    
    Note over UI,External: Subsequent Requests
    UI->>Cache: Request same data
    Cache-->>UI: Return cached data (fast)
    
    Note over UI,External: Cache Invalidation
    UI->>Cache: Trigger refresh
    Cache->>Backend: Force re-execution
    Backend->>External: Re-execute commands
    External-->>Backend: New results
    Backend->>Cache: Update cache
    Cache-->>UI: Return fresh data
```

### Cache Types

<details>
<summary>Click to expand cache implementation details</summary>

1. **Environment Verification Cache**: Stores verification results by section
2. **Dropdown Options Cache**: Command-based caching with dependency tracking
3. **Git Branch Cache**: Repository branch information per project
4. **Process State Cache**: Active terminal and container states

### Cache Strategies

- **Time-based Expiration**: Automatic cache invalidation
- **Dependency-based Invalidation**: Smart cache clearing based on relationships
- **Manual Refresh**: User-triggered cache clearing
- **Startup Preloading**: Critical data cached during application initialization

</details>

## Safety & Debug Features

The application includes comprehensive safety mechanisms and debugging tools integrated into the AppControlSidebar:

```mermaid
graph TB
    A[AppControlSidebar] --> AA[Auto Setup Button]
    A --> B[Developer Tools]
    A --> C[Application Reload]
    A --> D[Test Section Toggle]
    A --> E[No Run Mode]
    A --> F[Terminal Input Toggle]
    A --> G[Configuration Management]
    A --> H[Environment Export]
    A --> I[Verification Testing]
    
    AA --> AB[One-Click Environment Setup]
    
    E --> J[Command Preview]
    E --> K[Safe Testing]
    
    F --> L[Read-Only Protection]
    F --> M[Writable Override]
    
    G --> N[Import/Export Config]
    H --> O[Environment Data Export]
    I --> P[Toggle All Verifications]
    
    J --> Q[Show Commands Without Execution]
    L --> R[Prevent Accidental Input]
    
    style A fill:#fff3e0
    style E fill:#e8f5e8
    style F fill:#e3f2fd
```

### Safety Features

- **Read-Only Terminals**: Main terminals default to read-only mode (can be toggled via debug section)
- **No Run Mode**: Preview commands without execution for safe testing
- **Runtime Protection**: Critical debug features disabled while project is running to prevent conflicts
- **User Notifications**: Warning messages when attempting unsafe operations
- **Container Cleanup**: Automatic cleanup on process termination
- **Process Isolation**: Secure separation between UI and system operations
- **Risky Operation Warnings**: Clear labeling of potentially dangerous operations (like app reload)

### Debug Tools

The AppControlSidebar provides comprehensive tools for both regular operation and debugging:

**Main Features:**
- **Auto Setup**: One-click automated environment setup with priority-based fix command execution
- **Health Report**: Real-time monitoring of all running services and containers
- **Floating Terminal Management**: Show, minimize, and manage auxiliary terminals

**Debug Tools:**

- **Chrome DevTools Integration**: Opens browser developer tools for debugging
- **Application Reload**: Reloads the entire application (marked as risky due to potential variable substitution issues)
- **Test Section Toggle**: Show/hide development and test sections (disabled while project is running)
- **No Run Mode**: Preview commands without execution for safe testing
- **Terminal Input Toggle**: Switch between read-only and writable terminal modes
- **Configuration Management**: Import and export application configuration files
- **Environment Data Export**: Export complete environment verification data for debugging
- **Verification Testing**: Toggle all verifications between valid/invalid states for testing fix button functionality
- **Safety Mechanisms**: Most debug features are automatically disabled when the project is running to prevent conflicts

## Data Flow Summary

1. **Configuration Loading**: JSON files read and parsed on startup
2. **Environment Verification**: Parallel execution of all verification checks
3. **UI Rendering**: React components rendered based on configuration
4. **User Interaction**: Actions trigger command generation and execution
5. **Real-time Updates**: Live streaming of terminal output and status changes
6. **State Management**: Centralized state with intelligent caching
7. **Cleanup**: Graceful shutdown with container and process cleanup

## Development Environment

The project is configured with a robust ESLint setup to ensure code quality and prevent common errors. The configuration (`eslint.config.js`) includes plugins for:

- **Imports (`eslint-plugin-import`)**: Validates module paths and prevents resolution errors.
- **Promises (`eslint-plugin-promise`)**: Enforces best practices for handling Promises.
- **Node.js (`eslint-plugin-n`)**: Enforces Node.js best practices and style.
- **React & Jest**: Standard linting for React components and Jest tests.

This setup was instrumental in identifying and fixing pathing issues after the major file restructure.

## Performance Characteristics

- **Startup Time**: Fast startup with parallel verification loading
- **Memory Usage**: Efficient caching with automatic cleanup
- **CPU Usage**: Optimized command execution with efficient process management
- **Network**: Minimal network usage, primarily for cloud resource queries
- **Disk I/O**: Efficient file operations with caching

## Related Documentation

- [Configuration Guide](configuration-guide.md) - Detailed configuration options
- [Auto Setup Guide](auto-setup-guide.md) - Complete guide to automated environment setup
- [Terminal Features](terminal-features.md) - Terminal system capabilities
- [Command System](command-system.md) - Command generation and execution
- [Verification Types](verification-types.md) - Environment verification reference

---

This architecture enables {ProjectName} Manager to provide a powerful, flexible, and safe environment management experience while maintaining high performance and extensibility.

## Related Documentation

- [Architecture Overview](architecture-overview.md) - High-level system overview
- [Configuration Guide](configuration-guide.md) - Detailed configuration options  
- [Terminal Features](terminal-features.md) - Terminal system capabilities
- [Command System](command-system.md) - Command generation and execution
- [Verification Types](verification-types.md) - Environment verification reference
- [Auto Setup Guide](auto-setup-guide.md) - Automated environment setup
- [Testing Guide](testing-guide.md) - Test infrastructure and practices 