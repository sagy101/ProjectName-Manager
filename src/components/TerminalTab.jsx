import React, { useRef, useEffect, useState } from 'react';

const TerminalTab = ({ id, title, status, active, onSelect, onClose, onInfo, isError }) => {
  const tabRef = useRef(null);
  const titleRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Check for title overflow
  useEffect(() => {
    if (titleRef.current && tabRef.current) {
      // Temporarily make it visible if it's not, to measure
      const wasHidden = tabRef.current.style.display === 'none';
      if (wasHidden) tabRef.current.style.display = '';

      const checkOverflow = () => {
        if (titleRef.current) {
          // Max width for title is tab width minus padding, status, and buttons
          const tabWidth = tabRef.current.clientWidth;
          const paddingAndControlsWidth = 80; // Approximate (16px padding + 20px status + 24px info + 20px close)
          const maxTitleWidth = tabWidth - paddingAndControlsWidth;
          setIsOverflowing(titleRef.current.scrollWidth > maxTitleWidth);
        }
      };

      checkOverflow(); // Initial check
      
      if (wasHidden) tabRef.current.style.display = 'none'; // Restore if it was hidden

      // Re-check on resize or title change (though title change might re-render anyway)
      const resizeObserver = new ResizeObserver(checkOverflow);
      if (tabRef.current) {
        resizeObserver.observe(tabRef.current);
      }
      return () => resizeObserver.disconnect();
    }
  }, [title, active]); // Re-check when title or active state changes

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

  const handleInfoClick = (e) => {
    e.stopPropagation();
    onInfo(id, e);
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    onClose(id);
  };

  return (
    <div 
      ref={tabRef}
      className={`tab ${active ? 'active' : ''} ${isError ? 'error-tab-button' : ''}`}
      data-terminal-id={id}
      onClick={() => onSelect(id)}
      data-tab-id={id}
      data-testid={`terminal-tab-${id}`}
      title={isOverflowing ? title : ''}
    >
      <span 
        className={`tab-status ${getStatusClass()} ${isError ? 'status-error-config' : ''}`}
        title={getStatusTitle()}
      />
      <span ref={titleRef} className="tab-title">{title}</span>
      <button 
        className="tab-info-button"
        onClick={handleInfoClick}
        title="Tab Information"
      >
        ℹ
      </button>
      {/* <button 
        className="tab-close"
        onClick={handleCloseClick}
        title="Close Tab"
      >
        ×
      </button> */}
    </div>
  );
};

export default TerminalTab; 