import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AUTO_SETUP_STATUS, COMMAND_EXECUTION_STATUS, SECTION_STATUS, AUTO_SETUP_TERMINAL_CONFIG } from './constants/autoSetupConstants';
import { collectFixCommands, calculateGroupStatus, generateAutoSetupTerminalId, canGroupStart } from './utils/autoSetupUtils';

const log = (...args) => console.log('[AutoSetup]', ...args);

/**
 * Hook for managing auto setup functionality
 */
export const useAutoSetup = ({
  verificationStatuses,
  generalVerificationConfig, 
  configSidebarAbout,
  showTestSections,
  onOpenFloatingTerminal,
  onCommandComplete,
  onVerificationRerun,
  showAppNotification
}) => {
  // Core state
  const [isAutoSetupVisible, setIsAutoSetupVisible] = useState(false);
  const [autoSetupStatus, setAutoSetupStatus] = useState(AUTO_SETUP_STATUS.IDLE);
  
  // Debug status changes
  useEffect(() => {
    console.log('Auto Setup: Status changed to:', autoSetupStatus);
  }, [autoSetupStatus]);
  const [commandGroups, setCommandGroups] = useState([]);
  const [commandStatuses, setCommandStatuses] = useState({});
  const [activeTerminals, setActiveTerminals] = useState(new Map());
  const [commandTimeouts, setCommandTimeouts] = useState(new Map()); // Track command timeouts
  
  // Debug activeTerminals changes and sync with ref
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`🟠 ACTIVE_TERMINALS: [${timestamp}] activeTerminals changed, size:`, activeTerminals.size, 'keys:', Array.from(activeTerminals.keys()));
    console.log('🟠 ACTIVE_TERMINALS: Full details:', Array.from(activeTerminals.entries()));
    activeTerminalsRef.current = activeTerminals;
  }, [activeTerminals]);
  
  // Refs for state management
  const currentGroupIndexRef = useRef(0);
  const abortControllerRef = useRef(null);
  const activeTerminalsRef = useRef(new Map());

  // Collect available fix commands when dependencies change
  useEffect(() => {
    if (isAutoSetupVisible && (autoSetupStatus === AUTO_SETUP_STATUS.IDLE || autoSetupStatus === AUTO_SETUP_STATUS.PREPARING)) {
      const groups = collectFixCommands(
        verificationStatuses,
        generalVerificationConfig,
        configSidebarAbout,
        showTestSections
      );
      setCommandGroups(groups);
      
      // Initialize command statuses - always reset when collecting new commands
      const initialStatuses = {};
      groups.forEach(group => {
        group.commands.forEach(cmd => {
          initialStatuses[cmd.id] = COMMAND_EXECUTION_STATUS.PENDING;
        });
      });
      setCommandStatuses(initialStatuses);
      
      // Set status to IDLE after preparing is complete
      if (autoSetupStatus === AUTO_SETUP_STATUS.PREPARING) {
        setAutoSetupStatus(AUTO_SETUP_STATUS.IDLE);
      }
    }
  }, [
    isAutoSetupVisible, 
    verificationStatuses, 
    generalVerificationConfig, 
    configSidebarAbout, 
    showTestSections,
    autoSetupStatus
  ]);

  // Handle terminal completion
  const handleTerminalComplete = useCallback((terminalId, status, exitCode) => {
    log('HANDLE_COMPLETE called:', { terminalId, status, exitCode });
    const terminal = activeTerminalsRef.current.get(terminalId);
    log('HANDLE_COMPLETE: terminal:', terminal);
    if (!terminal || !terminal.commandId) {
      log('HANDLE_COMPLETE: No terminal or commandId for terminalId:', terminalId);
      return;
    }
    const commandId = terminal.commandId;
    const newStatus = exitCode === 0 ? COMMAND_EXECUTION_STATUS.SUCCESS : (status === 'stopped' ? COMMAND_EXECUTION_STATUS.STOPPED : COMMAND_EXECUTION_STATUS.FAILED);
    log('HANDLE_COMPLETE: Setting status for command:', commandId, 'to', newStatus);
    setCommandStatuses(prev => ({ ...prev, [commandId]: newStatus }));
    setCommandTimeouts(prev => {
      const next = new Map(prev);
      if (next.has(commandId)) {
        clearTimeout(next.get(commandId).timeoutId);
        next.delete(commandId);
      }
      return next;
    });
    setActiveTerminals(prev => {
      const next = new Map(prev);
      next.delete(terminalId);
      return next;
    });
    if (onVerificationRerun && newStatus === COMMAND_EXECUTION_STATUS.SUCCESS) {
      log('HANDLE_COMPLETE: Re-running verification for:', commandId);
      onVerificationRerun(commandId);
    }
    if (onCommandComplete) {
      log('HANDLE_COMPLETE: Calling external completion handler for:', terminalId);
      onCommandComplete(terminalId, status, exitCode);
    }
  }, [onCommandComplete, onVerificationRerun]);

  // Monitor group completion and progress to next group
  useEffect(() => {
    if (autoSetupStatus !== AUTO_SETUP_STATUS.RUNNING) return;

    const currentGroupIndex = currentGroupIndexRef.current;
    if (currentGroupIndex >= commandGroups.length) {
      setAutoSetupStatus(AUTO_SETUP_STATUS.SUCCESS);
      showAppNotification?.('Auto Setup completed successfully!', 'success');
      return;
    }

    const currentGroup = commandGroups[currentGroupIndex];
    if (!currentGroup) return;

    const groupStatus = calculateGroupStatus(currentGroup.commands, commandStatuses);
    
    if (groupStatus === SECTION_STATUS.SUCCESS) {
      const nextGroupIndex = currentGroupIndex + 1;
      currentGroupIndexRef.current = nextGroupIndex;

      if (nextGroupIndex >= commandGroups.length) {
        setAutoSetupStatus(AUTO_SETUP_STATUS.SUCCESS);
        showAppNotification?.('Auto Setup completed successfully!', 'success');
      } else {
        const nextGroup = commandGroups[nextGroupIndex];
        log(`EXECUTE_NEXT_GROUP: Moving to group ${nextGroup.priority}`);
        nextGroup.commands.forEach(command => {
          log(`EXECUTE_NEXT_GROUP: Executing command ${command.id}`);
          executeCommand(command);
        });
      }
    } else if (groupStatus === SECTION_STATUS.FAILED) {
      setAutoSetupStatus(AUTO_SETUP_STATUS.FAILED);
      showAppNotification?.('Priority group failed. Use "Continue" to proceed to next group or "Stop" to end Auto Setup.', 'warning');
    }
  }, [commandStatuses, autoSetupStatus, commandGroups, showAppNotification]);

  // Execute a single command
  const executeCommand = useCallback((command) => {
    // Mark command as running
    setCommandStatuses(prev => ({
      ...prev,
      [command.id]: COMMAND_EXECUTION_STATUS.RUNNING
    }));

    // Set up 60-second timeout
    const timeoutId = setTimeout(() => {
      // Command timed out
      setCommandStatuses(prev => ({
        ...prev,
        [command.id]: COMMAND_EXECUTION_STATUS.TIMEOUT
      }));

      // Find and kill the terminal
      activeTerminalsRef.current.forEach((terminal, terminalId) => {
        if (terminal.commandId === command.id) {
          if (window.electron?.killProcess) {
            window.electron.killProcess({ terminalId });
          }
          // Remove from active terminals
          setActiveTerminals(prev => {
            const next = new Map(prev);
            next.delete(terminalId);
            return next;
          });
        }
      });

      // Clear timeout tracking
      setCommandTimeouts(prev => {
        const next = new Map(prev);
        next.delete(command.id);
        return next;
      });

      showAppNotification?.(
        `Command "${command.title}" timed out after 60 seconds.`,
        'warning'
      );
    }, 60000); // 60 seconds

    // Track timeout with countdown
    setCommandTimeouts(prev => {
      const next = new Map(prev);
      next.set(command.id, {
        timeoutId,
        startTime: Date.now(),
        duration: 60000
      });
      return next;
    });

    // Open the floating terminal with auto setup configuration
    if (onOpenFloatingTerminal) {
      const createdTerminalId = onOpenFloatingTerminal(
        command.id, // Use command.id as the commandId for proper linking
        `Auto Setup: ${command.title}`,
        command.fixCommand,
        {
          ...AUTO_SETUP_TERMINAL_CONFIG,
          isFixCommand: true,
          onCommandComplete: handleTerminalComplete
        }
      );
      
      // Track the terminal with the actual created ID
      setActiveTerminals(prev => {
        const next = new Map(prev);
        next.set(createdTerminalId, {
          commandId: command.id,
          command: command,
          startTime: Date.now()
        });
        return next;
      });
    }
  }, [onOpenFloatingTerminal, handleTerminalComplete, showAppNotification]);

  // Start auto setup
  const startAutoSetup = useCallback(() => {
    if (commandGroups.length === 0) {
      showAppNotification?.('No fix commands available to run.', 'info');
      return;
    }

    setAutoSetupStatus(AUTO_SETUP_STATUS.RUNNING);
    currentGroupIndexRef.current = 0;
    
    // Reset all command statuses
    const resetStatuses = {};
    commandGroups.forEach(group => {
      group.commands.forEach(cmd => {
        resetStatuses[cmd.id] = COMMAND_EXECUTION_STATUS.PENDING;
      });
    });
    setCommandStatuses(resetStatuses);
    setActiveTerminals(new Map());

    // Start executing the first group immediately with fresh data
    const firstGroup = commandGroups[0];
    if (firstGroup) {
      firstGroup.commands.forEach(command => {
        executeCommand(command);
      });
    }
    
    showAppNotification?.(`Auto Setup started with ${commandGroups.length} priority groups.`, 'info');
  }, [commandGroups, executeCommand, showAppNotification]);

  // Stop auto setup
  const stopAutoSetup = useCallback(() => {
    setAutoSetupStatus(AUTO_SETUP_STATUS.STOPPED);
    
    // Kill all active terminals
    activeTerminalsRef.current.forEach((terminal, terminalId) => {
      setCommandStatuses(prev => ({
        ...prev,
        [terminal.commandId]: COMMAND_EXECUTION_STATUS.STOPPED
      }));
      
      if (window.electron?.killProcess) {
        window.electron.killProcess({ terminalId });
      }
    });
    
    setActiveTerminals(new Map());
    showAppNotification?.('Auto Setup stopped by user.', 'warning');
  }, [showAppNotification]);

  // Start a specific priority group
  const startPriorityGroup = useCallback((group) => {
    if (autoSetupStatus === AUTO_SETUP_STATUS.RUNNING) {
      showAppNotification?.('Cannot start a new group while Auto Setup is running.', 'warning');
      return;
    }
    
    // Reset statuses for this group's commands
    const newStatuses = { ...commandStatuses };
    group.commands.forEach(cmd => {
      newStatuses[cmd.id] = COMMAND_EXECUTION_STATUS.PENDING;
    });
    setCommandStatuses(newStatuses);

    // Set auto setup to running and execute commands
    setAutoSetupStatus(AUTO_SETUP_STATUS.RUNNING);
    group.commands.forEach(command => {
      executeCommand(command);
    });
    showAppNotification?.(`Starting Priority ${group.priority}...`, 'info');
  }, [autoSetupStatus, commandStatuses, executeCommand, showAppNotification]);

  // Terminate a specific running command
  const terminateCommand = useCallback((command) => {
    log('TERMINATE button clicked for command:', command.id, command.title);
    const activeTerminal = Array.from(activeTerminalsRef.current.entries()).find(
      ([terminalId, terminal]) => terminal.commandId === command.id
    );
    log('TERMINATE: activeTerminal:', activeTerminal);
    if (activeTerminal) {
      const [terminalId, terminal] = activeTerminal;
      log('TERMINATE: Killing process for terminalId:', terminalId);
      if (window.electron?.killProcess) {
        window.electron.killProcess({ terminalId });
      }
      setCommandTimeouts(prev => {
        const next = new Map(prev);
        if (next.has(command.id)) {
          clearTimeout(next.get(command.id).timeoutId);
          next.delete(command.id);
        }
        return next;
      });
      // Dispatch custom event for FloatingTerminal
      log('TERMINATE: Dispatching autoSetupSimulation event for terminalId:', terminalId);
      const completionEvent = new CustomEvent('autoSetupSimulation', {
        detail: { terminalId, status: 'stopped', exitCode: 1 }
      });
      window.dispatchEvent(completionEvent);
      // Internal completion
      log('TERMINATE: Calling handleTerminalComplete for terminalId:', terminalId);
      handleTerminalComplete(terminalId, 'stopped', 1);
      setCommandStatuses(prev => ({ ...prev, [command.id]: COMMAND_EXECUTION_STATUS.STOPPED }));
      showAppNotification?.(`Command "${command.title}" terminated by user.`, 'info');
      log('TERMINATE: Done for command:', command.id);
    } else {
      log('TERMINATE: No active terminal found for command:', command.id);
    }
  }, [showAppNotification, handleTerminalComplete]);

  // Retry a specific command
  const retryCommand = useCallback((command) => {
    if (autoSetupStatus === AUTO_SETUP_STATUS.RUNNING) {
      showAppNotification?.('Cannot retry commands while auto setup is running.', 'warning');
      return;
    }

    executeCommand(command);
  }, [autoSetupStatus, executeCommand, showAppNotification]);

  // Open auto setup screen
  const openAutoSetup = useCallback(() => {
    setIsAutoSetupVisible(true);
    setAutoSetupStatus(AUTO_SETUP_STATUS.PREPARING);
  }, []);

  // Close auto setup screen
  const closeAutoSetup = useCallback(() => {
    if (autoSetupStatus === AUTO_SETUP_STATUS.RUNNING) {
      // Ask for confirmation before closing
      if (window.confirm('Auto Setup is currently running. Stop it and close?')) {
        stopAutoSetup();
        setIsAutoSetupVisible(false);
        setAutoSetupStatus(AUTO_SETUP_STATUS.IDLE);
      }
    } else {
      setIsAutoSetupVisible(false);
      setAutoSetupStatus(AUTO_SETUP_STATUS.IDLE);
    }
  }, [autoSetupStatus, stopAutoSetup]);

  // Calculate progress
  const progress = React.useMemo(() => {
    if (commandGroups.length === 0) return { completed: 0, total: 0, percentage: 0 };

    const totalCommands = commandGroups.reduce((acc, group) => acc + group.commands.length, 0);
    const completedCommands = Object.values(commandStatuses).filter(
      status => status === COMMAND_EXECUTION_STATUS.SUCCESS
    ).length;

    return {
      completed: completedCommands,
      total: totalCommands,
      percentage: totalCommands > 0 ? Math.round((completedCommands / totalCommands) * 100) : 0
    };
  }, [commandGroups, commandStatuses]);

  return {
    // State
    isAutoSetupVisible,
    autoSetupStatus,
    commandGroups,
    commandStatuses,
    activeTerminals,
    commandTimeouts,
    progress,
    
    // Actions
    openAutoSetup,
    closeAutoSetup,
    startAutoSetup,
    stopAutoSetup,
    startPriorityGroup,
    retryCommand,
    terminateCommand,
    handleTerminalComplete
  };
}; 