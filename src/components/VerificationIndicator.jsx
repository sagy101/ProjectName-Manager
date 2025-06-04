import React from 'react';
import { STATUS } from '../constants/verificationConstants';
import '../styles/environment-verification.css'; // Keep relevant styles

// Indicator component for showing status of individual requirements
const VerificationIndicator = ({ label, status = STATUS.WAITING, children }) => {
  // Icons for different statuses
  const statusIcons = {
    [STATUS.WAITING]: '○',
    [STATUS.VALID]: '✓',
    [STATUS.INVALID]: '✗'
  };

  return (
    <div className={`verification-indicator ${status}`}>
      <span className="status-icon">{statusIcons[status]}</span>
      {children ? children : <span className="label" title={label}>{label}</span>}
    </div>
  );
};

export default VerificationIndicator; 