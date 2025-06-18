import React, { useState, useEffect, useRef } from 'react';
import TerminalTab from './TerminalTab';
import TerminalComponent from './Terminal';
import TabInfoPanel from './TabInfoPanel';
import TerminalPlaceholder from './TerminalPlaceholder';
import OverflowTabsDropdown from './OverflowTabsDropdown';
import '@xterm/xterm/css/xterm.css';
import configSidebarCommands from '../configurationSidebarCommands.json';
import { useTerminals } from '../hooks/useTerminals';
import { useTabManagement } from '../hooks/useTabManagement';
import { useIpcListeners } from '../hooks/useIpcListeners';

const TerminalContainer = React.forwardRef(({ noRunMode, configState, projectName, isReadOnly }, ref) => {
  const tabsContainerRef = useRef(null);
  
  const {
    terminals,
    setTerminals,
    activeTerminalId,
    setActiveTerminalId,
    openTabs,
    clearTabs,
    handleRefreshTab,
    handleCloseTab,
    killAllTerminals
  } = useTerminals(configState, configSidebarCommands, noRunMode);
  
  const {
    visibleTabs,
    overflowTabs,
    overflowTabsOpen,
    setOverflowTabsOpen,
    toggleOverflowTabs
  } = useTabManagement(tabsContainerRef, terminals, activeTerminalId);

  useIpcListeners(setTerminals);

  // Log terminal state changes for debugging
  useEffect(() => {
    debugLog('TerminalContainer state updated:', terminals);
  }, [terminals]);

  const [tabInfoPanel, setTabInfoPanel] = useState(null);
  const [detailsPopup, setDetailsPopup] = useState({ open: false, terminalId: null });

  // Handle when a terminal process actually starts
  const handleProcessStarted = (terminalId) => {
    setTerminals(prev => 
      prev.map(terminal => 
        terminal.id === terminalId ? { ...terminal, status: 'running' } : terminal
      )
    );
  };

  // Simplified global terminal manager setup
  useEffect(() => {
    const updateTerminalStatus = (terminalId, status) => {
      setTerminals(prev => 
        prev.map(terminal => 
          terminal.id === terminalId ? { ...terminal, status } : terminal
        )
      );
    };

    const executeCommand = (command, terminalId) => {
      if (window.electron) {
        setTerminals(prev => 
          prev.map(t => t.id === terminalId ? { ...t, command, originalCommand: command, status: 'pending_spawn' } : t)
        );
      }
    };
    
    window.runInTerminal = (command, newTab = true) => {
      let terminalId = activeTerminalId;
      if (newTab) {
        terminalId = Date.now();
        setTerminals(prev => [
          ...prev,
          { id: terminalId, title: `Run ${new Date().toLocaleTimeString()}`, status: 'idle' }
        ]);
        setTimeout(() => {
          setActiveTerminalId(terminalId);
          updateTerminalStatus(terminalId, 'running');
          executeCommand(command, terminalId);
        }, 100);
      } else {
        if(terminalId) {
            updateTerminalStatus(terminalId, 'running');
            executeCommand(command, terminalId);
        }
      }
      return terminalId;
    };
    
    // Cleanup
    return () => {
      delete window.runInTerminal;
    };
  }, [activeTerminalId, setTerminals, setActiveTerminalId]);

  const handleSelectTab = (terminalId) => {
    setActiveTerminalId(terminalId);
    setOverflowTabsOpen(false);
    
    if (overflowTabs.find(t => t.id === terminalId)) {
      const selectedTab = terminals.find(t => t.id === terminalId);
      const otherTabs = terminals.filter(t => t.id !== terminalId);
      setTerminals([selectedTab, ...otherTabs]);
    }
  };
  
  const handleShowTabInfo = (terminalId, event) => {
    const terminal = terminals.find(t => t.id === terminalId);
    if (!terminal) return;

    let position = { x: 100, y: 100 };
    const tabElement = document.querySelector(`.tab[data-tab-id="${terminalId}"]`);

    if (tabElement) {
      const rect = tabElement.getBoundingClientRect();
      position = { x: rect.left, y: rect.bottom + 5 };
    } else if (event?.currentTarget) {
      const iconRect = event.currentTarget.getBoundingClientRect();
      const panelWidth = 300;
      const panelHeight = 250;
      let x = Math.max(10, Math.min(iconRect.left, window.innerWidth - panelWidth - 10));
      let y = iconRect.bottom + 10;
      if (y + panelHeight > window.innerHeight) {
        y = iconRect.top - panelHeight - 10;
      }
      position = { x, y: Math.max(10, y) };
    }
    setTabInfoPanel({ terminal, position });
  };

  const handleCloseTabInfo = () => setTabInfoPanel(null);
  const handleOpenDetailsPopup = () => {
    if (tabInfoPanel?.terminal) {
      setDetailsPopup({ open: true, terminalId: tabInfoPanel.terminal.id });
    }
  };
  const handleCloseDetailsPopup = () => setDetailsPopup({ open: false, terminalId: null });

  React.useImperativeHandle(ref, () => ({
    openTabs,
    clearTabs: () => {
      clearTabs();
      setTabInfoPanel(null);
      setDetailsPopup({ open: false, terminalId: null });
    },
    getTerminals: () => terminals,
    killAllTerminals,
    focusTab: (terminalId) => {
      handleSelectTab(terminalId);
    },
    refreshTab: (terminalId) => {
      handleRefreshTab(terminalId);
    },
    stopAllContainers: async () => {
      const allContainers = new Set(
        terminals.flatMap(t => t.associatedContainers || []).filter(c => c && typeof c === 'string')
      );
      if (allContainers.size > 0 && window.electron?.stopContainers) {
        await window.electron.stopContainers(Array.from(allContainers));
      }
    }
  }), [terminals, openTabs, clearTabs, killAllTerminals, handleSelectTab, handleRefreshTab]);

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
            onInfo={handleShowTabInfo}
            isError={terminal.status === 'error' && terminal.errorType === 'config'}
          />
        ))}
        {overflowTabs.length > 0 && (
          <div className="tab overflow-indicator" onClick={toggleOverflowTabs} data-testid="overflow-indicator">
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
              onProcessStarted={handleProcessStarted}
            />
          ))
        )}
      </div>
      {tabInfoPanel && terminals.some(t => t.id === tabInfoPanel.terminal.id) && (
        <TabInfoPanel
          terminal={terminals.find(t => t.id === tabInfoPanel.terminal.id)}
          position={tabInfoPanel.position}
          onClose={handleCloseTabInfo}
          onRefresh={handleRefreshTab}
          configState={configState}
          noRunMode={noRunMode}
          detailsPopupOpen={detailsPopup.open && detailsPopup.terminalId === tabInfoPanel.terminal.id}
          onOpenDetailsPopup={handleOpenDetailsPopup}
          onCloseDetailsPopup={handleCloseDetailsPopup}
        />
      )}
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

TerminalContainer.displayName = 'TerminalContainer';

export default TerminalContainer; 