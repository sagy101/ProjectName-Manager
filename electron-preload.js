const { contextBridge, ipcRenderer } = require('electron');

// Store event-specific callback tracking for removal
const eventListeners = {
  'command-output': [],
  'process-started': [],
  'process-ended': [],
  'process-killed': [],
  'backend-progress': [],
  'pty-output': {} // Changed to an object to store listeners by terminalId
};

// Create a special direct output handler that bypasses the callback stack
let directOutputCallback = null;

contextBridge.exposeInMainWorld('electron', {
  // Add the new command generation handler
  getCommandForSection: (data) => ipcRenderer.invoke('get-command-for-section', data),

  // Generic dropdown functions
  getDropdownOptions: (config) => ipcRenderer.invoke('get-dropdown-options', config),
  precacheGlobalDropdowns: () => ipcRenderer.invoke('precache-global-dropdowns'),
  dropdownValueChanged: (dropdownId, value) => ipcRenderer.send('dropdown-value-changed', { dropdownId, value }),

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
  onEnvironmentVerificationComplete: (callback) => {
    ipcRenderer.on('environment-verification-complete', (event, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('environment-verification-complete', callback);
    };
  },
  onVerificationProgress: (callback) => {
    ipcRenderer.on('verification-progress', (event, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('verification-progress', callback);
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
  onProcessKilled: (callback) => ipcRenderer.on('process-killed', (event, data) => callback(data)),
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
      'hasDirectHandler': !!directOutputCallback
    };
  },

  // Container management
  stopContainers: (containerNames) => ipcRenderer.invoke('stop-containers', containerNames),
  getContainerStatus: (containerName) => ipcRenderer.invoke('get-container-status', containerName),

  exportConfig: (data) => ipcRenderer.invoke('export-config', data),
  importConfig: () => ipcRenderer.invoke('import-config'),
  
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
  }
}); 