import React from 'react';
import '../styles/health-report-button.css';

const HealthReportButton = ({ onOpenHealthReport, healthStatus = 'green' }) => {
  const getButtonClass = () => {
    return `health-report-button health-report-button--${healthStatus}`;
  };

  const getStatusIcon = () => {
    return (
      <svg className="health-icon" viewBox="0 0 24 24" width="20" height="20">
        <path 
          fill="currentColor" 
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        />
      </svg>
    );
  };

  return (
    <button
      className={getButtonClass()}
      onClick={onOpenHealthReport}
      title="Open Health Report - System Status Overview"
      data-testid="health-report-button"
    >
      {getStatusIcon()}
      <span className="health-button-text">Health Report</span>
    </button>
  );
};

export default HealthReportButton; 