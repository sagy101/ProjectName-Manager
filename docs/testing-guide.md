# Testing Guide

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
| `enableSection(window, title)` | Enable a configuration section | `await enableSection(window, 'Mirror + MariaDB');` |
| `runConfiguration(window)` | Run the current configuration | `await runConfiguration(window);` |
| `waitForTerminalTab(window, name)` | Wait for terminal tab to appear | `await waitForTerminalTab(window, 'Mirror');` |
| `expandAppControlSidebar(window)` | Open the app control sidebar | `await expandAppControlSidebar(window);` |
| `openDebugTools(window)` | Open debug tools panel | `await openDebugTools(window);` |
| `stopConfiguration(window)` | Stop running configuration | `await stopConfiguration(window);` |

#### Complete Helper Reference

##### App Lifecycle & Setup

| Helper | Purpose | Module |
|--------|---------|--------|
| `launchElectron(options)` | Launch Electron app with optional config | app-lifecycle |
| `setupTest()` | Complete test setup with environment cleanup | app-lifecycle |
| `teardownTest()` | Clean teardown with terminal cleanup | app-lifecycle |
| `waitForAppReady(window)` | Wait for app to fully initialize | app-lifecycle |
| `setupMockVerificationEndpoints()` | Set up mock verification endpoints | app-lifecycle |

##### Navigation & Sidebar Operations

| Helper | Purpose | Module |
|--------|---------|--------|
| `expandAppControlSidebar(window)` | Expand the App Control Sidebar | sidebar-helpers |
| `collapseAppControlSidebar(window)` | Collapse the App Control Sidebar | sidebar-helpers |
| `isAppControlSidebarExpanded(window)` | Check if App Control Sidebar is expanded | sidebar-helpers |
| `expandConfigSidebar(window)` | Expand the Configuration Sidebar | sidebar-helpers |
| `collapseConfigSidebar(window)` | Collapse the Configuration Sidebar | sidebar-helpers |
| `isConfigSidebarExpanded(window)` | Check if Configuration Sidebar is expanded | sidebar-helpers |

##### Configuration Management

| Helper | Purpose | Module |
|--------|---------|--------|
| `findConfigSection(window, title)` | Find a configuration section by title | config-helpers |
| `enableSection(window, title)` | Enable a configuration section | config-helpers |
| `disableSection(window, title)` | Disable a configuration section | config-helpers |
| `isSectionEnabled(window, title)` | Check if section is enabled | config-helpers |
| `toggleSection(window, title, state)` | Toggle section to specific state | config-helpers |
| `attachSection(window, sectionId)` | Attach a section (enable attach toggle) | config-helpers |
| `detachSection(window, sectionId)` | Detach a section | config-helpers |
| `setDeploymentMode(window, sectionId, mode)` | Set deployment mode (run/debug/container) | config-helpers |
| `selectGlobalProject(window, index)` | Select global project from dropdown | config-helpers |

##### Terminal Operations

| Helper | Purpose | Module |
|--------|---------|--------|
| `runConfiguration(window, options)` | Run the current configuration | terminal-helpers |
| `stopConfiguration(window)` | Stop all running configurations | terminal-helpers |
| `waitForTerminalTab(window, name, options)` | Wait for specific terminal tab to appear | terminal-helpers |
| `clickTerminalTab(window, name)` | Click on a specific terminal tab | terminal-helpers |
| `getTerminalTabs(window)` | Get all terminal tab elements | terminal-helpers |
| `isTerminalRunning(window, tabName)` | Check if terminal is in running state | terminal-helpers |
| `waitForAllTerminalsStopped(window)` | Wait for all terminals to stop | terminal-helpers |
| `waitForTerminalStatus(window, status)` | Wait for specific terminal status | terminal-status-helpers |
| `sendCtrlC(window)` | Send Ctrl+C to active terminal | terminal-status-helpers |
| `runAndInterruptTerminal(window, config)` | Run terminal and interrupt with Ctrl+C | terminal-status-helpers |

##### Debug Tools & Verification

