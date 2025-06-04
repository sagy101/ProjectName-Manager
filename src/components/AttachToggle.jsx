import React from 'react';
import '../styles/attachToggle.css';

const AttachToggle = ({ 
  id, 
  isAttached, 
  onToggle,
  isWarning = false,
  disabled = false
}) => {
  return (
    <div className="attach-toggle-container">
      <button
        id={id}
        className={`attach-toggle-button ${isAttached ? 'attached' : 'detached'} ${isWarning ? 'warning' : ''}`}
        onClick={() => onToggle(!isAttached)}
        disabled={disabled}
        title={isAttached ? 'Detach' : 'Attach'}
      >
        <div className="attach-toggle-status">
          <span className="attach-toggle-indicator"></span>
          <span className="attach-toggle-label">Attach</span>
        </div>
      </button>
    </div>
  );
};

export default AttachToggle; 