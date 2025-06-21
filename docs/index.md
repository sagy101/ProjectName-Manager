 # {ProjectName} Manager Documentation

Welcome to the {ProjectName} Manager documentation. This index provides quick access to all documentation resources.

## 📖 Documentation Overview

### Getting Started
- **[Getting Started & Installation](getting-started.md)** - Complete setup instructions and first-time configuration
- **[Configuration Guide](configuration-guide.md)** - Comprehensive guide to the JSON configuration system
- **[Auto Setup Guide](auto-setup-guide.md)** - Automated environment configuration with fix commands

### Core Features
- **[Terminal Features](terminal-features.md)** - Main terminals, floating terminals, and advanced features
- **[Command System](command-system.md)** - How commands are generated and executed
- **[Verification Types](verification-types.md)** - Reference for all environment verification check types
- **[Health Report](health-report.md)** - Real-time service monitoring and status calculation
- **[Export & Import Tools](config-export-import.md)** - Save and restore your settings

### Technical Documentation
- **[Architecture Overview](architecture-overview.md)** - High-level system design and components
- **[Architecture Details](architecture-details.md)** - Complete technical architecture with implementation details
- **[Testing Guide](testing-guide.md)** - Test infrastructure, strategies, and running tests

### Development Approach
- **[AI Coding Experiment](llm-experiments.md)** - My exploration of vibe coding with AI tools

## 🗺️ Quick Navigation Guide

### "I want to..."

#### Set up the application
→ Start with [Getting Started & Installation](getting-started.md)

#### Add a new service/section
→ See [Adding New Sections](configuration-guide.md#adding-new-sections) in the Configuration Guide

#### Understand how to configure the app
→ Read the [Configuration Guide](configuration-guide.md)

#### Fix environment issues automatically
→ Check the [Auto Setup Guide](auto-setup-guide.md) and [Verification Types](verification-types.md#auto-fix-commands)

#### Learn about terminal capabilities
→ Explore [Terminal Features](terminal-features.md)

#### Understand the codebase structure
→ Review the [Architecture Overview](architecture-overview.md) or [detailed Architecture](architecture-details.md)

#### Run tests or contribute code
→ Follow the [Testing Guide](testing-guide.md)

#### Monitor running services
→ Learn about the [Health Report](health-report.md)

## 📋 Configuration Files Quick Reference

| File | Purpose |
|------|---------|
| **`src/project-config/config/configurationSidebarSections.json`** | UI structure and components |
| **`src/project-config/config/configurationSidebarCommands.json`** | Command generation logic |
| **`src/project-config/config/configurationSidebarAbout.json`** | Descriptions and section verifications |
| **`src/environment-verification/generalEnvironmentVerifications.json`** | System-wide checks |

## 🔍 Key Concepts

- **Sections**: Logical groupings of functionality (services, projects)
- **Verifications**: Checks for tools, paths, and environment setup
- **Commands**: Dynamically generated based on configuration state
- **Fix Commands**: One-click remediation for failed verifications
- **Floating Terminals**: Auxiliary terminal windows for specific tasks
- **Health Report**: Centralized monitoring of all services

## 💡 Tips

- All functionality is JSON-configured - no code changes needed for customization
- Use Auto Setup for quick environment configuration
- Check verification failures before running services
- Main terminals are read-only by default for safety
- The Health Report provides the best overview of running services 