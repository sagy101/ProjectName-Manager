import React from 'react';
import '../styles/fix-command-confirmation.css';

const FixCommandConfirmation = ({ verification, onConfirm, onCancel }) => {
  if (!verification) return null;

  const handleClickOverlay = (e) => {
    e.stopPropagation();
    onCancel();
  };

  return (
    <div className="command-popup-overlay" onClick={handleClickOverlay}>
      <div className="command-popup" onClick={e => e.stopPropagation()}>
        <div className="command-popup-header">
          <h3>Run Fix Command?</h3>
          <button className="close-button" onClick={onCancel}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="command-popup-content">
          <h4>Command:</h4>
          <pre>{verification.fixCommand}</pre>
          <div className="fix-command-buttons">
            <button className="confirm-button" onClick={onConfirm}>Confirm</button>
            <button className="cancel-button" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixCommandConfirmation;
