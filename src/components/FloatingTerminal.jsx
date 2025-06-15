import React, { useEffect, useRef, useState } from 'react';
import TerminalComponent from './Terminal'; // Assuming Terminal.jsx is in the same directory
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import '../styles/floating-terminal.css'; // We will create this CSS file next

const FloatingTerminal = ({
  id,
  title,
  command,
  isVisible,
  isMinimized, // Will be used by the sidebar, visibility here is mainly through isVisible
  onClose,
  onFocus, // For z-index management and active state
  initialPosition, // For initial placement
  zIndex, // For stacking order
  onMinimize, // New prop for minimize action
  onOpenInfo, // New prop for opening info panel
  isFixCommand = false, // New prop to identify fix commands
  onShowNotification, // New prop for showing notifications
  onCommandComplete, // New prop for when command completes
  noRunMode // New prop for no-run mode
}) => {
  const terminalRef = useRef(null);
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCloseDisabled, setIsCloseDisabled] = useState(false);
  const [disableTimeRemaining, setDisableTimeRemaining] = useState(0);
  const [terminalStatus, setTerminalStatus] = useState('idle');
  const dragOffset = useRef({ x: 0, y: 0 });

  // Effect to update position if initialPosition prop changes externally (e.g., centering on re-open)
  // However, this might conflict with user dragging. Typically, initialPosition is for the first render.
  // For now, we set position once from initialPosition.
  useEffect(() => {
    setPosition(initialPosition || { x: 50, y: 50 });
  }, [initialPosition?.x, initialPosition?.y]); // Only re-run if initialPosition object reference itself changes or x/y

  // Effect for fix command close button disable timer
  useEffect(() => {
    if (isFixCommand) {
      setIsCloseDisabled(true);
      setDisableTimeRemaining(20);
      
      const timer = setInterval(() => {
        setDisableTimeRemaining(prev => {
          if (prev <= 1) {
            setIsCloseDisabled(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isFixCommand]);

  // Effect to listen for terminal status changes and auto-close
  useEffect(() => {
    if (!window.electron) return;

    const handleCommandFinished = ({ terminalId, status, exitCode }) => {
      if (terminalId === id) {
        setTerminalStatus(status);
        
        // Auto-close conditions:
        // 1. If it's a fix command and command finished (done/error/stopped)
        // 2. If terminal is minimized and command finished
        const shouldAutoClose = (isFixCommand || isMinimized) && 
                               ['done', 'error', 'stopped'].includes(status);
        
        if (shouldAutoClose) {
          // Small delay to let user see the final status
          setTimeout(() => {
            onClose(id);
          }, 2000);
        }
        
        // Notify parent component that command completed (for verification re-run)
        if (onCommandComplete && ['done', 'error', 'stopped'].includes(status)) {
          onCommandComplete(id, status, exitCode);
        }
      }
    };

    const handleCommandStarted = ({ terminalId }) => {
      if (terminalId === id) {
        setTerminalStatus('running');
      }
    };

    // Listen for command events
    const removeCommandFinished = window.electron.onCommandFinished?.(handleCommandFinished);
    const removeCommandStarted = window.electron.onCommandStarted?.(handleCommandStarted);

    return () => {
      removeCommandFinished?.();
      removeCommandStarted?.();
    };
  }, [id, isFixCommand, isMinimized, onClose, onCommandComplete]);

  const handleMouseDown = (e) => {
    if (!terminalRef.current) return;
    // Only allow dragging via the title bar, not the whole window unless that's desired.
    // The current setup has onClick on title-bar for focus, so mousedown here for drag is good.

    setIsDragging(true);
    onFocus && onFocus(id); // Bring to front when starting drag

    const terminalRect = terminalRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - terminalRect.left,
      y: e.clientY - terminalRect.top,
    };
    
    // Prevent text selection while dragging
    e.preventDefault(); 
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !terminalRef.current) return;
      
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;

      // Optional: Add boundary checks to keep window within viewport
      const { offsetWidth, offsetHeight } = terminalRef.current;
      newX = Math.max(0, Math.min(newX, window.innerWidth - offsetWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - offsetHeight));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Handle close button click with notification for disabled state
  const handleCloseClick = (e) => {
    e.stopPropagation();
    
    if (isCloseDisabled && onShowNotification) {
      onShowNotification(
        `Fix command is running. Close button will be enabled in ${disableTimeRemaining} seconds.`,
        'warning'
      );
      return;
    }
    
    onClose(id);
  };

  if (!isVisible) {
    return null;
  }

  // Apply zIndex and initialPosition in style
  const style = {
    position: 'fixed', // Ensure it's fixed for proper positioning
    top: `${position.y}px`, // Use provided position or fallback
    left: `${position.x}px`,
    zIndex: zIndex || 1000, // Apply zIndex or a default
  };

  return (
    <div
      ref={terminalRef}
      className="floating-terminal-window"
      style={style}
      // onClick={() => onFocus && onFocus(id)} // Option 1: Click anywhere on window
    >
      <div
        className="floating-terminal-title-bar"
        onMouseDown={handleMouseDown} // Attach mouse down handler for dragging
        // onClick is now handled by onMouseDown ensuring focus on drag start as well
      >
        <span className="floating-terminal-title">{title}</span>
        <div className="floating-terminal-controls">
          <button
            className="floating-terminal-info-btn"
            onClick={(e) => { e.stopPropagation(); onOpenInfo && onOpenInfo(id); }}
            title="Terminal Information"
          >
            <InformationCircleIcon className="icon" />
          </button>
          <button
            className="floating-terminal-minimize-btn"
            onClick={(e) => { e.stopPropagation(); onMinimize && onMinimize(id); }}
            title="Minimize Terminal"
          >
            {/* Simple minimize icon (e.g., underscore) */}
            {/* Using Heroicon later might be better for consistency */}
            _
          </button>
          <button
            className="floating-terminal-close-btn"
            onClick={handleCloseClick}
            title={isCloseDisabled ? `Close disabled (${disableTimeRemaining}s remaining)` : "Close Terminal"}
            disabled={isCloseDisabled}
          >
            &times; {/* Simple 'X' icon */}
          </button>
        </div>
      </div>
      <div className="floating-terminal-content">
        {/* Render TerminalComponent only when visible and not minimized,
            or let TerminalComponent handle its own internal active state based on a prop */}
        <TerminalComponent
          key={id} // Important for React to treat new terminals as distinct
          id={id}
          active={true} // Floating terminals, when visible, are considered active
          initialCommand={command}
          noRunMode={noRunMode} // Pass down the noRunMode prop
        />
      </div>
    </div>
  );
};

export default FloatingTerminal;