| Helper | Purpose | Module |
|--------|---------|--------|
| `openDebugTools(window)` | Open debug tools panel | debug-helpers |
| `closeDebugTools(window)` | Close debug tools panel | debug-helpers |
| `enableNoRunMode(window)` | Enable No Run Mode for testing | debug-helpers |
| `disableNoRunMode(window)` | Disable No Run Mode | debug-helpers |
| `toggleAllVerifications(window)` | Toggle all verification statuses | debug-helpers |
| `setTerminalMode(window, mode)` | Set terminal mode (readonly/writable) | debug-helpers |
| `showTestSections(window)` | Show test sections in UI | debug-helpers |
| `hideTestSections(window)` | Hide test sections in UI | debug-helpers |
| `expandVerificationSection(window, title)` | Expand verification section | verification-helpers |
| `waitForFixButtons(window)` | Wait for fix buttons to appear | verification-helpers |
| `executeFixCommand(window, buttonIndex)` | Execute a fix command workflow | verification-helpers |

##### UI Interactions & Utilities

| Helper | Purpose | Module |
|--------|---------|--------|
| `waitForElement(window, selector, options)` | Wait for element with flexible options | ui-helpers |
| `clickButtonWithText(window, text)` | Click button containing specific text | ui-helpers |
| `waitForNotification(window, type, options)` | Wait for notification to appear | ui-helpers |
| `waitForPopup(window, selector)` | Wait for popup/modal to appear | ui-helpers |
| `confirmAction(window, popupSelector)` | Confirm action in popup | ui-helpers |
| `cancelAction(window, popupSelector)` | Cancel action in popup | ui-helpers |
| `waitForTextContent(window, selector, text)` | Wait for specific text in element | ui-helpers |
| `hasClass(window, selector, className)` | Check if element has specific class | ui-helpers |

##### Specialized Features

| Helper | Purpose | Module |
|--------|---------|--------|
| `openHealthReport(window)` | Open health report screen | health-report-helpers |
| `closeHealthReport(window)` | Close health report screen | health-report-helpers |
| `expandTerminalSection(window, index)` | Expand terminal section in health report | health-report-helpers |
| `clickAutoSetupButton(window)` | Click auto setup button | auto-setup-helpers |
| `clickStartAutoSetup(window)` | Start auto setup process | auto-setup-helpers |
| `checkGroupCompleted(window, priority)` | Check if priority group completed | auto-setup-helpers |
| `setupFixCommandEnvironment(window)` | Set up complex fix command test environment | fix-command-helpers |
| `executeFixCommand(window, buttonIndex)` | Execute fix command with confirmation | fix-command-helpers |

#### Helper Module Organization

```
test-helpers/
├── index.js                    # Main export file - import everything from here
├── constants.js                # Selectors, timeouts, status classes
├── app-lifecycle.js            # App startup, teardown, environment setup
├── sidebar-helpers.js          # Sidebar expand/collapse operations
├── config-helpers.js           # Configuration section management
├── terminal-helpers.js         # Terminal running, stopping, tab management
├── terminal-status-helpers.js  # Terminal status monitoring, Ctrl+C operations
├── debug-helpers.js            # Debug tools, No Run Mode, verification toggling
├── verification-helpers.js     # Verification sections, fix commands
├── ui-helpers.js               # General UI interactions, notifications, popups
├── health-report-helpers.js    # Health report specific operations
├── auto-setup-helpers.js       # Auto setup workflow operations
└── fix-command-helpers.js      # Complex fix command test setups
```

#### Common Usage Patterns

**Basic Test Setup:**
```javascript
const { launchElectron, enableSection, runConfiguration } = require('./test-helpers/index.js');

test('should run configuration', async () => {
  const { electronApp, window } = await launchElectron();
  
  await enableSection(window, 'Mirror + MariaDB');
  await runConfiguration(window);
  
  await electronApp.close();
});
```

**Configuration Workflow:**
```javascript
// Enable and configure a section
await enableSection(window, 'Mirror + MariaDB');
await attachSection(window, 'mirror');
await setDeploymentMode(window, 'mirror', 'run');
await runConfiguration(window);

// Wait for terminal and verify
await waitForTerminalTab(window, 'Mirror');
await waitForTerminalStatus(window, 'running');
```

**Debug Testing:**
```javascript
// Set up debug environment
await openDebugTools(window);
await enableNoRunMode(window);
await toggleAllVerifications(window);

// Test configuration in debug mode
await enableSection(window, 'Mirror + MariaDB');
await runConfiguration(window);
```

#### Migration from Manual Operations

