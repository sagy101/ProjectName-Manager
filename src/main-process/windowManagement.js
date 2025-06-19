const { BrowserWindow } = require('electron');
const path = require('path');
const { debugLog } = require('../common/utils/debugUtils');

let mainWindow = null;

// Function to create the main application window
function createWindow() {
  debugLog('Creating main window...');
  
  // Check if running in test/headless mode
  const isTestMode = process.env.HEADLESS === 'true';
  
  const windowOptions = {
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../../electron-preload.js') // Corrected path
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
    debugLog('Creating invisible window for test mode');
  }

  // Create the browser window
  mainWindow = new BrowserWindow(windowOptions);

  // Load the app - corrected path to load from root directory
  mainWindow.loadFile(path.join(__dirname, '../../index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    debugLog('Main window ready to show');
    if (!isTestMode) {
      mainWindow.show();
      
      // Focus the window
      if (mainWindow) {
        mainWindow.focus();
      }
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    debugLog('Main window closed');
    mainWindow = null;
  });

  // Handle window focus events
  mainWindow.on('focus', () => {
    debugLog('Main window focused');
  });

  mainWindow.on('blur', () => {
    debugLog('Main window blurred');
  });

  // Handle window resize events
  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
    debugLog(`Main window resized to ${width}x${height}`);
  });

  // Handle window maximize/unmaximize events
  mainWindow.on('maximize', () => {
    debugLog('Main window maximized');
  });

  mainWindow.on('unmaximize', () => {
    debugLog('Main window unmaximized');
  });

  // Handle window minimize/restore events
  mainWindow.on('minimize', () => {
    debugLog('Main window minimized');
  });

  mainWindow.on('restore', () => {
    debugLog('Main window restored');
  });

  // Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Only allow navigation to the same origin or file protocol
    if (parsedUrl.origin !== new URL(mainWindow.webContents.getURL()).origin && 
        !navigationUrl.startsWith('file://')) {
      console.warn('Navigation blocked:', navigationUrl);
      event.preventDefault();
    }
  });

  // Handle new window creation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    debugLog('Preventing new window creation for:', url);
    return { action: 'deny' };
  });

  debugLog('Main window created successfully');
  return mainWindow;
}

// Function to get the main window instance
function getMainWindow() {
  return mainWindow;
}

// Function to open developer tools
function openDevTools() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    debugLog('Opening developer tools');
    mainWindow.webContents.openDevTools();
    return { success: true };
  } else {
    console.warn('Cannot open dev tools: main window not available');
    return { success: false, error: 'Main window not available' };
  }
}

// Function to reload the application
function reloadApp() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    debugLog('Reloading application');
    mainWindow.reload();
    return { success: true };
  } else {
    console.warn('Cannot reload app: main window not available');
    return { success: false, error: 'Main window not available' };
  }
}

// Function to close the main window
function closeMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    debugLog('Closing main window');
    mainWindow.close();
    return { success: true };
  } else {
    console.warn('Cannot close window: main window not available');
    return { success: false, error: 'Main window not available' };
  }
}

// Function to minimize the main window
function minimizeMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    debugLog('Minimizing main window');
    mainWindow.minimize();
    return { success: true };
  } else {
    return { success: false, error: 'Main window not available' };
  }
}

// Function to maximize the main window
function maximizeMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      debugLog('Unmaximizing main window');
      mainWindow.unmaximize();
    } else {
      debugLog('Maximizing main window');
      mainWindow.maximize();
    }
    return { success: true, isMaximized: mainWindow.isMaximized() };
  } else {
    return { success: false, error: 'Main window not available' };
  }
}

// Function to show the main window
function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    debugLog('Showing main window');
    mainWindow.show();
    mainWindow.focus();
    return { success: true };
  } else {
    return { success: false, error: 'Main window not available' };
  }
}

// Function to hide the main window
function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    debugLog('Hiding main window');
    mainWindow.hide();
    return { success: true };
  } else {
    return { success: false, error: 'Main window not available' };
  }
}

// Function to get window state information
function getWindowState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [width, height] = mainWindow.getSize();
    const [x, y] = mainWindow.getPosition();
    
    return {
      success: true,
      state: {
        width,
        height,
        x,
        y,
        isMaximized: mainWindow.isMaximized(),
        isMinimized: mainWindow.isMinimized(),
        isFocused: mainWindow.isFocused(),
        isVisible: mainWindow.isVisible(),
        isFullScreen: mainWindow.isFullScreen()
      }
    };
  } else {
    return { success: false, error: 'Main window not available' };
  }
}

// Function to set window state
function setWindowState(state) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { success: false, error: 'Main window not available' };
  }

  try {
    if (state.width && state.height) {
      mainWindow.setSize(state.width, state.height);
    }
    
    if (state.x !== undefined && state.y !== undefined) {
      mainWindow.setPosition(state.x, state.y);
    }
    
    if (state.isMaximized) {
      mainWindow.maximize();
    } else if (state.isMinimized) {
      mainWindow.minimize();
    }
    
    debugLog('Window state updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error setting window state:', error);
    return { success: false, error: error.message };
  }
}

// Function to send data to the renderer process
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
    return { success: true };
  } else {
    return { success: false, error: 'Main window not available' };
  }
}

// Function to check if window is ready
function isWindowReady() {
  return mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.isLoading() === false;
}

module.exports = {
  createWindow,
  getMainWindow,
  openDevTools,
  reloadApp,
  closeMainWindow,
  minimizeMainWindow,
  maximizeMainWindow,
  showMainWindow,
  hideMainWindow,
  getWindowState,
  setWindowState,
  sendToRenderer,
  isWindowReady
}; 