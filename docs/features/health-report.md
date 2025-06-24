# Health Report

> Real-time monitoring dashboard for all services and dependencies

## Overview

The Health Report provides a centralized view of your entire {ProjectName} Manager environment. Access it via the status indicator button in the App Control Sidebar for instant visibility into service health.

## Key Features

### Monitoring Capabilities
- **Unified Dashboard**: All services and containers in one view
- **Real-Time Updates**: Automatic refresh every few seconds
- **Combined Health Status**: Intelligent status calculation from multiple sources
- **Dependency Tracking**: See relationships between services and containers

### Interactive Controls
- **Focus Tab**: Jump directly to any service's terminal
- **Show Command**: View the exact command being executed
- **Refresh Service**: Re-run commands with one click
- **Status Details**: Expand sections for detailed information

## Status Calculation Logic

The Health Report uses a sophisticated logic to determine the combined status displayed in the header of each service section. This provides a more nuanced and accurate view of the service's true state.

### Combined Status Hierarchy

The combined status is calculated based on the following hierarchy of importance:

1.  **Error**: The status is `error` if:
    - The terminal's own status is `error` or `terminated`.
    - **OR** any of its associated containers has a status of `error`, `failed`, `unhealthy`, or has `exited` unexpectedly.

2.  **Initializing**: The status is `initializing` if:
    - The terminal's status is `running`.
    - **BUT** one or more containers are in a startup state (e.g., `creating`, `restarting`).

3.  **Running**: The status is `running` only if:
    - The terminal's status is `running`.
    - **AND** all of its associated containers are also `running`.

4.  **Degraded**: The status is `degraded` if:
    - The terminal's status is `running`.
    - **BUT** one or more containers are in a non-running state that is not a startup or error state (e.g., a container that has finished its task and `exited` cleanly).

5.  **Sleeping / Waiting**: The status is `sleeping` or `waiting` if:
    - The terminal's own status is `sleeping` or `waiting`.

6.  **Stopped**: The status is `stopped` if:
    - The terminal's status is `stopped` or `done`, and no containers are actively running.

This logic ensures that the header status provides a clear and accurate summary of each service's health, while the detailed view inside each section shows the specific status of the main process and its containers.

## See Also

- [Terminal System](terminal-system.md) - Understanding terminal status indicators
- [Configuration Commands Guide](../configuration/commands.md) - Configuring services to monitor
- [Architecture Overview](../architecture/overview.md) - System monitoring architecture 