# System Architecture

This document provides a comprehensive overview of the {ProjectName} Manager's architecture, covering how components interact, data flows, and the overall system design.

## Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [Communication Flow](#communication-flow)
- [Environment Verification System](#environment-verification-system)
- [Terminal System Architecture](#terminal-system-architecture)
- [Command Generation & Execution](#command-generation--execution)
- [Configuration System](#configuration-system)
- [Caching & Performance](#caching--performance)
- [Safety & Debug Features](#safety--debug-features)
- [Related Documentation](#related-documentation)

## Overview

{ProjectName} Manager is an Electron-based desktop application that provides comprehensive environment management with integrated terminal support, environment verification, and dynamic configuration management. The application follows a modular, JSON-driven architecture that allows for extensive customization without code changes.

### Key Architectural Principles

- **Configuration-Driven**: All functionality defined through JSON configuration files
- **Process Isolation**: Electron's main/renderer process separation for security and stability
- **Real-time Communication**: IPC-based communication with live data streaming
- **Intelligent Caching**: Multi-layered caching for performance optimization
- **Safety First**: Read-only defaults with explicit overrides for safety

## Architecture Diagram

```mermaid
graph TB
    subgraph "Electron Application"
        subgraph "Main Process (Node.js)"
            A[main.js] --> B[Environment Verification]
            A --> C[Terminal Management PTY]
            A --> D[Command Execution]
            A --> E[Docker Container Management]
            A --> F[Git Operations]
            A --> G[Dropdown Cache Management]
        end
        
        subgraph "Preload Script"
            H[electron-preload.js<br/>IPC Bridge]
        end
        
        subgraph "Renderer Process (React)"
            I[App.jsx] --> J[IsoConfiguration]
            I --> K[TerminalContainer]
            I --> L[EnvironmentVerification]
            I --> M[FloatingTerminals]
            I --> N[AppControlSidebar]
        end
    end
    
    subgraph "Configuration Files"
        O[configurationSidebarSections.json<br/>UI Structure & Components]
        P[configurationSidebarCommands.json<br/>Command Generation Logic]
        Q[configurationSidebarAbout.json<br/>Descriptions & Info]
        R[generalEnvironmentVerifications.json<br/>Tool Verification Config]
    end
    
    A -.->|IPC| H
    H -.->|Context Bridge| I
    I -.->|Reads| O
    I -.->|Reads| P
    I -.->|Reads| Q
    A -.->|Reads| R
```

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
    UI->>+Preload: fetchDropdownOptions(config)
    Preload->>+Main: IPC: fetch-dropdown-options
    Main->>+System: Execute dropdown command
    System-->>-Main: Options list
    Main-->>-Preload: Cached results
    Preload-->>-UI: Dropdown options
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

## Terminal System Architecture

The application features a dual-terminal system designed for different use cases and safety requirements.

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
    end
    
    subgraph "Process Management"
        O[Process Tracking]
        P[Container Status Monitoring]
        Q[Cleanup on Exit]
    end
    
    K --> O
    G --> P
    N --> Q
```

### Terminal Types

#### Main Terminals
- **Purpose**: Primary command execution for configuration sections
- **Safety**: Read-only by default (debug override available)
- **Features**: Tab management, container lifecycle tracking, process monitoring
- **Use Case**: Running main application services and processes

#### Floating Terminals
- **Purpose**: Auxiliary tasks and log viewing
- **Features**: Draggable, resizable, minimizable windows
- **Trigger**: Custom buttons in configuration sections
- **Use Case**: Viewing logs, running diagnostic commands, temporary tasks

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
4. **Modifier Application**: Prefixes, suffixes, and post-modifiers applied
5. **Execution**: Commands run in appropriate terminal context

See [command-system.md](command-system.md) for detailed information.

## Configuration System

The entire application behavior is defined through JSON configuration files, enabling extensive customization without code changes.

```mermaid
graph TD
    A[JSON Configuration Files] --> B[configurationSidebarSections.json]
    A --> C[configurationSidebarCommands.json] 
    A --> D[configurationSidebarAbout.json]
    A --> E[generalEnvironmentVerifications.json]
    
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
| `configurationSidebarSections.json` | UI structure and components | Sections, sub-sections, toggles, dropdowns, custom buttons |
| `configurationSidebarCommands.json` | Command generation logic | Conditional commands, modifiers, container associations |
| `configurationSidebarAbout.json` | Documentation and help | Section descriptions, verification details, help text |
| `generalEnvironmentVerifications.json` | Environment verification | Tool checks, system requirements, validation rules |

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

1. **Environment Verification Cache**: Stores verification results by section
2. **Dropdown Options Cache**: Command-based caching with dependency tracking
3. **Git Branch Cache**: Repository branch information per project
4. **Process State Cache**: Active terminal and container states

### Cache Strategies

- **Time-based Expiration**: Automatic cache invalidation
- **Dependency-based Invalidation**: Smart cache clearing based on relationships
- **Manual Refresh**: User-triggered cache clearing
- **Startup Preloading**: Critical data cached during application initialization

## Safety & Debug Features

The application includes comprehensive safety mechanisms and debugging tools:

```mermaid
graph TB
    A[Debug Panel] --> B[Developer Tools]
    A --> C[Application Reload]
    A --> D[Test Section Toggle]
    A --> E[No Run Mode]
    A --> F[Terminal Input Toggle]
    
    E --> G[Command Preview]
    E --> H[Safe Testing]
    
    F --> I[Read-Only Protection]
    F --> J[Writable Override]
    
    G --> K[Show Commands Without Execution]
    I --> L[Prevent Accidental Input]
    
    style A fill:#fff3e0
    style E fill:#e8f5e8
    style F fill:#e3f2fd
```

### Safety Features

- **Read-Only Terminals**: Main terminals default to read-only mode
- **No Run Mode**: Preview commands without execution
- **Container Cleanup**: Automatic cleanup on process termination
- **Process Isolation**: Secure separation between UI and system operations

### Debug Tools

- **Chrome DevTools Integration**: Full debugging capabilities
- **Test Section Management**: Hide/show development sections
- **Live Configuration Reload**: Update behavior without restart
- **Process Monitoring**: Real-time process and container status

## Data Flow Summary

1. **Configuration Loading**: JSON files read and parsed on startup
2. **Environment Verification**: Parallel execution of all verification checks
3. **UI Rendering**: React components rendered based on configuration
4. **User Interaction**: Actions trigger command generation and execution
5. **Real-time Updates**: Live streaming of terminal output and status changes
6. **State Management**: Centralized state with intelligent caching
7. **Cleanup**: Graceful shutdown with container and process cleanup

## Performance Characteristics

- **Startup Time**: Fast startup with parallel verification loading
- **Memory Usage**: Efficient caching with automatic cleanup
- **CPU Usage**: Optimized command execution with process pooling
- **Network**: Minimal network usage, primarily for cloud resource queries
- **Disk I/O**: Efficient file operations with caching

## Related Documentation

- [Configuration Guide](configuration-guide.md) - Detailed configuration options
- [Terminal Features](terminal-features.md) - Terminal system capabilities
- [Command System](command-system.md) - Command generation and execution
- [Verification Types](verification-types.md) - Environment verification reference
- [API Reference](api-reference.md) - Internal API documentation

---

This architecture enables {ProjectName} Manager to provide a powerful, flexible, and safe environment management experience while maintaining high performance and extensibility. 