# Testing Guide

This guide provides an overview of the testing strategy, setup, and different types of tests used in the {ProjectName} Manager application.

## Table of Contents
- [Testing Philosophy](#testing-philosophy)
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

## Testing Philosophy

Our testing philosophy focuses on **behavior over implementation details** to ensure reliability and maintainability. We prioritize testing that catches real bugs that would break user functionality, rather than testing implementation details that create brittle tests.

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

## Test Results

The test suite has been optimized for reliability and focuses on catching real bugs:

- **✅ 14 test suites passing** 
- **✅ 185 tests passing**
- **✅ 0 test failures**
- **⚡ Fast execution** (~1-2 seconds)

### What We Don't Test

We deliberately avoid testing implementation details that can create brittle tests:
- Internal function call verification
- Mock interaction counting  
- IPC handler registration specifics
- Module loading mechanisms

These implementation details change frequently during refactoring and create false test failures.

## Key Scripts

- `npm test`: Runs the main test suite.
- `npm run pretest`: Rebuilds `node-pty` for the `node` environment before tests run.
- `npm run posttest`: Rebuilds `node-pty` for the `electron` environment after tests complete, ensuring the application remains runnable.

## Troubleshooting

- **`node-pty` compilation errors**: If you see errors related to `node-pty` or `NODE_MODULE_VERSION`, running `npm run rebuild` (for Electron) or `npm rebuild node-pty` (for Node) can often resolve the issue.
- **`document is not defined`**: This error indicates that a test requiring a DOM is running in the `node` environment. Add `/** @jest-environment jsdom */` to the top of the test file.
- **`toBeInTheDocument is not a function`**: This means the `@testing-library/jest-dom` matchers are not loaded. Ensure that `jest.setup.js` is correctly configured in `jest.config.js`. 