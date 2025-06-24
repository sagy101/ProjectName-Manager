# Configuration Examples

> **Navigation:** [Configuration Guides](README.md) > Examples

This guide provides complete, working examples of {ProjectName} Manager configurations demonstrating real-world usage patterns.

## Simple Frontend Application

A basic frontend application with container and process deployment options.

### 1. Sections Configuration
```json
{
  "settings": {
    "projectName": "Frontend App",
    "autoSetupTimeoutSeconds": 90
  },
  "sections": [
    {
      "id": "frontend",
      "title": "Frontend Application",
      "components": {
        "toggle": true,
        "infoButton": true,
        "gitBranch": true,
        "deploymentOptions": true,
        "modeSelector": {
          "options": ["development", "production"],
          "labels": ["Development", "Production"],
          "default": "development"
        }
      }
    }
  ]
}
```

### 2. Commands Configuration
```json
[
  {
    "id": "frontend",
    "conditions": {
      "enabled": true,
      "deploymentType": "container"
    },
    "command": {
      "base": "cd frontend && docker-compose up",
      "associatedContainers": ["frontend-app", "frontend-db"],
      "tabTitle": "Frontend (Container)"
    }
  },
  {
    "id": "frontend",
    "conditions": {
      "enabled": true,
      "deploymentType": "process"
    },
    "command": {
      "base": "cd frontend && npm start",
      "prefix": "nvm use 16 && ",
      "tabTitle": "Frontend (Process)",
      "modifiers": [
        {
          "condition": "mode === 'development'",
          "append": " --watch"
        }
      ]
    }
  }
]
```

### 3. About Configuration
```json
[
  {
    "sectionId": "frontend",
    "directoryPath": "frontend",
    "description": "React frontend application with hot reloading and modern build tools.",
    "verifications": [
      {
        "id": "frontendDirExists",
        "title": "./frontend directory exists",
        "checkType": "pathExists",
        "pathValue": "./frontend",
        "pathType": "directory"
      },
      {
        "id": "nodeModulesExists", 
        "title": "node_modules installed",
        "checkType": "pathExists",
        "pathValue": "./frontend/node_modules",
        "pathType": "directory"
      }
    ]
  }
]
```

## Multi-Service Application

A complex application with multiple services, debugging, and cloud integration.

### 1. Sections Configuration
```json
{
  "settings": {
    "projectName": "Multi-Service App",
    "maxFloatingTerminals": 15,
    "autoSetupTimeoutSeconds": 120
  },
  "sections": [
    {
      "id": "api",
      "title": "API Service",
      "components": {
        "toggle": true,
        "infoButton": true,
        "deploymentOptions": true,
        "attachToggle": {
          "enabled": true,
          "mutuallyExclusiveWith": ["worker"]
        },
        "inputField": {
          "id": "debugPort",
          "placeholder": "Debug port (default: 9229)",
          "default": "9229",
          "visibleWhen": {
            "configKey": "attachState.api",
            "hasValue": true
          }
        },
        "customButtons": [
          {
            "id": "apiLogs",
            "label": "View Logs",
            "commandId": "apiLogCommand"
          },
          {
            "id": "apiMetrics",
            "label": "Metrics Dashboard",
            "commandId": "apiMetricsCommand"
          }
        ]
      }
    },
    {
      "id": "worker",
      "title": "Background Worker",
      "components": {
        "toggle": true,
        "infoButton": true,
        "deploymentOptions": true,
        "attachToggle": {
          "enabled": true,
          "mutuallyExclusiveWith": ["api"]
        },
        "modeSelector": {
          "options": ["single", "cluster"],
          "labels": ["Single Worker", "Cluster Mode"],
          "default": "single"
        }
      }
    },
    {
      "id": "frontend",
      "title": "Frontend UI",
      "components": {
        "toggle": true,
        "infoButton": true,
        "deploymentOptions": true,
        "subSections": [
          {
            "id": "storybook",
            "title": "Storybook",
            "components": {
              "toggle": true,
              "customButton": {
                "id": "storybookLogs",
                "label": "View Storybook",
                "commandId": "storybookCommand"
              }
            }
          }
        ]
      }
    }
  ]
}
```

