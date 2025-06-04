import React from 'react';

const DeploymentOptions = ({ sectionId, currentType, onChange, disabled = false }) => {
  return (
    <div className="deployment-options" style={{ opacity: disabled ? 0.6 : 1 }}>
      <div className="deployment-toggle-container">
        <button
          className={`deployment-toggle-btn ${currentType === 'container' ? 'active' : ''}`}
          onClick={() => !disabled && onChange('container')}
          disabled={disabled}
          aria-pressed={currentType === 'container'}
        >
          Container
        </button>
        <button
          className={`deployment-toggle-btn ${currentType === 'process' ? 'active' : ''}`}
          onClick={() => !disabled && onChange('process')}
          disabled={disabled}
          aria-pressed={currentType === 'process'}
        >
          Process
        </button>
      </div>
    </div>
  );
};

export default DeploymentOptions; 