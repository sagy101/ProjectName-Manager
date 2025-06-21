import { useCallback, useEffect } from 'react';
import configSidebarAbout from '../project-config/config/configurationSidebarAbout.json';
import { loggers } from '../common/utils/debugUtils.js';

const logger = loggers.terminal;

// Constants for terminal and sidebar dimensions
const FLOATING_TERMINAL_AVG_WIDTH = 500; // Approximate width
const FLOATING_TERMINAL_AVG_HEIGHT = 300; // Approximate height
const SIDEBAR_EXPANDED_WIDTH = 280; // From app-control-sidebar.css
const SIDEBAR_COLLAPSED_WIDTH = 50; // From app-control-sidebar.css

export const useFloatingTerminals = ({
  floatingTerminals,
  setFloatingTerminals,
  activeFloatingTerminalId,
  setActiveFloatingTerminalId,
  nextZIndex,
  setNextZIndex,
  positionOffset,
  isFloatingSidebarExpanded,
  setIsFloatingSidebarExpanded,
  infoPanelState,
  setInfoPanelState,
  configState,
  noRunMode,
  settings,
  showAppNotification
}) => {
  // Define showFloatingTerminal first
  const showFloatingTerminal = useCallback((terminalId) => {
    logger.debug('showFloatingTerminal called with terminalId:', terminalId);
    
    const terminal = floatingTerminals.find(t => t.id === terminalId);
    logger.debug('showFloatingTerminal found terminal:', terminal);
    logger.debug('showFloatingTerminal isAutoSetup:', terminal?.isAutoSetup);
    
    setFloatingTerminals(prevTerminals => {
      return prevTerminals.map(t =>
        t.id === terminalId
          ? { 
              ...t, 
              isVisible: true, 
              isMinimized: false,
              // Use higher z-index for auto setup terminals to appear above AutoSetupScreen (z-index: 10000)
              zIndex: t.isAutoSetup ? 15000 : (t.zIndex || nextZIndex)
            }
          : t
      );
    });
    setActiveFloatingTerminalId(terminalId); // Set as active
    
    // Increment nextZIndex if we used it
    setNextZIndex(prevZ => prevZ + 1);
  }, [nextZIndex, setActiveFloatingTerminalId, setFloatingTerminals, setNextZIndex]); // Added dependencies

  // Define focusFloatingTerminal next
  const focusFloatingTerminal = useCallback((terminalId) => {
    setActiveFloatingTerminalId(terminalId);
    setFloatingTerminals(prevTerminals =>
      prevTerminals.map(t =>
        t.id === terminalId
          ? { 
              ...t, 
              // Preserve high z-index for auto setup terminals, use nextZIndex for others
              zIndex: t.isAutoSetup ? Math.max(15000, nextZIndex) : nextZIndex 
            }
          : t
      )
    );
    setNextZIndex(prevZ => prevZ + 1); // Increment for the next focus action
  }, [nextZIndex, setActiveFloatingTerminalId, setFloatingTerminals, setNextZIndex]); // Depends on nextZIndex

  // Now define openFloatingTerminal, which depends on the two above
  const openFloatingTerminal = useCallback((commandId, title, command, options = {}) => {
    // Support both old signature and new options object
    let actualOptions = {};
    if (typeof options === 'boolean') {
      // Old signature: openFloatingTerminal(commandId, title, command, isFixCommand)
      actualOptions = { isFixCommand: options };
    } else {
      // New signature: openFloatingTerminal(commandId, title, command, options)
      actualOptions = options;
    }
    
    const {
      isFixCommand = false,
      isAutoSetup = false,
      startMinimized = false,
      hideFromSidebar = false,
      onCommandComplete = null
    } = actualOptions;
    
    // Check for existing terminal first
    const existingTerminal = floatingTerminals.find(t => t.commandId === commandId && t.title === title);

      if (existingTerminal && !isFixCommand) {
        // If terminal exists and it's not a fix command, show and focus it.
      setFloatingTerminals(prevTerminals =>
        prevTerminals.map(t => 
            t.id === existingTerminal.id
            ? { ...t, isVisible: true, isMinimized: false, zIndex: nextZIndex } 
              : t
          )
        );
        setActiveFloatingTerminalId(existingTerminal.id);
        setNextZIndex(prevZ => prevZ + 1);
      return existingTerminal.id; // Return existing terminal ID
      }

    // Check maximum floating terminals limit
    const maxTerminals = settings?.maxFloatingTerminals || 10;
    if (floatingTerminals.length >= maxTerminals) {
      const warningMsg = `Maximum number of floating terminals reached (${maxTerminals}). Close some terminals to create new ones.`;
      logger.warn(`Cannot create more floating terminals. ${warningMsg}`);

      // Prefer React-level notification if callback provided
      if (typeof showAppNotification === 'function') {
        showAppNotification(warningMsg, 'warning');
      } else if (window.electron?.showNotification) {
        // Fallback to electron notification for older code paths
        window.electron.showNotification({
          message: warningMsg,
          type: 'warning'
        });
      }

      return null; // Cannot create new terminal
    }

    // Generate terminal ID for new terminal
    const newTerminalId = `ft-${Date.now()}-${commandId}`;

      // Calculate centered position for new terminals
      const sidebarCurrentWidth = isFloatingSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
      const availableWidth = window.innerWidth - sidebarCurrentWidth;
      
      let centeredX = (availableWidth - FLOATING_TERMINAL_AVG_WIDTH) / 2;
      // Ensure it's not positioned too far left or behind the sidebar
      centeredX = Math.max(10, centeredX);
 
      let centeredY = (window.innerHeight - FLOATING_TERMINAL_AVG_HEIGHT) / 2;
      centeredY = Math.max(10, centeredY);

      // Apply simple staggering for new terminals to avoid exact overlap
    const staggerOffset = (floatingTerminals.filter(t => t.isVisible).length % 5) * positionOffset; // Stagger based on visible terminals
      const finalX = centeredX + staggerOffset;
      const finalY = centeredY + staggerOffset;

      const newTerminal = {
        id: newTerminalId,
        commandId,
        title,
        command,
      isVisible: !startMinimized,
      isMinimized: startMinimized,
        position: { x: finalX, y: finalY }, // Use calculated and staggered position
        zIndex: nextZIndex,
        status: 'idle', // Track actual terminal status
        exitStatus: null,
        startTime: Date.now(),
        associatedContainers: [], // Initialize associated containers
      isFixCommand: isFixCommand || false, // Track if this is a fix command terminal
      isAutoSetup: isAutoSetup || false, // Track if this is an auto setup terminal
      hideFromSidebar: hideFromSidebar || false, // Whether to hide from sidebar
      onCommandComplete: onCommandComplete // Callback for command completion
      };
    
    setFloatingTerminals(prevTerminals => [...prevTerminals, newTerminal]);
      setNextZIndex(prevZ => prevZ + 1);
      setActiveFloatingTerminalId(newTerminalId);
    
    return newTerminalId; // Return the terminal ID
  }, [floatingTerminals, nextZIndex, positionOffset, isFloatingSidebarExpanded, setFloatingTerminals, setActiveFloatingTerminalId, setNextZIndex, showAppNotification]); // Added floatingTerminals dependency

  const closeFloatingTerminal = useCallback((terminalId) => {
    setFloatingTerminals(prevTerminals =>
      prevTerminals.filter(t => t.id !== terminalId)
    );
    if (activeFloatingTerminalId === terminalId) {
      setActiveFloatingTerminalId(null);
    }
  }, [activeFloatingTerminalId, setFloatingTerminals, setActiveFloatingTerminalId]);

  const toggleMinimizeFloatingTerminal = useCallback((terminalId) => {
    setFloatingTerminals(prevTerminals =>
      prevTerminals.map(t =>
        t.id === terminalId
          ? { ...t, isMinimized: !t.isMinimized, isVisible: t.isMinimized } // If un-minimizing, make visible
          : t
      )
    );
  }, [setFloatingTerminals]);

  const hideFloatingTerminal = useCallback((terminalId) => {
    setFloatingTerminals(prevTerminals =>
      prevTerminals.map(t =>
        t.id === terminalId
          ? { ...t, isVisible: false }
          : t
      )
    );
  }, [setFloatingTerminals]);

  // Manages showing the TabInfoPanel for floating terminals
  const showFloatingTerminalInfoPanel = useCallback((terminalId) => {
    const existingTerminal = floatingTerminals.find(t => t.id === terminalId);
    if (!existingTerminal) {
      logger.warn(`showFloatingTerminalInfoPanel: Terminal not found for ID: ${terminalId}`);
      return;
    }

    const aboutConfig = configSidebarAbout.find(info => info.sectionId === existingTerminal.commandId);
    const description = aboutConfig?.description || "No specific description available.";
    // const verifications = aboutConfig?.verifications || []; // Not directly used by TabInfoPanel yet

    let commandWithDetails = existingTerminal.command;
    if (description) {
      commandWithDetails = `About: ${description}\n\nCommand:\n${existingTerminal.command}`;
    }

    const terminalDataForPanel = {
      id: existingTerminal.id,
      title: existingTerminal.title,
      command: commandWithDetails,
      originalCommand: existingTerminal.command,
      status: existingTerminal.status || 'idle', // Use actual terminal status
      exitStatus: existingTerminal.exitStatus || null,
      sectionId: existingTerminal.commandId,
      startTime: existingTerminal.startTime || parseInt(existingTerminal.id.split('-')[1], 10) || Date.now(),
      associatedContainers: existingTerminal.associatedContainers || [],
    };

    const panelX = window.innerWidth - SIDEBAR_EXPANDED_WIDTH - 420;
    const panelY = 100;

    setInfoPanelState({
      isVisible: true,
      terminalData: terminalDataForPanel,
      position: { x: Math.max(10, panelX), y: panelY },
      detailsOpen: false
    });
  }, [floatingTerminals, configState, noRunMode, setInfoPanelState]);

  const closeFloatingTerminalInfoPanel = useCallback(() => {
    setInfoPanelState(prev => ({ ...prev, isVisible: false, detailsOpen: false }));
  }, [setInfoPanelState]);

  const openInfoPanelDetails = useCallback(() => {
    setInfoPanelState(prev => ({ ...prev, detailsOpen: true }));
  }, [setInfoPanelState]);

  const closeInfoPanelDetails = useCallback(() => {
    setInfoPanelState(prev => ({ ...prev, detailsOpen: false }));
  }, [setInfoPanelState]);

  // Specific function for opening fix command terminals
  const openFixCommandTerminal = useCallback((verificationId, verificationTitle, fixCommand) => {
    const title = `Fix: ${verificationTitle}`;
    return openFloatingTerminal(verificationId, title, fixCommand, true);
  }, [openFloatingTerminal]);

  const toggleFloatingSidebarExpand = useCallback((expandedState) => {
    // If an explicit state is passed (true/false), use it. Otherwise, toggle.
    if (typeof expandedState === 'boolean') {
      setIsFloatingSidebarExpanded(expandedState);
    } else {
      setIsFloatingSidebarExpanded(prev => !prev);
    }
  }, [setIsFloatingSidebarExpanded]);

  // Add IPC listeners for floating terminal status updates
  useEffect(() => {
    if (!window.electron) return;

    // Command started listener
    const removeCommandStarted = window.electron.onCommandStarted && window.electron.onCommandStarted(({ terminalId }) => {
      setFloatingTerminals(prev => 
        prev.map(t => 
          t.id === terminalId ? { ...t, status: 'running' } : t
        )
      );
    });

    // Command finished listener
    const removeCommandFinished = window.electron.onCommandFinished && window.electron.onCommandFinished(({ terminalId, exitCode, status, exitStatus }) => {
      setFloatingTerminals(prev => 
        prev.map(t => 
          t.id === terminalId 
            ? { 
                ...t, 
                status: status || 'done', 
                exitStatus: exitStatus || 'Command completed',
                exitCode 
              } 
            : t
        )
      );
    });

    // Process ended listener
    const removeProcessEnded = window.electron.onProcessEnded && window.electron.onProcessEnded(({ terminalId, code, signal }) => {
      setFloatingTerminals(prev => 
        prev.map(t => {
          if (t.id === terminalId) {
            let status = 'done';
            let exitStatus = 'Exited successfully';

            if (signal) {
              status = 'stopped';
              exitStatus = `Terminated by signal ${signal}`;
            } else if (code !== 0) {
              status = 'error';
              exitStatus = `Exited with error code ${code}`;
            }

            return { ...t, status, exitStatus };
          }
          return t;
        })
      );
    });

    // Command status update listener (for real-time status)
    const removeCommandStatusUpdate = window.electron.onCommandStatusUpdate && window.electron.onCommandStatusUpdate(({ terminalId, overallStatus, statusDescription, processStates, processCount }) => {
      setFloatingTerminals(prev => 
        prev.map(t => 
          t.id === terminalId 
            ? { 
                ...t, 
                status: overallStatus,
                exitStatus: statusDescription,
                processStates,
                processCount
              } 
            : t
        )
      );
    });

    // Cleanup
    return () => {
      removeCommandStarted && removeCommandStarted();
      removeCommandFinished && removeCommandFinished();
      removeProcessEnded && removeProcessEnded();
      removeCommandStatusUpdate && removeCommandStatusUpdate();
    };
  }, [setFloatingTerminals]);

  return {
    showFloatingTerminal,
    focusFloatingTerminal,
    openFloatingTerminal,
    closeFloatingTerminal,
    toggleMinimizeFloatingTerminal,
    hideFloatingTerminal,
    showFloatingTerminalInfoPanel,
    closeFloatingTerminalInfoPanel,
    openInfoPanelDetails,
    closeInfoPanelDetails,
    openFixCommandTerminal,
    toggleFloatingSidebarExpand
  };
}; 