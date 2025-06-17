# Agent Guidelines

This project contains **{ProjectName} Manager**, a cross-platform Electron application built with React. The docs directory provides detailed information on architecture, configuration, command generation and testing.

## Environment configuration

- Requires **Node.js 22.16.0**. Use `nvm use` in the project root to activate the correct version.
- Install dependencies with `npm install` after cloning.
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

- Run all tests with `npm test`. Pretest and posttest scripts rebuild `node-pty` for the appropriate environment.
- Jest tests only: `npm run test:jest` (use `:prod` or `:mock` for different data sets).
- End-to-end tests: `HEADLESS=true npm run test:e2e` (or `npm run test:e2e:report`).
  - Run `scripts/setup-mock-e2e-env.sh` beforehand to create the mocked toolchain used in CI.
- If Electron can't open an X display, install Xvfb and run: `xvfb-run -a bash -c 'HEADLESS=true npm run test:e2e'`.
- For tests that require the DOM, add `/** @jest-environment jsdom */` at the top of the file.
- Mock configuration data lives under `__tests__/mock-data`.
- If `node-pty` build errors occur, run `npx @electron/rebuild -f -w node-pty`.

## Additional documentation

- `docs/architecture.md` – system design and data flow
- `docs/configuration-guide.md` – JSON configuration files and concepts
- `docs/command-system.md` – command generation mechanics
- `docs/terminal-features.md` – terminal types and behaviour
- `docs/verification-types.md` – reference for environment verification checks
- `docs/llm-experiments.md` – background on AI tools used during development

These resources provide the context needed when modifying or extending the project.
