# Testing Guide

This guide provides an overview of the testing strategy, setup, and different types of tests used in the {ProjectName} Manager application.

## Table of Contents
- [Setup and Configuration](#setup-and-configuration)
  - [Jest Configuration](#jest-configuration)
  - [Test Environment](#test-environment)
- [Running Tests](#running-tests)
- [Types of Tests](#types-of-tests)
  - [Bug Prevention Tests](#bug-prevention-tests)
  - [Unit Tests](#unit-tests)
  - [Component Rendering Tests](#component-rendering-tests)
  - [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
- [Key Scripts](#key-scripts)
- [Troubleshooting](#troubleshooting)


### Testing Strategy

1. **Behavior-Driven Testing**: Tests verify what the code does, not how it does it
2. **Bug Prevention**: Each test is designed to catch a specific type of bug that has caused real issues
3. **Data Structure Compatibility**: Tests ensure frontend/backend data contracts remain stable
4. **Minimal Mocking**: Only mock external dependencies, not internal module interactions
5. **Fast and Reliable**: Tests should run quickly and consistently without flaky failures

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

- **Location**: `__tests__/` and `__tests__/e2e/`
- **Examples**: `terminalContainer.e2e.test.jsx`, `processCleanup.test.js`
- **Purpose**: E2E tests validate complete workflows from start to finish. They often involve more complex setups, including mocking Electron's IPC and other main process features. These tests are crucial for ensuring that different parts of the application work together correctly.

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

### Running E2E Tests Headless (Electron)

For end-to-end (E2E) tests that launch the Electron app, you should run tests in headless mode to avoid opening windows during CI or automated runs. This is done by setting the `HEADLESS` environment variable:

```sh
HEADLESS=true npm run test:e2e
```

This ensures the Electron window is not shown during tests. You can also add `HEADLESS=true` to explicitly run Playwright in headless mode, but by default Playwright is headless unless configured otherwise.

**Important**: E2E tests require `openDevToolsByDefault` to be set to `false` in `src/configurationSidebarSections.json`. Having dev tools open during automated testing can interfere with test execution and cause failures.

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

## Troubleshooting

- **`node-pty` compilation errors**: If you see errors related to `node-pty` or `NODE_MODULE_VERSION`, run `npx @electron/rebuild -f -w node-pty` or restart with `npm start` to rebuild automatically.
- **`document is not defined`**: This error indicates that a test requiring a DOM is running in the `node` environment. Add `/** @jest-environment jsdom */` to the top of the test file.
- **`toBeInTheDocument is not a function`**: This means the `@testing-library/jest-dom` matchers are not loaded. Ensure that `jest.setup.js` is correctly configured in `jest.config.js`.
- **E2E tests failing**: Ensure `openDevToolsByDefault` is set to `false` in `src/configurationSidebarSections.json`. Dev tools being open can interfere with Playwright automation and cause test failures. 