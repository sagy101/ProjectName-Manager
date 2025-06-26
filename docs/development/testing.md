# Testing Framework

> Comprehensive testing infrastructure and strategies for {ProjectName} Manager

## Overview

This guide covers the testing infrastructure, strategies, and practices used in {ProjectName} Manager. The test suite ensures reliability through unit tests, component tests, and end-to-end tests.

## Testing Philosophy

### Core Principles

1. **Behavior-Driven**: Test what the code does, not how it does it
2. **Bug Prevention**: Each test catches specific bugs that have caused real issues
3. **Data Structure Compatibility**: Ensure frontend/backend contracts remain stable
4. **Minimal Mocking**: Only mock external dependencies
5. **Fast and Reliable**: Quick execution without flaky failures

### Test Categories

- **Critical Bug Prevention**: Tests that catch data structure mismatches and compatibility issues
- **Component Behavior**: Tests that verify React components render and behave correctly
- **End-to-End Workflows**: Tests that validate complete user workflows
- **Core Functionality**: Tests that verify essential application logic

## Setup and Configuration

The testing framework is built upon [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

### Jest Configuration

The main Jest configuration is in `jest.config.js`. It's set up to:
- Use `node` as the default test environment.
- Use `<rootDir>/jest.setup.js` to import `@testing-library/jest-dom` matchers for all tests.
- Mock CSS and other static assets to prevent errors during tests.
- Use `moduleNameMapper` to redirect imports of production configuration files (`*.json`) to their mock counterparts in the `__tests__/mock-data/` directory. This ensures tests run against a stable, generic dataset.

### Test Environment

- **Node Environment**: Most of the business logic and utility tests run in a standard `node` environment.
- **JSDOM Environment**: For component rendering tests that require a DOM, we use the `jsdom` environment. This is enabled on a per-file basis by adding the following docblock to the top of the test file:
  ```javascript
  /** @jest-environment jsdom */
  ```
- **Data Structure Compatibility**: Ensures import/export returns expected data structures
- **Frontend Integration**: Verifies git operations return data in format expected by UI components
- **API Consistency**: Checks that backend functions return data in expected formats
- **Isolated Configuration**: Tests run against a dedicated set of mock configuration files (`__tests__/mock-data/*.json`), making them independent of production configuration changes. This prevents tests from breaking when the real configuration is modified.

### Mock Data

Tests run against a stable, generic set of mock configuration files located in `__tests__/mock-data/`. This ensures that tests are not dependent on the production configuration, which can change frequently. The mock data is designed to cover a variety of component configurations and features.

-   **`mockConfigurationSidebarSections.json`**: Defines the UI structure for the tests. It includes sections with different component configurations, such as `deploymentOptions`, `modeSelector`, sub-sections, dropdowns, and custom buttons. It also includes a `testSection` that is hidden by default.
-   **`mockConfigurationSidebarAbout.json`**: Provides the "About" information and verifications for the mock sections.
-   **`mockConfigurationSidebarCommands.json`**: Contains the command definitions for the mock sections, including commands for main sections, sub-sections, and custom buttons.

By using this mock data, we can write tests that are stable, predictable, and easy to maintain.

## Running Tests

To run the entire test suite, use the following command:

```bash
npm test
```

This command will automatically trigger the `pretest` and `posttest` scripts to handle `node-pty` compilation for the appropriate environment.

## Types of Tests

### Bug Prevention Tests

- **Location**: `__tests__/main-startup.test.js`
- **Purpose**: These tests catch specific bugs that have broken frontend functionality in the past:
  - **Data Structure Compatibility**: Ensures import/export returns expected data structures
  - **Frontend Integration**: Verifies git operations return data in format expected by UI components
  - **API Consistency**: Checks that backend functions return data in expected formats

**Example Bug Prevention Tests:**
```javascript
// Catches data structure bugs that break frontend
test('should return correct data structure from import configuration', ...)
test('should return branch property from git checkout command', ...)
test('should return array directly from getAboutConfig', ...)
```

### Unit Tests

- **Location**: `__tests__/`
- **Examples**: `mainUtils.test.js`, `evalUtils.test.js`
- **Purpose**: To test individual functions and modules in isolation. These tests ensure that the core business logic of the application is working correctly.

### Component Rendering Tests

- **Location**: `__tests__/`
- **Example**: `componentsRender.test.jsx`
- **Purpose**: These tests use React Testing Library to render React components and verify that they behave as expected. They check for correct rendering, event handling, and state changes. These tests require the `jsdom` environment.

### End-to-End (E2E) Tests

- **Location**: `__tests__/e2e/`
- **Framework**: [Playwright](https://playwright.dev/) with Electron
- **Purpose**: E2E tests validate complete workflows from start to finish. They test real user interactions with the actual Electron application, ensuring different components work together correctly.

#### E2E Test Helpers Overview

The E2E tests use a comprehensive modular helper system located in `__tests__/e2e/test-helpers/`. These helpers eliminate code duplication and provide consistent, reliable operations across all tests.

**Benefits:**
- **Consistent Operations**: All tests use the same reliable implementations
- **Reduced Duplication**: 60-80% code reduction in test files
- **Better Error Handling**: Centralized timeout and retry logic
- **Easy Maintenance**: Update behavior in one place, applies to all tests

**Import Location:** All helpers are available through the main index:
```javascript
const { launchElectron, enableSection, runConfiguration } = require('./test-helpers/index.js');
```

#### Quick Reference - Most Common Helpers

| Helper | Purpose | Usage |
|--------|---------|-------|
| `launchElectron()` | Start Electron app and return window | `const { electronApp, window } = await launchElectron();` |
| `enableSection(window, title)` | Enable a configuration section | `await enableSection(window, 'Service A');` |
| `runConfiguration(window)` | Run the current configuration | `await runConfiguration(window);` |
| `waitForTerminalTab(window, name)` | Wait for terminal tab to appear | `await waitForTerminalTab(window, 'Service A');` |
| `expandAppControlSidebar(window)` | Open the app control sidebar | `await expandAppControlSidebar(window);` |
| `openDebugTools(window)` | Open debug tools panel | `await openDebugTools(window);` |
| `stopConfiguration(window)` | Stop running configuration | `await stopConfiguration(window);` |

### Viewing Debug Logs in E2E Tests (Electron)

To see detailed logs from both the Electron main process (backend) and the renderer (browser) during E2E tests:

- **On GitHub Actions:** Logs from both the main process and renderer are automatically captured and shown in the Actions UI when `DEBUG_LOGS=true` is set in the workflow.
- **Locally:**
  - By default, only renderer/browser logs are shown during E2E tests.
  - To see backend (main process) logs as well, run with both `CI=true` and `DEBUG_LOGS=true`:
    ```sh
    CI=true DEBUG_LOGS=true npm run test:e2e
    ```
  - This is because the E2E test helper (`__tests__/e2e/test-helpers.js`) is configured to forward main process logs only when both `CI` and `DEBUG_LOGS` are set to `true` (to avoid clutter during normal local runs).

**Log Prefixes:**
- `[APP CONSOLE]` — Renderer/browser logs (from the Electron window)
- `[MAIN STDOUT]` / `[MAIN STDERR]` — Backend/main process logs (including all `[DEBUG]` logs)

### GitHub Actions E2E Test Logging and Checks
- The CI workflow runs three main checks on every pull request:
  - **Jest Tests**: Runs all unit/component tests using Jest. Fails if any test fails.
  - **E2E Tests**: Runs Playwright E2E tests in a headless Electron environment. Fails if any workflow or UI test fails.
  - **Coverage**: Runs Jest with coverage reporting and merges results. Surfaces overall coverage % in PR comments.
- All checks must pass for a PR to be mergeable.
- Pass/fail status and summary (including test/coverage stats) are shown directly in the PR UI.
- Both backend and frontend logs are visible in the Actions log output for debugging.
- Artifacts (e.g., logs, coverage reports) may be uploaded for further review.

### Jest Tests Matrix Strategy

The Jest tests workflow uses a **Matrix Strategy** to run both mock and prod tests efficiently:

- **Parallel Execution**: Mock and prod tests run simultaneously as separate matrix jobs
- **Unified PR Comments**: A dedicated job collects results from both test runs and creates a single, consistent PR comment
- **Race Condition Prevention**: The comment update job waits for all test jobs to complete, eliminating timing issues
- **GitHub Checks**: Each test type appears as a separate check (`Jest mock Coverage`, `Jest prod Coverage`)

**Benefits of this approach:**
- ✅ No more race conditions with PR comment updates
- ✅ Cleaner workflow code with less duplication
- ✅ Easy to add more test types by extending the matrix
- ✅ Reliable PR comments that always include all test results

### Running E2E Tests Headless (Electron)

For end-to-end (E2E) tests that launch the Electron app, you should run tests in headless mode to avoid opening windows during CI or automated runs. This is done by setting the `HEADLESS` environment variable:

```sh
HEADLESS=true npm run test:e2e
```

This ensures the Electron window is not shown during tests. You can also add `HEADLESS=true` to explicitly run Playwright in headless mode, but by default Playwright is headless unless configured otherwise.

**Important**: E2E tests require `openDevToolsByDefault` to be set to `false` in `src/configurationSidebarSections.json`. Having dev tools open during automated testing can interfere with test execution and cause failures.

## Simulation System

The testing infrastructure includes a comprehensive simulation system that replaces all external dependencies with controlled, predictable simulators. This system consists of three interconnected simulators that provide realistic behavior without requiring actual tools to be installed.

> **📖 Complete Documentation**: See [Simulation System Guide](./simulation-system.md) for comprehensive details on architecture, usage, and extension.

### Overview

- **Generic Command Simulator**: Replaces all application commands (build, run, container management)
- **Verification Simulator**: Simulates tool verification and fix commands for environment validation  
- **Dropdown Simulator**: Provides realistic, varying dropdown data for UI components

### Key Benefits

- **No External Dependencies**: Works immediately after `npm install`
- **Predictable Behavior**: Deterministic results for reliable testing
- **Complete Control**: Easy to test both success and failure scenarios
- **Realistic Simulation**: Tool outputs match real command responses

### Quick Integration

The simulation system is automatically used in E2E tests and integrates seamlessly with the existing configuration system:

```bash
# All commands are automatically replaced with simulators
node scripts/simulators/generic-command-simulator.js --duration=30 --result=success
node scripts/simulators/verification-simulator.js verify cloudGcloudCLI  
node scripts/simulators/dropdown-simulator.js gcloud-projects
```

## Dynamic Mock Environment

The testing infrastructure includes a sophisticated dynamic mock generation system for E2E testing:

### Mock Environment Setup

- **Script**: `scripts/setup-mock-e2e-env.sh`
- **Helper**: `scripts/extract-mock-commands.js`
- **Purpose**: Creates a comprehensive mock environment that mirrors the production environment for E2E tests

### Dynamic Mock Generation

The mock environment automatically generates command mocks based on verification requirements found in:
- `src/environment-verification/generalEnvironmentVerifications.json`
- `src/project-config/config/configurationSidebarAbout.json`

**Benefits:**
- **Automatic**: New verifications in JSON files automatically get mocked
- **Consistent**: Mock outputs match exactly what verification logic expects
- **Maintainable**: No need to manually update mock scripts when adding new tools
- **Comprehensive**: Covers all commands used in verification and fix workflows

**Generated Mocks Include:**
- `gcloud`, `kubectl`, `kubectx` (Cloud tools)
- `docker` (Container runtime)
- `go`, `java`, `node`/`nvm` (Programming languages)
- `brew`, `rdctl` (Package managers)

## Enhanced Logging System

The application uses a centralized logging system that provides:

- **Structured Logging**: Timestamps, module prefixes, and log levels
- **Environment-Aware**: Automatic log level adjustment based on NODE_ENV
- **Override Control**: DEBUG_LOGS environment variable for explicit control
- **Zero Overhead**: No performance impact in production builds
- **Module Organization**: Pre-configured loggers for different components

```js
import { loggers } from '../common/utils/debugUtils.js';

const log = loggers.app; // or .terminal, .git, .health, etc.

log.error('Critical errors only');     // Always shown (ERROR level)
log.warn('Important warnings');        // Shown when level >= WARN
log.info('General information');       // Shown when level >= INFO  
log.debug('Detailed debugging');       // Shown when level >= DEBUG
```

**Log Level Behavior:**
- **Production**: Only ERROR level logs (unless DEBUG_LOGS=true)
- **Development**: All levels (ERROR, WARN, INFO, DEBUG)
- **DEBUG_LOGS=true**: Force DEBUG level (all logs)
- **DEBUG_LOGS=false**: Force INFO level (no debug logs)

**Available Loggers:** `app`, `terminal`, `floating`, `autoSetup`, `git`, `import`, `export`, `health`, `pty`, `container`, `verification`

**Output Format:** `[2024-01-15T10:30:45.123Z][MODULE][LEVEL] Message`

This replaces scattered `console.log`/`console.warn`/`console.error` statements with a professional, controllable system.

## Best Practices

### Test Writing
- Write tests that describe behavior, not implementation
- Use descriptive test names that explain what should happen
- Group related tests with `describe` blocks
- Keep tests focused and atomic

### Mock Usage
- Mock external dependencies, not internal logic
- Use realistic mock data that matches actual API responses
- Keep mock data in separate files for reusability

### E2E Testing
- Use the helper system for consistent operations
- Test complete user workflows, not individual components
- Handle async operations properly with appropriate waits
- Clean up resources (terminals, windows) after tests

### Debugging
- Use the logging system for debugging test issues
- Run tests individually to isolate problems
- Use `DEBUG_LOGS=true` for detailed output

## See Also

- [Simulation System Guide](./simulation-system.md) - Comprehensive simulation infrastructure
- [Configuration Guide](../configuration/) - Understanding test configuration
- [Architecture Guide](../architecture/) - System architecture affecting tests
- [Feature Guides](../features/) - Features being tested 