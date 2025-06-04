import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/debug-panel.css';

const DebugPanel = ({ 
  onToggleVerificationStatus, 
  onToggleTestSections, 
  showTestSections, 
  onToggleNoRunMode, 
  noRunMode, 
  isIsoRunning,
  showAppNotification,
  isOpen,
  onClose
}) => {
  const [sectionStatuses, setSectionStatuses] = useState({
    cloud: 'waiting',
    java: 'waiting',
    node: 'waiting',
    go: 'waiting',
    additional: 'waiting'
  });
  const panelRef = useRef(null);

  console.log('DebugPanel: Props received - isIsoRunning:', isIsoRunning, 'showTestSections:', showTestSections, 'noRunMode:', noRunMode);

  // Close the panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const openDevTools = () => {
    if (window.electron) {
      window.electron.openDevTools();
    } else {
      console.warn('Electron API not available');
    }
  };

  const cycleSectionStatus = (section) => {
    const statuses = ['waiting', 'valid', 'invalid'];
    const currentStatus = sectionStatuses[section];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];
    
    // Update local state
    setSectionStatuses(prev => ({
      ...prev,
      [section]: nextStatus
    }));
    
    // Pass to parent component
    onToggleVerificationStatus(section, nextStatus);
  };

  // Create mixed states for testing
  const setMixedStates = (preset) => {
    let newStatuses;
    
    switch(preset) {
      case 'all-valid':
        newStatuses = {
          cloud: 'valid',
          java: 'valid',
          node: 'valid',
          go: 'valid',
          additional: 'valid'
        };
        break;
      case 'all-invalid':
        newStatuses = {
          cloud: 'invalid',
          java: 'invalid',
          node: 'invalid',
          go: 'invalid',
          additional: 'invalid'
        };
        break;
      case 'all-waiting':
        newStatuses = {
          cloud: 'waiting',
          java: 'waiting',
          node: 'waiting',
          go: 'waiting',
          additional: 'waiting'
        };
        break;
      case 'mixed-valid-invalid':
        newStatuses = {
          cloud: 'valid',
          java: 'invalid',
          node: 'valid',
          go: 'invalid',
          additional: 'valid'
        };
        break;
      case 'mixed-valid-waiting':
        newStatuses = {
          cloud: 'valid',
          java: 'waiting',
          node: 'valid',
          go: 'waiting',
          additional: 'valid'
        };
        break;
      case 'mixed-invalid-waiting':
        newStatuses = {
          cloud: 'invalid',
          java: 'waiting',
          node: 'invalid',
          go: 'waiting',
          additional: 'invalid'
        };
        break;
      case 'mixed-all':
        newStatuses = {
          cloud: 'valid',
          java: 'invalid',
          node: 'waiting',
          go: 'valid',
          additional: 'invalid'
        };
        break;
      default:
        return;
    }
    
    // Update all statuses at once
    setSectionStatuses(newStatuses);
    
    // Update parent component
    Object.entries(newStatuses).forEach(([section, status]) => {
      onToggleVerificationStatus(section, status);
    });
  };

  const reloadApp = () => {
    if (window.electron) {
      window.electron.reloadApp();
    } else {
      window.location.reload();
    }
  };

  const clearLocalStorage = () => {
    localStorage.clear();
    console.log('Local storage cleared');
  };

  const handleToggleTestSectionsClick = useCallback(() => {
    console.log('DebugPanel: handleToggleTestSectionsClick, isIsoRunning:', isIsoRunning);
    if (isIsoRunning) {
      console.log('DebugPanel: ISO is running, calling showAppNotification for test sections.');
    } else {
      console.log('DebugPanel: ISO not running, calling onToggleTestSections.');
      onToggleTestSections();
    }
  }, [isIsoRunning, onToggleTestSections]);

  const handleToggleNoRunModeClick = useCallback(() => {
    console.log('DebugPanel: handleToggleNoRunModeClick, isIsoRunning:', isIsoRunning);
    if (isIsoRunning) {
      console.log('DebugPanel: ISO is running, calling showAppNotification for no run mode.');
    } else {
      console.log('DebugPanel: ISO not running, calling onToggleNoRunMode.');
      onToggleNoRunMode();
    }
  }, [isIsoRunning, onToggleNoRunMode]);

  return (
    <div className="debug-panel-container" ref={panelRef}>
      {isOpen && (
        <div className="debug-menu">
          <div className="debug-header">
            <h3>Debug Tools</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="debug-content">
            <section className="debug-section">
              <h4>Developer</h4>
              <button onClick={openDevTools}>Open Dev Tools</button>
              <button onClick={reloadApp}>Reload App</button>
              <button onClick={clearLocalStorage}>Clear Local Storage</button>
            </section>
            
            <section className="debug-section">
              <h4>Visibility</h4>
              <button 
                onClick={handleToggleTestSectionsClick} 
                className={`${showTestSections ? 'active' : ''} ${isIsoRunning ? 'disabled' : ''}`}
                disabled={isIsoRunning}
              >
                {showTestSections ? 'Hide' : 'Show'} Test Sections
              </button>
            </section>
            
            <section className="debug-section">
              <h4>Execution</h4>
              <button 
                onClick={handleToggleNoRunModeClick} 
                className={`${noRunMode ? 'active' : ''} ${isIsoRunning ? 'disabled' : ''}`}
                disabled={isIsoRunning}
              >
                {'No Run Mode'}
              </button>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel; 