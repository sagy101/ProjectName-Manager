import React from 'react';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import './styles/mode-selector.css';

const ModeSelector = ({ 
  sectionId, 
  options, 
  currentMode, 
  onModeChange, 
  disabled = false,
  className = '',
  style = {},
  labels = [],
  showAppNotification
}) => {
  if (!options || options.length === 0) {
    return null;
  }

  const handleOptionClick = (option) => {
    if (disabled) return;
    
    const optionConfig = options.find(o => (o.value || o) === option);
    if (optionConfig?.status === 'TBD') {
      if (showAppNotification) {
        showAppNotification('This feature is not yet implemented.', 'info');
      }
      return; // Prevent switching
    }
    
    if (onModeChange) {
      onModeChange(sectionId, option);
    }
  };

  return (
    <div className={`mode-selector-container ${className}`} style={style}>
      <div className="deployment-toggle-container compact">
        {options.map((option, index) => {
          const value = typeof option === 'object' ? option.value : option;
          const status = typeof option === 'object' ? option.status : null;
          const label = labels?.[index] || (value.charAt(0).toUpperCase() + value.slice(1));
          const isTBD = status === 'TBD';

          return (
            <button
              key={value}
              className={`deployment-toggle-btn ${currentMode === value ? 'active' : ''} ${isTBD ? 'tbd' : ''}`}
              onClick={() => handleOptionClick(value)}
              disabled={disabled}
              aria-pressed={currentMode === value}
              data-testid={`mode-selector-btn-${sectionId}-${value}`}
              title={isTBD ? 'This option is under construction' : label}
            >
              {isTBD && <WrenchScrewdriverIcon className="tbd-icon" />}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModeSelector; 