import React from 'react';
import { STATUS } from '../constants/verificationConstants';
import '../styles/environment-verification.css'; // Keep relevant styles

// Indicator component for showing status of individual requirements
const VerificationIndicator = ({ 
  label, 
  status = STATUS.WAITING, 
  children,
  verification = null, // New prop for full verification data
  onFixCommand = null // New prop for fix command handler
}) => {
  // Icons for different statuses
  const statusIcons = {
    [STATUS.WAITING]: '○',
    [STATUS.VALID]: '✓',
    [STATUS.INVALID]: '✗'
  };

  // Show fix button if verification is invalid and has a fixCommand
  const showFixButton = verification && 
                       verification.fixCommand && 
                       status === STATUS.INVALID && 
                       onFixCommand;

  const handleFixClick = (e) => {
    e.stopPropagation();
    onFixCommand(verification);
  };

  return (
    <div className={`verification-indicator ${status}`}>
      <span className="status-icon">{statusIcons[status]}</span>
      {children ? children : <span className="label" title={label}>{label}</span>}
      {showFixButton && (
        <button 
          className="fix-button"
          onClick={handleFixClick}
          title={`Fix: ${verification.fixCommand}`}
        >
          Fix
        </button>
      )}
    </div>
  );
};

export default VerificationIndicator; 