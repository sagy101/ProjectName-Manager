import React, { useEffect, useRef, useState, useCallback } from 'react';
import TerminalComponent from '../terminal/components/Terminal';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import './floating-terminal.css'; // We will create this CSS file next
import { loggers } from '../common/utils/debugUtils.js';

// Use the dedicated floating terminal logger
const log = loggers.floating;

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
  isAutoSetup = false, // New prop to identify auto setup terminals
  onShowNotification, // New prop for showing notifications
  onCommandComplete, // New prop for when command completes
  noRunMode, // New prop for no-run mode
  settings // New prop for settings including scrollback
}) => {
  const terminalRef = useRef(null);
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCloseDisabled, setIsCloseDisabled] = useState(false);
  const [disableTimeRemaining, setDisableTimeRemaining] = useState(0);
  const [terminalStatus, setTerminalStatus] = useState('idle');
  const [wasVisible, setWasVisible] = useState(isVisible);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [status, setStatus] = useState('idle');
  const [exitCode, setExitCode] = useState(0);

  // Define the callback outside of useEffect
  const handleCommandFinished = useCallback((terminalId, status, exitCode) => {
    log.debug('handleCommandFinished called for terminalId:', terminalId, 'status:', status, 'exitCode:', exitCode);
    log.debug('My ID:', id, 'isAutoSetup:', isAutoSetup, 'isMinimized:', isMinimized);
    
    if (terminalId === id) {
      log.debug('This event is for me! Setting status to:', status);
      setStatus(status);
      setExitCode(exitCode);
      
      // Handle auto-close logic for auto-setup and fix commands
      if ((isAutoSetup || isFixCommand)) {
        // Auto-close logic for successful commands
        const shouldAutoClose = status !== 'running';
        
        log.debug('Auto-close check:', {
          shouldAutoClose,
          status,
          exitCode,
          isAutoSetup,
          isFixCommand,
          isMinimized
        });
        
        if (shouldAutoClose) {
          log.debug('Will auto-close in 2 seconds');
          setTimeout(() => {
            log.debug('Auto-closing now');
            onClose(id);
          }, 2000);
        } else {
          log.debug('Will NOT auto-close');
        }
      }
      
      if (onCommandComplete) {
        log.debug('Calling onCommandComplete with:', id, status, exitCode);
        onCommandComplete(id, status, exitCode);
      } else {
        log.debug('NOT calling onCommandComplete');
      }
    } else {
      log.debug('Event not for me (terminalId:', terminalId, 'vs my id:', id, ')');
    }
  }, [id, isAutoSetup, isMinimized, onClose, onCommandComplete]);

  // Effect to update position if initialPosition prop changes externally (e.g., centering on re-open)
  // However, this might conflict with user dragging. Typically, initialPosition is for the first render.
  // For now, we set position once from initialPosition.
  useEffect(() => {
    setPosition(initialPosition || { x: 50, y: 50 });
  }, [initialPosition?.x, initialPosition?.y]); // Only re-run if initialPosition object reference itself changes or x/y

  // Effect to handle terminal resize when becoming visible (for auto setup terminals that start hidden)
  useEffect(() => {
    if (isVisible && !wasVisible) {
      // Terminal just became visible, trigger resize after a short delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (window.electron?.resizeTerminal) {
          window.electron.resizeTerminal({ terminalId: id });
        }
        // Also trigger a window resize event that xterm.js might be listening to
        window.dispatchEvent(new Event('resize'));
      }, 100);
      
      return () => clearTimeout(timer);
    }
    setWasVisible(isVisible);
  }, [isVisible, wasVisible, id]);

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
    const handleCommandStarted = ({ terminalId }) => {
      if (terminalId === id) {
        setTerminalStatus('running');
      }
    };

    // Handler for simulation events (No Run Mode for Auto Setup)
    const handleSimulationEvent = (event) => {
      const { terminalId, status, exitCode } = event.detail;
      if (terminalId === id) {
        handleCommandFinished(terminalId, status, exitCode);
      }
    };

    // Wrapper to handle both object and separate parameter formats
    const commandFinishedWrapper = (data) => {
      if (typeof data === 'object' && data.terminalId) {
        // Object format from tests: { terminalId, status, exitCode }
        handleCommandFinished(data.terminalId, data.status, data.exitCode);
      } else {
        // Separate parameters format: (terminalId, status, exitCode)
        handleCommandFinished(...arguments);
      }
    };

    // Listen for real command events (when electron is available)
    let removeCommandFinished, removeCommandStarted;
    if (window.electron) {
      removeCommandFinished = window.electron.onCommandFinished?.(commandFinishedWrapper);
      removeCommandStarted = window.electron.onCommandStarted?.(handleCommandStarted);
    }

    // Listen for simulation events (No Run Mode)
    window.addEventListener('autoSetupSimulation', handleSimulationEvent);

    return () => {
      removeCommandFinished?.();
      removeCommandStarted?.();
      window.removeEventListener('autoSetupSimulation', handleSimulationEvent);
    };
  }, [id, isFixCommand, isAutoSetup, isMinimized, onClose, onCommandComplete]);

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

  // Apply zIndex and initialPosition in style
  const style = {
    position: 'fixed', // Ensure it's fixed for proper positioning
    top: `${position.y}px`, // Use provided position or fallback
    left: `${position.x}px`,
    zIndex: zIndex || 1000, // Apply zIndex or a default
    display: isVisible ? 'block' : 'none' // Control visibility with CSS
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
        {/* Always render TerminalComponent to preserve state and allow background execution */}
        <TerminalComponent
          key={id} // Important for React to treat new terminals as distinct
          id={id}
          active={true} // Always active for background execution
          initialCommand={command}
          noRunMode={noRunMode} // Pass down the noRunMode prop
          isAutoSetup={isAutoSetup} // Pass down auto setup flag for simulation
          scrollback={settings?.terminalScrollback || 1000} // Pass down scrollback setting
          fontSize={settings?.terminalFontSize || 14} // Pass down font size setting
        />
      </div>
    </div>
  );
};

export default FloatingTerminal;
