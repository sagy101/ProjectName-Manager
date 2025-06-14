import React from 'react';

const ConfigCollapseButton = ({ isCollapsed, onToggle, className = '' }) => {
  return (
    <button 
      className={`config-collapse-btn ${isCollapsed ? 'collapsed' : ''} ${className}`}
      onClick={onToggle}
      title={isCollapsed ? 'Expand Configuration' : 'Collapse Configuration'}
    >
      {isCollapsed ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      )}
    </button>
  );
};

export default ConfigCollapseButton; 