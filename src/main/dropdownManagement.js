const { exec } = require('child_process');
const { resolveEnvVars } = require('../mainUtils');

// Generic dropdown cache
let dropdownCache = {}; // Keyed by dropdown ID and args
let dropdownLoadingState = {}; // Track loading state for each dropdown

// Function to fetch dropdown options with caching
async function fetchDropdownOptions(dropdownId, config) {
  const cacheKey = `${dropdownId}:${JSON.stringify(config)}`;
  
  // Check if already loading
  if (dropdownLoadingState[cacheKey]) {
    // Wait for the existing operation to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!dropdownLoadingState[cacheKey]) {
          clearInterval(checkInterval);
          resolve(dropdownCache[cacheKey] || { options: [] });
        }
      }, 100);
    });
  }

  // Check cache first
  if (dropdownCache[cacheKey]) {
    console.log(`Returning cached options for dropdown ${dropdownId}`);
    return dropdownCache[cacheKey];
  }

  // Mark as loading
  dropdownLoadingState[cacheKey] = true;

  try {
    const { command, parseScript } = config;
    
    if (!command) {
      console.warn(`No command specified for dropdown ${dropdownId}`);
      dropdownCache[cacheKey] = { options: [] };
      return dropdownCache[cacheKey];
    }

    // Resolve environment variables in the command
    const resolvedCommand = resolveEnvVars(command);
    console.log(`Fetching dropdown options for ${dropdownId} with command: ${resolvedCommand}`);

    const result = await new Promise((resolve) => {
      exec(resolvedCommand, { 
        timeout: 10000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Dropdown command failed for ${dropdownId}: ${stderr || error.message}`);
          resolve({ success: false, stdout: '', stderr: stderr || error.message });
        } else {
          resolve({ success: true, stdout: stdout.trim(), stderr: stderr.trim() });
        }
      });
    });

    if (!result.success) {
      console.error(`Failed to fetch dropdown options for ${dropdownId}:`, result.stderr);
      dropdownCache[cacheKey] = { options: [], error: result.stderr };
      return dropdownCache[cacheKey];
    }

    // Parse the output
    let options = [];
    if (parseScript) {
      try {
        // Create a safe evaluation context
        const parseFunction = new Function('stdout', 'stderr', parseScript);
        options = parseFunction(result.stdout, result.stderr) || [];
      } catch (parseError) {
        console.error(`Error parsing dropdown output for ${dropdownId}:`, parseError);
        options = [];
      }
    } else {
      // Default parsing: split by lines and filter empty lines
      options = result.stdout.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => ({ value: line, label: line }));
    }

    const resultData = { options };
    dropdownCache[cacheKey] = resultData;
    console.log(`Cached ${options.length} options for dropdown ${dropdownId}`);
    
    return resultData;
  } catch (error) {
    console.error(`Error fetching dropdown options for ${dropdownId}:`, error);
    dropdownCache[cacheKey] = { options: [], error: error.message };
    return dropdownCache[cacheKey];
  } finally {
    // Mark as no longer loading
    dropdownLoadingState[cacheKey] = false;
  }
}

// Function to execute dropdown commands
async function executeDropdownCommand(command, args, parseResponse) {
  try {
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
    console.log(`Executing dropdown command: ${resolvedCommand}`);

    const result = await new Promise((resolve) => {
      exec(resolvedCommand, { 
        timeout: 30000, // Longer timeout for commands that might take time
        maxBuffer: 1024 * 1024 // 1MB buffer
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Dropdown command execution failed: ${stderr || error.message}`);
          resolve({ success: false, stdout: stdout.trim(), stderr: stderr.trim() });
        } else {
          console.log(`Dropdown command executed successfully`);
          resolve({ success: true, stdout: stdout.trim(), stderr: stderr.trim() });
        }
      });
    });

    let parsedResponse = null;
    if (parseResponse && result.success) {
      try {
        // Handle standard parsing modes
        if (parseResponse === 'lines') {
          // Split by lines and filter empty lines
          parsedResponse = result.stdout.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        } else if (parseResponse === 'json') {
          // Parse as JSON
          parsedResponse = JSON.parse(result.stdout);
          if (!Array.isArray(parsedResponse)) {
            console.warn('JSON response is not an array, wrapping in array');
            parsedResponse = [parsedResponse];
          }
        } else if (typeof parseResponse === 'string' && parseResponse.startsWith('function')) {
          // Custom parsing function (passed as string, we'll eval it - be careful!)
          const parseFunc = eval(`(${parseResponse})`);
          parsedResponse = parseFunc(result.stdout);
        } else {
          // Create a safe evaluation context for parsing response
          const parseFunction = new Function('stdout', 'stderr', parseResponse);
          parsedResponse = parseFunction(result.stdout, result.stderr);
        }
      } catch (parseError) {
        console.error('Error parsing dropdown command response:', parseError);
        parsedResponse = null;
      }
    }

    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      parsed: parsedResponse,
      options: parsedResponse || [] // Add options field for compatibility
    };
  } catch (error) {
    console.error('Error executing dropdown command:', error);
    return {
      success: false,
      stdout: '',
      stderr: error.message,
      parsed: null,
      options: []
    };
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
  fetchDropdownOptions,
  executeDropdownCommand,
  handleDropdownValueChange,
  clearDropdownCache,
  getDropdownCacheStats
}; 