# Simulation System

> Comprehensive command, verification, and dropdown simulation infrastructure for {ProjectName} Manager

## Overview

The simulation system provides a complete replacement for real external tools and services during development and testing. This system enables {ProjectName} Manager to run with completely generic, predictable data while maintaining full functionality.

## Architecture

The simulation system consists of three interconnected simulators that work together to provide a realistic but controlled environment:

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  Generic Command    │    │   Verification       │    │   Dropdown          │
│     Simulator       │    │     Simulator        │    │   Simulator         │
│                     │    │                      │    │                     │
│ • Container mgmt    │    │ • Tool verification  │    │ • Project lists     │
│ • Build processes   │    │ • Fix commands       │    │ • Context lists     │
│ • Development runs  │    │ • Environment checks │    │ • Pod selections    │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                          ┌─────────────────────┐
                          │   Configuration     │
                          │      Files          │
                          │                     │
                          │ • Sections          │
                          │ • Commands          │
                          │ • Verifications     │
                          └─────────────────────┘
```

## System Components

### 1. Generic Command Simulator

**Location**: `scripts/simulators/generic-command-simulator.js`

**Purpose**: Replaces all real application commands (build, run, container management) with a configurable simulator that provides realistic timing and behavior.

#### Features

- **Configurable Duration**: Commands can run for specific times or indefinitely
- **Success/Failure Control**: Simulate success or failure scenarios
- **Container Simulation**: Manages mock container lifecycle
- **Variable Display**: Shows environment variables in realistic format
- **Silent/Verbose Modes**: Control output verbosity

#### Usage

```bash
# Basic command simulation
node scripts/simulators/generic-command-simulator.js --duration=30 --result=success

# Container mode with variables
node scripts/simulators/generic-command-simulator.js \
  --duration=30 \
  --result=success \
  --containers='container-a,container-b' \
  --variables='nodeVersion=15.5.1,debugPort=5005' \
  --tabTitle='Service A (Debug)'
```

#### Parameters

| Parameter | Description | Examples |
|-----------|-------------|----------|
| `--duration` | How long to run | `30` (seconds), `infinite` |
| `--result` | Command outcome | `success`, `fail` |
| `--containers` | Container names | `container-a,container-b` |
| `--variables` | Environment vars | `nodeVersion=15.5.1,port=8080` |
| `--silent` | Output control | `true`, `false` |
| `--tabTitle` | Terminal tab name | `Service A` |

### 2. Verification Simulator

**Location**: `scripts/simulators/verification-simulator.js`

**Purpose**: Simulates tool verification and fix commands for environment validation without requiring real tools to be installed.

#### Features

- **Session-Based State**: No persistence across app restarts
- **Realistic Responses**: Tool-specific output that matches real commands
- **Environment Variable Support**: Dynamic responses based on actual environment
- **Fix Command Support**: Simulates fixing verification issues
- **Default Valid State**: Verifications succeed by default unless overridden

#### Usage

```bash
# Verify a tool
node scripts/simulators/verification-simulator.js verify cloudGcloudCLI

# Fix a verification issue  
node scripts/simulators/verification-simulator.js fix cloudGcloudCLI

# Override behavior with environment variable
VERIFICATION_SHOULD_FAIL=true node scripts/simulators/verification-simulator.js verify nodeJs
```

#### Supported Verifications

| Tool | Verification ID | Output Example |
|------|----------------|----------------|
| gcloud CLI | `cloudGcloudCLI` | `Google Cloud SDK 458.0.1` |
| kubectl | `cloudKubectlCLI` | `Client Version: v1.28.4` |
| Docker | `dockerRunning` | `Docker version 24.0.7` |
| Node.js | `nodeJs` | `v15.5.1` |
| Go | `goInstalled` | `go version go1.21.5` |
| Java | `javaVersion` | `openjdk version "17.0.9"` |

#### State Management

- **No Persistence**: Verification state resets on app restart
- **Session Memory**: Maintains state during app session
- **Default Behavior**: All verifications succeed by default
- **Environment Override**: `VERIFICATION_SHOULD_FAIL=true` forces failures
- **Fix Commands**: Updates verification state to success

### 3. Dropdown Simulator

**Location**: `scripts/simulators/dropdown-simulator.js`

**Purpose**: Provides realistic, varying dropdown data for project selection, Kubernetes contexts, and pod listings.

#### Features

- **Time-Based Variation**: Results change every 30 seconds for demo purposes
- **Deterministic**: Same results within time windows for consistency
- **Generic Data**: All values use generic naming conventions
- **Multiple Formats**: Supports different dropdown types
- **Auto-Detection**: Can detect command type from full command strings

#### Usage

```bash
# Generate project list
node scripts/simulators/dropdown-simulator.js gcloud-projects

