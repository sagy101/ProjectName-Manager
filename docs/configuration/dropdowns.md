# Dropdown Configuration

> **Navigation:** [Configuration Guides](README.md) > Dropdowns

This guide covers the configuration of dynamic dropdown selectors that execute commands and populate options dynamically in {ProjectName} Manager.

## Overview

Dropdown selectors provide a powerful way to create dynamic, command-driven dropdowns that can be used in both environment verification headers and configuration sections. They execute shell commands to populate their options and can be chained together with dependencies.

## Basic Configuration

```json
{
  "id": "gcloudProject",
  "command": "gcloud projects list --format=\"value(projectId)\"",
  "parseResponse": "lines",
  "placeholder": "Select project...",
  "loadingText": "Loading projects...",
  "errorText": "Error loading projects",
  "noOptionsText": "No projects found"
}
```

## Configuration Properties

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for the dropdown |
| `command` | string | Shell command to execute for fetching options |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `parseResponse` | string | "lines" | How to parse command output |
| `placeholder` | string | "Select option..." | Text shown when no option selected |
| `loadingText` | string | "Loading..." | Text shown while loading options |
| `errorText` | string | "Error loading options" | Text shown on command failure |
| `noOptionsText` | string | "No options available" | Text shown when no options found |
| `dependsOn` | string | - | ID of another dropdown this depends on |
| `commandArgs` | object | - | Command arguments object |
| `defaultValue` | object | - | Default selection behavior |
| `commandOnChange` | string | - | Command to execute when value changes |

## Response Parsing

### Lines Parser (Default)
Splits command output by newlines, each line becomes an option:

```json
{
  "command": "kubectl config get-contexts -o name",
  "parseResponse": "lines"
}
```

**Example Output**:
```
minikube
gke-cluster-dev
gke-cluster-prod
```

**Result**: 3 dropdown options

### JSON Parser
Parses JSON output and extracts values:

```json
{
  "command": "gcloud projects list --format=json",
  "parseResponse": "json"
}
```

**Example Output**:
```json
[
  {"projectId": "my-dev-project"},
  {"projectId": "my-prod-project"}
]
```

**Result**: Dropdown options extracted from `projectId` fields

### Space Parser
Splits output by spaces/whitespace:

```json
{
  "command": "echo \"option1 option2 option3\"",
  "parseResponse": "space"
}
```

## Default Value Selection

Control which option is selected by default:

### Exact Match
```json
{
  "defaultValue": {
    "exact": "gke-cluster-dev"
  }
}
```

Selects the option that exactly matches "gke-cluster-dev".

### Contains Match
```json
{
  "defaultValue": {
    "contains": "dev"
  }
}
```

Selects the first option containing "dev" substring.

### Combined Matching
```json
{
  "defaultValue": {
    "exact": "gke-cluster-dev",
    "contains": "dev"
  }
}
```

Tries exact match first, falls back to contains match if not found.

### Selection Priority
1. Exact match (if specified)
2. Contains match (if specified)
3. First option in list
4. Placeholder text (if no options)

## Command on Change

Execute commands automatically when dropdown value changes:

```json
{
  "id": "gcloudProject",
  "command": "gcloud projects list --format=\"value(projectId)\"",
  "commandOnChange": "gcloud config set project ${gcloudProject}",
  "placeholder": "Select project..."
}
```

### Variable Substitution
Use `${dropdownId}` syntax to reference selected values:

```json
{
  "commandOnChange": "kubectl config use-context ${kubectlContext} && gcloud config set project ${gcloudProject}"
}
```

### Features
- **Automatic Execution**: Runs when user selects different option
- **User Feedback**: Success/failure notifications displayed
- **Non-blocking**: Command failures don't prevent value changes
- **Variable Support**: Multiple dropdown values can be referenced
- **Environment Variables**: Standard environment variable resolution

## Dropdown Dependencies

Chain dropdowns together where one depends on another:

```json
[
  {
    "id": "gcloudProject",
    "command": "gcloud projects list --format=\"value(projectId)\"",
    "placeholder": "Select project..."
  },
  {
    "id": "gkeCluster",
    "command": "gcloud container clusters list --project=${gcloudProject} --format=\"value(name)\"",
    "dependsOn": "gcloudProject",
    "placeholder": "Select cluster..."
  }
]
```

### Dependency Behavior
- **Parent Required**: Dependent dropdown is disabled until parent has value
- **Auto-refresh**: Dependent dropdown reloads when parent value changes
- **Chain Clearing**: Changing parent value clears dependent dropdown selections
- **Deep Dependencies**: Multi-level dependency chains are supported

## Usage Locations

### Environment Verification Header
```json
{
  "header": {
    "title": "General Environment",
    "dropdownSelectors": [
      {
        "id": "gcloudProject",
        "command": "gcloud projects list --format=\"value(projectId)\"",
        "placeholder": "Select project...",
        "commandOnChange": "gcloud config set project ${gcloudProject}"
      }
    ]
  }
}
```

### Section Components
```json
{
  "id": "kubernetes",
  "components": {
    "dropdownSelectors": [
      {
        "id": "kubectlContext",
        "command": "kubectl config get-contexts -o name",
        "placeholder": "Select context...",
        "dependsOn": "gcloudProject"
      }
    ]
  }
}
```

