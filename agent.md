# Agent Guidelines

This project contains **{ProjectName} Manager**, a cross-platform Electron application built with React. The docs directory provides detailed information on architecture, configuration, command generation and testing.

## Environment configuration

- Requires **Node.js 22.16.0**. Use `nvm use` in the project root to activate the correct version.
- Managed project commands may require Node.js 15 or 16. The app handles switching with `nvm` automatically.
- Install dependencies with `npm install` after cloning.
- Rebuild native modules with `npm run rebuild` after installing dependencies.
- Native modules rebuild automatically when running `npm start`. If they fail,
  run `npx @electron/rebuild -f -w node-pty`.
- Start the application using `npm start`.
- For development mode run `npm run watch` in one terminal and `npm start` in another.
- Ensure that npm runs scripts with Bash by adding `script-shell=/bin/bash` to `.npmrc`. This allows commands like `source ~/.nvm/nvm.sh` to work.

### Setup script

The repository includes a `setup.sh` script that installs [nvm](https://github.com/nvm-sh/nvm) and the required Node.js version if they are not already present. Codex automatically executes this script when initializing the container.

For container customization, see [OpenAI docs](https://platform.openai.com/docs/codex/overview#environment-configuration).

## Testing

Testing practices follow `docs/testing-guide.md`:

- Run all tests with `npm test` (Jest + Playwright).
- Jest tests only: `npm run test:jest` (use `:prod` or `:mock` for different data sets).
- End-to-end tests: `HEADLESS=true npm run test:e2e` (or `npm run test:e2e:report`).
  - Run `scripts/setup-mock-e2e-env.sh` beforehand to create the mocked toolchain used in CI (the GitHub workflow runs this script as well).
  - Ensure `openDevToolsByDefault` is `false` in `src/configurationSidebarSections.json` or tests may fail.
  - Set `CI=true DEBUG_LOGS=true` to capture main process logs during E2E runs.
  - `scripts/run-all-tests.sh` runs Jest and Playwright in one step.
- If Electron can't open an X display, install Xvfb and run: `xvfb-run -a bash -c 'HEADLESS=true npm run test:e2e'`.
- For tests that require the DOM, add `/** @jest-environment jsdom */` at the top of the file.
- Mock configuration data lives under `__tests__/mock-data`.
- If `node-pty` build errors occur, run `npx @electron/rebuild -f -w node-pty`.
- Test categories include bug prevention tests (`__tests__/main-startup.test.js`), unit tests, component rendering tests, and Playwright E2E workflows in `__tests__/e2e`.
- Use the helper system in `__tests__/e2e/test-helpers` for consistent UI interactions.
- The mock environment for E2E tests is generated dynamically based on JSON verifications and fix commands.

Every code change must pass:
1. `npm run test:jest` with no fails.
2. `npm run lint` with no errors (warnings are ok).

## Additional documentation

- `docs/index.md` – entry point for all docs
- `docs/architecture-overview.md` – high level design
- `docs/architecture-details.md` – in-depth system architecture
- `docs/testing-guide.md` – test strategy and commands
- `docs/configuration-guide.md` – JSON configuration files and concepts
- `docs/command-system.md` – command generation mechanics
- `docs/terminal-features.md` – terminal types and behavior
- `docs/verification-types.md` – reference for environment verification checks
- `docs/health-report.md` – service monitoring details
- `docs/llm-experiments.md` – background on AI tools used during development

These resources provide the context needed when modifying or extending the project.

## Project structure overview

- `src/` – application source code
  - `main-process/` – Electron main process modules
  - `common/` – shared components and hooks
  - `project-config/` – configuration UI and logic
    - `config/` – JSON configuration files
  - `environment-verification/` – verification UI and data
  - `terminal/` – terminal components
  - `floating-terminal/` – floating terminal system
  - `auto-setup/` – automated setup feature
  - `health-report/` – service monitoring
- `scripts/` – development and CI helper scripts
- `__tests__/` – Jest and Playwright test suites (unit tests and `e2e/` workflows)
- `docs/` – in-depth documentation

## Coding conventions

- Use the existing code style and meaningful variable and function names
- Prefer functional React components with hooks and keep them small
- Use Tailwind CSS utilities; add custom CSS only when necessary
- Name component files in `PascalCase.jsx`
- Follow the modular architecture: keep hooks and components grouped by feature
- Export custom hooks from their feature folders
- Use PropTypes for component validation when appropriate

## Pull request guidelines

1. Provide a clear description of the change
2. Reference related issues when applicable
3. Ensure all tests pass before submitting
4. Include screenshots for UI changes
5. Keep PRs focused on a single concern

## Programmatic checks

Run these commands before merging:

```bash
npm run lint
npm run build
npm run test
```

