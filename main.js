const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { generateCommandList } = require('./src/utils/evalUtils');
const { debugLog } = require('./src/utils/debugUtils');

// Make debugLog available globally for any modules that might expect it
global.debugLog = debugLog;

// Handle uncaught exceptions gracefully during tests
if (process.env.NODE_ENV === 'test') {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception in test mode:', error.message);
    if (error.message.includes('node-pty') || error.message.includes('pty.node')) {
      console.log('Continuing test execution despite node-pty error...');
      return; // Don't crash, just log and continue
    }
    throw error; // Re-throw other errors
  });
}

// Import our modular components
const environmentVerification = require('./src/main/environmentVerification');
const gitManagement = require('./src/main/gitManagement');
const dropdownManagement = require('./src/main/dropdownManagement');
const ptyManagement = require('./src/main/ptyManagement');
const containerManagement = require('./src/main/containerManagement');
const configurationManagement = require('./src/main/configurationManagement');
const windowManagement = require('./src/main/windowManagement');

// Import shared constants
const { projectSelectorFallbacks } = require('./src/constants/selectors');

let mainWindow; // This will be managed by windowManagement module

const projectRoot = path.resolve(app.getAppPath(), '..'); // Define projectRoot globally for helpers

// Function to create the main window (corrected version)
function createWindow(displaySettings = {}) {
  // Check if running in test/headless mode
  const isTestMode = process.env.HEADLESS === 'true';
  
  const windowOptions = {
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js') // Updated preload script
    }
  };
  
  // Add invisible window options for test mode
  if (isTestMode) {
    windowOptions.show = false; // Don't show window initially
    windowOptions.skipTaskbar = true; // Don't show in taskbar
    windowOptions.x = -2000; // Position off-screen
    windowOptions.y = -2000;
    windowOptions.minimizable = false;
    windowOptions.maximizable = false;
    windowOptions.closable = true;
    windowOptions.focusable = false;
    console.log('Creating invisible window for test mode');
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadFile('index.html');
  
  // Open DevTools for debugging based on config (but not in test mode)
  if (!isTestMode && displaySettings.openDevToolsByDefault) {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  return mainWindow;
}

async function loadDisplaySettings() {
  try {
    const result = await configurationManagement.loadDisplaySettings();
    return result.success ? result.displaySettings : {};
  } catch (error) {
    console.error('Error loading display settings:', error);
    return {}; // Return empty object on error
  }
}

// ==================== IPC HANDLERS ====================

// Setup modular IPC handlers
dropdownManagement.setupDropdownIpcHandlers(ipcMain);

ipcMain.handle('get-environment-verification', async () => {
  return environmentVerification.getEnvironmentVerification();
});

ipcMain.handle('refresh-environment-verification', async () => {
  return await environmentVerification.refreshEnvironmentVerification(mainWindow);
});

ipcMain.handle('rerun-single-verification', async (event, verificationId) => {
  return await environmentVerification.rerunSingleVerification(verificationId, mainWindow);
});

ipcMain.handle('refresh-git-statuses', async () => {
  return await gitManagement.refreshGitBranches();
});

ipcMain.handle('get-command-for-section', async (event, { config, globalDropdowns, attachState, showTestSections }) => {
  // This handler regenerates the command list based on the latest state from the frontend
  const configSidebarCommands = await configurationManagement.loadCommandsConfig();
  const configSidebarSectionsActual = await configurationManagement.loadSectionsConfig();
  
  return generateCommandList(config, globalDropdowns, {
    attachState,
    configSidebarCommands,
    configSidebarSectionsActual,
    showTestSections
  });
});

// Process management - corrected to match original signature
ipcMain.on('kill-process', (event, data) => {
  const { terminalId } = data;
  ptyManagement.killProcess(terminalId, mainWindow);
});

// Container management
ipcMain.handle('stop-containers', async (event, containerNames) => {
  return await containerManagement.stopContainers(containerNames, mainWindow);
});

ipcMain.handle('get-container-status', async (event, containerName) => {
  return await containerManagement.getContainerStatus(containerName);
});

// Development tools
ipcMain.on('open-dev-tools', (event) => {
  console.log('Opening DevTools by user request');
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
});

ipcMain.handle('is-dev-tools-open', () => {
    if (!mainWindow) return false;
    return mainWindow.webContents.isDevToolsOpened();
});

ipcMain.on('reload-app', (event) => {
  console.log('Reloading app by user request');
  
  // Request renderer to send all associated containers before reload
  if (mainWindow) {
    // Send a message to renderer to stop all containers
    mainWindow.webContents.send('stop-all-containers-before-reload');
    
    // Give some time for containers to stop, then reload
    setTimeout(() => {
      mainWindow.reload();
    }, 1000);
  }
});



// Git management
ipcMain.handle('git-checkout-branch', async (event, { projectPath, branchName }) => {
  return await gitManagement.checkoutGitBranch(projectPath, branchName);
});

ipcMain.handle('git-list-local-branches', async (event, { projectPath }) => {
  return await gitManagement.listLocalGitBranches(projectPath);
});

// Configuration management
ipcMain.handle('get-about-config', async () => {
  return await configurationManagement.getAboutConfig();
});

ipcMain.handle('export-config', async (event, data) => {
  return await configurationManagement.exportConfiguration(data);
});

ipcMain.handle('import-config', async () => {
  return await configurationManagement.importConfiguration();
});

ipcMain.handle('export-environment-data', async () => {
  return environmentVerification.getEnvironmentExportData();
});

// PTY/Terminal management - corrected to match original signature
ipcMain.on('pty-spawn', (event, { command, terminalId, cols, rows }) => {
  ptyManagement.spawnPTY(command, terminalId, cols, rows, projectRoot, mainWindow);
});

ipcMain.on('pty-input', (event, { terminalId, data }) => {
  ptyManagement.writeToPTY(terminalId, data);
});

ipcMain.on('pty-resize', (event, { terminalId, cols, rows }) => {
  ptyManagement.resizePTY(terminalId, cols, rows);
});

ipcMain.on('process-exited', (event, data) => {
    mainWindow.webContents.send('process-exited', data);
});

// ==================== APP LIFECYCLE ====================

app.whenReady().then(async () => {
  console.log('=== APPLICATION STARTUP ===');
  console.log('1. Loading display settings...');
  const displaySettings = await loadDisplaySettings();

  console.log('2. Starting environment verification...');
  
  // Create the main window
  mainWindow = createWindow(displaySettings);
  
  // Perform environment verification first
  try {
    const allVerificationResults = await environmentVerification.verifyEnvironment(mainWindow);
    if (mainWindow) {
      mainWindow.webContents.send('environment-verification-complete', allVerificationResults);
    }
  } catch (error) {
    console.error('Error during initial environment verification:', error);
  }

  // Initial dropdown data will be fetched on demand from frontend
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const displaySettings = await loadDisplaySettings();
    createWindow(displaySettings);
  }
});

// Ensure all PTY processes are killed when the app quits
app.on('will-quit', async (event) => {
  // Prevent default quit to allow cleanup
  event.preventDefault();
  
  console.log('Application is about to quit. Cleaning up...');
  
  // Kill all active PTY processes
  ptyManagement.killAllPTYProcesses();
  
  // Request renderer to stop all containers
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('Requesting renderer to stop all containers...');
    mainWindow.webContents.send('stop-all-containers-before-quit');
    
    // Wait a bit for containers to stop
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Now really quit
  app.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV !== 'test') {
    app.quit();
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Main process initialized with modular architecture'); 