### 2. Commands Configuration
```json
[
  {
    "id": "api",
    "conditions": {
      "enabled": true,
      "deploymentType": "container"
    },
    "command": {
      "base": "cd api && docker-compose up",
      "associatedContainers": ["api-server", "api-db", "redis"],
      "tabTitle": "API (Container)"
    }
  },
  {
    "id": "api",
    "conditions": {
      "enabled": true,
      "deploymentType": "process",
      "attachState": false
    },
    "command": {
      "base": "cd api && npm start",
      "prefix": "nvm use 18 && ",
      "tabTitle": "API (Process)"
    }
  },
  {
    "id": "api",
    "conditions": {
      "enabled": true,
      "deploymentType": "process",
      "attachState": true
    },
    "command": {
      "base": "cd api && node --inspect=${debugPort} server.js",
      "prefix": "nvm use 18 && ",
      "tabTitle": "API (Debug:${debugPort})"
    }
  },
  {
    "id": "worker",
    "conditions": {
      "enabled": true,
      "mode": "single"
    },
    "command": {
      "base": "cd worker && npm run worker:single",
      "tabTitle": "Worker (Single)"
    }
  },
  {
    "id": "worker",
    "conditions": {
      "enabled": true,
      "mode": "cluster"
    },
    "command": {
      "base": "cd worker && npm run worker:cluster",
      "tabTitle": "Worker (Cluster)"
    }
  },
  {
    "id": "frontend",
    "conditions": {
      "enabled": true
    },
    "command": {
      "base": "cd frontend && npm start",
      "tabTitle": "Frontend"
    }
  },
  {
    "id": "storybook",
    "conditions": {
      "enabled": true
    },
    "command": {
      "base": "cd frontend && npm run storybook",
      "tabTitle": "Storybook"
    }
  },
  {
    "id": "apiLogCommand",
    "command": {
      "base": "tail -f api/logs/app.log",
      "tabTitle": "API Logs"
    }
  },
  {
    "id": "apiMetricsCommand",
    "command": {
      "base": "open http://localhost:3001/metrics",
      "tabTitle": "API Metrics"
    }
  },
  {
    "id": "storybookCommand",
    "command": {
      "base": "cd frontend && npm run storybook",
      "tabTitle": "Storybook Server"
    }
  }
]
```

## Cloud-Native Application

An application with cloud provider integration and dynamic dropdowns.

### 1. Environment Configuration
```json
{
  "header": {
    "title": "Cloud Environment",
    "dropdownSelectors": [
      {
        "id": "cloudProvider",
        "command": "echo \"gcp\naws\nazure\"",
        "placeholder": "Select cloud provider...",
        "defaultValue": {
          "exact": "gcp"
        }
      },
      {
        "id": "project",
        "command": "case ${cloudProvider} in\n  gcp) gcloud projects list --format='value(projectId)';;\n  aws) aws organizations list-accounts --query 'Accounts[].Id' --output text;;\n  azure) az account list --query '[].id' --output tsv;;\nesac",
        "dependsOn": "cloudProvider",
        "placeholder": "Select project/account...",
        "commandOnChange": "case ${cloudProvider} in\n  gcp) gcloud config set project ${project};;\n  aws) aws configure set default.account ${project};;\n  azure) az account set --subscription ${project};;\nesac"
      },
      {
        "id": "cluster",
        "command": "case ${cloudProvider} in\n  gcp) gcloud container clusters list --format='value(name)';;\n  aws) aws eks list-clusters --query 'clusters' --output text;;\n  azure) az aks list --query '[].name' --output tsv;;\nesac",
        "dependsOn": "project",
        "placeholder": "Select cluster...",
        "commandOnChange": "case ${cloudProvider} in\n  gcp) gcloud container clusters get-credentials ${cluster};;\n  aws) aws eks update-kubeconfig --name ${cluster};;\n  azure) az aks get-credentials --name ${cluster};;\nesac"
      }
    ]
  },
  "categories": [
    {
      "category": {
        "title": "Cloud Tools",
        "verifications": [
          {
            "id": "cloudCliInstalled",
            "title": "Cloud CLI installed",
            "checkType": "commandSuccess",
            "command": "case ${cloudProvider:-gcp} in\n  gcp) gcloud --version;;\n  aws) aws --version;;\n  azure) az --version;;\nesac",
            "fixCommand": "case ${cloudProvider:-gcp} in\n  gcp) curl https://sdk.cloud.google.com | bash;;\n  aws) pip install awscli;;\n  azure) curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash;;\nesac"
          }
        ]
      }
    }
  ]
}
```

