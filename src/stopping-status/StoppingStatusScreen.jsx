import React, { useEffect, useState } from 'react';
import './StoppingStatusScreen.css';

const StoppingStatusScreen = ({ terminals, isVisible, projectName, onClose }) => {
  const [terminationStatus, setTerminationStatus] = useState({
    processes: {},
    containers: {}
  });
  const [isComplete, setIsComplete] = useState(false);
  const [isTimeoutReached, setIsTimeoutReached] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let timer;
    if (isVisible) {
      // Reset states on visibility change
      setIsComplete(false);
      setIsTimeoutReached(false);
      setIsInitialized(false);

      timer = setTimeout(() => {
        setIsTimeoutReached(true);
      }, 20000); // 20 seconds
    }
    return () => clearTimeout(timer);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      // Reset status when not visible
      setTerminationStatus({ processes: {}, containers: {} });
      setIsComplete(false);
      setIsTimeoutReached(false);
      setIsInitialized(false);
      return;
    }

    // Initialize status for all terminals and containers
    const initialStatus = {
      processes: {},
      containers: {}
    };

    terminals.forEach(terminal => {
      // Initialize process status
      initialStatus.processes[terminal.id] = {
        title: terminal.title,
        status: 'waiting', // waiting, terminating, terminated
        sectionId: terminal.sectionId
      };

      // Initialize container status
      if (terminal.associatedContainers && terminal.associatedContainers.length > 0) {
        terminal.associatedContainers.forEach(container => {
          // Skip undefined, null, or empty container names
          if (!container || typeof container !== 'string' || container.trim() === '') {
            return;
          }
          
          if (!initialStatus.containers[container]) {
            initialStatus.containers[container] = {
              name: container,
              status: 'waiting',
              terminals: []
            };
          }
          initialStatus.containers[container].terminals.push(terminal.title);
        });
      }
    });

    setTerminationStatus(initialStatus);
    setIsInitialized(true);

    // Listen for termination progress events
    const handleProcessTerminating = (data) => {
      setTerminationStatus(prev => ({
        ...prev,
        processes: {
          ...prev.processes,
          [data.terminalId]: {
            ...prev.processes[data.terminalId],
            status: 'terminating'
          }
        }
      }));
    };

    const handleProcessTerminated = (data) => {
      setTerminationStatus(prev => ({
        ...prev,
        processes: {
          ...prev.processes,
          [data.terminalId]: {
            ...prev.processes[data.terminalId],
            status: 'terminated'
          }
        }
      }));
    };

    const handleContainerTerminating = (data) => {
      // Skip if containerName is invalid
      if (!data.containerName || typeof data.containerName !== 'string') {
        return;
      }
      
      setTerminationStatus(prev => ({
        ...prev,
        containers: {
          ...prev.containers,
          [data.containerName]: {
            ...prev.containers[data.containerName],
            status: 'terminating'
          }
        }
      }));
    };

    const handleContainerTerminated = (data) => {
      // Skip if containerName is invalid
      if (!data.containerName || typeof data.containerName !== 'string') {
        return;
      }
      
      setTerminationStatus(prev => ({
        ...prev,
        containers: {
          ...prev.containers,
          [data.containerName]: {
            ...prev.containers[data.containerName],
            status: data.success ? 'terminated' : 'error'
          }
        }
      }));
    };

    // Add event listeners
    if (window.electron) {
      window.electron.onProcessTerminating(handleProcessTerminating);
      window.electron.onProcessTerminated(handleProcessTerminated);
      window.electron.onContainerTerminating(handleContainerTerminating);
      window.electron.onContainerTerminated(handleContainerTerminated);
    }

    // Cleanup
    return () => {
      if (window.electron) {
        window.electron.removeProcessTerminatingListener(handleProcessTerminating);
        window.electron.removeProcessTerminatedListener(handleProcessTerminated);
        window.electron.removeContainerTerminatingListener(handleContainerTerminating);
        window.electron.removeContainerTerminatedListener(handleContainerTerminated);
      }
    };
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isVisible) return;

    const allProcessesTerminated = Object.values(terminationStatus.processes).every(
      p => p.status === 'terminated'
    );
    const allContainersTerminated = Object.values(terminationStatus.containers).every(
      c => c.status === 'terminated' || c.status === 'error'
    );
    
    const hasProcesses = Object.keys(terminationStatus.processes).length > 0;
    const hasContainers = Object.keys(terminationStatus.containers).length > 0;
    
    // Condition 1: All tasks are done.
    const allDone = hasProcesses && allProcessesTerminated && (!hasContainers || allContainersTerminated);
    
    // Condition 2: There were no tasks to begin with, and we have initialized.
    const nothingToStop = isInitialized && !hasProcesses && !hasContainers;

    if (allDone || (isVisible && nothingToStop)) {
      setIsComplete(true);
    }
  }, [terminationStatus, isVisible, isInitialized]);

  if (!isVisible) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting':
        return (
          <svg className="status-icon waiting" viewBox="0 0 24 24" width="14" height="14">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'terminating':
        return (
          <svg className="status-icon terminating spinning" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" 
                  d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
          </svg>
        );
      case 'terminated':
        return (
          <svg className="status-icon terminated" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M20 6L9 17l-5-5" />
          </svg>
        );
      case 'error':
        return (
          <svg className="status-icon error" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  d="M18 6L6 18M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const processCount = Object.keys(terminationStatus.processes).length;
  const containerCount = Object.keys(terminationStatus.containers).length;
  const processesTerminated = Object.values(terminationStatus.processes).filter(p => p.status === 'terminated').length;
  const containersTerminated = Object.values(terminationStatus.containers).filter(c => c.status === 'terminated' || c.status === 'error').length;

  return (
    <div className="stopping-status-overlay">
      <div className="stopping-status-container">
        <div className="stopping-header">
          <h2>Stopping {projectName}</h2>
          <div className="stopping-progress">
            <div className="progress-item">
              <span className="progress-label">Processes:</span>
              <span className="progress-value">{processesTerminated} / {processCount}</span>
            </div>
            {containerCount > 0 && (
              <div className="progress-item">
                <span className="progress-label">Containers:</span>
                <span className="progress-value">{containersTerminated} / {containerCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="stopping-content">
          {processCount > 0 && (
            <div className="status-section">
              <h3>Terminal Processes</h3>
              <div className="status-list">
                {Object.entries(terminationStatus.processes).map(([terminalId, process]) => (
                  <div key={terminalId} className={`status-item ${process.status}`}>
                    {getStatusIcon(process.status)}
                    <span className="item-name">{process.title}</span>
                    <span className={`status-label ${process.status}`}>
                      {process.status === 'waiting' && 'Waiting'}
                      {process.status === 'terminating' && 'Terminating...'}
                      {process.status === 'terminated' && 'Terminated'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {containerCount > 0 && (
            <div className="status-section">
              <h3>Docker Containers</h3>
              <div className="status-list">
                {Object.entries(terminationStatus.containers).map(([containerName, container]) => (
                  <div key={containerName} className={`status-item ${container.status}`}>
                    {getStatusIcon(container.status)}
                    <span className="item-name">
                      {container.name}
                      <span className="item-detail">
                        ({(container.terminals || []).join(', ')})
                      </span>
                    </span>
                    <span className={`status-label ${container.status}`}>
                      {container.status === 'waiting' && 'Waiting'}
                      {container.status === 'terminating' && 'Stopping...'}
                      {container.status === 'terminated' && 'Stopped'}
                      {container.status === 'error' && 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="stopping-footer">
          {!(isComplete || isTimeoutReached) ? (
            <>
              <div className="stopping-spinner">
                <svg className="spinner" viewBox="0 0 24 24" width="20" height="20">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" 
                          strokeDasharray="31.4" strokeDashoffset="10" />
                </svg>
              </div>
              <span>Please wait while all processes and containers are terminated...</span>
            </>
          ) : (
            <div className="stopping-complete">
              {isComplete ? (
                <>
                  <svg className="complete-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>All processes have been terminated successfully.</span>
                </>
              ) : (
                <>
                  {getStatusIcon('error')}
                  <span>Stopping timed out. Some processes may still be running.</span>
                </>
              )}
              <button className="close-button" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoppingStatusScreen; 