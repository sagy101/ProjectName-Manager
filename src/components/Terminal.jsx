import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TerminalComponent = ({ id, active, initialCommand, noRunMode, isReadOnly, isErrorTab, errorMessage, onProcessStarted }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  // Effect for initializing xterm instance and PTY communication
  // This effect runs once when initialCommand or id changes, and sets up the PTY.
  // It no longer depends on `active` for spawning/killing the PTY.
  useEffect(() => {
    if (isErrorTab) return; // Do not initialize xterm for error tabs
    if (!terminalRef.current || !initialCommand || xtermRef.current) return; // Only run if we have a ref, a command, and no existing xterm instance

    const term = new XTerm({
      cursorBlink: true,
      convertEol: true, 
      scrollback: 5000,
      theme: {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
        cursor: '#f0f0f0'
      },
      disableStdin: isReadOnly === true // Disable input if isReadOnly is true
    });
    const fitAddon = new FitAddon();
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    term.open(terminalRef.current); 
    // Initial fit will be handled by the visibility effect or when `active` becomes true.

    if (window.electron) {
      const { cols, rows } = term;
      
      if (noRunMode) {
        // In no-run mode, just display the command without executing it
        term.write('\r\n\x1b[33m[NO-RUN MODE]\x1b[0m\r\n');
        term.write('\x1b[32m$\x1b[0m ' + initialCommand + '\r\n');
        term.write('\r\n\x1b[90mCommand displayed but not executed.\x1b[0m\r\n');
        
        // Store terminal reference for potential future writes
        if (!window.terminals) window.terminals = {};
        window.terminals[id] = {
          write: (data) => term.write(data),
          term: term
        };
      } else {
        // Normal mode - spawn PTY and execute command
        window.electron.ptySpawn(initialCommand, String(id), cols, rows);
        
        // Notify parent that process has started
        if (onProcessStarted) {
          onProcessStarted(id);
        }
        
        const removePtyOutputListener = window.electron.onPtyOutput(String(id), (output) => {
          term.write(output);
        });

        let onDataDisposable;
        if (!isReadOnly) { // Only attach onData listener if not read-only
          onDataDisposable = term.onData(data => {
            window.electron.ptyInput(String(id), data);
          });
        }

        const onResizeDisposable = term.onResize(({ cols: newCols, rows: newRows }) => {
          window.electron.ptyResize(String(id), newCols, newRows);
          // fitAddon.fit(); // FitAddon should be called when the *container* resizes or becomes visible
        });
        
        if (!window.terminals) window.terminals = {};
        window.terminals[id] = {
          write: (data) => term.write(data),
          term: term
        };

        return () => { // This cleanup runs when the component unmounts (tab is closed)
          removePtyOutputListener();
          if (onDataDisposable) onDataDisposable.dispose();
          onResizeDisposable.dispose();
          term.dispose();
          xtermRef.current = null;
          fitAddonRef.current = null;
          if (window.terminals && window.terminals[id]) {
            delete window.terminals[id];
          }
          window.electron.killProcess(String(id)); // Kill PTY when tab is closed
        };
      }
    }
    
    // Cleanup for no-run mode
    return () => {
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      if (window.terminals && window.terminals[id]) {
        delete window.terminals[id];
      }
    };
  }, [id, initialCommand, noRunMode, isReadOnly]); // Re-run if id, initialCommand, noRunMode, or isReadOnly changes

  // Effect for handling visibility and fitting the addon
  useEffect(() => {
    if (active && xtermRef.current && fitAddonRef.current) {
      fitAddonRef.current.fit();
    } 
    // If you want to clear the terminal when it becomes inactive:
    // if (!active && xtermRef.current) { xtermRef.current.clear(); }
  }, [active, isErrorTab]); // Add isErrorTab to dependencies

  // Handle window resize to refit the terminal if it is active
  useEffect(() => {
    if (isErrorTab || !active || !xtermRef.current || !fitAddonRef.current) return; // Also check isErrorTab here

    const handleResize = () => {
      fitAddonRef.current?.fit();
    };
    window.addEventListener('resize', handleResize);
    // Call fit once when the active terminal mounts or becomes active with a valid ref
    if (terminalRef.current) { 
        fitAddonRef.current?.fit();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [active, isErrorTab]); // Rerun if active status changes or if it's an error tab

  if (isErrorTab) {
    return (
      <div
        className={`terminal-instance error-display-tab ${active ? 'active' : ''}`}
        // Inline styles removed
      >
        <div className="error-message-container">
          <div className="error-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm0-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
            </svg>
          </div>
          <pre className="error-message-text">{errorMessage}</pre>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={terminalRef}
      className={`terminal-instance-wrapper ${active ? 'active' : ''}`}
      // Inline styles removed, display will be handled by .active class in CSS for this wrapper too
    />
  );
};

export default TerminalComponent; 