### 2. Sections Configuration
```json
{
  "sections": [
    {
      "id": "microservice",
      "title": "Microservice",
      "components": {
        "toggle": true,
        "infoButton": true,
        "deploymentOptions": true,
        "dropdownSelectors": [
          {
            "id": "namespace",
            "command": "kubectl get namespaces -o name | sed 's/namespace\\///'",
            "placeholder": "Select namespace...",
            "defaultValue": {
              "exact": "default"
            }
          },
          {
            "id": "environment",
            "command": "echo \"development\nstaging\nproduction\"",
            "placeholder": "Select environment...",
            "defaultValue": {
              "contains": "dev"
            }
          }
        ],
        "inputField": {
          "id": "replicas",
          "placeholder": "Number of replicas (default: 3)",
          "default": "3"
        }
      }
    }
  ]
}
```

### 3. Commands Configuration
```json
[
  {
    "id": "microservice",
    "conditions": {
      "enabled": true,
      "deploymentType": "container"
    },
    "command": {
      "base": "kubectl apply -f k8s/${environment}/ -n ${namespace}",
      "postModifiers": " && kubectl scale deployment myapp --replicas=${replicas} -n ${namespace}",
      "tabTitle": "Microservice (${environment}:${namespace})"
    }
  },
  {
    "id": "microservice",
    "conditions": {
      "enabled": true,
      "deploymentType": "process"
    },
    "command": {
      "base": "cd microservice && npm start",
      "prefix": "export NODE_ENV=${environment} && ",
      "tabTitle": "Microservice (Local:${environment})"
    }
  }
]
```

## Development Workflow Example

A development-focused configuration with testing and build tools.

### 1. Sections Configuration
```json
{
  "sections": [
    {
      "id": "app",
      "title": "Main Application",
      "components": {
        "toggle": true,
        "infoButton": true,
        "gitBranch": true,
        "deploymentOptions": true,
        "modeSelector": {
          "options": ["dev", "test", "prod"],
          "labels": ["Development", "Testing", "Production"],
          "default": "dev"
        },
        "subSections": [
          {
            "id": "testing",
            "title": "Testing Suite",
            "components": {
              "toggle": true,
              "modeSelector": {
                "options": ["unit", "integration", "e2e"],
                "labels": ["Unit Tests", "Integration Tests", "E2E Tests"],
                "default": "unit"
              },
              "customButtons": [
                {
                  "id": "testWatch",
                  "label": "Watch Tests",
                  "commandId": "testWatchCommand"
                },
                {
                  "id": "coverage",
                  "label": "Coverage Report",
                  "commandId": "coverageCommand"
                }
              ]
            }
          },
          {
            "id": "build",
            "title": "Build Pipeline",
            "components": {
              "toggle": true,
              "dropdownSelectors": [
                {
                  "id": "buildTarget",
                  "command": "echo \"development\nproduction\nstaging\"",
                  "placeholder": "Select build target..."
                }
              ]
            }
          }
        ]
      }
    },
    {
      "id": "tools",
      "title": "Development Tools",
      "testSection": true,
      "components": {
        "toggle": true,
        "customButtons": [
          {
            "id": "linter",
            "label": "Run Linter",
            "commandId": "linterCommand"
          },
          {
            "id": "formatter",
            "label": "Format Code",
            "commandId": "formatterCommand"
          }
        ]
      }
    }
  ]
}
```

