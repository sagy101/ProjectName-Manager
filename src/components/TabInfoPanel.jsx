import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import '../styles/tab-info-panel.css';

const TabInfoPanel = ({ 
  terminal, 
  position, 
  onClose, 
  onRefresh,
  configState,
  noRunMode,
  detailsPopupOpen,
  onOpenDetailsPopup,
  onCloseDetailsPopup
}) => {
  const [containerStatuses, setContainerStatuses] = useState({});
  const [isLoadingContainerStatuses, setIsLoadingContainerStatuses] = useState(false);
  const panelRef = useRef(null);

  // Helper to get elapsed time as a string
  const getElapsedTime = (startTime) => {
    if (!startTime) return 'N/A';
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const [elapsedTime, setElapsedTime] = useState(getElapsedTime(terminal.startTime || terminal.id));

  // Memoize the stringified version of associatedContainers for stable dependency
  const associatedContainersString = JSON.stringify(terminal.associatedContainers);

  // Effect for live-updating the elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(getElapsedTime(terminal.startTime || terminal.id));
    }, 1000);
    return () => clearInterval(timer);
  }, [terminal.startTime, terminal.id]);

  // Fetch container statuses when popup is shown and terminal has associated containers
  useEffect(() => {
    if (detailsPopupOpen && terminal.associatedContainers && terminal.associatedContainers.length > 0) {
      const fetchStatuses = async () => {
        setIsLoadingContainerStatuses(true);
        const initialStatuses = {};
        terminal.associatedContainers.forEach(name => {
          initialStatuses[name] = 'loading...';
        });
        setContainerStatuses(initialStatuses);

        const statuses = {};
        for (const containerName of terminal.associatedContainers) {
          if (window.electron && window.electron.getContainerStatus) {
            try {
              statuses[containerName] = await window.electron.getContainerStatus(containerName);
            } catch (error) {
              console.error(`TabInfoPanel: Error fetching status for container ${containerName}:`, error);
              statuses[containerName] = 'error';
            }
          } else {
            statuses[containerName] = 'unknown'; // Fallback if API not available
          }
        }
        setContainerStatuses(statuses);
        setIsLoadingContainerStatuses(false);
      };
      fetchStatuses();
    }
  }, [detailsPopupOpen, associatedContainersString]); // Use the stringified version as a dependency

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if click is on command popup
        const commandPopup = document.querySelector('.command-popup-overlay');
        if (commandPopup && commandPopup.contains(event.target)) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const formatStartTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleRefresh = () => {
    if (!noRunMode) {
      onRefresh(terminal.id);
    }
  };

  const DetailsPopup = () => {
    if (!detailsPopupOpen) return null;

    return (
      <div className="command-popup-overlay" onClick={onCloseDetailsPopup}>
        <div className="command-popup" onClick={(e) => e.stopPropagation()}>
          <div className="command-popup-header">
            <h3>More Details</h3>
            <button className="close-button" onClick={onCloseDetailsPopup}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="command-popup-content">
            <h4>Command:</h4>
            <pre>{terminal.command}</pre>
            <button 
              className="copy-button"
              onClick={(event) => {
                navigator.clipboard.writeText(terminal.command);
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

            {terminal.associatedContainers && terminal.associatedContainers.length > 0 && (
              <div className="associated-containers-section">
                <h4>Associated Containers:</h4>
                {isLoadingContainerStatuses ? (
                  <p className="loading-text">Loading container statuses...</p>
                ) : (
                  <ul>
                    {terminal.associatedContainers.map(name => (
                      <li key={name}>
                        {name}: <span className={`container-status status-${(containerStatuses[name] || 'loading').toLowerCase().replace(/\s+/g, '-')}`}>
                                  {containerStatuses[name] || 'N/A'}
                                </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return ReactDOM.createPortal(
    <>
      <div 
        ref={panelRef}
        className="tab-info-panel"
        style={{
          position: 'fixed',
          top: position.y,
          left: position.x,
          zIndex: 100000
        }}
      >
        <div className="tab-info-header">
          <h3>Tab Information</h3>
          <button className="close-button" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="tab-info-content">
          <div className="info-row">
            <span className="info-label">Tab Name:</span>
            <span className="info-value">{terminal.title}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Terminal ID:</span>
            <span className="info-value mono">{terminal.id}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Start Time:</span>
            <span className="info-value">{formatStartTime(terminal.startTime || terminal.id)}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Elapsed Time:</span>
            <span className="info-value">{elapsedTime}</span>
          </div>

          {terminal.sectionId && (
            <div className="info-row">
              <span className="info-label">Section:</span>
              <span className="info-value">{terminal.sectionId}</span>
            </div>
          )}
          
          <div className="info-actions">
            <button 
              className="action-button"
              onClick={onOpenDetailsPopup}
            >
              More Details
            </button>
            
            <button 
              className="action-button refresh-button"
              onClick={handleRefresh}
              disabled={noRunMode || !terminal}
              title={noRunMode ? 'Cannot refresh in No Run Mode' : 'Refresh and re-run command'}
            >
              🔄 Refresh
            </button>
          </div>

          {noRunMode && (
            <div className="info-warning">
              No Run Mode is active - refresh disabled
            </div>
          )}
        </div>
      </div>
      
      <DetailsPopup />
    </>,
    document.body
  );
};

export default TabInfoPanel; 