import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const TerminalComponent = ({ id, active, initialCommand, noRunMode, isReadOnly, isErrorTab, errorMessage, onProcessStarted, isAutoSetup, scrollback = 1000, fontSize = 14 }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const searchAddonRef = useRef(null);
  const webglAddonRef = useRef(null);
  const clipboardAddonRef = useRef(null);
  const webLinksAddonRef = useRef(null);
  
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ current: 0, total: 0 });

  // Search functionality methods
  const handleSearch = (term, direction = 'next') => {
    if (!searchAddonRef.current || !term) return;
    
    try {
      let found = false;
      if (direction === 'next') {
        found = searchAddonRef.current.findNext(term, { caseSensitive: false });
      } else {
        found = searchAddonRef.current.findPrevious(term, { caseSensitive: false });
      }
      
      // Note: The search addon doesn't provide result count in the current API
      // We'll show a simple found/not found indication
      setSearchResults(prev => ({
        ...prev,
        current: found ? 1 : 0,
        total: found ? 1 : 0
      }));
    } catch (error) {
      console.warn('Search error:', error);
    }
  };

  const handleSearchInput = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term) {
      handleSearch(term, 'next');
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handleSearch(searchTerm, 'previous');
      } else {
        handleSearch(searchTerm, 'next');
      }
    } else if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchTerm('');
      if (xtermRef.current) {
        xtermRef.current.focus();
      }
    }
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchTerm('');
    setSearchResults({ current: 0, total: 0 });
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  // Keyboard event handler for search shortcut
  useEffect(() => {
    if (!active || isErrorTab) return;

    const handleKeyDown = (e) => {
      // Ctrl+F or Cmd+F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        // Focus will be set to search input in the next effect
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, isErrorTab]);

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch) {
      const searchInput = document.querySelector(`#search-input-${id}`);
      if (searchInput) {
        searchInput.focus();
      }
    }
  }, [showSearch, id]);

  // Effect for initializing xterm instance and PTY communication
  // This effect runs once when initialCommand or id changes, and sets up the PTY.
  // It no longer depends on `active` for spawning/killing the PTY.
  useEffect(() => {
    if (isErrorTab) return; // Do not initialize xterm for error tabs
    if (!terminalRef.current || !initialCommand || xtermRef.current) return; // Only run if we have a ref, a command, and no existing xterm instance

    const term = new XTerm({
      cursorBlink: true,
      convertEol: true, 
      scrollback: scrollback,
      theme: {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
        cursor: '#f0f0f0'
      },
      disableStdin: isReadOnly === true, // Disable input if isReadOnly is true
      fontSize: fontSize
    });
    
    // Initialize addons
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webglAddon = new WebglAddon();
    const clipboardAddon = new ClipboardAddon();
    const webLinksAddon = new WebLinksAddon();
    
    // Store addon references
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    webglAddonRef.current = webglAddon;
    clipboardAddonRef.current = clipboardAddon;
    webLinksAddonRef.current = webLinksAddon;
    
    // Load addons
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(webglAddon);
    term.loadAddon(clipboardAddon);
    term.loadAddon(webLinksAddon);
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
        
        // For Auto Setup terminals, simulate successful completion after a delay
        if (isAutoSetup) {
          // Simulate command execution with visual feedback
          setTimeout(() => {
            term.write('\x1b[33mStarting simulation...\x1b[0m\r\n');
          }, 500);
          
          // Simulate successful completion
          setTimeout(() => {
            term.write('\x1b[32m[SIMULATED SUCCESS]\x1b[0m\r\n');
            term.write('Command would have completed successfully.\r\n');
            
            // Create a custom event to simulate command completion
            const simulationEvent = new CustomEvent('autoSetupSimulation', {
              detail: { 
                terminalId: id, 
                status: 'done', 
                exitCode: 0,
                exitStatus: 'Command completed successfully (simulated)'
              }
            });
            
            // Dispatch the event to be caught by FloatingTerminal
            window.dispatchEvent(simulationEvent);
          }, 2000); // 2 second delay to simulate command execution
        }
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
          searchAddonRef.current = null;
          webglAddonRef.current = null;
          clipboardAddonRef.current = null;
          webLinksAddonRef.current = null;
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
      searchAddonRef.current = null;
      webglAddonRef.current = null;
      clipboardAddonRef.current = null;
      webLinksAddonRef.current = null;
      if (window.terminals && window.terminals[id]) {
        delete window.terminals[id];
      }
    };
  }, [id, initialCommand, noRunMode, isReadOnly, fontSize]); // Re-run if id, initialCommand, noRunMode, or isReadOnly changes

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
    <div className={`terminal-inner-container ${active ? 'active' : ''}`}>
      {/* Search UI */}
      {showSearch && (
        <div className="terminal-search-bar">
          <div className="search-input-container">
            <input
              id={`search-input-${id}`}
              type="text"
              value={searchTerm}
              onChange={handleSearchInput}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search..."
              className="search-input"
            />
            <div className="search-controls">
              <button
                onClick={() => handleSearch(searchTerm, 'previous')}
                disabled={!searchTerm}
                className="search-btn search-prev"
                title="Previous (Shift+Enter)"
              >
                ↑
              </button>
              <button
                onClick={() => handleSearch(searchTerm, 'next')}
                disabled={!searchTerm}
                className="search-btn search-next"
                title="Next (Enter)"
              >
                ↓
              </button>
              <span className="search-results">
                {searchTerm && (searchResults.total > 0 ? 'Found' : 'Not found')}
              </span>
              <button
                onClick={closeSearch}
                className="search-btn search-close"
                title="Close (Escape)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Terminal */}
      <div 
        ref={terminalRef}
        className={`terminal-instance-wrapper ${active ? 'active' : ''}`}
        // Inline styles removed, display will be handled by .active class in CSS for this wrapper too
      />
    </div>
  );
};

export default TerminalComponent; 