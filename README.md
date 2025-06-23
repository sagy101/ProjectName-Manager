# {ProjectName} Manager

> **Note:** The Electron app requires Node.js **22.16.0**. The managed Isolation Project terminal commands may require Node.js **15** or **16** depending on the specific project configuration. It is recommended to use [nvm](https://github.com/nvm-sh/nvm) to manage multiple Node.js versions. Once you have `nvm` installed, you can run `nvm use` in the project directory to automatically switch to the correct version for the Electron runtime.

> The application has been tested on **macOS**. It should also work on **Linux**, though this has not been verified. Windows compatibility is not planned at this time.

[![Electron](https://img.shields.io/badge/Electron-36.5.0-47848F?style=flat&logo=electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.16.0-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux-lightgrey)](https://github.com/electron/electron)

A powerful, modular desktop application for managing project environments with integrated terminal support, environment verification, and dynamic configuration management.

This project is also an experiment in "vibe coding" mixed with solid code practices. I explored a variety of AI tools and language models to see how they complement traditional development. Details can be found in the [AI Coding Experiment](docs/llm-experiments.md) document.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/sagy101/ProjectName-Manager.git
cd ProjectName-Manager

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Start the application
npm start
```

For development mode with file watching:
```bash
npm run watch  # In one terminal
npm start      # In another terminal
```

## 📋 Core Features

### Environment Management
- **Dynamic Environment Verification** with JSON-configurable checks
- **Auto-Fix Commands** for one-click remediation
- **Auto Setup** for automated environment configuration
- **Generic Dropdown Selectors** with dependency chains

### Terminal System  
- **Integrated Terminal** with full PTY support and tab management
- **Floating Terminals** for auxiliary tasks and log viewing
- **Read-Only Safety** with debug override options
- **Container Lifecycle Management** tied to terminal tabs

### Configuration & UI
- **Modular JSON Configuration** - customize without code changes
- **Git Integration** for branch management
- **Real-time Status Updates** and health monitoring
- **No Run Mode** for safe command preview
- **Test Section Management** for development workflows

## 📚 Documentation

For complete documentation, see the **[Documentation Index](docs/index.md)**.

### Quick Links
- [Getting Started & Installation](docs/getting-started.md) - Detailed setup instructions
- [Configuration Guide](docs/configuration-guide.md) - JSON configuration system  
- [Auto Setup Guide](docs/auto-setup-guide.md) - Automated environment setup
- [Export & Import Tools](docs/config-export-import.md) - Save and restore settings
- [Architecture Overview](docs/architecture-overview.md) - System design and components
- [Development Roadmap](roadmap.md) - Planned features and enhancements

## ⚙️ Configuration Overview

{ProjectName} Manager uses a modular JSON-based configuration system:

| File | Purpose |
|------|---------|
| `src/project-config/config/configurationSidebarSections.json` | UI structure and components |
| `src/project-config/config/configurationSidebarCommands.json` | Command generation logic |
| `src/project-config/config/configurationSidebarAbout.json` | Section descriptions and verifications |
| `src/environment-verification/generalEnvironmentVerifications.json` | System-wide environment checks |

See the [Configuration Guide](docs/configuration-guide.md) for detailed information.

## 🔧 Adding New Sections

Adding new functionality requires updating three JSON files - no code changes needed:

1. **Define UI** in `configurationSidebarSections.json`
2. **Add Descriptions** in `configurationSidebarAbout.json`  
3. **Configure Commands** in `configurationSidebarCommands.json`

See [Adding New Sections](docs/configuration-guide.md#adding-new-sections) for a step-by-step guide.

## 🛠️ Development

### Requirements
- Node.js 22.16.0 (for the Electron app)
- npm or yarn
- Git

### Build & Run
```bash
npm run build    # Development build
npm run watch    # Build with file watching
npm start        # Start the application
npm test         # Run all tests
```

### Native Module Rebuilding
After installing new native dependencies:
```bash
npm run rebuild
```

### Project Structure
```
ProjectName-Manager/
├── src/
│   ├── main-process/          # Electron main process modules
│   ├── common/                # Shared components and hooks
│   ├── project-config/        # Configuration UI and logic
│   ├── environment-verification/ # Verification system
│   ├── terminal/              # Terminal components
│   ├── floating-terminal/     # Floating terminal system
│   ├── auto-setup/            # Auto-setup feature
│   ├── health-report/         # Health monitoring
│   └── ...                    # Other feature modules
├── __tests__/                 # Test suites
├── docs/                      # Documentation
└── main.js                    # Entry point
```

## 💾 Export & Import Tools

Detailed steps for exporting configuration and verification data have moved to [Export & Import Tools](docs/config-export-import.md).

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- UI powered by [React](https://reactjs.org/)
- Terminal integration via [node-pty](https://github.com/microsoft/node-pty)
- Icons from [Heroicons](https://heroicons.com/)

---

<div align="center">
  <strong>{ProjectName} Manager</strong> - Streamlining environment management, one configuration at a time.
</div>
