const { exec } = require('child_process');
const { resolveEnvVars } = require('./mainUtils');
const fs = require('fs').promises;
const path = require('path');

// Generic dropdown cache
let dropdownCache = {}; // Keyed by dropdown ID and args
let dropdownLoadingState = {}; // Track loading state for each dropdown

async function getDropdownOptions(config) {
  const { id, command, args, parseResponse } = config;

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

  // Check cache first
  if (dropdownCache[cacheKey]) {
    console.log(`Returning cached options for dropdown ${id}`);
    return dropdownCache[cacheKey];
  }

  // Mark as loading
  dropdownLoadingState[cacheKey] = true;
  console.log(`Fetching dropdown options for ${id} with command: ${resolvedCommand}`);

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
    console.log(`Cached ${options.length} options for dropdown ${id}`);
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

async function precacheGlobalDropdowns() {
    console.log('Starting global dropdown pre-caching...');
    try {
        const configPath = path.join(__dirname, '..', 'generalEnvironmentVerifications.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);

        const globalDropdowns = config?.header?.dropdownSelectors || [];

        if (globalDropdowns.length === 0) {
            console.log('No global dropdowns found to pre-cache.');
            return { success: true, precached: 0 };
        }

        const precachePromises = globalDropdowns.map(dropdownConfig => {
            console.log(`Pre-caching a global dropdown: ${dropdownConfig.id}`);
            return getDropdownOptions({
                id: dropdownConfig.id,
                command: dropdownConfig.command,
                parseResponse: dropdownConfig.parseResponse,
                args: {} 
            });
        });

        await Promise.all(precachePromises);
        console.log(`Global dropdown pre-caching complete. Cached ${globalDropdowns.length} dropdowns.`);
        return { success: true, precached: globalDropdowns.length };

    } catch (error) {
        console.error('Failed to pre-cache global dropdowns:', error);
        return { success: false, error: error.message };
    }
}

// Function to handle dropdown value changes
function handleDropdownValueChange(dropdownId, value) {
  console.log(`Dropdown ${dropdownId} value changed to: ${value}`);
  
  // Clear related caches if needed
  // This is a simple implementation - you might want more sophisticated cache invalidation
  const keysToRemove = Object.keys(dropdownCache).filter(key => key.startsWith(`${dropdownId}:`));
  keysToRemove.forEach(key => {
    delete dropdownCache[key];
  });
  
  if (keysToRemove.length > 0) {
    console.log(`Cleared ${keysToRemove.length} cache entries for dropdown ${dropdownId}`);
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
    console.log(`Cleared cache for dropdown ${dropdownId}`);
  } else {
    // Clear all cache
    dropdownCache = {};
    dropdownLoadingState = {};
    console.log('Cleared all dropdown cache');
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

module.exports = {
  getDropdownOptions,
  precacheGlobalDropdowns,
  handleDropdownValueChange,
  clearDropdownCache,
  getDropdownCacheStats
};