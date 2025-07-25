const { contextBridge, ipcRenderer } = require('electron');

// Store event-specific callback tracking for removal
const eventListeners = {
  'command-output': [],
  'process-started': [],
  'process-ended': [],
  'process-killed': [],
  'backend-progress': [],
  'dropdown-command-executed': [],
  'single-verification-updated': [],
  'verification-progress': [],
  'dropdown-cached': [],
  'environment-verification-complete': [],
  'pty-output': {} // Changed to an object to store listeners by terminalId
};

// Create a special direct output handler that bypasses the callback stack
let directOutputCallback = null;

// Expose limited environment variables needed by the renderer
contextBridge.exposeInMainWorld('env', {
  DEBUG_LOGS: process.env.DEBUG_LOGS
});

contextBridge.exposeInMainWorld('electron', {
  // Add the new command generation handler
  getCommandForSection: (data) => ipcRenderer.invoke('get-command-for-section', data),

  // Generic dropdown functions
  getDropdownOptions: (config) => ipcRenderer.invoke('get-dropdown-options', config),
  precacheGlobalDropdowns: () => ipcRenderer.invoke('precache-global-dropdowns'),
      dropdownValueChanged: (dropdownId, value, globalDropdownValues) => ipcRenderer.send('dropdown-value-changed', { dropdownId, value, globalDropdownValues }),

  onBackendProgress: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    eventListeners['backend-progress'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('backend-progress', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('backend-progress', wrapperFn);
      const index = eventListeners['backend-progress'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['backend-progress'].splice(index, 1);
      }
    };
  },

  // Environment verification handlers
  getEnvironmentVerification: () => ipcRenderer.invoke('get-environment-verification'),
  refreshEnvironmentVerification: () => ipcRenderer.invoke('refresh-environment-verification'),
  rerunSingleVerification: (verificationId) => ipcRenderer.invoke('rerun-single-verification', verificationId),
  refreshGitStatuses: () => ipcRenderer.invoke('refresh-git-statuses'),
  onEnvironmentVerificationComplete: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    eventListeners['environment-verification-complete'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('environment-verification-complete', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('environment-verification-complete', wrapperFn);
      const index = eventListeners['environment-verification-complete'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['environment-verification-complete'].splice(index, 1);
      }
    };
  },
  onSingleVerificationUpdated: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    eventListeners['single-verification-updated'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('single-verification-updated', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('single-verification-updated', wrapperFn);
      const index = eventListeners['single-verification-updated'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['single-verification-updated'].splice(index, 1);
      }
    };
  },
  onVerificationProgress: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    eventListeners['verification-progress'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('verification-progress', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('verification-progress', wrapperFn);
      const index = eventListeners['verification-progress'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['verification-progress'].splice(index, 1);
      }
    };
  },
  onDropdownCached: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    eventListeners['dropdown-cached'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('dropdown-cached', wrapperFn);

    return () => {
      ipcRenderer.removeListener('dropdown-cached', wrapperFn);
      const index = eventListeners['dropdown-cached'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['dropdown-cached'].splice(index, 1);
      }
    };
  },

  // Git related functions
  gitCheckoutBranch: (projectPath, branchName) => ipcRenderer.invoke('git-checkout-branch', { projectPath, branchName }),
  gitListLocalBranches: (projectPath) => ipcRenderer.invoke('git-list-local-branches', { projectPath }),

  // Configuration functions
  getAboutConfig: () => ipcRenderer.invoke('get-about-config'),

  // PTY terminal functions
  ptySpawn: (command, terminalId, cols, rows) => {
    ipcRenderer.send('pty-spawn', { command, terminalId, cols, rows });
  },
  ptyInput: (terminalId, data) => {
    ipcRenderer.send('pty-input', { terminalId, data });
  },
  ptyResize: (terminalId, cols, rows) => {
    ipcRenderer.send('pty-resize', { terminalId, cols, rows });
  },
  onPtyOutput: (terminalId, callback) => {
    const wrapperFn = (event, data) => {
      if (data.terminalId === terminalId) {
        callback(data.output);
      }
    };

    if (!eventListeners['pty-output'][terminalId]) {
      eventListeners['pty-output'][terminalId] = [];
    }
    eventListeners['pty-output'][terminalId].push({ callback, wrapper: wrapperFn });
    ipcRenderer.on('pty-output', wrapperFn);


    return () => {
      ipcRenderer.removeListener('pty-output', wrapperFn);
      if (eventListeners['pty-output'][terminalId]) {
        const index = eventListeners['pty-output'][terminalId].findIndex(
          listener => listener.wrapper === wrapperFn
        );
        if (index !== -1) {
          eventListeners['pty-output'][terminalId].splice(index, 1);
          if (eventListeners['pty-output'][terminalId].length === 0) {
            delete eventListeners['pty-output'][terminalId];
          }
        }
      }
    };
  },
  killProcess: (terminalId) => {
    ipcRenderer.send('kill-process', { terminalId });
  },
  openDevTools: () => {
    ipcRenderer.send('open-dev-tools');
  },
  reloadApp: () => {
    ipcRenderer.send('reload-app');
  },
  onCommandOutput: (callback) => {
    const wrapperFn = (event, data) => {
      callback(data);

      if (directOutputCallback) {
        try {
          directOutputCallback(data);
        } catch (e) {
          console.error('Error in direct output callback:', e);
        }
      }
    };
    
    eventListeners['command-output'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('command-output', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('command-output', wrapperFn);
      const index = eventListeners['command-output'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['command-output'].splice(index, 1);
      }
    };
  },
  // Direct output handler
  setDirectOutputHandler: (callback) => {
    directOutputCallback = callback;
    return () => {
      directOutputCallback = null;
    };
  },
  onProcessStarted: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    eventListeners['process-started'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('process-started', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('process-started', wrapperFn);
      const index = eventListeners['process-started'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['process-started'].splice(index, 1);
      }
    };
  },
  onProcessEnded: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    eventListeners['process-ended'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('process-ended', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('process-ended', wrapperFn);
      const index = eventListeners['process-ended'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['process-ended'].splice(index, 1);
      }
    };
  },
  onCommandFinished: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    ipcRenderer.on('command-finished', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('command-finished', wrapperFn);
    };
  },
  onCommandStarted: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    ipcRenderer.on('command-started', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('command-started', wrapperFn);
    };
  },
  onCommandStatusUpdate: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    ipcRenderer.on('command-status-update', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('command-status-update', wrapperFn);
    };
  },
  onProcessKilled: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    eventListeners['process-killed'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('process-killed', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('process-killed', wrapperFn);
      const index = eventListeners['process-killed'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['process-killed'].splice(index, 1);
      }
    };
  },
  removeProcessKilledListener: (callback) => ipcRenderer.removeListener('process-killed', callback),
  
  // Termination status events
  onProcessTerminating: (callback) => ipcRenderer.on('process-terminating', (event, data) => callback(data)),
  removeProcessTerminatingListener: (callback) => ipcRenderer.removeListener('process-terminating', callback),
  onProcessTerminated: (callback) => ipcRenderer.on('process-terminated', (event, data) => callback(data)),
  removeProcessTerminatedListener: (callback) => ipcRenderer.removeListener('process-terminated', callback),
  onContainerTerminating: (callback) => ipcRenderer.on('container-terminating', (event, data) => callback(data)),
  removeContainerTerminatingListener: (callback) => ipcRenderer.removeListener('container-terminating', callback),
  onContainerTerminated: (callback) => ipcRenderer.on('container-terminated', (event, data) => callback(data)),
  removeContainerTerminatedListener: (callback) => ipcRenderer.removeListener('container-terminated', callback),

  // Debug helper to report active listeners
  getActiveListeners: () => {
    return {
      'command-output': eventListeners['command-output'].length,
      'process-started': eventListeners['process-started'].length,
      'process-ended': eventListeners['process-ended'].length,
      'process-killed': eventListeners['process-killed'].length,
      'backend-progress': eventListeners['backend-progress'].length,
      'dropdown-command-executed': eventListeners['dropdown-command-executed'].length,
      'single-verification-updated': eventListeners['single-verification-updated'].length,
      'verification-progress': eventListeners['verification-progress'].length,
      'environment-verification-complete': eventListeners['environment-verification-complete'].length,
      'pty-output-terminals': Object.keys(eventListeners['pty-output']).length,
      'hasDirectHandler': !!directOutputCallback
    };
  },

  // Container management
  stopContainers: (containerNames) => ipcRenderer.invoke('stop-containers', containerNames),
  getContainerStatus: (containerName) => ipcRenderer.invoke('get-container-status', containerName),

  isDevToolsOpen: () => ipcRenderer.invoke('is-dev-tools-open'),
  exportConfig: (data) => ipcRenderer.invoke('export-config', data),
  importConfig: () => ipcRenderer.invoke('import-config'),
  exportEnvironmentData: () => ipcRenderer.invoke('export-environment-data'),
  
  // Container cleanup event handlers
  onStopAllContainersBeforeQuit: (callback) => {
    const wrapperFn = (event) => callback();
    ipcRenderer.on('stop-all-containers-before-quit', wrapperFn);
    return () => {
      ipcRenderer.removeListener('stop-all-containers-before-quit', wrapperFn);
    };
  },
  onStopAllContainersBeforeReload: (callback) => {
    const wrapperFn = (event) => callback();
    ipcRenderer.on('stop-all-containers-before-reload', wrapperFn);
    return () => {
      ipcRenderer.removeListener('stop-all-containers-before-reload', wrapperFn);
    };
  },

  // Dropdown command execution event handler
  onDropdownCommandExecuted: (callback) => {
    const wrapperFn = (event, data) => callback(data);
    eventListeners['dropdown-command-executed'].push({
      callback: callback,
      wrapper: wrapperFn
    });
    ipcRenderer.on('dropdown-command-executed', wrapperFn);
    
    return () => {
      ipcRenderer.removeListener('dropdown-command-executed', wrapperFn);
      const index = eventListeners['dropdown-command-executed'].findIndex(
        listener => listener.wrapper === wrapperFn
      );
      if (index !== -1) {
        eventListeners['dropdown-command-executed'].splice(index, 1);
      }
    };
  }
}); 