import React, { useState } from 'react';
import { STATUS } from '../constants/verificationConstants';
import '../styles/environment-verification.css'; // Keep relevant styles

// Indicator component for showing status of individual requirements
const VerificationIndicator = ({
  label,
  status = STATUS.WAITING,
  children,
  fixCommand,
  verificationId,
  sectionId
}) => {
  const [isFixing, setIsFixing] = useState(false);

  // Icons for different statuses
  const statusIcons = {
    [STATUS.WAITING]: '○', // Neutral/waiting
    [STATUS.VALID]: '✓',   // Checkmark for valid
    [STATUS.INVALID]: '✗'  // X for invalid
  };

  const handleFix = async () => {
    if (!window.electron || !fixCommand || !verificationId) {
      console.error('Missing electron IPC, fixCommand, or verificationId for handleFix.');
      return;
    }
    setIsFixing(true);
    try {
      console.log(`Attempting to fix verification: ${verificationId}, section: ${sectionId || 'general'}`);
      const result = await window.electron.ipcRenderer.invoke('run-fix-command', {
        verificationId,
        sectionId: sectionId || 'general' // Default to 'general' if sectionId is not provided
      });
      console.log('Fix command result for ' + verificationId + ':', result);
      // The parent component (App.jsx) is expected to listen to an IPC event
      // from the main process (e.g., 'verification-status-updated')
      // to refresh the overall statusMap or specific item.
    } catch (error) {
      console.error('Error running fix command for ' + verificationId + ':', error);
    } finally {
      setIsFixing(false);
    }
  };

  // Determine the CSS class for the status text/icon based on the status prop
  const statusClassName = `status-${status.toLowerCase()}`; // e.g., status-valid, status-invalid

  return (
    <div className={`verification-indicator-container ${statusClassName}`}>
      <span className={`status-icon ${statusClassName}`}>{statusIcons[status]}</span>
      {children ? children : <span className="label" title={label}>{label}</span>}
      {status === STATUS.INVALID && fixCommand && verificationId && (
        <button
          onClick={handleFix}
          disabled={isFixing}
          className="fix-button"
        >
          {isFixing ? 'Fixing...' : 'Fix'}
        </button>
      )}
    </div>
  );
};

export default VerificationIndicator;