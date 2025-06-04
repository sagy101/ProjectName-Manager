# API Reference

This document provides a comprehensive reference for {ProjectName} Manager's internal APIs, IPC communication, and component interfaces. It is intended for developers working on or extending the {ProjectName} Manager application itself.

## Table of Contents

- [IPC Communication](#ipc-communication)
- [Component APIs](#component-apis)
  - [AppControlSidebar Component (New)](#appcontrolsidebar-component-new)
  - [FloatingTerminal Component](#floatingterminal-component)
  - [TerminalContainer Component](#terminalcontainer-component)
  - [TerminalComponent Component](#terminalcomponent-component)
- [State Management](#state-management)
- [Verification System](#verification-system)
- [Terminal Integration](#terminal-integration)
  - [Main Tabbed Terminals](#main-tabbed-terminals)
  - [Floating Terminals](#floating-terminals)
- [Git Integration](#git-integration)

## IPC Communication

{ProjectName} Manager uses Electron's IPC (Inter-Process Communication) for communication between the main process and renderer process. For a high-level diagram of communication flows, see the [System Architecture](architecture.md#communication-flow) document.

### Main Process → Renderer (Events received via `window.electron.on...` methods)

These are events sent from the main process that the renderer process can listen to.

**`environment-verification-complete`**
- **Listened via**: `window.electron.onEnvironmentVerificationComplete(callback)`
- **Data**: `Object` - The complete verification results.
  ```javascript
  // Example data structure
  {
    general: {
      statuses: { /* [verificationId]: 'valid'|'invalid'|'waiting' */ },
      config: { /* categories: [{ name, verifications }] */ },
      header: { /* title, dropdownSelectors config */ }
    },
    // [sectionId]: { statuses: { /* ... */ }, gitBranch: 'main' }
  }
  ```

**`verification-progress`**
- **Listened via**: `window.electron.onVerificationProgress(callback)`
- **Data**: `Object` - Progress of environment verification.
  ```javascript
  {
    completed: number, // Number of checks completed
    total: number,     // Total number of checks
    percentage: number // Overall progress percentage
  }
  ```

**`pty-output`**
- **Listened via**: `window.electron.onPtyOutput(terminalId, callback)`
- **Data**: `string` - Raw output data from the PTY process for the specified `terminalId`.

**`process-ended`**
- **Listened via**: `window.electron.onProcessEnded(callback)`
- **Data**: `Object` - Indicates a PTY process has ended.
  ```javascript
  {
    terminalId: string,
    code: number,      // Exit code of the process
    signal: string?    // Signal if terminated by one
  }
  ```
  *Note: `main.js` also sends `process-terminated` which seems to be for more general termination/cleanup notification, while `process-ended` includes exit code/signal.*

**`process-terminating`**
- **Listened via**: `window.electron.onProcessTerminating(callback)`
- **Data**: `Object` - Indicates a PTY process is being terminated.
  ```javascript
  {
    terminalId: string
  }
  ```

**`process-terminated`**
- **Listened via**: `window.electron.onProcessTerminated(callback)`
- **Data**: `Object` - Indicates a PTY process has been terminated (e.g., after cleanup).
  ```javascript
  {
    terminalId: string
  }
  ```

**`container-terminating`**
- **Listened via**: `window.electron.onContainerTerminating(callback)`
- **Data**: `Object` - Indicates a Docker container is being terminated.
  ```javascript
  {
    containerName: string
  }
  ```

**`container-terminated`**
- **Listened via**: `window.electron.onContainerTerminated(callback)`
- **Data**: `Object` - Indicates a Docker container has been terminated.
  ```javascript
  {
    containerName: string,
    success: boolean,
    error?: string     // Error message if termination failed
  }
  ```

**`backend-progress`**
- **Listened via**: `window.electron.onBackendProgress(callback)`
- **Data**: `Object` - Generic progress updates from backend operations (e.g., dropdown loading).
  ```javascript
  {
    type: string,      // Identifier for the type of progress
    status: string,    // e.g., 'loading', 'loaded', 'error'
    value: number,     // Progress value (e.g., percentage)
    // ...other custom progressData
  }
  ```

**`stop-all-containers-before-quit`**
- **Listened via**: `window.electron.onStopAllContainersBeforeQuit(callback)`
- **Data**: None. Signals the app is about to quit and containers should be stopped.

**`stop-all-containers-before-reload`**
- **Listened via**: `window.electron.onStopAllContainersBeforeReload(callback)`
- **Data**: None. Signals the app is about to reload and containers should be stopped.

*Obsolete/Unclear Listeners in Preload (Potentially remove or clarify if still used from main):*
- `onCommandOutput(callback)`: Seems to be a general PTY output, `onPtyOutput` is more specific.
- `onProcessStarted(callback)`: No corresponding send from `main.js` found.
- `onProcessKilled(callback)`: `main.js` sends `process-terminated` or `process-ended`.

### Renderer → Main Process (Functions exposed on `window.electron`)

These are functions the renderer process can call to request actions or data from the main process.

**Environment Verification**
- `getEnvironmentVerification(): Promise<Object>`
  - Invokes `get-environment-verification`.
  - Returns a Promise with the complete verification results.
- `refreshEnvironmentVerification(): Promise<Object>`
  - Invokes `refresh-environment-verification`.
  - Forces a refresh of all verification caches and returns the new results.

**Dropdown Operations**
- `fetchDropdownOptions(dropdownId: string, config: Object): Promise<Object>`
  - Invokes `fetch-dropdown-options`.
  - Params: `dropdownId`, `config` (includes `command`, `args?`, `parseResponse?`).
  - Returns Promise with `{ options: string[], error?: string }`.
- `executeDropdownCommand(config: Object): Promise<Object>`
  - Invokes `execute-dropdown-command`.
  - Params: `config` (includes `command`, `args?`, `parseResponse?`).
  - Returns Promise with `{ options: string[], error?: string }`.
- `dropdownValueChanged(dropdownId: string, value: string): void`
  - Sends `dropdown-value-changed`.
  - Notifies the backend of a dropdown value change, potentially for cache invalidation.

**Git Operations**
- `gitCheckoutBranch(projectPath: string, branchName: string): Promise<Object>`
  - Invokes `git-checkout-branch`.
  - Returns Promise with `{ success: boolean, error?: string, branch?: string }`.
- `gitListLocalBranches(projectPath: string): Promise<Object>`
  - Invokes `git-list-local-branches`.
  - Returns Promise with `{ success: boolean, branches?: string[], error?: string }`.

**Terminal Operations**
- `ptySpawn(command: string, terminalId: string, cols: number, rows: number): void`
  - Sends `pty-spawn`. Spawns a new PTY process.
- `ptyInput(terminalId: string, data: string): void`
  - Sends `pty-input`. Sends user input to the specified PTY.
- `ptyResize(terminalId: string, cols: number, rows: number): void`
  - Sends `pty-resize`. Resizes the specified PTY.
- `killProcess(terminalId: string): void`
  - Sends `kill-process`. Terminates the PTY process for the given terminal.

**Container Management**
- `stopContainers(containerNames: string[]): Promise<Object[]>`
  - Invokes `stop-containers`.
  - Returns Promise with an array of results: `{ container: string, success: boolean, error?: string }[]`.
- `getContainerStatus(containerName: string): Promise<string>`
  - Invokes `get-container-status`.
  - Returns Promise with container status string (e.g., 'running', 'exited', 'unknown').

**Application Control & Debugging**
- `openDevTools(): void`
  - Sends `open-dev-tools`. Opens Chrome Developer Tools.
- `reloadApp(): void`
  - Sends `reload-app`. Reloads the application.

## Component APIs

This section details the props and notable aspects of key React components.

### AppControlSidebar Component

**Purpose**: Manages the display and interaction for floating terminals and provides access to application-level debug tools.

**Props:**
```typescript
interface AppControlSidebarProps {
  floatingTerminals: FloatingTerminalState[]; // Array of floating terminal state objects
  onShowTerminal: (terminalId: string) => void;
  onCloseTerminal: (terminalId: string) => void;
  onToggleMinimize: (terminalId: string) => void;
  onOpenAbout: (terminalId: string) => void; // Shows info/about for a floating terminal
  activeFloatingTerminalId?: string | null;
  isExpanded: boolean;
  onToggleExpand: (expandedState?: boolean) => void;
  
  // Debug related props passed from App.jsx
  showTestSections: boolean;
  noRunMode: boolean;
  isIsoRunning: boolean; // True if the main ISO configuration is running
  onToggleTestSections: () => void;
  onToggleNoRunMode: () => void;
  showAppNotification: (message: string, type?: string, autoCloseTime?: number) => void;
  isMainTerminalWritable: boolean;
  onToggleMainTerminalWritable: () => void;
}
```

### FloatingTerminal Component

**Purpose**: Renders an individual draggable, resizable floating terminal window.

**Props:**
```typescript
interface FloatingTerminalProps {
  id: string; // Unique ID for the terminal
  title: string; // Title displayed in the terminal window
  command: string; // The command to execute (or display in noRunMode)
  isVisible: boolean;
  isMinimized: boolean;
  onClose: (terminalId: string) => void;
  onFocus: (terminalId: string) => void; // Callback when terminal is focused (e.g., clicked)
  initialPosition?: { x: number; y: number };
  zIndex?: number; // For stacking order
  onMinimize: (terminalId: string) => void;
  noRunMode: boolean; // If true, command is displayed but not run
  isReadOnly: boolean; // Note: FloatingTerminals are typically hardcoded to `isReadOnly={false}` when rendering their internal TerminalComponent, unless `noRunMode` is true.
}
```

### IsoConfiguration Component

**Purpose**: Manages the main configuration sidebar, state for each section, and orchestrates running the ISO command sets.

**Props:**
```typescript
interface IsoConfigurationProps {
  projectName: string;
  globalDropdownValues: object; // Current values of globally scoped dropdowns
  terminalRef: React.RefObject<TerminalContainerRef>; // Ref to TerminalContainer for actions
  verificationStatuses: object; // Current verification statuses for all sections
  onTriggerRefresh: () => void; // Callback to trigger a global verification refresh
  showTestSections: boolean; // If true, sections marked as test sections are displayed and included
  onConfigStateChange: (newState: object) => void; // Callback when the internal config state changes
  onIsRunningChange: (isRunning: boolean) => void; // Callback when the ISO run state changes
  openFloatingTerminal: (commandId: string, title: string, command: string) => void;
}
```

**State Management**:
Internal state (e.g., `configState` for section toggles/options, `isRunning`, `attachState`) is managed using React hooks (`useState`, `useEffect`). `onConfigStateChange` and `onIsRunningChange` are used to propagate important state changes to the parent `App` component.

**Key Internal Logic:**
- `generateCommandList(configState, globalDropdownValues)`: Crucial internal method that evaluates `configurationSidebarCommands.json` against the current `configState` and `globalDropdownValues` to produce a list of commands to be executed in main terminal tabs. It also handles filtering based on `showTestSections`.
- Event handlers for section interactions (toggling, deployment changes, mode changes, attach toggles, dropdown changes within sections) which update the internal `configState`.

### ConfigSection Component

**Purpose**: Renders a single section (or sub-section) within the `IsoConfiguration` sidebar, including its UI controls.

**Props:**
```typescript
interface ConfigSectionProps {
  section: SectionConfig; // The static configuration for this section from JSON
  config: object; // The current dynamic state for this section (e.g., { enabled, deploymentType, ... })
  toggleEnabled: (sectionId: string, enabled: boolean) => void;
  setDeploymentType: (sectionId: string, deploymentType: string) => void;
  setMode: (sectionId: string, mode: string) => void;
  setSectionDropdownValue: (sectionId: string, dropdownId: string, value: string) => void;
  globalDropdownValues: object;
  isAttached: boolean;
  onAttachToggle: (attached: boolean) => void;
  isAttachWarning: boolean;
  isLocked: boolean; // True if an ISO configuration is currently running
  sectionPathStatus: object | string; // Verification status for the section's path/verifications
  sectionGitBranch: string; // Current Git branch for the section
  onTriggerRefresh: () => void; // Propagated for refresh actions
  attachState: object; // Global attach state for all sections
  configState: object; // The entire application config state
  toggleSubSectionEnabled: (sectionId: string, subSectionId: string, enabled: boolean) => void;
  setSubSectionDeploymentType: (sectionId: string, subSectionId: string, deploymentType: string) => void;
  openFloatingTerminal: (commandId: string, title: string, command: string) => void;
}
```

**Types (related to `section` prop from `configurationSidebarSections.json`):**
```typescript
interface SectionConfig {
  id: string;
  title: string;
  testSection?: boolean;
  components: {
    toggle?: boolean;
    infoButton?: boolean;
    gitBranch?: boolean;
    deploymentOptions?: string[]; // Array of deployment option strings
    labels?: string[]; // Optional labels for deploymentOptions
    modeSelector?: { options: string[], default: string };
    attachToggle?: { enabled: boolean, mutuallyExclusiveWith?: string[] } | boolean;
    subSections?: SubSectionConfig[];
    dropdownSelectors?: DropdownSelectorConfig[];
    customButton?: { id: string, label: string, commandId: string };
    // Note: 'logsButton' if it exists, is typically implemented via a customButton
  }
}

interface SubSectionConfig extends SectionConfig { // SubSections have a similar structure
  // ...may have its own components including dropdownSelectors, deploymentOptions, etc.
}

interface DropdownSelectorConfig {
  id: string;
  command: string;
  parseResponse?: 'lines' | 'json' | 'function'; // 'function' implies a stringified function
  placeholder?: string;
  loadingText?: string;
  errorText?: string;
  noOptionsText?: string;
  dependsOn?: string; // ID of another dropdown it depends on
  commandArgs?: object;
  defaultValue?: { exact?: string, contains?: string };
  visibleWhen?: { configKey: string, hasValue: string }; // Conditional visibility
}
```

### EnvironmentVerification Component

**Purpose**: Renders the general environment verification section, typically at the top of the UI.

**Props:**
```typescript
interface EnvironmentVerificationProps {
  projectName: string;
  statusMap: object; // Verification statuses for general checks (e.g., { checkId: 'valid' })
  verificationConfig: object[]; // Array of category objects from generalEnvironmentVerifications.json
  headerConfig: object; // Header configuration (title, dropdowns) from generalEnvironmentVerifications.json
  globalDropdownValues: object;
  onGlobalDropdownChange: (dropdownId: string, value: string) => void;
  onInitiateRefresh: () => void; // Callback to trigger a refresh of these verifications
}
```

### TerminalContainer Component

**Purpose**: Manages and renders the main tabbed terminal area.

**Props:**
```typescript
interface TerminalContainerProps {
  ref: React.RefObject<TerminalContainerRef>; // For imperative API access
  noRunMode: boolean;
  configState: object; // Current application configuration state
  projectName: string;
  isReadOnly: boolean; // If true, main terminals will not accept input by default
}
```

**Imperative API (`ref` methods):**
```typescript
interface TerminalContainerRef {
  openTabs(tabConfigs: TabConfig[]): void; // Clears existing tabs and opens new ones
  clearTabs(): void; // Clears all main tabs
  getTerminals(): TerminalState[]; // Returns an array of current terminal states
  killAllTerminals(): Promise<void>; // Kills all PTYs and stops associated containers for main tabs
  stopAllContainers(): Promise<void>; // Stops all containers associated with main tabs
  // getActiveTerminalId(): string | null; // (Internally managed, not typically exposed/needed externally)
}

interface TabConfig { // Structure of objects in the array passed to openTabs
  id: string | number; // Unique ID for the tab
  title: string;       // Title for the tab
  command?: string;      // Command to execute (undefined for error tabs)
  originalCommand?: string; // Initial command before any refresh modifications
  status: 'idle' | 'running' | 'done' | 'error' | 'pending_spawn';
  sectionId: string;   // ID of the section this tab relates to
  commandDefinitionId?: number; // Index from configurationSidebarCommands.json
  associatedContainers?: string[];
  isSubSectionCommand?: boolean;
  refreshConfig?: object; // From configurationSidebarCommands.json
  refreshCount?: number;
  // For error tabs:
  type?: 'error';
  message?: string; // Error message to display
  errorType?: 'config'; // Type of error (e.g., configuration issue)
}

interface TerminalState extends TabConfig { /* ... plus any internal runtime state ... */ }
```

### TerminalComponent Component

**Purpose**: Renders a single xterm.js terminal instance, used by both `TerminalContainer` and `FloatingTerminal`.

**Props:**
```typescript
interface TerminalComponentProps {
  id: string; // Unique ID for this terminal instance
  active: boolean; // If true, this terminal is currently visible/focused
  initialCommand: string; // The command to execute or display
  noRunMode: boolean; // If true, displays command instead of running
  isReadOnly: boolean; // If true, user input to the terminal is disabled
  isErrorTab?: boolean; // If true, displays an error message instead of a terminal
  errorMessage?: string; // The error message to display if isErrorTab is true
}
```

## State Management

### Application State Structure

```typescript
interface ApplicationState {
  // Section configurations and states
  sections: {
    [sectionId: string]: SectionState
  };
  
  // General environment verification results
  generalEnvironmentStatuses: {
    [verificationId: string]: VerificationStatus
  };
  
  // Verification configuration
  generalVerificationConfig: VerificationConfig;
  
  // UI state
  isRunning: boolean;
  debugMode: boolean;
}

type VerificationStatus = 'valid' | 'invalid' | 'waiting';
```

### State Updates

State updates follow React patterns with immutable updates:

```typescript
// Section toggle
setSections(prev => ({
  ...prev,
  [sectionId]: {
    ...prev[sectionId],
    enabled: !prev[sectionId].enabled
  }
}));

// Deployment option change
setSections(prev => ({
  ...prev,
  [sectionId]: {
    ...prev[sectionId],
    deploymentOption: newOption
  }
}));
```

## Verification System

### Verification Configuration

```typescript
interface VerificationConfig {
  categories: VerificationCategory[];
}

interface VerificationCategory {
  name: string;
  verifications: VerificationObject[];
}

interface VerificationObject {
  id: string;
  title: string;
  checkType: 'commandSuccess' | 'outputContains' | 'envVarExists' | 'envVarEquals' | 'pathExists';
  
  // Command-based verifications
  command?: string;
  expectedValue?: string;
  outputStream?: 'stdout' | 'stderr' | 'any';
  
  // Environment variable verifications
  variableName?: string;
  
  // Path verifications
  pathValue?: string;
  pathType?: 'file' | 'directory';
}
```

### Verification Execution

The verification system executes checks asynchronously:

```typescript
// Main process verification function
async function verifyEnvironment(): Promise<VerificationResults> {
  const results = {};
  
  for (const verification of verifications) {
    try {
      const result = await executeVerification(verification);
      results[verification.id] = result;
    } catch (error) {
      results[verification.id] = 'invalid';
    }
  }
  
  return results;
}
```

### Custom Verification Types

To add new verification types, extend the verification system:

```typescript
// In main.js
switch (checkType) {
  case 'commandSuccess':
    // Existing implementation
    break;
  case 'customCheck':
    result = await executeCustomCheck(verification);
    break;
  default:
    console.warn(`Unknown checkType: ${checkType}`);
    result = 'invalid';
}
```

## Terminal Integration

{ProjectName} Manager features two types of terminals:

### Main Tabbed Terminals
- Integrated into the primary UI with a tab bar.
- Used for executing commands from the main configuration sections.
- **Read-only by default**; can be made writable via Debug Tools in the AppControlSidebar.

### Floating Terminals
- Independent, draggable, resizable, and minimizable windows.
- Launched typically by `customButton` components for specific tasks (e.g., "View Logs").
- Managed (show, minimize, close, view "About" info) via the AppControlSidebar.
- Respects the global "No Run Mode" setting.
- **Always writable** (unless in "No Run Mode" where no execution occurs).

### Terminal Manager API

```typescript
interface TerminalManager {
  // Write text to a specific terminal
  writeToTerminal(terminalId: string, text: string, isError?: boolean): boolean;
  
  // Get currently active terminal ID
  getActiveTerminalId(): string | null;
  
  // Set active terminal
  setActiveTerminalId(id: string): void;
  
  // Create new terminal
  createTerminal(terminalId: string): boolean;
}

// Global terminal manager instance
declare global {
  interface Window {
    terminalManager: TerminalManager;
    runInTerminal: (command: string, newTab?: boolean) => string;
    terminals: {[id: string]: TerminalInstance};
  }
}
```

### Terminal Instance API

```typescript
interface TerminalInstance {
  write(data: string, isError?: boolean): void;
  term: Terminal; // xterm.js Terminal instance
}
```

### PTY Integration

```typescript
// Spawn new PTY process
window.electron.ptySpawn(command, terminalId, cols, rows);

// Send input to PTY
window.electron.ptyInput(terminalId, data);

// Resize PTY
window.electron.ptyResize(terminalId, cols, rows);

// Listen for PTY output
const removeListener = window.electron.onPtyOutput(terminalId, (output) => {
  // Handle output
});

// Kill PTY process
window.electron.killProcess(terminalId);
```

## Git Integration

### Git Operations API

```typescript
interface GitOperations {
  // Checkout branch
  gitCheckoutBranch(projectPath: string, branchName: string): Promise<GitResult>;
  
  // List local branches
  gitListLocalBranches(projectPath: string): Promise<GitBranchResult>;
}

interface GitResult {
  success: boolean;
  error?: string;
}

interface GitBranchResult {
  success: boolean;
  branches?: string[];
  error?: string;
}
```

### Git State Management

```typescript
// Branch information is stored in section state
interface SectionState {
  gitBranch: string; // Current branch name
  // ... other properties
}

// Branch changes trigger verification refresh
const handleBranchChange = () => {
  // Refresh environment verification
  window.electron.verifyEnvironment();
};
```

## Error Handling

### IPC Error Handling

```typescript
// Async IPC calls with error handling
try {
  const result = await window.electron.gitCheckoutBranch(path, branch);
  if (!result.success) {
    console.error('Git checkout failed:', result.error);
    // Handle error in UI
  }
} catch (error) {
  console.error('IPC call failed:', error);
  // Handle IPC error
}
```

### Verification Error Handling

```typescript
// Verification errors are handled gracefully
const executeVerification = async (verification) => {
  try {
    // Execute verification logic
    return 'valid';
  } catch (error) {
    console.error(`Verification failed for ${verification.id}:`, error);
    return 'invalid';
  }
};
```

### Terminal Error Handling

```typescript
// Terminal errors are displayed in the terminal output
const handleTerminalError = (terminalId, error) => {
  if (window.terminals[terminalId]) {
    window.terminals[terminalId].write(`\r\nError: ${error.message}\r\n`, true);
  }
};
```

## Development APIs

### Debug Tools (via AppControlSidebar)

Access to debug functionalities is now consolidated within the **App Control Sidebar**, which is toggled by the gear icon at the bottom of that sidebar. The gear icon indicates active debug options with an orange border.

**Available Debug Actions:**
-   **Open Dev Tools**: Launches Chrome Developer Tools for the renderer process.
-   **Reload App**: Reloads the entire Electron application.
-   **Show/Hide Test Sections**: Toggles the visibility of sections marked `testSection: true`
-   **Show/Hide Test Sections**: Toggles the visibility of sections marked `testSection: true`
This API reference provides the foundation for understanding and extending {ProjectName} Manager's functionality. For specific implementation details, refer to the source code and configuration examples. 