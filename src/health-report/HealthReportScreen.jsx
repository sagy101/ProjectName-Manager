import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './styles/health-report-screen.css';
import { loggers } from '../common/utils/debugUtils.js';

const log = loggers.health;

const HealthReportScreen = ({ 
  isVisible, 
  projectName, 
  onClose, 
  terminals = [], 
  noRunMode = false,
  onRefreshTerminal,
  onFocusTerminal 
}) => {
  log.debug('HealthReportScreen: Component rendered or re-rendered.');
  const [containerHealth, setContainerHealth] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [showCommandPopup, setShowCommandPopup] = useState(null);

  // Memoize terminal IDs to create a stable dependency for initializing expanded state
  const terminalIds = useMemo(() => JSON.stringify(terminals.map(t => t.id).sort()), [terminals]);

  // Effect to initialize expanded state for new terminals
  useEffect(() => {
    if (!isVisible) return;
    
    const newExpandedState = { ...expandedSections };
    let stateChanged = false;
    
    terminals.forEach(terminal => {
      if (newExpandedState[terminal.id] === undefined) {
        newExpandedState[terminal.id] = false; // Start all sections collapsed by default
        stateChanged = true;
      }
    });

    if (stateChanged) {
      setExpandedSections(newExpandedState);
    }
  }, [isVisible, terminalIds]);

  // Effect for fetching container statuses
  useEffect(() => {
    if (!isVisible) {
      setContainerHealth({});
      setIsLoading(true);
      return;
    }
    
    log.debug('HealthReportScreen: fetching container statuses...');
    fetchContainerStatuses();
    setIsLoading(false);
    
    const refreshInterval = setInterval(fetchContainerStatuses, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(refreshInterval);
  }, [isVisible, terminalIds]);


  const fetchContainerStatuses = useCallback(async () => {
    log.debug('HealthReportScreen: fetching container statuses...');
    const updates = {};
    
    for (const terminal of terminals) {
      if (terminal.associatedContainers && terminal.associatedContainers.length > 0) {
        const containerStatuses = {};
        for (const containerName of terminal.associatedContainers) {
          if (containerName && typeof containerName === 'string' && containerName.trim() !== '') {
            try {
              containerStatuses[containerName] = window.electron?.getContainerStatus 
                ? await window.electron.getContainerStatus(containerName) 
                : 'unknown';
            } catch (error) {
              log.error(`Error fetching container status for ${containerName}:`, error);
              containerStatuses[containerName] = 'error';
            }
          }
        }
        updates[terminal.id] = { containerStatuses, lastUpdated: Date.now() };
      }
    }

    if (Object.keys(updates).length > 0) {
      setContainerHealth(prev => ({ ...prev, ...updates }));
    }
    setLastUpdated(Date.now());
  }, [terminals]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return (
          <svg className="status-icon running" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M20 6L9 17l-5-5" />
          </svg>
        );
      case 'sleeping':
      case 'waiting':
        return (
          <svg className="status-icon sleeping" viewBox="0 0 24 24" width="14" height="14">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M8 12h8" />
          </svg>
        );
      case 'done':
      case 'stopped':
        return (
          <svg className="status-icon done" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M20 6L9 17l-5-5" />
          </svg>
        );
      case 'error':
      case 'terminated':
        return (
          <svg className="status-icon error" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  d="M18 6L6 18M6 6l12 12" />
          </svg>
        );
      case 'initializing':
        return (
          <svg className="status-icon initializing" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        );
      case 'degraded':
        return (
          <svg className="status-icon degraded" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M2.45 15.79l5.09-8.82A2 2 0 019.24 6h5.52a2 2 0 011.7.97l5.09 8.82a2 2 0 01-1.7 3.03H4.15a2 2 0 01-1.7-3.03z" />
          </svg>
        );
      case 'idle':
      default:
        return (
          <svg className="status-icon idle" viewBox="0 0 24 24" width="14" height="14">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'running': return 'Running';
      case 'sleeping': return 'Sleeping';
      case 'waiting': return 'Waiting';
      case 'done': return 'Completed';
      case 'stopped': return 'Stopped';
      case 'error': return 'Error';
      case 'terminated': return 'Terminated';
      case 'initializing': return 'Initializing';
      case 'degraded': return 'Degraded';
      case 'idle': return 'Idle';
      default: return status || 'Unknown';
    }
  };

  const toggleSection = (terminalId) => {
    setExpandedSections(prev => ({
      ...prev,
      [terminalId]: !prev[terminalId]
    }));
  };

  const handleShowCommand = (terminal) => {
    setShowCommandPopup(terminal);
  };

  const handleCloseCommandPopup = () => {
    setShowCommandPopup(null);
  };

  const handleFocusTab = (terminalId) => {
    if (onFocusTerminal) {
      onFocusTerminal(terminalId);
    }
    onClose(); // Close health report after focusing
  };

  const handleRefresh = (terminalId) => {
    if (!noRunMode && onRefreshTerminal) {
      onRefreshTerminal(terminalId);
    }
  };

  const getCombinedHealthStatus = (terminal) => {
    if (!terminal) return 'unknown';

    const { status: terminalStatus, associatedContainers } = terminal;
    const currentContainerInfo = containerHealth[terminal.id] || {};
    const containerStatuses = Object.values(currentContainerInfo.containerStatuses || {});

    // Terminal error states are highest priority
    if (['error', 'terminated'].includes(terminalStatus)) {
      return 'error';
    }

    // If no containers, the terminal status is the final status
    if (!associatedContainers || associatedContainers.length === 0) {
      return terminalStatus || 'unknown';
    }
    
    const totalContainers = associatedContainers.length;
    let runningContainers = 0;
    
    for (const s of containerStatuses) {
      const statusStr = (s || 'unknown').toLowerCase();
      if (['error', 'failed', 'unhealthy', 'exited'].includes(statusStr)) return 'error';
      if (statusStr === 'running') runningContainers++;
      if (['creating', 'restarting'].includes(statusStr)) return 'initializing';
    }

    if (terminalStatus === 'running') {
      if (runningContainers === totalContainers) return 'running';
      if (runningContainers > 0) return 'degraded';
      return 'initializing'; // Terminal is running but containers are not up yet
    }

    return terminalStatus || 'unknown';
  };

  const getOverallHealthStatus = () => {
    const statuses = terminals.map(terminal => {
      // Primary status comes directly from the terminal object
      if (['error', 'terminated'].includes(terminal.status)) {
        return 'error';
      }
      
      // Check container statuses from our separate state
      const containerStatuses = Object.values(containerHealth[terminal.id]?.containerStatuses || {});
      if (containerStatuses.some(status => ['error', 'failed'].includes(status))) {
        return 'error';
      }
      
      if (['sleeping', 'waiting'].includes(terminal.status)) {
        return 'warning';
      }
      
      return 'healthy';
    });

    if (statuses.includes('error')) return 'error';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  };

  const getHealthSummary = () => {
    const total = terminals.length;
    const running = terminals.filter(t => t.status === 'running').length;
    const errors = terminals.filter(t => ['error', 'terminated'].includes(t.status)).length;
    const waiting = terminals.filter(t => ['sleeping', 'waiting'].includes(t.status)).length;

    return { total, running, errors, waiting };
  };

  const CommandPopup = () => {
    if (!showCommandPopup) return null;

    return (
      <div className="command-popup-overlay" onClick={handleCloseCommandPopup}>
        <div className="command-popup" onClick={(e) => e.stopPropagation()}>
          <div className="command-popup-header">
            <h3>Command Details</h3>
            <button className="close-button" onClick={handleCloseCommandPopup}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="command-popup-content">
            <h4>Command:</h4>
            <pre>{showCommandPopup.command || 'No command available'}</pre>
            <button 
              className="copy-button"
              onClick={(event) => {
                navigator.clipboard.writeText(showCommandPopup.command || '');
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                setTimeout(() => {
                  button.textContent = originalText;
                }, 1500);
              }}
            >
              Copy Command
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  const healthSummary = getHealthSummary();
  const overallStatus = getOverallHealthStatus();

  return ReactDOM.createPortal(
    <>
      <div className="health-report-overlay">
        <div className="health-report-container">
          <div className="health-report-header">
            <h2>{projectName} Health Report</h2>
            <div className="health-summary">
              <div className={`summary-status summary-status--${overallStatus}`}>
                {overallStatus === 'healthy' && '✓ All Systems Healthy'}
                {overallStatus === 'warning' && `⚠ ${healthSummary.waiting} Systems Waiting`}
                {overallStatus === 'error' && `✗ ${healthSummary.errors} Issues Detected`}
              </div>
              <div className="summary-stats">
                <span>Total: {healthSummary.total}</span>
                <span>Running: {healthSummary.running}</span>
                <span>Errors: {healthSummary.errors}</span>
                {lastUpdated && (
                  <span className="last-updated">
                    Updated: {new Date(lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            <div className="header-actions">
              <button className="refresh-all-button" onClick={fetchContainerStatuses}>
                <svg className="refresh-icon" viewBox="0 0 24 24" width="16" height="16">
                  <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M23 4v6h-6m-3 13a9 9 0 01-9-9 9 9 0 0118 0 9 9 0 01-9 9z" />
                </svg>
                Refresh All
              </button>
              <button className="close-button" onClick={onClose}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="health-report-content">
            {isLoading ? (
              <div className="loading-section">
                <div className="loading-spinner">
                  <svg className="spinner" viewBox="0 0 24 24" width="20" height="20">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" 
                            strokeDasharray="31.4" strokeDashoffset="10" />
                  </svg>
                </div>
                <span>Loading health data...</span>
              </div>
            ) : terminals.length === 0 ? (
              <div className="no-terminals-message">
                <p>No terminal tabs found.</p>
              </div>
            ) : (
              <div className="terminals-grid">
                {terminals.map(terminal => {
                  const terminalStatus = terminal.status || 'unknown';
                  const combinedStatus = getCombinedHealthStatus(terminal);
                  const isExpanded = expandedSections[terminal.id];
                  const currentContainerInfo = containerHealth[terminal.id] || {};

                  return (
                    <div 
                      key={terminal.id} 
                      className="terminal-health-section"
                      data-status={combinedStatus}
                    >
                      <div 
                        className="terminal-section-header"
                        onClick={() => toggleSection(terminal.id)}
                        data-testid={`terminal-section-${terminal.title}`}
                      >
                      <div className="terminal-header-left">
                        {getStatusIcon(combinedStatus)}
                        <span className="terminal-name">{terminal.title}</span>
                        <span className={`terminal-status-label status-${combinedStatus}`}>
                          {getStatusLabel(combinedStatus)}
                        </span>
                      </div>
                      <div className="terminal-header-right">
                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="terminal-section-content">
                        <div className="terminal-details">
                          <div className="detail-row">
                            <span className="detail-label">Terminal ID:</span>
                            <span className="detail-value mono">{terminal.id}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Section:</span>
                            <span className="detail-value">{terminal.sectionId || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value">
                              {getStatusLabel(terminalStatus)}
                              {terminal.exitStatus && ` (${terminal.exitStatus})`}
                            </span>
                          </div>
                        </div>

                        {terminal.associatedContainers && terminal.associatedContainers.length > 0 && (
                          <div className="container-statuses">
                            <h4>Associated Containers:</h4>
                            {isLoading ? (
                              <p className="loading-text">Loading container statuses...</p>
                            ) : (
                              <ul className="container-list">
                                {terminal.associatedContainers.map(containerName => (
                                  <li key={containerName} className="container-item">
                                    {getStatusIcon(currentContainerInfo.containerStatuses?.[containerName] || 'unknown')}
                                    <span className="container-name">{containerName}</span>
                                    <span className={`container-status status-${(currentContainerInfo.containerStatuses?.[containerName] || 'unknown').toLowerCase()}`}>
                                      {currentContainerInfo.containerStatuses?.[containerName] || 'Unknown'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        <div className="terminal-actions">
                          <button 
                            className="action-button"
                            onClick={() => handleShowCommand(terminal)}
                            data-testid="show-command-button"
                          >
                            Show Command
                          </button>
                          <button 
                            className="action-button"
                            onClick={() => handleFocusTab(terminal.id)}
                            data-testid="focus-tab-button"
                          >
                            Focus Tab
                          </button>
                          <button 
                            className="action-button"
                            onClick={() => handleRefresh(terminal.id)}
                            disabled={noRunMode}
                            title={noRunMode ? 'Cannot refresh in No Run Mode' : 'Refresh and re-run command'}
                            data-testid="refresh-button"
                          >
                            🔄 Refresh
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <CommandPopup />
    </>,
    document.body
  );
};

export default HealthReportScreen; 