# Getting Started & Installation Guide

This guide provides detailed instructions for setting up and running {ProjectName} Manager.

<div align="center">
  <img src="../assets/loading_screen.png" alt="First Launch - Environment Verification" width="80%">
  <p><em>Initial loading screen showing environment verification progress on first launch</em></p>
</div>

## Prerequisites

### System Requirements

- **Operating System**: macOS (tested), Linux (expected to work)
- **Node.js**: Version 22.16.0 (required for the Electron app)
- **Git**: For cloning the repository and managing project repositories
- **npm or yarn**: Package manager

### Important Note on Node.js Versions

- **Electron App**: Requires Node.js 22.16.0
- **Managed Projects**: The Isolation Project commands that run in the terminals may require different Node.js version other then 22.16.0, depending on the specific project configuration

I recommend using [nvm](https://github.com/nvm-sh/nvm) to manage multiple Node.js versions:

```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 22.16.0 for the Electron app
nvm install 22.16.0
nvm use 22.16.0

# The app will handle switching Node versions for managed projects
```

## Installation

### 1. Clone the Repository

**Important**: Always clone your organization's specific project branch, not the main branch. Each organization has its own customized configuration.

```bash
# Clone your project's specific branch (replace YourProject with your actual project name)
git clone -b Project-YourProject https://github.com/sagy101/ProjectName-Manager.git
cd ProjectName-Manager

# If you're unsure of your project branch name, you can:
# 1. Check with your team lead or project maintainer
# 2. List all available project branches:
git branch -r | grep "Project-"
```

**Project Branch Examples:**
- `Project-Isolation` - For Isolation Project team
- `Project-Acme` - For Acme Corporation
- `Project-TechCorp` - For TechCorp organization

If you don't have a project branch yet, see the [Contributing Guide](CONTRIBUTIONS.md#getting-started-for-new-projects) for information on setting up a new project branch.

### 2. Install Dependencies

```bash
# Ensure you're using Node.js 22.16.0
nvm use 22.16.0

# Install all dependencies
npm install
```

### 3. Rebuild Native Modules

The application uses native modules (like `node-pty`) that need to be rebuilt for Electron:

```bash
npm run rebuild
```

This step is crucial for terminal functionality to work properly.

### 4. Build the Application

Build the renderer process bundle:

```bash
npm run build
```

This step is required to generate the `dist/renderer.js` file that the application loads.

### 5. Start the Application

```bash
npm start
```

The application should launch and display the main window.

## Subsequent Runs

After completing the initial setup, you only need to run:

```bash
npm start
```

The build artifacts from step 4 are persistent, so you don't need to rebuild unless:
- You pull new code changes
- You modify source files (unless using `npm run watch`)
- You encounter issues that require a fresh build

## Development Setup

### Running in Development Mode

For active development with automatic rebuilding:

```bash
# Terminal 1: Watch for file changes and rebuild
npm run watch

# Terminal 2: Run the application (rebuild will happen automatically via watch)
npm start
```

**Note**: When using `npm run watch`, you don't need to manually run `npm run build` as the watch process handles automatic rebuilding.

### Building for Development

To manually build the application for development (with source maps and debugging):

```bash
npm run build:dev
```

For production builds:

```bash
npm run build
```

### Running Tests

```bash
# Run all tests (Jest + E2E)
npm test

# Run only Jest tests
npm run test:jest

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:jest:coverage:html
```

## First-Time Configuration

When you first launch {ProjectName} Manager, you'll need to:

### 1. Review Environment Verification

The application will automatically check for required tools and dependencies:
- Look at the "General Environment" section
- Red indicators show missing or misconfigured tools
- Click "Fix" buttons to automatically install/configure tools

### 2. Configure Your Project Sections

Each section in the sidebar represents a project or service:
- Enable sections you want to use
- Select deployment modes (Container/Process)
- Configure any dropdown options

### 3. Run Auto Setup (Optional)

For a quick environment setup:
1. Click the wrench icon (🔧) in the App Control Sidebar
2. Review the commands that will be executed
3. Click "Start Auto Setup"
4. Monitor progress and address any failures

### 4. Start Your Configuration

Once everything is configured:
- Click "Run {ProjectName}" to start all enabled services
- Monitor the terminal tabs for each service
- Use the Health Report to view overall system status

## Common Setup Issues

### Terminal Not Working

If terminals show errors or don't display output:

```bash
# Rebuild node-pty for Electron
npm run rebuild

# If still having issues, try:
npx @electron/rebuild -f -w node-pty
```

### Permission Errors

Some operations may require elevated permissions:
- Fix commands that install system tools may need sudo
- Docker operations require Docker daemon to be running
- File operations need appropriate directory permissions

### Missing Dependencies

If verifications fail:
1. Check the specific error message
2. Use the "Fix" button if available
3. Or manually install the required tool
4. Re-run verification to confirm

### Platform-Specific Notes

**macOS**:
- Homebrew is often used for tool installation
- Some tools may require Xcode Command Line Tools

**Linux**:
- Package manager varies by distribution
- May need to adjust fix commands for your package manager

## Next Steps

 - Read the [Configuration Overview](configuration/overview.md) to understand the JSON configuration system
 - Explore the [Terminal System Guide](features/terminal-system.md) to learn about terminal capabilities
 - Check the [Auto Setup Guide](features/auto-setup.md) for automated environment configuration
 - Review the [Architecture Overview](architecture/overview.md) to understand how the system works
