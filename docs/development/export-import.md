# Configuration Export & Import

> Tools for backing up configuration settings and exporting verification data

## Overview

{ProjectName} Manager provides comprehensive tools for backing up your configuration settings and exporting verification data for troubleshooting. These tools ensure you can maintain consistent setups across different environments and provide detailed information for debugging.

## Export Configuration

The configuration export feature allows you to backup all your current settings for easy restoration or sharing.

### How to Export

1. Click **Export Config** in the App Control Sidebar
2. Choose where to save the file 
3. The exported JSON includes all settings and git branches

### What's Included

The exported configuration contains:
- All section enable/disable states
- Deployment mode settings
- Attach toggle states
- Git branch selections
- Dropdown selections
- Mode selector states
- Sub-section configurations

### Use Cases

- **Backup**: Save your working configuration before making changes
- **Sharing**: Share configuration with team members
- **Multiple Environments**: Transfer settings between development machines
- **Version Control**: Track configuration changes over time

## Import Configuration

The configuration import feature restores previously exported settings, making it easy to recover or replicate configurations.

### How to Import

1. Click **Import Config** in the App Control Sidebar
2. Select a previously exported configuration file
3. Review the import status screen showing what will be changed
4. Confirm the import to restore your settings and branches

### Import Process

The import process:
1. Validates the configuration file format
2. Shows a preview of what will be imported
3. Applies settings safely with error handling
4. Reports success/failure for each configuration section
5. Preserves existing settings for any failed imports

### Safety Features

- **Validation**: Ensures import file is valid before applying changes
- **Preview**: Shows what will change before confirmation
- **Partial Success**: Applies valid settings even if some fail
- **Error Reporting**: Clear feedback on any import issues
- **Rollback**: Easy to export current state before importing

## Export Verification Data

The verification data export provides comprehensive environmental information for troubleshooting and support.

### How to Export Verification Data

1. Click **Export Environment** in the Debug Tools gear menu
2. A JSON file is generated with detailed system information

### What's Included

The verification export contains:
- Platform information (OS, architecture, versions)
- All verification results and statuses
- Tool versions and availability
- Command outputs and error messages
- Environment variables and paths
- System configuration details

### Use Cases

- **Troubleshooting**: Provide detailed environment info for debugging
- **Support**: Share system state with support teams
- **Documentation**: Record working environment configurations
- **Compliance**: Document environment setup for audit purposes

## File Formats

### Configuration Export Format

```json
{
  "version": "1.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "sections": {
    "sectionId": {
      "enabled": true,
      "deploymentType": "run",
      "attachState": false,
      "mode": "development",
      // ... other section-specific settings
    }
  },
  "globalSettings": {
    "projectSelection": "project-1",
    // ... other global settings
  },
  "gitBranches": {
    "sectionId": "main"
  }
}
```

### Verification Export Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "platform": {
    "os": "darwin",
    "arch": "arm64",
    "version": "14.0"
  },
  "verifications": [
    {
      "id": "nodeInstalled",
      "status": "valid",
      "output": "v18.17.0",
      "command": "node --version"
    }
  ],
  "environment": {
    "PATH": "/usr/local/bin:/usr/bin",
    // ... other environment variables
  }
}
```

## Best Practices

### Configuration Management

- **Regular Backups**: Export configuration before major changes
- **Naming Convention**: Use descriptive names with timestamps
- **Version Control**: Consider storing configuration exports in git
- **Team Sharing**: Use consistent export/import for team environments

### Troubleshooting Workflow

1. Export verification data when issues occur
2. Review the verification results for failed checks
3. Share export files when seeking support
4. Use exports to compare working vs. broken environments

### Security Considerations

- **Sensitive Data**: Exports may contain environment variables and paths
- **Storage**: Store export files securely
- **Sharing**: Review exports before sharing externally
- **Cleanup**: Remove old export files that may contain outdated information

## Integration with Other Features

### Auto Setup Integration

- Export configurations before running Auto Setup
- Use verification exports to identify required fix commands
- Import working configurations as Auto Setup targets

### Testing Integration

- Export test configurations for consistent test environments
- Use verification exports to mock test environments
- Import configurations for automated testing scenarios

## Troubleshooting

### Common Import Issues

- **Version Mismatch**: Ensure export was created with compatible version
- **File Corruption**: Verify file integrity and format
- **Permission Issues**: Check file access permissions
- **Invalid JSON**: Validate JSON format before importing

### Export Problems

- **File Access**: Ensure write permissions to export location
- **Disk Space**: Verify sufficient disk space for exports
- **Large Exports**: Verification exports can be large with detailed output

## See Also

- [Testing Framework](testing.md) - Using exports in test environments
- [Feature Auto Setup Guide](../features/auto-setup.md) - Integration with automated setup
- [Feature Verification Guide](../features/verification.md) - Understanding verification data 