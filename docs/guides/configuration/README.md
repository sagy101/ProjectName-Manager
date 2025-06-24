# Configuration Guides

> Master {ProjectName} Manager's powerful JSON-based configuration system

{ProjectName} Manager uses a modular JSON-based configuration system that allows complete customization without code changes. This section provides comprehensive guides for understanding and using this system.

## 📋 Configuration Files Overview

| File | Purpose |
|------|---------|
| `configurationSidebarSections.json` | UI structure and components |
| `configurationSidebarCommands.json` | Command generation logic |
| `configurationSidebarAbout.json` | Section descriptions and verifications |
| `generalEnvironmentVerifications.json` | System-wide environment checks |

## 📚 Guide Pages

### [Overview](overview.md)
**Quick start and fundamental concepts**
- Basic configuration principles
- How the JSON system works
- Adding your first section
- Common patterns and best practices

### [Sections](sections.md) 
**UI components and structure**
- Section definitions and properties
- Component types (toggles, dropdowns, buttons)
- Sub-sections and nesting
- Conditional visibility

### [Commands](commands.md)
**Command generation and execution**
- Command definitions and conditions
- Modifiers and conditional logic
- Tab title configuration
- Container associations

### [Dropdowns](dropdowns.md)
**Dynamic dropdown selectors**
- Dropdown configuration properties
- Command execution and parsing
- Dependency chains
- Default value selection

### [Examples](examples.md)
**Complete working examples**
- Full section configurations
- Multi-mode setups
- Complex conditional logic
- Real-world use cases

## 🎯 Quick Tasks

| I want to... | Go to... |
|---------------|----------|
| Add a new section | [Sections Guide](sections.md#adding-new-sections) |
| Create a custom button | [Sections Guide](sections.md#custom-buttons) |
| Configure commands | [Commands Guide](commands.md#command-configuration) |
| Set up dropdowns | [Dropdowns Guide](dropdowns.md#configuration-properties) |
| See complete examples | [Examples Guide](examples.md) |

## 📖 Related Documentation

- [Getting Started](../../getting-started.md) - Installation and setup
- [Architecture Overview](../architecture/overview.md) - How the system works
- [Reference Documentation](../../reference/) - JSON schemas and API reference 