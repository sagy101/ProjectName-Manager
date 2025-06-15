# Health Report Guide

The Health Report is a centralized dashboard that provides a real-time, at-a-glance overview of the health of all services and their dependencies. It is accessible via the status indicator button in the App Control Sidebar.

## Key Features

- **Unified View**: Consolidates the status of all main terminal processes and their associated Docker containers into a single, easy-to-read interface.
- **Real-Time Updates**: Automatically refreshes every few seconds to provide a live snapshot of your environment's health.
- **Combined Health Status**: Displays a holistic, combined health status for each service, calculated from the state of both the main process and its container dependencies.
- **Interactive Controls**: Allows you to quickly jump to a service's terminal tab, view its command, or re-run its process.

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