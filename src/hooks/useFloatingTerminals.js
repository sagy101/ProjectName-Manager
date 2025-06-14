import { useCallback } from 'react';
import configSidebarAbout from '../configurationSidebarAbout.json';

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
  noRunMode
}) => {
  // Define showFloatingTerminal first
  const showFloatingTerminal = useCallback((terminalId) => {
    setFloatingTerminals(prevTerminals =>
      prevTerminals.map(t =>
        t.id === terminalId
          ? { ...t, isVisible: true, isMinimized: false }
          : t
      )
    );
    setActiveFloatingTerminalId(terminalId); // Set as active
  }, []); // Ensure its own dependencies are correct (empty if none from App scope)

  // Define focusFloatingTerminal next
  const focusFloatingTerminal = useCallback((terminalId) => {
    setActiveFloatingTerminalId(terminalId);
    setFloatingTerminals(prevTerminals =>
      prevTerminals.map(t =>
        t.id === terminalId
          ? { ...t, zIndex: nextZIndex } // Bring to front
          : t
      )
    );
    setNextZIndex(prevZ => prevZ + 1); // Increment for the next focus action
  }, [nextZIndex, setActiveFloatingTerminalId, setFloatingTerminals, setNextZIndex]); // Depends on nextZIndex

  // Now define openFloatingTerminal, which depends on the two above
  const openFloatingTerminal = useCallback((commandId, title, command) => {
    setFloatingTerminals(prevTerminals => {
      const newTerminalId = `ft-${Date.now()}-${commandId}`;
      const existingTerminal = prevTerminals.find(t => t.commandId === commandId && t.title === title);

      if (existingTerminal) {
        // If terminal exists, show and focus it.
        // If it was minimized, ensure it un-minimizes and becomes visible.
        setFloatingTerminals(currentTerminals =>
          currentTerminals.map(t =>
            t.id === existingTerminal.id
              ? { ...t, isVisible: true, isMinimized: false, zIndex: nextZIndex } // Bring to front, ensure visible & not minimized
              : t
          )
        );
        setActiveFloatingTerminalId(existingTerminal.id);
        setNextZIndex(prevZ => prevZ + 1);
        return prevTerminals.map(t => t.id === existingTerminal.id ? { ...t, isVisible: true, isMinimized: false } : t); // This return might be redundant due to setFloatingTerminals above
      }

      // Calculate centered position for new terminals
      const sidebarCurrentWidth = isFloatingSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
      const availableWidth = window.innerWidth - sidebarCurrentWidth;
      
      let centeredX = (availableWidth - FLOATING_TERMINAL_AVG_WIDTH) / 2;
      // Ensure it's not positioned too far left or behind the sidebar
      centeredX = Math.max(10, centeredX);
 
      let centeredY = (window.innerHeight - FLOATING_TERMINAL_AVG_HEIGHT) / 2;
      centeredY = Math.max(10, centeredY);

      // Apply simple staggering for new terminals to avoid exact overlap
      const staggerOffset = (prevTerminals.filter(t => t.isVisible).length % 5) * positionOffset; // Stagger based on visible terminals
      const finalX = centeredX + staggerOffset;
      const finalY = centeredY + staggerOffset;

      const newTerminal = {
        id: newTerminalId,
        commandId,
        title,
        command,
        isVisible: true,
        isMinimized: false,
        position: { x: finalX, y: finalY }, // Use calculated and staggered position
        zIndex: nextZIndex
      };
      setNextZIndex(prevZ => prevZ + 1);
      setActiveFloatingTerminalId(newTerminalId);
      return [...prevTerminals, newTerminal];
    });
  }, [nextZIndex, focusFloatingTerminal, showFloatingTerminal, positionOffset, isFloatingSidebarExpanded, setFloatingTerminals, setActiveFloatingTerminalId, setNextZIndex]); // Added isFloatingSidebarExpanded

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
    const terminal = floatingTerminals.find(t => t.id === terminalId);
    if (!terminal) {
      console.warn(`showFloatingTerminalInfoPanel: Terminal not found for ID: ${terminalId}`);
      return;
    }

    const aboutConfig = configSidebarAbout.find(info => info.sectionId === terminal.commandId);
    const description = aboutConfig?.description || "No specific description available.";
    // const verifications = aboutConfig?.verifications || []; // Not directly used by TabInfoPanel yet

    let commandWithDetails = terminal.command;
    if (description) {
      commandWithDetails = `About: ${description}\n\nCommand:\n${terminal.command}`;
    }

    const terminalDataForPanel = {
      id: terminal.id,
      title: terminal.title,
      command: commandWithDetails,
      originalCommand: terminal.command,
      status: terminal.isMinimized ? 'minimized' : (terminal.isVisible ? 'active' : 'hidden'),
      sectionId: terminal.commandId,
      startTime: parseInt(terminal.id.split('-')[1], 10) || Date.now(),
      associatedContainers: [],
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

  const toggleFloatingSidebarExpand = useCallback((expandedState) => {
    // If an explicit state is passed (true/false), use it. Otherwise, toggle.
    if (typeof expandedState === 'boolean') {
      setIsFloatingSidebarExpanded(expandedState);
    } else {
      setIsFloatingSidebarExpanded(prev => !prev);
    }
  }, [setIsFloatingSidebarExpanded]);

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
    toggleFloatingSidebarExpand
  };
}; 