**❌ Old Way (Manual Operations):**
```javascript
const expandButton = window.locator('[title="Expand Sidebar"]');
await expandButton.click();

const section = window.locator('h2:has-text("Mirror + MariaDB")').locator('..').locator('..');
const toggle = section.locator('input[type="checkbox"]').first();
await toggle.click();
```

**✅ New Way (Using Helpers):**
```javascript
await expandAppControlSidebar(window);
await enableSection(window, 'Mirror + MariaDB');
```

#### Benefits of Helper System

- **Consistency**: All tests use the same reliable implementations
- **Maintainability**: Update behavior in one place, applies everywhere
- **Error Handling**: Built-in timeouts, retries, and error messages
- **Readability**: Tests focus on what they're testing, not how to interact with UI
- **Reliability**: Helpers handle timing issues, animations, and edge cases

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

**Implementation details:**
- Test jobs save results as JSON artifacts
- Comment job downloads all artifacts and parses results
- Single comment is created/updated with complete test summary
- `edit-mode: replace` ensures comment consistency

### Running E2E Tests Headless (Electron)

For end-to-end (E2E) tests that launch the Electron app, you should run tests in headless mode to avoid opening windows during CI or automated runs. This is done by setting the `HEADLESS` environment variable:

```sh
HEADLESS=true npm run test:e2e
```

This ensures the Electron window is not shown during tests. You can also add `HEADLESS=true` to explicitly run Playwright in headless mode, but by default Playwright is headless unless configured otherwise.

**Important**: E2E tests require `openDevToolsByDefault` to be set to `false` in `src/configurationSidebarSections.json`. Having dev tools open during automated testing can interfere with test execution and cause failures.

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
- `chromium` (Browser)

### Mock Environment Features

The setup script creates:
- **Project directories**: Sibling directories for all related projects
- **Executable files**: Mock `gradlew` files with correct permissions
- **Command mocks**: Dynamic executable scripts in `./mock_bin/`
- **Environment setup**: `GOPATH`, PATH configuration, GitHub Actions compatibility

### Testing the Mock Environment

Comprehensive test suite at `__tests__/scripts/setup-mock-e2e-env.test.js`:
- Tests directory and file creation
- Validates all mock command behaviors
- Ensures environment variables are set correctly
- Verifies output matches expected verification results

## Key Scripts

- `npm test`: Runs the main test suite (all Jest and E2E tests).
- `npm run pretest`: Rebuilds `node-pty` for the `node` environment before tests run.
- `npm run posttest`: Rebuilds `node-pty` for the `electron` environment after tests complete, ensuring the application remains runnable.
- `npm run test:jest`: Runs all Jest tests (unit, component, and mock data tests).
- `npm run test:jest:prod`: Runs Jest tests using production configuration/data files.
- `npm run test:jest:mock`: Runs Jest tests using mock configuration/data files for stable, generic test coverage.
- `npm run test:e2e`: Builds the app and runs Playwright E2E tests (set `HEADLESS=true` for headless Electron window).
- `npm run test:e2e:report`: Builds the app and runs Playwright E2E tests with the default Playwright reporter (for HTML or CI reports).
- `npm run test:jest:coverage:text`: Generates a text coverage summary.
- `npm run test:jest:coverage:html`: Generates an HTML coverage report.
- `scripts/run-all-tests.sh`: Convenience script that runs Jest and Playwright tests.
- `scripts/setup-mock-e2e-env.sh`: Sets up the dynamic mock environment for E2E testing.

## Troubleshooting

### Common Issues

- **`node-pty` compilation errors**: Run `npx @electron/rebuild -f -w node-pty` or restart with `npm start`
- **`document is not defined`**: Add `/** @jest-environment jsdom */` to the test file
- **`toBeInTheDocument is not a function`**: Check `jest.setup.js` configuration
- **E2E tests failing**: Ensure `openDevToolsByDefault` is `false` in configuration

### Platform-Specific Issues

- **macOS**: May need Xcode Command Line Tools for native modules
- **Linux**: Ensure required development packages are installed
- **CI/CD**: Use headless mode for E2E tests

## Related Documentation

- [Architecture Details](architecture-details.md) - Understanding the codebase structure
- [Getting Started](getting-started.md) - Setting up the development environment
- [Configuration Guide](configuration-guide.md) - Test configuration options
- [Terminal Features](terminal-features.md) - Testing terminal functionality 