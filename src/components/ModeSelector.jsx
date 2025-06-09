import React from 'react';

const ModeSelector = ({ 
  sectionId, 
  options, 
  currentMode, 
  onModeChange, 
  disabled = false,
  className = '',
  style = {}
}) => {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className={`mode-selector-container ${className}`} style={{ padding: '8px 12px', ...style }}>
      <div className="deployment-toggle-container compact">
        {options.map(option => (
          <button
            key={option}
            className={`deployment-toggle-btn ${currentMode === option ? 'active' : ''}`}
            onClick={() => !disabled && onModeChange(sectionId, option)}
            disabled={disabled}
            aria-pressed={currentMode === option}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector; 