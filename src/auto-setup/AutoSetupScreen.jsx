import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AUTO_SETUP_STATUS, COMMAND_EXECUTION_STATUS, SECTION_STATUS } from './constants/autoSetupConstants';
import { calculateGroupStatus } from './utils/autoSetupUtils';
import { loggers } from '../common/utils/debugUtils.js';
import './auto-setup-screen.css';


const logger = loggers.autoSetup;

const AutoSetupScreen = ({
  isVisible,
  projectName,
  onClose,
  autoSetupStatus,
  commandGroups = [],
  commandStatuses = {},
  activeTerminals,
  floatingTerminals = [],
  commandTimeouts = new Map(),
  progress,
  onStartAutoSetup,
  onStopAutoSetup,
  onStartPriorityGroup,
  onRetryCommand,
  onTerminateCommand,
  onViewTerminal,
  noRunMode = false
}) => {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showCommandPopup, setShowCommandPopup] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for timeout countdown
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isVisible]);

  // Auto-expand active priority section and collapse finished ones
  useEffect(() => {
    if (isVisible && commandGroups.length > 0) {
      const newExpandedState = {};
      let hasRunningGroup = false;
      
      commandGroups.forEach((group, index) => {
        const groupStatus = calculateGroupStatus(group.commands, commandStatuses);
        
        // Auto-expand logic:
        // - Running groups should always be expanded
        // - If no groups are running, expand the first waiting group
        // - Collapse completed/failed groups unless manually expanded
        if (groupStatus === SECTION_STATUS.RUNNING) {
          newExpandedState[group.priority] = true;
          hasRunningGroup = true;
        } else if (groupStatus === SECTION_STATUS.SUCCESS || groupStatus === SECTION_STATUS.FAILED) {
          // Collapse finished groups unless user manually expanded them
          if (expandedGroups[group.priority] === undefined) {
            newExpandedState[group.priority] = false;
          } else {
            // Keep user's manual preference for finished groups
            newExpandedState[group.priority] = expandedGroups[group.priority];
          }
        } else if (groupStatus === SECTION_STATUS.WAITING) {
          // If no running group and this is the first waiting group, expand it
          if (!hasRunningGroup && index === 0) {
            newExpandedState[group.priority] = true;
          } else {
            // Keep existing state or default to collapsed for waiting groups
            newExpandedState[group.priority] = expandedGroups[group.priority] ?? false;
          }
        } else {
          // Default case - preserve existing state or collapse
          newExpandedState[group.priority] = expandedGroups[group.priority] ?? (index === 0);
        }
      });
      
      // If no running groups, expand the first incomplete group
      if (!hasRunningGroup) {
        const firstIncompleteGroup = commandGroups.find(group => {
          const status = calculateGroupStatus(group.commands, commandStatuses);
          return status === SECTION_STATUS.WAITING || status === SECTION_STATUS.FAILED;
        });
        if (firstIncompleteGroup) {
          newExpandedState[firstIncompleteGroup.priority] = true;
        }
      }
      
      setExpandedGroups(newExpandedState);
    }
  }, [isVisible, commandGroups.length, commandStatuses, autoSetupStatus]);

  const getStatusIcon = (status) => {
    switch (status) {
      case COMMAND_EXECUTION_STATUS.RUNNING:
        return (
          <svg className="status-icon running" viewBox="0 0 24 24" width="14" height="14">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" 
                    strokeDasharray="31.4" strokeDashoffset="10" />
          </svg>
        );
      case COMMAND_EXECUTION_STATUS.SUCCESS:
        return (
          <svg className="status-icon success" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M20 6L9 17l-5-5" />
          </svg>
        );
      case COMMAND_EXECUTION_STATUS.FAILED:
        return (
          <svg className="status-icon failed" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  d="M18 6L6 18M6 6l12 12" />
          </svg>
        );
      case COMMAND_EXECUTION_STATUS.STOPPED:
        return (
          <svg className="status-icon stopped" viewBox="0 0 24 24" width="14" height="14">
            <rect x="6" y="6" width="12" height="12" fill="currentColor" />
          </svg>
        );
      case COMMAND_EXECUTION_STATUS.TIMEOUT:
        return (
          <svg className="status-icon timeout" viewBox="0 0 24 24" width="14" height="14">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            <path fill="currentColor" d="M12 6v6l4 2-1 1.5-5-3V6z" />
          </svg>
        );
      case COMMAND_EXECUTION_STATUS.PENDING:
      default:
        return (
          <svg className="status-icon pending" viewBox="0 0 24 24" width="14" height="14">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case COMMAND_EXECUTION_STATUS.RUNNING: return 'Running';
      case COMMAND_EXECUTION_STATUS.SUCCESS: return 'Success';
      case COMMAND_EXECUTION_STATUS.FAILED: return 'Failed';
      case COMMAND_EXECUTION_STATUS.STOPPED: return 'Stopped';
      case COMMAND_EXECUTION_STATUS.TIMEOUT: return 'Timeout';
      case COMMAND_EXECUTION_STATUS.PENDING: return 'Pending';
      default: return status || 'Unknown';
    }
  };

  const getGroupStatusIcon = (groupStatus) => {
    switch (groupStatus) {
      case SECTION_STATUS.RUNNING:
        return (
          <svg className="group-status-icon running" viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" 
                    strokeDasharray="31.4" strokeDashoffset="10" />
          </svg>
        );
      case SECTION_STATUS.SUCCESS:
        return (
          <svg className="group-status-icon success" viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M20 6L9 17l-5-5" />
          </svg>
        );
      case SECTION_STATUS.FAILED:
        return (
          <svg className="group-status-icon failed" viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  d="M18 6L6 18M6 6l12 12" />
          </svg>
        );
      case SECTION_STATUS.WAITING:
      default:
        return (
          <svg className="group-status-icon waiting" viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
    }
  };

  const toggleGroup = (priority) => {
    setExpandedGroups(prev => ({
      ...prev,
      [priority]: !prev[priority]
    }));
  };

  const handleShowCommand = (command) => {
    setShowCommandPopup(command);
  };

  const handleCloseCommandPopup = () => {
    setShowCommandPopup(null);
  };

  const handleRetryCommand = (command) => {
    if (onRetryCommand) {
      onRetryCommand(command);
    }
  };

  const handleViewTerminal = useCallback((command) => {
    // Find the floating terminal for this command
    const floatingTerminal = floatingTerminals.find(
      terminal => terminal.commandId === command.id
    );
    
    logger.debug('🟢 VIEW_TERMINAL: handleViewTerminal called for command:', command.id);
    logger.debug('🟢 VIEW_TERMINAL: All floating terminals:', floatingTerminals.map(t => ({ id: t.id, commandId: t.commandId })));
    logger.debug('🟢 VIEW_TERMINAL: Found floating terminal:', floatingTerminal);
    
    if (floatingTerminal && onViewTerminal) {
      logger.debug('🟢 VIEW_TERMINAL: Calling onViewTerminal with ID:', floatingTerminal.id);
      onViewTerminal(floatingTerminal.id);
    } else {
      logger.debug('🟢 VIEW_TERMINAL: No terminal found or onViewTerminal not available');
      logger.debug('🟢 VIEW_TERMINAL: floatingTerminal exists:', !!floatingTerminal);
      logger.debug('🟢 VIEW_TERMINAL: onViewTerminal exists:', !!onViewTerminal);
    }
  }, [floatingTerminals, onViewTerminal]);

  const getOverallStatus = () => {
    switch (autoSetupStatus) {
      case AUTO_SETUP_STATUS.RUNNING:
        return 'running';
      case AUTO_SETUP_STATUS.SUCCESS:
        return 'success';
      case AUTO_SETUP_STATUS.FAILED:
        return 'failed';
      case AUTO_SETUP_STATUS.STOPPED:
        return 'stopped';
      default:
        return 'idle';
    }
  };

  const getOverallStatusMessage = () => {
    switch (autoSetupStatus) {
      case AUTO_SETUP_STATUS.PREPARING:
        return 'Preparing auto setup...';
      case AUTO_SETUP_STATUS.RUNNING:
        return `Running auto setup (${progress.completed}/${progress.total} commands completed)`;
      case AUTO_SETUP_STATUS.SUCCESS:
        return '✓ Auto Setup completed successfully!';
      case AUTO_SETUP_STATUS.FAILED:
        return '✗ Auto Setup failed - some commands did not complete successfully';
      case AUTO_SETUP_STATUS.STOPPED:
        return '⏹ Auto Setup stopped by user';
      default:
        return `Ready to run ${progress.total} fix commands`;
    }
  };

  const canStart = autoSetupStatus === AUTO_SETUP_STATUS.IDLE || 
                   autoSetupStatus === AUTO_SETUP_STATUS.PREPARING || 
                   autoSetupStatus === AUTO_SETUP_STATUS.STOPPED;
  const isRunning = autoSetupStatus === AUTO_SETUP_STATUS.RUNNING;
  const canContinue = autoSetupStatus === AUTO_SETUP_STATUS.FAILED;

  // Helper to get timeout remaining for a command
  const getTimeoutRemaining = (commandId) => {
    const timeout = commandTimeouts.get(commandId);
    if (!timeout) return null;
    
    const elapsed = currentTime - timeout.startTime;
    const remaining = Math.max(0, timeout.duration - elapsed);
    return Math.ceil(remaining / 1000); // Return seconds remaining
  };

  // Helper to format timeout display
  const formatTimeoutDisplay = (seconds) => {
    if (seconds <= 0) return 'Timing out...';
    return `${seconds}s`;
  };

  const CommandPopup = () => {
    if (!showCommandPopup) return null;

    return (
      <div className="command-popup-overlay" onClick={handleCloseCommandPopup}>
        <div className="command-popup" onClick={(e) => e.stopPropagation()}>
          <div className="command-popup-header">
            <h3>Fix Command Details</h3>
            <button className="close-button" onClick={handleCloseCommandPopup}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="command-popup-content">
            <h4>Verification:</h4>
            <p>{showCommandPopup.title}</p>
            <h4>Fix Command:</h4>
            <pre>{showCommandPopup.fixCommand}</pre>
            <button 
              className="copy-button"
              onClick={(event) => {
                navigator.clipboard.writeText(showCommandPopup.fixCommand);
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

  const overallStatus = getOverallStatus();

  return ReactDOM.createPortal(
    <>
      <div className="auto-setup-overlay">
        <div className="auto-setup-container">
          <div className="auto-setup-header">
            <div className="header-title">
              <h2>{projectName} Auto Setup</h2>
              <div className="header-title-actions">
                {canStart && commandGroups.length > 0 && (
                  <button 
                    className="start-button" 
                    onClick={onStartAutoSetup}
                    title={noRunMode ? 'Cannot start in No Run Mode' : 'Start Auto Setup'}
                  >
                    <svg className="start-icon" viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M8 5v14l11-7z" />
                    </svg>
                    Start Auto Setup
                  </button>
                )}
                {isRunning && (
                  <button className="stop-button" onClick={onStopAutoSetup}>
                    <svg className="stop-icon" viewBox="0 0 24 24" width="16" height="16">
                      <rect x="6" y="6" width="12" height="12" fill="currentColor" />
                    </svg>
                    Stop
                  </button>
                )}
                <button className="close-button" onClick={onClose}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="auto-setup-summary">
              <div className={`summary-status summary-status--${overallStatus}`}>
                {getOverallStatusMessage()}
              </div>
              <div className="summary-stats">
                <span>Progress: {progress.completed}/{progress.total} ({progress.percentage}%)</span>
                <span>Groups: {commandGroups.length}</span>
                {(autoSetupStatus === AUTO_SETUP_STATUS.RUNNING || autoSetupStatus === AUTO_SETUP_STATUS.SUCCESS) && (
                  <span className="last-updated">
                    Started: {new Date().toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

          </div>

          <div className="auto-setup-content">
            {commandGroups.length === 0 ? (
              <div className="no-commands-message">
                <div className="no-commands-icon">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3>All verifications are passing!</h3>
                <p>No fix commands are needed at this time.</p>
              </div>
            ) : (
              <div className="priority-groups">
                {commandGroups.map((group, groupIndex) => {
                  const groupStatus = calculateGroupStatus(group.commands, commandStatuses);
                  const isExpanded = expandedGroups[group.priority];
                  const completedCommands = group.commands.filter(cmd => 
                    commandStatuses[cmd.id] === COMMAND_EXECUTION_STATUS.SUCCESS
                  ).length;

                  return (
                    <div 
                      key={group.priority}
                      className="priority-group"
                      data-status={groupStatus}
                    >
                      <div 
                        className="priority-group-header"
                        onClick={() => toggleGroup(group.priority)}
                      >
                        <div className="group-header-left">
                          {getGroupStatusIcon(groupStatus)}
                          <span className="group-title">{group.priority === 999 ? 'Last Priority' : `Priority ${group.priority}`}</span>
                          <span className="group-progress">{completedCommands}/{group.commands.length} completed</span>
                          <span className={`group-status-label status-${groupStatus}`}>
                            {groupStatus === SECTION_STATUS.WAITING && 'Waiting'}
                            {groupStatus === SECTION_STATUS.RUNNING && 'Running'}
                            {groupStatus === SECTION_STATUS.SUCCESS && 'Complete'}
                            {groupStatus === SECTION_STATUS.FAILED && 'Failed'}
                          </span>
                        </div>
                        <div className="group-header-right">
                          <button
                            className="start-priority-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartPriorityGroup(group);
                            }}
                            title={`Start Priority ${group.priority}`}
                            disabled={isRunning}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Start Priority
                          </button>
                          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="priority-group-content">
                          <div className="commands-list">
                            {group.commands.map(command => {
                              const commandStatus = commandStatuses[command.id] || COMMAND_EXECUTION_STATUS.PENDING;
                              
                              // Check if command has an active terminal (running command with terminal)
                              const hasActiveTerminal = commandStatus === COMMAND_EXECUTION_STATUS.RUNNING && 
                                floatingTerminals.some(terminal => terminal.commandId === command.id);
                              
                              // Check if command has any terminal (for view terminal button)
                              const hasViewableTerminal = floatingTerminals.some(
                                terminal => terminal.commandId === command.id
                              );

                              // Find the specific floating terminal for this command for debug logging
                              const commandFloatingTerminal = floatingTerminals.find(
                                terminal => terminal.commandId === command.id
                              );

                              // Debug logging for button visibility
                              if (command.id === 'homebrewInstalled') { // Adjust this to your command ID
                                logger.debug('🟢 BUTTON_LOGIC:', command.id, {
                                  status: commandStatus,
                                  hasFloatingTerminal: !!commandFloatingTerminal,
                                  isAutoSetup: commandFloatingTerminal?.isAutoSetup,
                                  canView: commandStatus === 'running' && commandFloatingTerminal && onViewTerminal,
                                  canTerminate: commandStatus === 'running' && commandFloatingTerminal?.isAutoSetup
                                });
                              }

                              return (
                                <div 
                                  key={command.id}
                                  className="command-item"
                                  data-status={commandStatus}
                                >
                                  <div className="command-info">
                                    <div className="command-status">
                                      {getStatusIcon(commandStatus)}
                                      <span className="command-title">{command.title}</span>
                                      {commandStatus === COMMAND_EXECUTION_STATUS.RUNNING && (
                                        <span className="command-timeout">
                                          {(() => {
                                            const remaining = getTimeoutRemaining(command.id);
                                            return remaining !== null ? (
                                              <span className={`timeout-countdown ${remaining <= 10 ? 'warning' : ''}`}>
                                                ⏱ {formatTimeoutDisplay(remaining)}
                                              </span>
                                            ) : null;
                                          })()}
                                        </span>
                                      )}
                                    </div>
                                    <div className="command-details">
                                      <span className="command-category">{command.category}</span>
                                      <span className="command-source">{command.source === 'general' ? 'Environment' : 'Section'}</span>
                                    </div>
                                  </div>
                                  <div className="command-actions">
                                    <button 
                                      className="action-button"
                                      onClick={() => handleShowCommand(command)}
                                      title="Show command details"
                                    >
                                      Details
                                    </button>
                                    {hasViewableTerminal && (
                                      <button 
                                        className="action-button view-terminal-button"
                                        onClick={() => handleViewTerminal(command)}
                                        title="View terminal output"
                                      >
                                        View Terminal
                                      </button>
                                    )}
                                    {hasActiveTerminal && (
                                      <button 
                                        className="action-button terminate-button"
                                        onClick={() => {
                                          logger.debug('🔴 BUTTON_CLICK: Terminate button clicked for command:', command.id);
                                          onTerminateCommand(command);
                                        }}
                                        title="Terminate this command"
                                      >
                                        Terminate
                                      </button>
                                    )}
                                    {(commandStatus === COMMAND_EXECUTION_STATUS.FAILED || 
                                      commandStatus === COMMAND_EXECUTION_STATUS.STOPPED || 
                                      commandStatus === COMMAND_EXECUTION_STATUS.TIMEOUT) && !isRunning && (
                                      <button 
                                        className="action-button retry-button"
                                        onClick={() => handleRetryCommand(command)}
                                        title="Retry this command"
                                        disabled={noRunMode}
                                      >
                                        Retry
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {noRunMode && (
            <div className="no-run-mode-warning pinned-bottom">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              No Run Mode is active - commands will be displayed but not executed
            </div>
          )}
        </div>
      </div>
      
      <CommandPopup />
    </>,
    document.body
  );
};

export default AutoSetupScreen; 