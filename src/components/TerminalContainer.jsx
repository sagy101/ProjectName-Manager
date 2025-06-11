import React, { useState, useEffect, useRef } from 'react';
import TerminalTab from './TerminalTab';
import TerminalComponent from './Terminal';
import TabInfoPanel from './TabInfoPanel';
import TerminalPlaceholder from './TerminalPlaceholder';
import OverflowTabsDropdown from './OverflowTabsDropdown';
import '@xterm/xterm/css/xterm.css';
import configSidebarCommands from '../configurationSidebarCommands.json';

const TerminalContainer = React.forwardRef(({ noRunMode, configState, projectName, isReadOnly }, ref) => {
  const [terminals, setTerminals] = useState([]);
  const [activeTerminalId, setActiveTerminalId] = useState(null);
  const [overflowTabsOpen, setOverflowTabsOpen] = useState(false);
  const [visibleTabs, setVisibleTabs] = useState([]);
  const [overflowTabs, setOverflowTabs] = useState([]);
  const [tabInfoPanel, setTabInfoPanel] = useState(null);
  const [detailsPopup, setDetailsPopup] = useState({ open: false, terminalId: null });
  const cleanupFunctions = useRef([]);
  const tabsContainerRef = useRef(null);
  // Use a ref to track if we've already set up IPC listeners
  const ipcListenersSet = useRef(false);
  
  // Set up a direct listener for command outputs
  useEffect(() => {
    // This effect sets up a direct link to IPC events
    const directCommandOutputHandler = (event) => {
      try {
        const data = JSON.parse(event.detail);
        const { stdout, stderr, terminalId } = data;
        
        if (window.terminals && window.terminals[terminalId]) {
          // Write directly to the output area
          if (stdout) {
            window.terminals[terminalId].write(stdout);
          }
          if (stderr) {
            window.terminals[terminalId].write(stderr, true);
          }
        }
      } catch (error) {
        console.error('Error handling direct command output:', error);
      }
    };
    
    // Add the direct event listener
    window.addEventListener('direct-command-output', directCommandOutputHandler);
    
    return () => {
      window.removeEventListener('direct-command-output', directCommandOutputHandler);
    };
  }, []);

  // Setup a bridge between Electron IPC and direct events
  useEffect(() => {
    if (window.electron) {
      // Create a bridge function that converts IPC events to DOM events
      const bridgeFunction = (data) => {
        // Convert the data to a custom event
        const event = new CustomEvent('direct-command-output', {
          detail: JSON.stringify(data)
        });
        // Dispatch the event to be caught by our direct listener
        window.dispatchEvent(event);
      };
      
      // Register the bridge with the IPC handler
      const removeCommandOutput = window.electron.onCommandOutput(bridgeFunction);
      
      // If available, also set a direct handler for extra reliability
      let removeDirectHandler = null;
      if (window.electron.setDirectOutputHandler) {
        removeDirectHandler = window.electron.setDirectOutputHandler((data) => {
          const { terminalId, stdout, stderr } = data;
          
          // Try to write directly to the terminal if it exists
          if (window.terminals && window.terminals[terminalId]) {
            if (stdout) {
              window.terminals[terminalId].write(stdout);
            }
            if (stderr) {
              window.terminals[terminalId].write(stderr, true);
            }
          }
        });
      }
      
      // Store for cleanup
      cleanupFunctions.current.push(removeCommandOutput);
      if (removeDirectHandler) {
        cleanupFunctions.current.push(removeDirectHandler);
      }
      
      return () => {
        // Clean up the bridge
        if (removeCommandOutput) removeCommandOutput();
        if (removeDirectHandler) removeDirectHandler();
      };
    }
  }, []);

  // Create a standalone function for tab recalculation
  const recalculateVisibleTabs = React.useCallback(() => {
    if (!tabsContainerRef.current) return;
    
    // Initialize with current tabs state
    setVisibleTabs(terminals);
    setOverflowTabs([]);
    
    // We need to wait for DOM to update before measuring
    setTimeout(() => {
      if (!tabsContainerRef.current) return;
      
      const containerWidth = tabsContainerRef.current.clientWidth;
      const tabElements = Array.from(tabsContainerRef.current.querySelectorAll('.tab:not(.overflow-indicator)'));
      
      let width = 0;
      let visibleCount = 0;
      
      // Reserve 40px for the overflow indicator button
      const maxWidth = containerWidth - 40;
      
      for (const tab of tabElements) {
        width += tab.offsetWidth;
        if (width <= maxWidth) {
          visibleCount++;
        } else {
          break;
        }
      }
      
      // If all tabs fit, don't show overflow indicator
      if (visibleCount >= terminals.length) {
        setVisibleTabs(terminals);
        setOverflowTabs([]);
      } else {
        // Make sure active tab is visible if possible
        const activeTabIndex = terminals.findIndex(t => t.id === activeTerminalId);
        
        // If active tab would be hidden, adjust visible tabs
        if (activeTabIndex >= visibleCount) {
          // Show at least the active tab and then as many as will fit
          const newVisibleTabs = [
            terminals[activeTabIndex],
            ...terminals.slice(0, activeTabIndex).slice(0, visibleCount - 1)
          ];
          const newOverflowTabs = [
            ...terminals.slice(0, activeTabIndex).slice(visibleCount - 1),
            ...terminals.slice(activeTabIndex + 1)
          ];
          
          setVisibleTabs(newVisibleTabs);
          setOverflowTabs(newOverflowTabs);
        } else {
          // Normal case: show first N tabs
          const newVisibleTabs = terminals.slice(0, visibleCount);
          const newOverflowTabs = terminals.slice(visibleCount);
          
          setVisibleTabs(newVisibleTabs);
          setOverflowTabs(newOverflowTabs);
        }
      }
    }, 0);
  }, [terminals, activeTerminalId]);

  // Initialize visible tabs with all terminals on first render
  useEffect(() => {
    setVisibleTabs(terminals);
  }, []);

  // Handle tab visibility management
  useEffect(() => {
    // Calculate initially and on window resize
    recalculateVisibleTabs();
    
    const handleResize = () => recalculateVisibleTabs();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [terminals, activeTerminalId, recalculateVisibleTabs]);

  // Initialize the global terminal manager
  useEffect(() => {
    // Create window.terminalManager to be compatible with existing code
    window.terminalManager = {
      writeToTerminal: (terminalId, text, isError = false) => {
        if (window.terminals && window.terminals[terminalId]) {
          window.terminals[terminalId].write(text, isError);
          return true;
        }
        return false;
      },
      getActiveTerminalId: () => activeTerminalId,
      setActiveTerminalId: (id) => setActiveTerminalId(id),
      createTerminal: (terminalId) => {
        // This will be handled by the React component system now
        setTerminals(prev => {
          // Check if terminal already exists
          if (prev.find(t => t.id === terminalId)) {
            return prev;
          }
          return [...prev, {
            id: terminalId,
            title: `Output ${terminalId}`,
            status: 'idle'
          }];
        });
        return true;
      }
    };

    // Setup command execution handling
    window.runInTerminal = (command, newTab = true) => {
      let terminalId = activeTerminalId;
      
      if (newTab) {
        terminalId = Date.now();
        
        setTerminals(prev => [
          ...prev,
          {
            id: terminalId,
            title: `Run ${new Date().toLocaleTimeString()}`,
            status: 'idle'
          }
        ]);
        
        // Need to wait for the terminal to be created
        setTimeout(() => {
          setActiveTerminalId(terminalId);
          
          // Update status to running
          updateTerminalStatus(terminalId, 'running');
          
          // Execute the command
          executeCommand(command, terminalId);
        }, 100);
      } else {
        // Use existing tab
        updateTerminalStatus(terminalId, 'running');
        executeCommand(command, terminalId);
      }
      
      return terminalId;
    };

    // Helper function to execute commands
    const executeCommand = (command, terminalId) => {
      if (window.electron) {
        // New: ptySpawn will be called by TerminalComponent when it mounts with initialCommand
        // For now, we just need to ensure the command is available to TerminalComponent
        // We can update the terminal state to include the command if it's not already there.
        setTerminals(prev => 
          prev.map(t => t.id === terminalId ? { ...t, command: command, originalCommand: command, status: 'pending_spawn' } : t)
        );
        return true;
      }
      return false;
    };

    // Update terminal status
    const updateTerminalStatus = (terminalId, status) => {
      setTerminals(prev => 
        prev.map(terminal => 
          terminal.id === terminalId 
            ? { ...terminal, status } 
            : terminal
        )
      );
    };

    // Only set up IPC listeners once
    if (!ipcListenersSet.current && window.electron) {
      // Clean up any previous listeners
      if (cleanupFunctions.current.length > 0) {
        cleanupFunctions.current.forEach(cleanup => cleanup());
        cleanupFunctions.current = [];
      }
      
      // Sets up IPC communication for command output - THIS WILL BE HANDLED BY TerminalComponent NOW
      // const removeCommandOutput = window.electron.onCommandOutput((data) => { ... });
      // cleanupFunctions.current = [removeCommandOutput, ...];
      // ipcListenersSet.current = true; // This whole block can be simplified or removed if TerminalComponent handles its own IPC
    }
    
    // Return cleanup function
    return () => {
      // Clean up IPC listeners when component unmounts
      if (cleanupFunctions.current.length > 0) {
        cleanupFunctions.current.forEach(cleanup => cleanup());
        cleanupFunctions.current = [];
      }
    };
  }, [activeTerminalId]);

  const toggleOverflowTabs = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setOverflowTabsOpen(prev => !prev);
  };

  // Close overflow tabs when clicking outside
  useEffect(() => {
    if (!overflowTabsOpen) return;
    
    const handleClickOutside = (e) => {
      const overflowButton = tabsContainerRef.current?.querySelector('.overflow-indicator');
      const dropdownEl = document.querySelector('[data-testid="overflow-dropdown"]');
      const tabInfoPanelEl = document.querySelector('.tab-info-panel');
      const commandPopupEl = document.querySelector('.command-popup-overlay');

      const clickedOnKeeperElement = 
        (overflowButton && overflowButton.contains(e.target)) ||
        (dropdownEl && dropdownEl.contains(e.target)) ||
        (tabInfoPanelEl && tabInfoPanelEl.contains(e.target)) ||
        (commandPopupEl && commandPopupEl.contains(e.target));

      if (!clickedOnKeeperElement) {
        setOverflowTabsOpen(false);
      }
    };
    
    const timerId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timerId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [overflowTabsOpen]);

  // Handle tab selection
  const handleSelectTab = (terminalId) => {
    setActiveTerminalId(terminalId);
    setOverflowTabsOpen(false);
    
    // Move the selected tab to the beginning of the visible tabs
    if (overflowTabs.find(t => t.id === terminalId)) {
      const selectedTab = terminals.find(t => t.id === terminalId);
      const otherTabs = terminals.filter(t => t.id !== terminalId);
      
      setTerminals([selectedTab, ...otherTabs]);
      // Tab order will be recalculated due to dependency on terminals
    }
  };

  // Handle tab info panel
  const handleShowTabInfo = (terminalId, event) => {
    const terminal = terminals.find(t => t.id === terminalId);
    if (!terminal) return;

    // Get position from the tab element or event
    let position = { x: 100, y: 100 }; // Default fallback
    const tabElement = document.querySelector(`.tab[data-tab-id="${terminalId}"]`);

    if (tabElement) {
      // Regular tab in the tab bar
      const rect = tabElement.getBoundingClientRect();
      position = {
        x: rect.left, // Align with the left of the tab
        y: rect.bottom + 5 // Position 5px below the tab
      };
    } else if (event && event.currentTarget) {
      // Overflow tab - position relative to the button that was clicked
      const iconRect = event.currentTarget.getBoundingClientRect();
      
      // Calculate position to avoid clipping
      let x = iconRect.left;
      let y = iconRect.bottom + 10;
      
      // Adjust if panel would go off screen
      const panelWidth = 300; // Approximate panel width
      const panelHeight = 250; // Approximate panel height
      
      // Check right edge
      if (x + panelWidth > window.innerWidth) {
        x = window.innerWidth - panelWidth - 10;
      }
      
      // Check bottom edge
      if (y + panelHeight > window.innerHeight) {
        y = iconRect.top - panelHeight - 10;
      }
      
      // Ensure minimum margins
      x = Math.max(10, x);
      y = Math.max(10, y);
      
      position = { x, y };
    }

    setTabInfoPanel({
      terminal,
      position
    });
  };

  const handleCloseTabInfo = () => {
    setTabInfoPanel(null);
  };

  const handleOpenDetailsPopup = () => {
    if (tabInfoPanel && tabInfoPanel.terminal) {
      setDetailsPopup({ open: true, terminalId: tabInfoPanel.terminal.id });
    }
  };

  const handleCloseDetailsPopup = () => {
    setDetailsPopup({ open: false, terminalId: null });
  };

  // Helper function to evaluate conditions from command config
  const evaluateCommandCondition = (condition, currentConfigState, sectionId) => {
    if (condition === undefined) {
      return true; // If condition is not present, treat as true (unconditional)
    }
    if (typeof condition !== 'string' || !currentConfigState) {
      console.warn('Invalid or missing condition string for refresh command, evaluating as false.', { condition, sectionId });
      return false; // Condition must be a string, or config state is missing
    }
    // Explicitly handle "true" as a string for robustness, though the Function constructor would also work.
    if (condition.trim().toLowerCase() === 'true') {
      return true;
    }
    // Explicitly handle "false" as a string.
    if (condition.trim().toLowerCase() === 'false') {
      return false;
    }

    try {
      const context = {
        ...currentConfigState[sectionId],
        attachState: currentConfigState.attachState || {},
        // Add other relevant parts of configState if needed by conditions
      };
      // Ensure the condition is a valid expression to be returned
      const func = new Function(...Object.keys(context), `return (${condition});`);
      return !!func(...Object.values(context)); // Coerce to boolean
    } catch (e) {
      console.error('Error evaluating refresh condition:', condition, e);
      return false;
    }
  };

  // Handle tab refresh (re-run command with potential modifications)
  const handleRefreshTab = async (terminalId) => {
    const terminal = terminals.find(t => t.id === terminalId);
    if (!terminal) return;

    // First, stop any associated containers if needed
    if (terminal.associatedContainers && terminal.associatedContainers.length > 0) {
      const containersToStop = terminal.associatedContainers.filter(c => c && typeof c === 'string'); // Filter out undefined/null and non-strings
      await window.electron.stopContainers(containersToStop);
    }

    let commandToRun = terminal.originalCommand || terminal.command;
    const { commandDefinitionId, sectionId } = terminal;

    if (commandDefinitionId !== undefined && configSidebarCommands[commandDefinitionId]) {
      const commandDef = configSidebarCommands[commandDefinitionId];
      if (commandDef.command && commandDef.command.refreshConfig) {
        const { refreshConfig } = commandDef.command;
        let prependedString = '';
        let appendedString = '';

        if (refreshConfig.prependCommands) {
          refreshConfig.prependCommands.forEach(pc => {
            if (evaluateCommandCondition(pc.condition, configState, sectionId)) {
              prependedString += pc.command;
            }
          });
        }
        if (refreshConfig.appendCommands) {
          refreshConfig.appendCommands.forEach(ac => {
            if (evaluateCommandCondition(ac.condition, configState, sectionId)) {
              appendedString += ac.command;
            }
          });
        }
        commandToRun = prependedString + commandToRun + appendedString;
      }
    }

    if (window.electron) {
      window.electron.killProcess(terminalId);
    }

    setTerminals(prev => 
      prev.map(t => 
        t.id === terminalId 
          ? { ...t, status: 'pending_spawn', command: commandToRun, refreshCount: (t.refreshCount || 0) + 1 } 
          : t
      )
    );
  };

  // Handle tab close
  const handleCloseTab = async (terminalId) => {
    const terminalToClose = terminals.find(t => t.id === terminalId);
    if (!terminalToClose) return;

    // Stop associated containers
    if (terminalToClose.associatedContainers && terminalToClose.associatedContainers.length > 0) {
      if (window.electron && window.electron.stopContainers) {
        console.log(`Closing tab ${terminalId}, stopping containers:`, terminalToClose.associatedContainers);
        const containersToStop = terminalToClose.associatedContainers.filter(c => c && typeof c === 'string'); // Filter out undefined/null and non-strings
        await window.electron.stopContainers(containersToStop);
      }
    }
    
    if (window.electron && window.electron.killProcess) {
        window.electron.killProcess(terminalId); // Ensure PTY process is killed
    }

    if (terminals.length <= 1 && terminalId === activeTerminalId) {
       setTerminals([]);
       setActiveTerminalId(null);
    } else {
      if (terminalId === activeTerminalId) {
        // If we're closing the active tab, select another tab
        const currentIndex = terminals.findIndex(t => t.id === terminalId);
        const newIndex = currentIndex === 0 ? (terminals.length > 1 ? 1 : -1) : currentIndex - 1;
        if (newIndex !== -1 && terminals[newIndex]) {
          setActiveTerminalId(terminals[newIndex].id);
        } else {
          setActiveTerminalId(null);
        }
      }
      setTerminals(prev => prev.filter(terminal => terminal.id !== terminalId));
    }
    
    // Close info panel if it's for this tab
    if (tabInfoPanel?.terminal.id === terminalId) {
      setTabInfoPanel(null);
    }
  };

  // Expose a method to open multiple tabs with custom titles and commands
  React.useImperativeHandle(ref, () => ({
    openTabs: (tabConfigs) => {
      setTerminals([]); // Clear any existing tabs
      let firstId = null;
      const newTerminals = tabConfigs.map((tab, idx) => {
        const terminalId = Date.now() + idx;
        if (idx === 0) firstId = terminalId;

        if (tab.type === 'error') {
          return {
            id: terminalId,
            title: tab.title || tab.section, // Use tab.title if available, else tab.section
            status: 'error', // General status indicating an error state
            errorType: 'config', // Specific type of error
            errorMessage: tab.message, // The error message from the tab config
            sectionId: tab.sectionId,
            command: undefined, // No command to execute
            originalCommand: undefined,
            associatedContainers: [],
            isSubSectionCommand: tab.isSubSectionCommand || false, // Default or from tab
            refreshConfig: undefined,
            refreshCount: 0,
            commandDefinitionId: tab.commandDefinitionId, // Keep if available, though not used for execution
          };
        } else {
          return {
            id: terminalId,
            title: tab.title || tab.section, // Use tab.title if available, else tab.section for consistency
            status: 'idle',
            command: tab.command,
            originalCommand: tab.command, // Store the initial command
            sectionId: tab.sectionId, // Pass from IsoConfig
            commandDefinitionId: tab.commandDefinitionId, // Pass from IsoConfig
            associatedContainers: tab.associatedContainers || [], // Store associated containers
            isSubSectionCommand: tab.isSubSectionCommand || false, // Default or from tab
            refreshConfig: tab.refreshConfig, // Pass refresh config from IsoConfig
            refreshCount: 0
          };
        }
      });
      
      setTerminals(newTerminals);
      if (firstId) setActiveTerminalId(firstId);
    },
    clearTabs: () => {
      console.log('TerminalContainer: clearTabs called');
      setTerminals([]);
      setActiveTerminalId(null);
      setTabInfoPanel(null); // Close info panel as well
      setDetailsPopup({ open: false, terminalId: null }); // Close details popup
    },
    getTerminals: () => terminals, // Expose current terminals
    killAllTerminals: async () => {
      console.log('TerminalContainer: killAllTerminals called for', terminals.length, 'terminals');
      // First, collect all unique containers to stop them efficiently
      const allContainersToStop = new Set();
      terminals.forEach(terminal => {
        if (terminal.associatedContainers) {
          terminal.associatedContainers.forEach(container => {
            if (container && typeof container === 'string') { // Only add valid string containers
              allContainersToStop.add(container);
            }
          });
        }
      });

      if (allContainersToStop.size > 0) {
        console.log('TerminalContainer: Stopping all associated containers:', Array.from(allContainersToStop));
        if (window.electron && window.electron.stopContainers) {
          try {
            await window.electron.stopContainers(Array.from(allContainersToStop));
          } catch (error) {
            console.error('Error stopping containers during killAllTerminals:', error);
          }
        }
      }

      // Then, kill all PTY processes
      terminals.forEach(terminal => {
        if (window.electron && window.electron.killProcess) {
          console.log('TerminalContainer: Killing PTY for terminal', terminal.id);
          window.electron.killProcess(terminal.id);
        }
      });

      // Finally, clear the terminals from the UI (this will be done by stopIsoExecution calling clearTabs)
      // No need to call setTerminals([]) here directly, as stopIsoExecution handles it via clearTabs
      console.log('TerminalContainer: All PTYs killed and containers signaled to stop.');
    },
    stopAllContainers: async () => {
      // This function remains largely the same, but killAllTerminals will be more comprehensive
      console.log('TerminalContainer: stopAllContainers (explicit) called');
      const allContainers = new Set();
      terminals.forEach(terminal => {
        if (terminal.associatedContainers) {
          terminal.associatedContainers.forEach(container => {
            if (container && typeof container === 'string') { // Only add valid string containers
              allContainers.add(container);
            }
          });
        }
      });
      
      if (allContainers.size > 0) {
        const containerArray = Array.from(allContainers);
        console.log(`Stopping ${containerArray.length} containers (explicitly):`, containerArray);
        if (window.electron && window.electron.stopContainers) {
          await window.electron.stopContainers(containerArray);
        }
      }
    }
  }), [terminals]); // Add terminals to dependency array to ensure killAllTerminals has current scope

  return (
    <div className="terminal-main-container">
      <div className="tabs" id="tabs" ref={tabsContainerRef}>
        {visibleTabs.map(terminal => (
          <TerminalTab
            key={terminal.id}
            id={terminal.id}
            title={terminal.title}
            status={terminal.status}
            active={terminal.id === activeTerminalId}
            onSelect={handleSelectTab}
            onClose={handleCloseTab}
            onInfo={(id) => handleShowTabInfo(id)}
            isError={terminal.status === 'error' && terminal.errorType === 'config'}
          />
        ))}
        
        {overflowTabs.length > 0 && (
          <div 
            className="tab overflow-indicator" 
            onClick={toggleOverflowTabs}
            data-testid="overflow-indicator"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <div className="terminal-container">
        {terminals.length === 0 ? (
          <TerminalPlaceholder projectName={projectName} />
        ) : (
          terminals.map(terminal => (
            <TerminalComponent
              key={`${terminal.id}-${terminal.refreshCount || 0}`}
              id={terminal.id}
              active={terminal.id === activeTerminalId}
              initialCommand={terminal.command}
              noRunMode={noRunMode}
              isReadOnly={isReadOnly}
              isErrorTab={terminal.status === 'error' && terminal.errorType === 'config'}
              errorMessage={terminal.errorMessage}
            />
          ))
        )}
      </div>
      
      {(() => {
        if (!tabInfoPanel) return null;
        const liveTerminal = terminals.find(t => t.id === tabInfoPanel.terminal.id);
        if (!liveTerminal) return null;

        return (
          <TabInfoPanel
            terminal={liveTerminal}
            position={tabInfoPanel.position}
            onClose={handleCloseTabInfo}
            onRefresh={handleRefreshTab}
            configState={configState}
            noRunMode={noRunMode}
            detailsPopupOpen={detailsPopup.open && detailsPopup.terminalId === liveTerminal.id}
            onOpenDetailsPopup={handleOpenDetailsPopup}
            onCloseDetailsPopup={handleCloseDetailsPopup}
          />
        );
      })()}
      
      <OverflowTabsDropdown
        isOpen={overflowTabsOpen}
        tabs={overflowTabs}
        activeTerminalId={activeTerminalId}
        onSelectTab={handleSelectTab}
        onShowTabInfo={handleShowTabInfo}
        containerRef={tabsContainerRef}
      />
    </div>
  );
});

export default TerminalContainer; 