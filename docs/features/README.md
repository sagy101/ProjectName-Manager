# Feature Guides

> Comprehensive guides for all major features in {ProjectName} Manager

## Overview

This directory contains detailed guides for each major feature in {ProjectName} Manager. Each guide provides practical examples, configuration details, and best practices for using the features effectively.

## Available Features

### [Auto Setup](auto-setup.md)
One-click automated environment configuration with intelligent fix command execution. Automatically detects failing verifications, organizes fix commands by priority, and executes them with real-time progress tracking.

**Key capabilities:**
- Smart priority group management
- Enhanced No Run Mode for safe testing
- Terminal integration with timeout management
- Graceful error recovery

### [Terminal System](terminal-system.md)
Comprehensive dual-terminal system with advanced process monitoring and management. Includes both main tabbed terminals for service execution and floating terminals for auxiliary tasks.

**Key capabilities:**
- Real-time process monitoring
- Tab information panels with command management
- Conditional tab refresh
- App Control Sidebar integration

### [Health Report](health-report.md)
Real-time monitoring dashboard for all services and dependencies. Provides centralized visibility into service health with interactive controls for management.

**Key capabilities:**
- Unified dashboard for all services
- Combined health status calculation
- Interactive service controls
- Real-time status updates

### [Environment Verification](verification.md)
Comprehensive environment validation system with auto-fix capabilities. Validates tools, paths, environment variables, and dependencies with one-click remediation.

**Key capabilities:**
- Multiple verification types (command success, output validation, path existence, environment variables)
- Auto-fix commands with priority support
- Category organization
- Dynamic environment selection

## Feature Integration

Many features work together to provide a seamless development experience:

- **Auto Setup** uses **Environment Verification** fix commands to automatically resolve issues
- **Terminal System** provides the execution environment for all commands
- **Health Report** monitors the status of services started through the **Terminal System**
- **Environment Verification** ensures dependencies are in place before running services

## Getting Started

For new users, we recommend starting with:

1. [Environment Verification](verification.md) - Understand how dependency checking works
2. [Auto Setup](auto-setup.md) - Learn how to automatically fix environment issues
3. [Terminal System](terminal-system.md) - Master the terminal interface
4. [Health Report](health-report.md) - Monitor your running services

## See Also

- [Configuration Guides](../configuration/) - How to configure these features
- [Architecture Guides](../architecture/) - Technical implementation details
- [Development Guides](../development/) - Testing and development information 