### Sub-section Components
```json
{
  "subSections": [
    {
      "id": "advanced-config",
      "components": {
        "dropdownSelectors": [
          {
            "id": "configProfile",
            "command": "ls config/profiles/",
            "placeholder": "Select profile..."
          }
        ]
      }
    }
  ]
}
```

## Advanced Examples

### Cloud Environment Setup
```json
[
  {
    "id": "cloudProvider",
    "command": "echo \"aws\ngcp\nazure\"",
    "placeholder": "Select cloud provider...",
    "defaultValue": {
      "exact": "gcp"
    }
  },
  {
    "id": "region",
    "command": "case ${cloudProvider} in\n  aws) aws ec2 describe-regions --query 'Regions[].RegionName' --output text;;\n  gcp) gcloud compute regions list --format='value(name)';;\n  azure) az account list-locations --query '[].name' --output tsv;;\nesac",
    "dependsOn": "cloudProvider",
    "placeholder": "Select region..."
  },
  {
    "id": "cluster",
    "command": "case ${cloudProvider} in\n  aws) aws eks list-clusters --region ${region} --query 'clusters' --output text;;\n  gcp) gcloud container clusters list --region=${region} --format='value(name)';;\n  azure) az aks list --query '[].name' --output tsv;;\nesac",
    "dependsOn": "region",
    "placeholder": "Select cluster...",
    "commandOnChange": "echo \"Switched to ${cloudProvider} cluster ${cluster} in ${region}\""
  }
]
```

### Git Workflow Integration
```json
[
  {
    "id": "gitBranch",
    "command": "git branch -r | sed 's/origin\\///' | grep -v HEAD",
    "placeholder": "Select branch...",
    "defaultValue": {
      "contains": "main"
    }
  },
  {
    "id": "environment",
    "command": "if [[ ${gitBranch} == *\"dev\"* ]]; then echo \"development\"; elif [[ ${gitBranch} == *\"staging\"* ]]; then echo \"staging\"; else echo \"production\"; fi",
    "dependsOn": "gitBranch",
    "placeholder": "Environment determined..."
  }
]
```

### Feature Flag Management
```json
{
  "id": "featureFlags",
  "command": "curl -s https://api.example.com/feature-flags | jq -r '.[].name'",
  "parseResponse": "lines",
  "placeholder": "Select feature flags...",
  "commandOnChange": "curl -X POST https://api.example.com/enable-feature -d '{\"feature\": \"${featureFlags}\"}'"
}
```

## Error Handling

### Command Failures
```json
{
  "id": "serviceList",
  "command": "kubectl get services -o name 2>/dev/null || echo \"No services found\"",
  "errorText": "Failed to list services - check kubectl connection",
  "noOptionsText": "No services available"
}
```

### Timeout Handling
Commands have automatic timeouts to prevent UI blocking:
- Default timeout: 30 seconds
- Loading indicator shows progress
- Error state displayed on timeout

### Validation
```json
{
  "id": "portNumber",
  "command": "echo \"3000\n8080\n9000\"",
  "commandOnChange": "if [[ ${portNumber} =~ ^[0-9]+$ ]]; then echo \"Port ${portNumber} selected\"; else echo \"Invalid port number\"; fi"
}
```

## Performance Optimization

### Caching
- **Result Caching**: Command outputs are cached to avoid repeated execution
- **Cache Invalidation**: Cache is cleared when dependency values change
- **TTL Support**: Cache entries have time-to-live for freshness

### Debouncing
- **Input Debouncing**: Rapid dependency changes are debounced
- **Load Throttling**: Multiple dropdown loads are queued and optimized

### Efficient Commands
```json
{
  "id": "fastList",
  "command": "ls -1 /path/to/directory | head -20",
  "placeholder": "Select item (showing first 20)..."
}
```

## Best Practices

### Command Design
- **Keep commands fast**: Avoid slow operations that block UI
- **Handle errors gracefully**: Include fallbacks for command failures
- **Limit output size**: Use pagination or filtering for large datasets
- **Test thoroughly**: Verify commands work in different environments

### User Experience
- **Meaningful placeholders**: Use descriptive placeholder text
- **Clear error messages**: Provide helpful error information
- **Logical dependencies**: Structure dependencies in intuitive ways
- **Default selections**: Choose sensible defaults when possible

### State Management
- **Consistent naming**: Use clear, descriptive dropdown IDs
- **Variable scoping**: Understand how variables are resolved
- **Dependency planning**: Design dependency chains carefully

## Troubleshooting

### Common Issues
1. **Command not found**: Ensure required tools are installed and in PATH
2. **Permission denied**: Check command permissions and authentication
3. **No options appearing**: Verify command output format and parsing
4. **Dependency not working**: Check parent dropdown ID matches `dependsOn`
5. **Variables not resolving**: Ensure variable names match dropdown IDs

### Debug Commands
```json
{
  "id": "debug",
  "command": "echo \"Debug info: PATH=$PATH, PWD=$PWD, USER=$USER\"",
  "placeholder": "Debug output..."
}
```

## Related Documentation

- [Section Configuration](sections.md) - How dropdowns integrate with sections
- [Command Configuration](commands.md) - Using dropdown values in commands
- [Configuration Examples](examples.md) - Complete working examples
- [Environment Verification](../features/verification.md) - Using dropdowns in verification headers 