### 2. Commands Configuration
```json
[
  {
    "id": "app",
    "conditions": {
      "enabled": true,
      "mode": "dev"
    },
    "command": {
      "base": "npm run dev",
      "prefix": "export NODE_ENV=development && ",
      "tabTitle": "App (Development)"
    }
  },
  {
    "id": "app",
    "conditions": {
      "enabled": true,
      "mode": "prod"
    },
    "command": {
      "base": "npm run build && npm start",
      "prefix": "export NODE_ENV=production && ",
      "tabTitle": "App (Production)"
    }
  },
  {
    "id": "testing",
    "conditions": {
      "enabled": true,
      "testMode": "unit"
    },
    "command": {
      "base": "npm run test:unit",
      "tabTitle": "Unit Tests"
    }
  },
  {
    "id": "testing",
    "conditions": {
      "enabled": true,
      "testMode": "integration"
    },
    "command": {
      "base": "npm run test:integration",
      "tabTitle": "Integration Tests"
    }
  },
  {
    "id": "testing",
    "conditions": {
      "enabled": true,
      "testMode": "e2e"
    },
    "command": {
      "base": "npm run test:e2e",
      "tabTitle": "E2E Tests"
    }
  },
  {
    "id": "build",
    "conditions": {
      "enabled": true
    },
    "command": {
      "base": "npm run build:${buildTarget}",
      "tabTitle": "Build (${buildTarget})"
    }
  },
  {
    "id": "testWatchCommand",
    "command": {
      "base": "npm run test:watch",
      "tabTitle": "Test Watcher"
    }
  },
  {
    "id": "coverageCommand",
    "command": {
      "base": "npm run test:coverage && open coverage/index.html",
      "tabTitle": "Coverage Report"
    }
  },
  {
    "id": "linterCommand",
    "command": {
      "base": "npm run lint",
      "tabTitle": "ESLint"
    }
  },
  {
    "id": "formatterCommand",
    "command": {
      "base": "npm run format",
      "tabTitle": "Prettier"
    }
  }
]
```

## Best Practices Demonstrated

### 1. **Clear Naming Conventions**
- Section IDs use kebab-case: `"microservice"`, `"api-gateway"`
- Component IDs use camelCase: `"debugPort"`, `"buildTarget"`
- Command IDs are descriptive: `"apiLogCommand"`, `"testWatchCommand"`

### 2. **Logical Component Usage**
- Use `deploymentOptions` for container/process selection
- Use `modeSelector` for custom environment modes
- Use `inputField` for user-provided values
- Use `customButtons` for auxiliary actions

### 3. **State Management**
- Simple, flat state structure
- Consistent property naming
- Clear variable substitution patterns

### 4. **Command Organization**
- Separate commands for different conditions
- Clear, descriptive tab titles
- Proper container association
- Meaningful modifiers

### 5. **Error Prevention**
- Required verifications for each section
- Sensible defaults for components
- Graceful handling of missing dependencies

## Common Patterns

### Container Lifecycle Management
```json
{
  "associatedContainers": [
    "app-container",
    {
      "name": "debug-sidecar",
      "condition": "attachState.api === true"
    }
  ]
}
```

### Dynamic Tab Titles
```json
{
  "tabTitle": {
    "base": "Service",
    "conditionalAppends": [
      {
        "condition": "environment === 'production'",
        "append": " [PROD]"
      }
    ]
  }
}
```

### Conditional Modifiers
```json
{
  "modifiers": [
    {
      "condition": "mode === 'development'",
      "append": " --hot-reload"
    },
    {
      "condition": "debugPort",
      "prepend": "DEBUG_PORT=${debugPort} "
    }
  ]
}
```

## Related Documentation

- [Configuration Overview](overview.md) - Basic concepts and principles
- [Section Configuration](sections.md) - UI components and structure
- [Command Configuration](commands.md) - Command generation and execution
- [Dropdown Configuration](dropdowns.md) - Dynamic dropdown setup
- [Getting Started](../../getting-started.md) - Setting up your first configuration 