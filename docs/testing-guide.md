# Testing Guide

This guide provides an overview of the testing strategy, setup, and different types of tests used in the {ProjectName} Manager application.

## Table of Contents
- [Testing Philosophy](#testing-philosophy)
- [Setup and Configuration](#setup-and-configuration)
  - [Jest Configuration](#jest-configuration)
  - [Test Environment](#test-environment)
- [Running Tests](#running-tests)
- [Types of Tests](#types-of-tests)
  - [Unit Tests](#unit-tests)
  - [Component Rendering Tests](#component-rendering-tests)
  - [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
- [Key Scripts](#key-scripts)
- [Troubleshooting](#troubleshooting)

## Testing Philosophy

Our testing philosophy is to ensure reliability and maintainability through a combination of unit, component, and end-to-end tests. This tiered approach allows us to test logic in isolation, verify component behavior, and validate complete user workflows.

## Setup and Configuration

The testing framework is built upon [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

### Jest Configuration

The main Jest configuration is in `jest.config.js`. It's set up to:
- Use `node` as the default test environment.
- Use `<rootDir>/jest.setup.js` to import `@testing-library/jest-dom` matchers for all tests.
- Mock CSS and other static assets to prevent errors during tests.

### Test Environment

- **Node Environment**: Most of the business logic and utility tests run in a standard `node` environment.
- **JSDOM Environment**: For component rendering tests that require a DOM, we use the `jsdom` environment. This is enabled on a per-file basis by adding the following docblock to the top of the test file:
  ```javascript
  /** @jest-environment jsdom */
  ```

## Running Tests

To run the entire test suite, use the following command:

```bash
npm test
```

This command will automatically trigger the `pretest` and `posttest` scripts to handle `node-pty` compilation for the appropriate environment.

## Types of Tests

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

## Key Scripts

- `npm test`: Runs the main test suite.
- `npm run pretest`: Rebuilds `node-pty` for the `node` environment before tests run.
- `npm run posttest`: Rebuilds `node-pty` for the `electron` environment after tests complete, ensuring the application remains runnable.

## Troubleshooting

- **`node-pty` compilation errors**: If you see errors related to `node-pty` or `NODE_MODULE_VERSION`, running `npm run rebuild` (for Electron) or `npm rebuild node-pty` (for Node) can often resolve the issue.
- **`document is not defined`**: This error indicates that a test requiring a DOM is running in the `node` environment. Add `/** @jest-environment jsdom */` to the top of the test file.
- **`toBeInTheDocument is not a function`**: This means the `@testing-library/jest-dom` matchers are not loaded. Ensure that `jest.setup.js` is correctly configured in `jest.config.js`. 