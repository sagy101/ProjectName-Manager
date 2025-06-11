import React from 'react';
import '../styles/mode-selector.css';

const ModeSelector = ({ 
  sectionId, 
  options, 
  currentMode, 
  onModeChange, 
  disabled = false,
  className = '',
  style = {},
  labels = []
}) => {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className={`mode-selector-container ${className}`} style={style}>
      <div className="deployment-toggle-container compact">
        {options.map((option, index) => {
          const label = labels[index] || option.charAt(0).toUpperCase() + option.slice(1);
          return (
            <button
              key={option}
              className={`deployment-toggle-btn ${currentMode === option ? 'active' : ''}`}
              onClick={() => !disabled && onModeChange(sectionId, option)}
              disabled={disabled}
              aria-pressed={currentMode === option}
              data-testid={`mode-selector-btn-${sectionId}-${option}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModeSelector; 