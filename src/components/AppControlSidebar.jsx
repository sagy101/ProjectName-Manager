import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/app-control-sidebar.css'; // Renamed CSS
import HealthReportButton from './HealthReportButton';
// Import XMarkIcon as CloseIcon for clarity, or use XMarkIcon directly if no conflict
import { Bars3Icon, XMarkIcon, EyeIcon, EyeSlashIcon, InformationCircleIcon, XMarkIcon as CloseIcon, Cog6ToothIcon, ArrowPathIcon, ComputerDesktopIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const AppControlSidebar = ({
  floatingTerminals,
  onShowTerminal,     // Expects (terminalId) => void
  onCloseTerminal,    // Expects (terminalId) => void
  onToggleMinimize, // Expects (terminalId) => void
  onOpenAbout,     // Expects (terminalId) => void
  activeFloatingTerminalId,
  isExpanded,      // New prop
  onToggleExpand,  // New prop (or setIsExpanded)
  showTestSections, // New prop
  noRunMode, // New prop
  isProjectRunning, // New prop
  // Props for debug actions, formerly passed to DebugPanel
  onToggleTestSections,
  onToggleNoRunMode,
  showAppNotification, // Though showAppNotification might not be directly used by buttons here, it was part of DebugPanel
  isMainTerminalWritable, // New prop
  onToggleMainTerminalWritable, // New prop
  onExportConfig,
  onImportConfig,
  onToggleAllVerifications, // New prop for toggling all verification statuses
  // Health Report props
  healthStatus, // Health report status (green/blue/red)
  onOpenHealthReport // Health report open handler
}) => {
  const sidebarRef = useRef(null);
  const [isDebugSectionOpen, setIsDebugSectionOpen] = useState(false);

  // Click away to collapse
  useEffect(() => {
    if (!isExpanded) return;

    function handleClickOutside(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        onToggleExpand(false); // Call prop to set expanded to false
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, onToggleExpand]);

  const toggleDebugSection = () => {
    if (!isExpanded) {
      // If sidebar is collapsed, clicking the debug button should:
      // 1. Ensure the debug section is set to open.
      // 2. Ensure the sidebar is expanded.
      setIsDebugSectionOpen(true);
      onToggleExpand(true);
    } else {
      // If sidebar is already expanded, just toggle debug section visibility.
      setIsDebugSectionOpen(prev => !prev);
    }
  };

  // Debug actions (logic adapted from DebugPanel.jsx)
  const openDevTools = () => {
    if (window.electron) window.electron.openDevTools();
    else console.warn('Electron API not available for openDevTools');
  };

  const reloadApp = () => {
    if (window.electron) window.electron.reloadApp();
    else window.location.reload();
  };

  const exportEnvironment = async () => {
    if (window.electron && window.electron.exportEnvironmentData) {
      try {
        const environmentData = await window.electron.exportEnvironmentData();
        
        // Create a blob with the JSON data
        const jsonString = JSON.stringify(environmentData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create a download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `environment-export-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (showAppNotification) {
          showAppNotification('Environment data exported successfully', 'info');
        }
      } catch (error) {
        console.error('Error exporting environment data:', error);
        if (showAppNotification) {
          showAppNotification('Failed to export environment data', 'error');
        }
      }
    }
  };

  const handleToggleTestSectionsClick = useCallback(() => {
    if (isProjectRunning) {
      if (showAppNotification) showAppNotification('Cannot change test section visibility while the project is running.', 'warning');
    } else {
      onToggleTestSections();
    }
  }, [isProjectRunning, onToggleTestSections, showAppNotification]);

  const handleToggleNoRunModeClick = useCallback(() => {
    if (isProjectRunning) {
      if (showAppNotification) showAppNotification('Cannot change No Run Mode while the project is running.', 'warning');
    } else {
      onToggleNoRunMode();
    }
  }, [isProjectRunning, onToggleNoRunMode, showAppNotification]);

  return (
    <div ref={sidebarRef} className={`app-control-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="sidebar-toggle-button"
        onClick={() => onToggleExpand(!isExpanded)} // Call prop
        title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
      >
        {isExpanded ? <XMarkIcon className="icon" /> : <Bars3Icon className="icon" />}
      </button>

      {isExpanded && (
        <div className="sidebar-content">
          <h3>Active Terminals</h3>
          {floatingTerminals.length === 0 && <p className="empty-message">No active floating terminals.</p>}
          <ul>
            {floatingTerminals.map(terminal => (
              <li key={terminal.id} className={terminal.id === activeFloatingTerminalId ? 'active' : ''}>
                <span className="terminal-title" title={terminal.title}>{terminal.title}</span>
                <div className="terminal-actions">
                  {terminal.isMinimized || !terminal.isVisible ? (
                    <button onClick={() => onShowTerminal(terminal.id)} title="Show">
                      <EyeIcon className="icon" />
                    </button>
                  ) : (
                    <button onClick={() => onToggleMinimize(terminal.id)} title="Minimize">
                      <EyeSlashIcon className="icon" />
                    </button>
                  )}
                  <button onClick={() => onOpenAbout && onOpenAbout(terminal.id)} title="About">
                    <InformationCircleIcon className="icon" />
                  </button>
                  <button onClick={() => onCloseTerminal(terminal.id)} title="Close">
                    <CloseIcon className="icon" /> {/* Use XMarkIcon or an alias */}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isExpanded && (
        <div className="sidebar-minimized-icons">
          {floatingTerminals.map(terminal => (
            <button
              key={terminal.id}
              className="minimized-icon-button"
              onClick={() => onShowTerminal(terminal.id)}
              title={`Show ${terminal.title}`}
            >
              {/* Basic icon placeholder - could be dynamic based on terminal type later */}
              <span>{terminal.title.substring(0,1)}</span>
            </button>
          ))}
          {floatingTerminals.length === 0 && (
            <span className="empty-minimized-message"></span>
          )}
        </div>
      )}

      {/* Health Report and Debug Section Toggle Buttons - always visible at the bottom */}
      <div className="sidebar-bottom-controls">
        <div className="health-report-button-container">
          <HealthReportButton
            healthStatus={healthStatus}
            onOpenHealthReport={onOpenHealthReport}
          />
        </div>
        <button
          className={`debug-section-toggle-button ${isExpanded ? 'expanded' : 'collapsed'} ${(showTestSections || noRunMode) ? 'has-active-options' : ''}`}
          onClick={toggleDebugSection}
          title={isDebugSectionOpen ? "Hide Debug Tools" : `Show Debug Tools${(showTestSections || noRunMode) ? ' (Active Options)' : ''}`}
        >
          <Cog6ToothIcon className="icon" />
          {isExpanded && <span className="debug-toggle-text">{isDebugSectionOpen ? "Hide Debug" : "Debug"}</span>}
        </button>
      </div>

      {/* Debug Section Content - shown when isDebugSectionOpen and sidebar isExpanded */}
      {isExpanded && isDebugSectionOpen && (
        <div className="debug-section-content">
          <button onClick={openDevTools} title="Open Developer Tools">
            <ComputerDesktopIcon className="icon" />
            <span>DevTools</span>
          </button>
          <button onClick={reloadApp} title="Reload Application">
            <ArrowPathIcon className="icon" />
            <span>Reload</span>
          </button>
          <button
            onClick={handleToggleTestSectionsClick}
            className={`${(showTestSections && !isProjectRunning) ? 'active' : ''} ${isProjectRunning ? 'disabled' : ''}`}
            disabled={isProjectRunning}
            title={showTestSections ? 'Hide Test Sections' : 'Show Test Sections'}
          >
            <span>{showTestSections ? 'Hide Tests' : 'Show Tests'}</span>
          </button>
          <button
            onClick={handleToggleNoRunModeClick}
            className={`${(noRunMode && !isProjectRunning) ? 'active' : ''} ${isProjectRunning ? 'disabled' : ''}`}
            disabled={isProjectRunning}
            title={noRunMode ? 'Disable No Run Mode' : 'Enable No Run Mode'}
          >
            <span>No Run Mode</span>
          </button>
          <button
            onClick={onToggleMainTerminalWritable}
            title={isMainTerminalWritable ? 'Make Terminals Read-Only' : 'Enable Terminal Input'}
            disabled={isProjectRunning}
            className={`${isProjectRunning ? 'disabled' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="icon">
              <path fillRule="evenodd" d="M2 5a1 1 0 00-1 1v8a1 1 0 001 1h16a1 1 0 001-1V6a1 1 0 00-1-1H2zm3.293 2.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414L11.414 12l3.293 3.293a1 1 0 01-1.414 1.414L10 13.414l-3.293 3.293a1 1 0 01-1.414-1.414L8.586 12 5.293 8.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>{isMainTerminalWritable ? 'Terminals Writable' : 'Terminals Read-Only'}</span>
          </button>
          <button onClick={onExportConfig} title="Export Configuration">
            <ArrowDownTrayIcon className="icon" />
            <span>Export Config</span>
          </button>
          <button onClick={onImportConfig} title="Import Configuration">
            <ArrowUpTrayIcon className="icon" />
            <span>Import Config</span>
          </button>
          <button onClick={exportEnvironment} title="Export Environment Data">
            <ArrowDownTrayIcon className="icon" />
            <span>Export Environment</span>
          </button>
          <button 
            onClick={onToggleAllVerifications} 
            title="Toggle all verifications between valid/invalid for testing fix button functionality"
            disabled={isProjectRunning}
            className={`${isProjectRunning ? 'disabled' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="icon">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-3.068-9.849a7 7 0 00-11.614 3.138.75.75 0 101.449.39 5.5 5.5 0 019.4-2.466l.31-.31V5.159a.75.75 0 001.5 0V.917a.75.75 0 00-.75-.75H8.497a.75.75 0 000 1.5h2.433l-.31.31z" clipRule="evenodd" />
            </svg>
            <span>Toggle Verifications</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AppControlSidebar;
