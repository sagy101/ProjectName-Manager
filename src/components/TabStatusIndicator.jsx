import React from 'react';

const TabStatusIndicator = ({ status, isError }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'done':
        return 'status-done';
      case 'error':
        return 'status-error';
      default:
        return 'status-idle';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'done':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  };

  return (
    <span 
      className={`tab-status ${getStatusClass()} ${isError ? 'status-error-config' : ''}`}
      title={getStatusTitle()}
    />
  );
};

export default TabStatusIndicator; 