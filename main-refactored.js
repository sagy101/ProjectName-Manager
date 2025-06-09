const { app, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');

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

// ==================== IPC HANDLERS ====================

// Environment verification handlers
ipcMain.handle('fetch-dropdown-options', async (event, { dropdownId, config }) => {
  return await dropdownManagement.fetchDropdownOptions(dropdownId, config);
});

ipcMain.handle('get-environment-verification', async () => {
  return environmentVerification.getEnvironmentVerification();
});

ipcMain.handle('refresh-environment-verification', async () => {
  return await environmentVerification.refreshEnvironmentVerification();
});

// Dropdown command execution
ipcMain.handle('execute-dropdown-command', async (event, { command, args, parseResponse }) => {
  return await dropdownManagement.executeDropdownCommand(command, args, parseResponse);
});

// Process management
ipcMain.on('kill-process', (event, data) => {
  const { pid } = data;
  if (!pid) {
    console.warn('No PID provided for kill-process');
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    console.log(`Process ${pid} killed successfully`);
    event.reply('process-killed', { success: true, pid });
  } catch (error) {
    console.error(`Failed to kill process ${pid}:`, error.message);
    event.reply('process-killed', { success: false, pid, error: error.message });
  }
});

// Container management
ipcMain.handle('stop-containers', async (event, containerNames) => {
  return await containerManagement.stopContainers(containerNames);
});

ipcMain.handle('get-container-status', async (event, containerName) => {
  return await containerManagement.getContainerStatus(containerName);
});

// Development tools
ipcMain.on('open-dev-tools', (event) => {
  windowManagement.openDevTools();
});

ipcMain.on('reload-app', (event) => {
  windowManagement.reloadApp();
});

// Dropdown value changes
ipcMain.on('dropdown-value-changed', (event, { dropdownId, value }) => {
  dropdownManagement.handleDropdownValueChange(dropdownId, value);
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

// PTY/Terminal management
ipcMain.on('pty-spawn', (event, { command, terminalId, cols, rows }) => {
  const result = ptyManagement.spawnPTY(command, terminalId, cols, rows);
  
  if (result.success) {
    // Set up event handlers for this PTY
    ptyManagement.setupPTYEventHandlers(terminalId, mainWindow);
  }
  
  event.reply('pty-spawn-result', result);
});

ipcMain.on('pty-input', (event, { terminalId, data }) => {
  const result = ptyManagement.writeToPTY(terminalId, data);
  if (!result.success) {
    console.warn(`Failed to write to PTY ${terminalId}:`, result.error);
  }
});

ipcMain.on('pty-resize', (event, { terminalId, cols, rows }) => {
  const result = ptyManagement.resizePTY(terminalId, cols, rows);
  if (!result.success) {
    console.warn(`Failed to resize PTY ${terminalId}:`, result.error);
  }
});

// ==================== APP LIFECYCLE ====================

app.whenReady().then(async () => {
  console.log('App is ready, initializing...');
  
  // Create the main window
  mainWindow = windowManagement.createWindow();
  
  // Load display settings
  const displaySettings = await configurationManagement.loadDisplaySettings();
  if (displaySettings.success) {
    console.log('Display settings loaded:', displaySettings.displaySettings);
  }
  
  // Start environment verification
  console.log('Starting environment verification...');
  try {
    await environmentVerification.verifyEnvironment();
    console.log('Environment verification completed');
  } catch (error) {
    console.error('Environment verification failed:', error);
  }
});

app.on('window-all-closed', () => {
  // Clean up all PTY processes
  ptyManagement.killAllPTYProcesses();
  
  // On macOS, apps typically stay open even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked and no windows are open
  if (!mainWindow) {
    mainWindow = windowManagement.createWindow();
  }
});

app.on('before-quit', () => {
  console.log('App is quitting, cleaning up...');
  
  // Clean up all PTY processes
  ptyManagement.killAllPTYProcesses();
  
  // Clear all caches
  dropdownManagement.clearDropdownCache();
});

// Handle app errors
app.on('web-contents-created', (event, contents) => {
  contents.on('crashed', (event, killed) => {
    console.error('Web contents crashed:', { killed });
  });
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