# Generate kubectl contexts
node scripts/simulators/dropdown-simulator.js kubectl-contexts --json

# Generate pod lists
node scripts/simulators/dropdown-simulator.js kubectl-pods-service-c-sub --count=3

# Auto-detect from command
node scripts/simulators/dropdown-simulator.js "gcloud projects list --format=value(projectId)"
```

#### Supported Dropdown Types

| Type | Command | Sample Output |
|------|---------|---------------|
| GCP Projects | `gcloud-projects` | `project-a-dev-abe5983f` |
| Kubectl Contexts | `kubectl-contexts` | `gke_project-a-dev_us-central1_dev-cluster` |
| Service Pods | `kubectl-pods-service-c-sub` | `service-c-sub-deployment-7c8d9e0f-abc12` |

#### Output Formats

- **Line-separated** (default): One item per line
- **JSON Array** (`--json`): Valid JSON array format
- **Limited Count** (`--count=N`): Restrict number of results

## Configuration Integration

### Command Replacement

All real commands in configuration files have been replaced with simulator calls:

**Before:**
```json
{
  "command": "cd ./project-a && docker-compose up -d"
}
```

**After:**
```json
{
  "command": "node ./ProjectName-Manager/scripts/simulators/generic-command-simulator.js --duration=30 --result=success --containers='container-a,container-b'"
}
```

### Verification Integration

Environment verifications now use the verification simulator:

**Before:**
```json
{
  "id": "cloudGcloudCLI",
  "command": "gcloud --version",
  "fixCommand": "brew install google-cloud-sdk"
}
```

**After:**
```json
{
  "id": "cloudGcloudCLI", 
  "command": "node ./ProjectName-Manager/scripts/simulators/verification-simulator.js verify cloudGcloudCLI",
  "fixCommand": "node ./ProjectName-Manager/scripts/simulators/verification-simulator.js fix cloudGcloudCLI"
}
```

### Dropdown Integration

Dropdown selectors use the dropdown simulator:

**Before:**
```json
{
  "id": "gcloudProject",
  "command": "gcloud projects list --format=\"value(projectId)\""
}
```

**After:**
```json
{
  "id": "gcloudProject",
  "command": "node ./ProjectName-Manager/scripts/simulators/dropdown-simulator.js gcloud-projects"
}
```

## Generic Naming Conventions

The simulation system uses consistent generic naming to avoid any project-specific references:

### Projects and Services
- `project-a`, `project-b`, `project-c` (main projects)
- `project-infrastructure` (infrastructure project)
- `service-a`, `service-b`, `service-c` (UI service names)

### Containers
- `container-a`, `container-b`, `container-c` (database containers)
- `container-d`, `container-e` (application containers)  
- `container-f`, `container-g` (specialized containers)

### Directories
- `./project-a/`, `./project-b/` (project directories)
- `./project-c/subproject-a/` (nested projects)
- `./project-infrastructure/` (infrastructure)

### Cloud Resources
- `project-a-dev-abe5983f` (GCP project IDs)
- `gke_project-a-dev_us-central1_dev-cluster` (Kubernetes contexts)
- `service-c-sub-deployment-7c8d9e0f-abc12` (pod names)

## Development Benefits

### 1. **No External Dependencies**
- Developers don't need gcloud, kubectl, Docker, or other tools installed
- Works immediately after `npm install`
- Consistent behavior across all development environments

### 2. **Predictable Behavior**
- Commands always succeed (unless configured to fail)
- Dropdown data is consistent and realistic
- No network dependencies or API rate limits

### 3. **Complete Control**
- Easy to test failure scenarios with environment variables
- Configurable timing for performance testing
- Deterministic results for reliable testing

### 4. **Realistic Simulation**
- Tool outputs match real command responses
- Container lifecycle simulation
- Proper exit codes and error handling

## Testing Integration

### E2E Test Support

The simulation system is fully integrated with E2E tests:

```javascript
// Tests work with simulated commands
await enableSection(window, 'Service A');
await runConfiguration(window);
await waitForTerminalTab(window, 'Service A');
```

### Mock Environment

E2E tests automatically set up the simulation environment:

- **Script**: `scripts/setup-mock-e2e-env.sh`
- **Dynamic Generation**: Creates mocks based on configuration files
- **Path Setup**: Adds simulators to PATH for seamless execution

### GitHub Actions

CI/CD workflows use the simulation system:

- No external tool dependencies in GitHub Actions
- Consistent behavior across all CI runs
- Realistic testing without actual cloud resources

## Extending the System

### Adding New Commands

1. **Add to Generic Command Simulator**:
   ```javascript
   // In generic-command-simulator.js
   if (commandType.includes('new-tool')) {
     return runNewToolSimulation(options);
   }
   ```

2. **Update Configuration**:
   ```json
   {
     "command": "node ./ProjectName-Manager/scripts/simulators/generic-command-simulator.js --duration=10 --result=success --tool=new-tool"
   }
   ```

### Adding New Verifications

1. **Add to Verification Simulator**:
   ```javascript
   // In verification-simulator.js
   'newTool': {
     success: 'New Tool v1.2.3',
     failure: 'newTool: command not found',
     type: 'outputContains',
     expectedValue: 'New Tool'
   }
   ```

2. **Add to Configuration**:
   ```json
   {
     "id": "newTool",
     "command": "node ./ProjectName-Manager/scripts/simulators/verification-simulator.js verify newTool",
     "fixCommand": "node ./ProjectName-Manager/scripts/simulators/verification-simulator.js fix newTool"
   }
   ```

### Adding New Dropdown Types

1. **Add to Dropdown Simulator**:
   ```javascript
   // In dropdown-simulator.js
   function generateNewDropdownType() {
     return ['option-1', 'option-2', 'option-3'];
   }
   ```

2. **Add Case Handler**:
   ```javascript
   case 'new-dropdown-type':
     return generateNewDropdownType();
   ```

## Troubleshooting

### Common Issues

**Commands Not Found**:
- Ensure `scripts/simulators/` is in PATH for E2E tests
- Check that simulator files are executable (`chmod +x`)

**Verification Failures**:
- Use `VERIFICATION_SHOULD_FAIL=true` to test failure scenarios
- Check that verification IDs match between config and simulator

**Missing Dropdown Data**:
- Verify command type is supported in dropdown simulator
- Check that dropdown selectors use correct command format

### Debug Mode

Enable detailed logging for simulators:

```bash
DEBUG=true node scripts/simulators/generic-command-simulator.js --duration=5
```

### State Reset

To reset verification state during development:
- Restart the application (simulators don't persist state)
- Use environment variables to override default behavior

## Performance Considerations

### Timing
- Container commands: 30 seconds (realistic build time)
- Development commands: Infinite (until stopped)
- Verification commands: Instant
- Fix commands: Instant

### Resource Usage
- Minimal CPU usage (no real operations)
- No network requests
- No disk I/O (except for logs)
- Fast startup times

## Security

### No Real Operations
- Simulators never execute real commands
- No actual container creation or management
- No real cloud API calls
- Safe for any environment

### Data Privacy
- All generated data is generic and fictional
- No real project names, IDs, or sensitive information
- Deterministic output prevents data leaks

## See Also

- [Testing Framework](./testing.md) - How simulators integrate with testing
- [Configuration Guide](../configuration/) - Configuration file formats
- [Architecture Guide](../architecture/) - System architecture overview 