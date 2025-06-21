const { exec } = require('child_process');
const { resolveEnvVars } = require('./mainUtils');
const fs = require('fs').promises;
const path = require('path');

// Simple debug logger that matches the global one from main.js
const debugLog = (...args) => {
  if (process.env.DEBUG_LOGS === 'true') {
    console.log(...args);
  }
};

// Generic dropdown cache
let dropdownCache = {}; // Keyed by dropdown ID and args
let dropdownLoadingState = {}; // Track loading state for each dropdown

async function getDropdownOptions(config) {
  const { id, command, args, parseResponse, forceRefresh = false } = config;

  // Replace placeholders in the command with actual values
  let processedCommand = command;
  if (args && typeof args === 'object') {
    for (const [key, value] of Object.entries(args)) {
      const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
      processedCommand = processedCommand.replace(placeholder, value);
    }
  }

  // Resolve environment variables
  const resolvedCommand = resolveEnvVars(processedCommand);

  // Use the resolved command for a unique cache key
  const cacheKey = `${id}:${resolvedCommand}`;

  // Check if already loading
  if (dropdownLoadingState[cacheKey]) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!dropdownLoadingState[cacheKey]) {
          clearInterval(checkInterval);
          resolve(dropdownCache[cacheKey] || { options: [], error: 'Loading timed out' });
        }
      }, 100);
    });
  }

  // Check cache first (unless force refresh is requested)
  if (!forceRefresh && dropdownCache[cacheKey]) {
    debugLog(`Returning cached options for dropdown ${id}`);
    return dropdownCache[cacheKey];
  }

  if (forceRefresh) {
    debugLog(`Force refresh requested for dropdown ${id}, bypassing cache`);
  }

  // Mark as loading
  dropdownLoadingState[cacheKey] = true;
  debugLog(`Fetching dropdown options for ${id} with command: ${resolvedCommand}`);

  try {
    const result = await new Promise((resolve) => {
      exec(resolvedCommand, { timeout: 15000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Dropdown command failed for ${id}: ${stderr || error.message}`);
          resolve({ success: false, stdout: '', stderr: stderr || error.message });
        } else {
          resolve({ success: true, stdout: stdout.trim(), stderr: stderr.trim() });
        }
      });
    });

    if (!result.success) {
      const errorResult = { options: [], error: result.stderr };
      dropdownCache[cacheKey] = errorResult;
      return errorResult;
    }

    let options = [];
    if (parseResponse === 'lines') {
      options = result.stdout.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } else {
      options = [result.stdout];
    }
    
    const resultData = { options };
    dropdownCache[cacheKey] = resultData;
    debugLog(`Cached ${options.length} options for dropdown ${id}`);
    return resultData;

  } catch (error) {
    console.error(`Error in getDropdownOptions for ${id}:`, error);
    const errorResult = { options: [], error: error.message };
    dropdownCache[cacheKey] = errorResult;
    return errorResult;
  } finally {
    dropdownLoadingState[cacheKey] = false;
  }
}

async function precacheGlobalDropdowns(mainWindow = null) {
    debugLog('Starting global dropdown pre-caching...');
    try {
        const configPath = path.join(__dirname, '..', 'environment-verification', 'generalEnvironmentVerifications.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);

        const globalDropdowns = config?.header?.dropdownSelectors || [];

        if (globalDropdowns.length === 0) {
            debugLog('No global dropdowns found to pre-cache.');
            if (mainWindow) {
                mainWindow.webContents.send('dropdown-cached', {
                    cached: 0,
                    total: 0
                });
            }
            return { success: true, precached: 0 };
        }

        let cachedCount = 0;
        const precachePromises = globalDropdowns.map(async dropdownConfig => {
            debugLog(`Pre-caching a global dropdown: ${dropdownConfig.id}`);
            await getDropdownOptions({
                id: dropdownConfig.id,
                command: dropdownConfig.command,
                parseResponse: dropdownConfig.parseResponse,
                args: {}
            });
            cachedCount++;
            if (mainWindow) {
                mainWindow.webContents.send('dropdown-cached', {
                    cached: cachedCount,
                    total: globalDropdowns.length
                });
            }
        });

        await Promise.all(precachePromises);
        debugLog(`Global dropdown pre-caching complete. Cached ${globalDropdowns.length} dropdowns.`);
        return { success: true, precached: globalDropdowns.length };

    } catch (error) {
        console.error('Failed to pre-cache global dropdowns:', error);
        return { success: false, error: error.message };
    }
}

// Function to execute commandOnChange when dropdown value changes
async function executeDropdownChangeCommand(dropdownId, value, globalDropdownValues = {}) {
  try {
    // Load the dropdown configuration to get the commandOnChange
    const dropdownConfig = await getDropdownConfig(dropdownId);
    
    if (!dropdownConfig || !dropdownConfig.commandOnChange) {
      debugLog(`No commandOnChange defined for dropdown ${dropdownId}`);
      return { success: true, message: 'No command configured' };
    }

    // Create substitution values including current dropdown and all global values
    const substitutionValues = {
      ...globalDropdownValues,
      [dropdownId]: value,
      value: value // alias for current value
    };

    // Replace variables in the command template
    let processedCommand = dropdownConfig.commandOnChange;
    for (const [key, val] of Object.entries(substitutionValues)) {
      if (val !== null && val !== undefined) {
        const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
        processedCommand = processedCommand.replace(placeholder, val);
      }
    }

    // Resolve environment variables
    const resolvedCommand = resolveEnvVars(processedCommand);
    
    debugLog(`Executing commandOnChange for ${dropdownId}: ${resolvedCommand}`);

    // Execute the command
    const result = await new Promise((resolve) => {
      exec(resolvedCommand, { timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`CommandOnChange failed for ${dropdownId}: ${stderr || error.message}`);
          resolve({ 
            success: false, 
            error: stderr || error.message,
            stdout: stdout || '',
            stderr: stderr || ''
          });
        } else {
          resolve({ 
            success: true, 
            stdout: stdout.trim(), 
            stderr: stderr.trim(),
            message: `Command executed successfully for ${dropdownId}`
          });
        }
      });
    });

    debugLog(`CommandOnChange result for ${dropdownId}:`, result);
    return result;

  } catch (error) {
    console.error(`Error executing commandOnChange for ${dropdownId}:`, error);
    return { 
      success: false, 
      error: error.message,
      message: `Failed to execute command for ${dropdownId}`
    };
  }
}

// Function to get dropdown configuration by ID
async function getDropdownConfig(dropdownId) {
  try {
    // Check generalEnvironmentVerifications.json first
    const generalConfigPath = path.join(__dirname, '..', 'environment-verification', 'generalEnvironmentVerifications.json');
    const generalConfigData = await fs.readFile(generalConfigPath, 'utf-8');
    const generalConfig = JSON.parse(generalConfigData);
    
    const generalDropdown = generalConfig?.header?.dropdownSelectors?.find(d => d.id === dropdownId);
    if (generalDropdown) {
      return generalDropdown;
    }

    // Check configurationSidebarAbout.json for section-specific dropdowns
    const aboutConfigPath = path.join(__dirname, '..', 'project-config', 'config', 'configurationSidebarAbout.json');
    const aboutConfigData = await fs.readFile(aboutConfigPath, 'utf-8');
    const aboutConfig = JSON.parse(aboutConfigData);
    
    // Look through sections for dropdown configurations
    for (const section of aboutConfig) {
      if (section.dropdownSelectors) {
        const dropdown = section.dropdownSelectors.find(d => d.id === dropdownId);
        if (dropdown) {
          return dropdown;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error loading dropdown config for ${dropdownId}:`, error);
    return null;
  }
}

// Function to handle dropdown value changes
function handleDropdownValueChange(dropdownId, value) {
  debugLog(`Dropdown ${dropdownId} value changed to: ${value}`);
  
  // Clear related caches if needed
  // This is a simple implementation - you might want more sophisticated cache invalidation
  const keysToRemove = Object.keys(dropdownCache).filter(key => key.startsWith(`${dropdownId}:`));
  keysToRemove.forEach(key => {
    delete dropdownCache[key];
  });
  
  if (keysToRemove.length > 0) {
    debugLog(`Cleared ${keysToRemove.length} cache entries for dropdown ${dropdownId}`);
  }
}

// Function to clear dropdown cache
function clearDropdownCache(dropdownId = null) {
  if (dropdownId) {
    // Clear cache for specific dropdown
    const keysToRemove = Object.keys(dropdownCache).filter(key => key.startsWith(`${dropdownId}:`));
    keysToRemove.forEach(key => {
      delete dropdownCache[key];
      delete dropdownLoadingState[key];
    });
    debugLog(`Cleared cache for dropdown ${dropdownId}`);
  } else {
    // Clear all cache
    dropdownCache = {};
    dropdownLoadingState = {};
    debugLog('Cleared all dropdown cache');
  }
}

// Function to get cache stats (for debugging)
function getDropdownCacheStats() {
  return {
    cacheSize: Object.keys(dropdownCache).length,
    loadingCount: Object.keys(dropdownLoadingState).filter(key => dropdownLoadingState[key]).length,
    cacheKeys: Object.keys(dropdownCache),
    loadingKeys: Object.keys(dropdownLoadingState).filter(key => dropdownLoadingState[key])
  };
}

// IPC handler for dropdown value changes - moved here for better modularity
function setupDropdownIpcHandlers(ipcMain) {
  // Dropdown value changes
  ipcMain.on('dropdown-value-changed', async (event, { dropdownId, value, globalDropdownValues }) => {
    console.log(`Dropdown value changed: ${dropdownId} = ${value}`);
    
    // Handle cache management
    handleDropdownValueChange(dropdownId, value);
    
    // Execute commandOnChange if configured
    try {
      const commandResult = await executeDropdownChangeCommand(
        dropdownId, 
        value, 
        globalDropdownValues || {}
      );
      
      // Send result back to renderer
      const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('dropdown-command-executed', {
          dropdownId,
          value,
          result: commandResult
        });
      }
    } catch (error) {
      console.error(`Error executing commandOnChange for ${dropdownId}:`, error);
      const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('dropdown-command-executed', {
          dropdownId,
          value,
          result: {
            success: false,
            error: error.message,
            message: `Failed to execute command for ${dropdownId}`
          }
        });
      }
    }
  });

  // Dropdown options handlers
  ipcMain.handle('get-dropdown-options', async (event, config) => {
    return await getDropdownOptions(config);
  });

  ipcMain.handle('precache-global-dropdowns', async () => {
    const { BrowserWindow } = require('electron');
    const mainWindow = BrowserWindow.getAllWindows()[0];
    return await precacheGlobalDropdowns(mainWindow);
  });
}

module.exports = {
  getDropdownOptions,
  precacheGlobalDropdowns,
  handleDropdownValueChange,
  clearDropdownCache,
  getDropdownCacheStats,
  executeDropdownChangeCommand,
  setupDropdownIpcHandlers
};