import React from 'react';

const RunButton = ({ isRunning, isStopping, projectName, onClick, disabled }) => {
  return (
    <button
      id="run-configuration-button"
      className={`run-configuration-button ${
        isStopping ? 'stopping' : isRunning ? 'stop' : ''
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {isStopping ? (
        <>
          <svg className="stopping-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
          STOPPING {projectName.toUpperCase()}...
        </>
      ) : isRunning ? (
        <>
          <svg className="stop-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M6 6h12v12H6z" />
          </svg>
          STOP {projectName.toUpperCase()}
        </>
      ) : (
        <>
          <svg className="run-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M8 5v14l11-7z" />
          </svg>
          RUN {projectName.toUpperCase()}
        </>
      )}
    </button>
  );
};

export default RunButton; 