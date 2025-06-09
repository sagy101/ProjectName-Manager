const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { exec, execSync } = require('child_process'); // Added execSync
const fs = require('fs').promises;
const fsSync = require('fs');
const pty = require('node-pty'); // Added node-pty
const { exportConfigToFile, importConfigFromFile } = require('./configIO');

// Import shared constants
const { projectSelectorFallbacks } = require('./src/constants/selectors');

let mainWindow;
// Store active processes by terminalId
const activeProcesses = {}; // This will now store pty processes

// Generic dropdown cache
let dropdownCache = {}; // Keyed by dropdown ID and args
let dropdownLoadingState = {}; // Track loading state for each dropdown

// Dynamic cache for environment verification
let environmentCaches = {
  general: null
  // All other sections will be added dynamically from JSON
};

let isVerifyingEnvironment = false; // Global flag for the whole process

const projectRoot = path.resolve(app.getAppPath(), '..'); // Define projectRoot globally for helpers

// Path to the verifications configuration file
const VERIFICATIONS_CONFIG_PATH = path.join(__dirname, 'src', 'generalEnvironmentVerifications.json');
const CONFIG_SIDEBAR_ABOUT_PATH = path.join(__dirname, 'src', 'configurationSidebarAbout.json');

// Path to the configuration file that includes display settings
const CONFIG_SIDEBAR_SECTIONS_PATH = path.join(__dirname, 'src', 'configurationSidebarSections.json');

// Utility helpers
const { resolveEnvVars, checkPathExists } = require('./src/mainUtils');

// Helper function to get Git branch with caching
const gitBranchCache = {};
const getGitBranch = async (relativePath) => {
  // Check cache first
  if (gitBranchCache[relativePath]) {
    return gitBranchCache[relativePath];
  }
  
  const absolutePath = path.join(projectRoot, relativePath);
  return new Promise((resolve) => {
    // The -C flag tells Git to run as if git was started in <path> instead of the current working directory.
    exec(`git -C "${absolutePath}" rev-parse --abbrev-ref HEAD`, { timeout: 1000 }, (error, stdout, stderr) => {
      if (error) {
        console.warn(`Error getting Git branch for ${absolutePath}: ${stderr || error.message}`);
        gitBranchCache[relativePath] = 'unknown'; // Cache the error result
        resolve('unknown');
        return;
      }
      const branchName = stdout.trim();
      console.log(`Git branch for ${absolutePath}: ${branchName}`);
      gitBranchCache[relativePath] = branchName; // Cache the result
      resolve(branchName);
    });
  });
};

// Function to check environment requirements
async function verifyEnvironment() {
  if (isVerifyingEnvironment) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Check if all expected caches are populated
        const allCachesReady = Object.keys(environmentCaches).every(key => {
          if (key === 'general') {
            return environmentCaches[key] && environmentCaches[key].statuses && environmentCaches[key].config;
          }
          return environmentCaches[key] !== null;
        });
        
        if (allCachesReady) {
          clearInterval(checkInterval);
          resolve(environmentCaches);
        }
      }, 100);
    });
  }

  // Check if all caches are already populated
  const allCachesReady = Object.keys(environmentCaches).every(key => {
    if (key === 'general') {
      return environmentCaches[key] && environmentCaches[key].statuses && environmentCaches[key].config;
    }
    return environmentCaches[key] !== null;
  });
  
  if (allCachesReady) {
    return environmentCaches;
  }

  isVerifyingEnvironment = true;
  console.log('Starting full environment verification process...');

  // For generalResults, we'll populate statuses directly. The config will be stored alongside.
  const generalResultsStatuses = {};
  let parsedVerificationsConfig = {}; // To store the config read from JSON

  // Load configuration sidebar verifications
  let configSidebarAbout = [];
  try {
    const configAboutFile = await fs.readFile(CONFIG_SIDEBAR_ABOUT_PATH, 'utf-8');
    configSidebarAbout = JSON.parse(configAboutFile);
  } catch (err) {
    console.error('Error reading or parsing configurationSidebarAbout.json:', err);
  }

  const execCommand = async (commandString) => {
    console.log(`Executing command: ${commandString}`);
    return new Promise((resolve) => {
      // Set a reasonable timeout for commands
      const timeout = setTimeout(() => {
        console.warn(`Command timed out after 15 seconds: ${commandString}`);
        resolve({ success: false, stdout: '', stderr: 'Command timed out' });
      }, 15000);
      
      // Use the user's default shell in login mode
      // This ensures shell functions like nvm are available
      const userShell = process.env.SHELL || '/bin/bash';
      
      let finalCommand = commandString;
      // If the command is an nvm command, try to source nvm.sh generically
      if (commandString.startsWith('nvm')) {
        let nvmScriptPath = '';
        const nvmDir = process.env.NVM_DIR;
        const homeNvmPath = path.join(os.homedir(), '.nvm', 'nvm.sh');
        const homebrewNvmPath = '/opt/homebrew/opt/nvm/nvm.sh'; // Common Homebrew path on macOS

        if (nvmDir && fsSync.existsSync(path.join(nvmDir, 'nvm.sh'))) {
          nvmScriptPath = path.join(nvmDir, 'nvm.sh');
          console.log(`Found nvm.sh via NVM_DIR: ${nvmScriptPath}`);
        } else if (fsSync.existsSync(homeNvmPath)) {
          nvmScriptPath = homeNvmPath;
          console.log(`Found nvm.sh at default home location: ${nvmScriptPath}`);
        } else if (process.platform === 'darwin' && fsSync.existsSync(homebrewNvmPath)) {
          nvmScriptPath = homebrewNvmPath;
          console.log(`Found nvm.sh at Homebrew location: ${nvmScriptPath}`);
        }

        if (nvmScriptPath) {
          finalCommand = `. "${nvmScriptPath}" && ${commandString}`; // Ensure path with spaces is quoted
          console.log(`Modified nvm command to: ${finalCommand}`);
        } else {
          console.warn('nvm.sh not found via NVM_DIR, ~/.nvm/nvm.sh, or Homebrew path. Running nvm command without explicit sourcing.');
        }
      }
      
      // Using -l (login) flag to load shell configurations
      // and -c (command) flag to execute the command
      const shellCommand = `${userShell} -l -c "${finalCommand.replace(/"/g, '\"')}"`;
      
      exec(shellCommand, { 
        timeout: 10000, // 10 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer for output
      }, (error, stdout, stderr) => {
        clearTimeout(timeout);
        const sStdout = stdout.trim();
        const sStderr = stderr.trim();
        if (error) {
          console.warn(`Command failed: ${commandString}. Stderr: "${sStderr}". Error:`, error.message);
          resolve({ success: false, stdout: sStdout, stderr: sStderr });
        } else {
          console.log(`Command success: ${commandString}. Stdout: "${sStdout}". Stderr: "${sStderr}"`);
          resolve({ success: true, stdout: sStdout, stderr: sStderr });
        }
      });
    });
  };

  try {
    // --- General Environment Checks from JSON ---
    console.log('Verifying General Tools from JSON configuration...');
    parsedVerificationsConfig = {};
    try {
      const configFile = await fs.readFile(VERIFICATIONS_CONFIG_PATH, 'utf-8');
      parsedVerificationsConfig = JSON.parse(configFile); // Store the parsed config
    } catch (err) {
      console.error('Error reading or parsing verifications.json:', err);
      parsedVerificationsConfig = { header: {}, categories: [] }; // Default structure
    }

    // Extract header and categories from new structure
    const { header = {}, categories = [] } = parsedVerificationsConfig;

    // Process all verifications in parallel
    const verificationPromises = [];
    let completedCount = 0;
    const totalVerifications = categories.reduce((sum, item) => 
      sum + (item.category.verifications?.length || 0), 0) + configSidebarAbout.length;
    
    for (const item of categories) {
      const category = item.category;
      for (const verification of category.verifications) {
        generalResultsStatuses[verification.id] = 'waiting';
        
        // Create a promise for each verification
        const verificationPromise = (async () => {
          const { 
            command, id, title, checkType = 'commandSuccess', 
            expectedValue, outputStream = 'any', variableName, 
            pathValue, pathType 
          } = verification;
          let result = 'invalid';

          try {
            // General checkType logic for all verifications
            const resolvedExpectedValue = resolveEnvVars(expectedValue);
            const resolvedPathValue = resolveEnvVars(pathValue);

            switch (checkType) {
              case 'commandSuccess':
                if (command) {
                  const execResult = await execCommand(command);
                  result = execResult.success ? 'valid' : 'invalid';
                } else {
                  console.warn(`Verification ID [${id}] is commandSuccess but no command provided.`);
                  result = 'invalid';
                }
                break;
              case 'outputContains':
                if (command) {
                  const execResult = await execCommand(command);
                  // For outputContains, we check the output regardless of exit code
                  // because some commands return non-zero exit codes even when successful
                  // exit codes even when they successfully produce output
                    let output = '';
                    if (outputStream === 'stdout') output = execResult.stdout;
                    else if (outputStream === 'stderr') output = execResult.stderr;
                    else output = `${execResult.stdout} ${execResult.stderr}`;
                    
                    // Handle empty expectedValue as "any non-empty output"
                    if (expectedValue === '' || expectedValue === null || expectedValue === undefined) {
                      result = output.trim() !== '' ? 'valid' : 'invalid';
                    } else {
                      const regex = new RegExp(resolvedExpectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                      result = regex.test(output) ? 'valid' : 'invalid';
                  }
                } else {
                    console.warn(`Verification ID [${id}] is outputContains but no command provided.`);
                    result = 'invalid';
                }
                break;
              case 'envVarExists':
                result = (process.env[variableName] !== undefined && process.env[variableName] !== '') ? 'valid' : 'invalid';
                break;
              case 'envVarEquals':
                result = (process.env[variableName] === resolvedExpectedValue) ? 'valid' : 'invalid';
                break;
              case 'pathExists':
                try {
                  const stats = await fs.stat(resolvedPathValue);
                  if (pathType === 'directory' && stats.isDirectory()) result = 'valid';
                  else if (pathType === 'file' && stats.isFile()) result = 'valid';
                  else if (!pathType && (stats.isFile() || stats.isDirectory())) result = 'valid';
                  else result = 'invalid';
                } catch (e) {
                  result = 'invalid';
                }
                break;
              default:
                console.warn(`Unknown checkType: ${checkType} for verification ID [${id}]`);
                result = 'invalid';
            }
          } catch (execError) {
            console.error(`Error executing verification for ${title} (ID: ${id}):`, execError);
            result = 'invalid';
          }
          
          generalResultsStatuses[id] = result;
          
          // Update progress
          completedCount++;
          if (mainWindow) {
            mainWindow.webContents.send('verification-progress', { 
              completed: completedCount, 
              total: totalVerifications,
              percentage: Math.round((completedCount / totalVerifications) * 100)
            });
          }
          
          return { id, result };
        })();
        
        verificationPromises.push(verificationPromise);
      }
    }
    
    // Wait for all verifications to complete
    await Promise.all(verificationPromises);
    
    // Store both statuses and the config used to generate them
    environmentCaches.general = {
        statuses: generalResultsStatuses,
        config: categories,
        header: header
    };

    // --- Configuration Sidebar Section Checks ---
    // Process all sections in parallel
    const sectionPromises = configSidebarAbout.map(async (sectionAbout) => {
      const { sectionId, verifications, directoryPath, skipVerification } = sectionAbout;
      const sectionResults = {};
      
      // Initialize cache key based on camelCase conversion of sectionId
      const cacheKey = sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      
      // Handle sections that skip verification
      if (skipVerification) {
        environmentCaches[cacheKey] = { status: 'no_specific_checks' };
        console.log(`${sectionId} Environment Cache:`, environmentCaches[cacheKey]);
        return;
      }
      
      // Process verifications for this section in parallel
      const sectionVerificationPromises = (verifications || []).map(async (verification) => {
        const { id, checkType, pathValue, pathType, command, expectedValue, outputStream } = verification;
        let result = 'invalid';
        
        try {
          switch (checkType) {
            case 'pathExists':
              const resolvedPath = pathValue.startsWith('./') 
                ? path.join(projectRoot, pathValue.slice(2))
                : resolveEnvVars(pathValue);
              
              const pathStatus = await checkPathExists(projectRoot, pathValue.slice(2), pathType);
              result = pathStatus;
              break;
              
            case 'commandSuccess':
              try {
                const execResult = await execCommand(command);
                result = execResult.success ? 'valid' : 'invalid';
              } catch (e) {
                result = 'invalid';
              }
              break;
              
            case 'outputContains':
              try {
                const { stdout, stderr } = await execCommand(command);
                const output = outputStream === 'stderr' ? stderr : stdout;
                result = output.includes(expectedValue) ? 'valid' : 'invalid';
              } catch (e) {
                result = 'invalid';
              }
              break;
              
            case 'envVarExists':
              result = process.env[verification.variableName] ? 'valid' : 'invalid';
              break;
              
            case 'envVarEquals':
              result = process.env[verification.variableName] === expectedValue ? 'valid' : 'invalid';
              break;
              
            default:
              console.warn(`Unknown checkType: ${checkType} for verification ID [${id}]`);
              result = 'invalid';
          }
        } catch (error) {
          console.error(`Error checking verification ${id}:`, error);
          result = 'invalid';
        }
        
        return { id, result };
      });
      
      // Wait for all verifications for this section
      const verificationResults = await Promise.all(sectionVerificationPromises);
      verificationResults.forEach(({ id, result }) => {
        sectionResults[id] = result;
      });
      
      // Get git branch using directoryPath from JSON (can run in parallel with verifications)
      const gitBranchPromise = directoryPath ? getGitBranch(directoryPath) : Promise.resolve('N/A');
      const gitBranch = await gitBranchPromise;
      
      // Store all verification results, not just the first one
      environmentCaches[cacheKey] = {
        ...sectionResults,
        gitBranch
      };
      
      console.log(`${sectionId} Environment Cache:`, environmentCaches[cacheKey]);
      
      // Update progress for section completion
      completedCount++;
      if (mainWindow) {
        mainWindow.webContents.send('verification-progress', { 
          completed: completedCount, 
          total: totalVerifications,
          percentage: Math.round((completedCount / totalVerifications) * 100)
        });
      }
    });
    
    // Wait for all sections to complete
    await Promise.all(sectionPromises);

    console.log('Overall Environment Verification Completed. Composite Results:\n', JSON.stringify(environmentCaches, null, 2));
    return environmentCaches;

  } catch (error) {
    console.error('Error during environment verification:', error);
    // In case of error, ensure all caches are at least initialized
    if (!environmentCaches.general) {
      environmentCaches.general = { statuses: generalResultsStatuses || {}, config: [] };
    }
    // Initialize any missing section caches
    for (const sectionAbout of configSidebarAbout) {
      const cacheKey = sectionAbout.sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      if (!environmentCaches[cacheKey]) {
        environmentCaches[cacheKey] = { gitBranch: 'waiting' };
      }
    }

    throw error;
  } finally {
    isVerifyingEnvironment = false;
  }
}

// Helper function removed - now using directoryPath from JSON configuration

// Generic function to fetch dropdown options from JSON configuration
async function fetchDropdownOptions(dropdownId, config) {
  const cacheKey = `${dropdownId}_${JSON.stringify(config.args || {})}`;
  
  // Check if already loading
  if (dropdownLoadingState[cacheKey]) {
    return dropdownCache[cacheKey] || { loading: true };
  }
  
  // Check cache
  if (dropdownCache[cacheKey]) {
    return dropdownCache[cacheKey];
  }
  
  dropdownLoadingState[cacheKey] = true;
  
  try {
    // Use the existing execute-dropdown-command handler
    const result = await executeDropdownCommand(null, config);
    
    dropdownCache[cacheKey] = result;
    dropdownLoadingState[cacheKey] = false;
    
    // Send progress update if needed
    if (mainWindow && config.progressType) {
      mainWindow.webContents.send('backend-progress', { 
        type: config.progressType, 
        status: result.error ? 'error' : 'loaded',
        value: result.error ? 0 : 100,
        ...config.progressData
      });
    }
    
    return result;
  } catch (error) {
    dropdownLoadingState[cacheKey] = false;
    const errorResult = { error: error.message, options: [] };
    dropdownCache[cacheKey] = errorResult;
    return errorResult;
  }
}

async function loadDisplaySettings() {
  try {
    const configFile = await fs.readFile(CONFIG_SIDEBAR_SECTIONS_PATH, 'utf-8');
    const config = JSON.parse(configFile);
    return config.displaySettings || {};
  } catch (error) {
    console.error('Error reading or parsing configurationSidebarSections.json for display settings:', error);
    return {}; // Return empty object on error
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js') // Updated preload script
    }
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools for debugging based on config
  loadDisplaySettings().then(displaySettings => {
    if (displaySettings.openDevToolsByDefault) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Clear any active processes on startup
  Object.keys(activeProcesses).forEach(pid => {
    try {
      delete activeProcesses[pid];
    } catch (e) {
      console.error(`Error clearing process ${pid}:`, e);
    }
  });
}

// Initialize app when ready
app.whenReady().then(async () => {
  createWindow();
  
  // When the loading screen is showing, perform initialization tasks
  console.log('=== APPLICATION STARTUP ===');
  console.log('1. Starting environment verification...');
  
  // Perform environment verification first
  try {
    const allVerificationResults = await verifyEnvironment();
    // console.log('Overall Environment Verification Completed. Composite Results:', allVerificationResults); // This line is now inside verifyEnvironment
    if (mainWindow) {
      mainWindow.webContents.send('environment-verification-complete', allVerificationResults);
    }
  } catch (error) {
    console.error('Error during initial environment verification:', error);
  }

  // Initial dropdown data will be fetched on demand from frontend
});

// Generic IPC handler for fetching dropdown options
ipcMain.handle('fetch-dropdown-options', async (event, { dropdownId, config }) => {
  console.log(`IPC: fetch-dropdown-options called for dropdown ${dropdownId}`);
  return fetchDropdownOptions(dropdownId, config);
});



// Add IPC handler for environment verification
ipcMain.handle('get-environment-verification', async () => {
  return verifyEnvironment(); // This will now return the composite object
});

// Add IPC handler to force refresh environment verification
ipcMain.handle('refresh-environment-verification', async () => {
  console.log('Refreshing all environment verification caches...');
  // Clear all caches dynamically
  Object.keys(environmentCaches).forEach(key => {
    environmentCaches[key] = null;
  });
  
  // Clear git branch cache as well
  Object.keys(gitBranchCache).forEach(key => {
    delete gitBranchCache[key];
  });
  
  // Re-verify and get the new results
  const newResults = await verifyEnvironment(); 
  
  // Explicitly send the complete event with new results
  if (mainWindow) {
    mainWindow.webContents.send('environment-verification-complete', newResults);
  }
  
  return newResults; // Return the new results to the caller as well
});

// Function to execute dropdown commands
async function executeDropdownCommand(event, { command, args, parseResponse }) {
  console.log(`Executing dropdown command: ${command} with args:`, args);
  
  return new Promise((resolve) => {
    // Build the full command with arguments
    let fullCommand = command;
    
    // Replace argument placeholders in the command
    if (args) {
      Object.keys(args).forEach(key => {
        const value = args[key];
        // Replace ${key} placeholders in the command
        fullCommand = fullCommand.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
      });
    }
    
    console.log(`Full dropdown command: ${fullCommand}`);
    
    // Use the same shell execution approach as other commands
    const userShell = process.env.SHELL || '/bin/bash';
    const shellCommand = `${userShell} -l -c "${fullCommand.replace(/"/g, '\\"')}"`;
    
    exec(shellCommand, {
      timeout: 10000,
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Dropdown command error: ${stderr || error.message}`);
        resolve({ error: stderr || error.message, options: [] });
        return;
      }
      
      try {
        let options = [];
        
        // Default parsing: split by newlines and filter empty
        if (!parseResponse || parseResponse === 'lines') {
          options = stdout.trim().split('\n').filter(line => line.trim() !== '');
        } 
        // JSON parsing
        else if (parseResponse === 'json') {
          options = JSON.parse(stdout);
          if (!Array.isArray(options)) {
            console.warn('JSON response is not an array, wrapping in array');
            options = [options];
          }
        }
        // Custom parsing function (passed as string, we'll eval it - be careful!)
        else if (typeof parseResponse === 'string' && parseResponse.startsWith('function')) {
          // This is risky but allows flexibility
          const parseFunc = eval(`(${parseResponse})`);
          options = parseFunc(stdout);
        }
        
        console.log(`Dropdown command returned ${options.length} options`);
        resolve({ options, error: null });
      } catch (parseError) {
        console.error('Error parsing dropdown response:', parseError);
        resolve({ error: `Parse error: ${parseError.message}`, options: [] });
      }
    });
  });
}

// Generic dropdown command handler
ipcMain.handle('execute-dropdown-command', executeDropdownCommand);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});



// Kill a running process
ipcMain.on('kill-process', (event, data) => {
  const { terminalId } = data;
  const ptyProcess = activeProcesses[terminalId];

  if (ptyProcess) {
    console.log(`Attempting to kill PTY process with PID ${ptyProcess.pid} for terminal ${terminalId}`);
    
    // Emit terminating event
    if (mainWindow) {
      mainWindow.webContents.send('process-terminating', { terminalId });
    }
    
    try {
      if (os.platform() === 'win32') {
        ptyProcess.kill(); // Default behavior for Windows
        console.log(`ptyProcess.kill() called for Windows PID ${ptyProcess.pid} for terminal ${terminalId}`);
      } else {
        ptyProcess.kill('SIGKILL'); // Use SIGKILL for macOS/Linux
        console.log(`ptyProcess.kill('SIGKILL') called for PID ${ptyProcess.pid} for terminal ${terminalId}`);
      }
      // The onExit handler will handle cleanup and notification
    } catch (e) {
      console.error(`Failed to kill PTY process ${ptyProcess.pid}: ${e.message}`);
      try {
        mainWindow.webContents.send('pty-output', { terminalId, output: `\r\nError killing process: ${e.message}\r\n` });
      } catch (sendError) {
        console.error(`Error sending kill failure message: ${sendError.message}`);
      }
    }
  } else {
    console.log(`No active PTY process found for terminal ${terminalId} to kill.`);
    // Still emit terminated event even if process not found
    if (mainWindow) {
      mainWindow.webContents.send('process-terminated', { terminalId });
    }
  }
});

// Handle stopping Docker containers
ipcMain.handle('stop-containers', async (event, containerNames) => {
  console.log(`Stopping containers: ${containerNames.join(', ')}`);
  
  const promises = containerNames.map(containerName => {
    return new Promise((resolve) => {
      // Emit container terminating event
      if (mainWindow) {
        mainWindow.webContents.send('container-terminating', { containerName });
      }
      
      const command = `docker stop ${containerName}`;
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Failed to stop container ${containerName}: ${stderr || error.message}`);
          // Emit container terminated event with error
          if (mainWindow) {
            mainWindow.webContents.send('container-terminated', { 
              containerName, 
              success: false, 
              error: stderr || error.message 
            });
          }
          resolve({ container: containerName, success: false, error: stderr || error.message });
        } else {
          console.log(`Successfully stopped container ${containerName}`);
          // Emit container terminated event with success
          if (mainWindow) {
            mainWindow.webContents.send('container-terminated', { 
              containerName, 
              success: true 
            });
          }
          resolve({ container: containerName, success: true });
        }
      });
    });
  });
  
  const results = await Promise.all(promises);
  return results;
});

// Get Docker container status
ipcMain.handle('get-container-status', async (event, containerName) => {
  return new Promise((resolve) => {
    const command = `docker inspect -f '{{.State.Status}}' ${containerName}`;
    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        // Container might not exist
        resolve('unknown');
      } else {
        const status = stdout.trim();
        resolve(status || 'unknown');
      }
    });
  });
});

// Handle opening dev tools
ipcMain.on('open-dev-tools', (event) => {
  console.log('Opening DevTools by user request');
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
});

// Handle app reload
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

// Handle dropdown value changes (for cache invalidation if needed)
ipcMain.on('dropdown-value-changed', (event, { dropdownId, value }) => {
  console.log(`Dropdown value changed: ${dropdownId} = ${value}`);
  // Clear dependent dropdown caches if needed
  // This logic can be expanded based on dropdown dependencies defined in JSON
});

// IPC handler to checkout a git branch for a given project path
ipcMain.handle('git-checkout-branch', async (event, { projectPath, branchName }) => {
  const absolutePath = path.join(projectRoot, projectPath);
  console.log(`Attempting to checkout branch '${branchName}' for project at '${absolutePath}'`);

  return new Promise((resolve) => {
    exec(`git -C "${absolutePath}" checkout "${branchName}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error checking out branch '${branchName}' for ${absolutePath}: ${stderr || error.message}`);
        resolve({ success: false, error: stderr || error.message });
        return;
      }
      console.log(`Successfully checked out branch '${branchName}' for ${absolutePath}. Output: ${stdout}`);
      resolve({ success: true, branch: branchName });
    });
  });
});

// IPC handler to list local git branches for a given project path
ipcMain.handle('git-list-local-branches', async (event, { projectPath }) => {
  const absolutePath = path.join(projectRoot, projectPath);
  console.log(`Attempting to list local branches for project at '${absolutePath}'`);

  return new Promise((resolve) => {
    // List local branches with short names
    exec(`git -C "${absolutePath}" branch --list --format="%(refname:short)"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error listing local branches for ${absolutePath}: ${stderr || error.message}`);
        resolve({ success: false, error: stderr || error.message, branches: [] });
        return;
      }
      const branches = stdout.trim().split('\n').filter(branch => branch.trim() !== '');
      console.log(`Local branches for ${absolutePath}:`, branches);
      resolve({ success: true, branches });
    });
  });
});


ipcMain.handle('export-config', async (event, data) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Configuration',
      defaultPath: 'config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    return await exportConfigToFile(data, filePath);
  } catch (error) {
    console.error('Error exporting config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-config', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Configuration',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    return await importConfigFromFile(filePaths[0]);
  } catch (error) {
    console.error('Error importing config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('pty-spawn', (event, { command, terminalId, cols, rows }) => {
  if (activeProcesses[terminalId]) {
    console.warn(`Terminal ${terminalId} already has an active process.`);
    return;
  }

  let shell;
  let shellArgs = [];

  if (os.platform() === 'win32') {
    shell = process.env.COMSPEC || 'cmd.exe';
      } else {
    shell = process.env.SHELL || '/bin/bash';
  }
  console.log(`Using shell: ${shell} with args: [${shellArgs.join(', ')}] for PTY on platform: ${os.platform()}`);

  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-color',
    cols: cols || 80,
    rows: rows || 24,
    cwd: projectRoot,
    env: { ...process.env, LANG: 'en_US.UTF-8' }
  });

  activeProcesses[terminalId] = ptyProcess;
  console.log(`PTY spawned for terminal ${terminalId} with PID ${ptyProcess.pid}, executing: ${command}`);

  // Execute the command
  ptyProcess.write(`${command}\r`); 

  ptyProcess.onData(data => {
    try {
      mainWindow.webContents.send('pty-output', { terminalId, output: data });
    } catch (e) {
      console.error(`Error sending pty-output for terminal ${terminalId}: ${e.message}`);
    }
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`PTY for terminal ${terminalId} exited with code ${exitCode}, signal ${signal}`);
    delete activeProcesses[terminalId];
    
    // Emit process terminated event
    if (mainWindow) {
      mainWindow.webContents.send('process-terminated', { terminalId });
    }
    
    // Send exit notification to the renderer
    try {
      mainWindow.webContents.send('pty-output', { 
        terminalId, 
        output: `\r\nProcess exited with code ${exitCode}${signal ? `, signal ${signal}` : ''}\r\n` 
      });
      mainWindow.webContents.send('process-ended', { terminalId, code: exitCode, signal });
    } catch (e) {
      console.error(`Error sending pty exit info for terminal ${terminalId}: ${e.message}`);
    }
  });
});

ipcMain.on('pty-input', (event, { terminalId, data }) => {
  const ptyProcess = activeProcesses[terminalId];
  if (ptyProcess) {
    ptyProcess.write(data);
  } else {
    console.warn(`No active PTY found for input on terminal ${terminalId}`);
  }
});

ipcMain.on('pty-resize', (event, { terminalId, cols, rows }) => {
  const ptyProcess = activeProcesses[terminalId];
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows);
    } catch (e) {
      console.error(`Error resizing PTY for terminal ${terminalId}: ${e.message}`);
    }
  }
});

// Ensure all PTY processes are killed when the app quits
app.on('will-quit', async (event) => {
  // Prevent default quit to allow cleanup
  event.preventDefault();
  
  console.log('Application is about to quit. Cleaning up...');
  
  // Kill all active PTY processes
  for (const id in activeProcesses) {
    if (activeProcesses[id]) {
      try {
        console.log(`Killing PTY for terminal ${id} with PID ${activeProcesses[id].pid}`);
        activeProcesses[id].kill();
      } catch (e) {
        console.error(`Error killing PTY for terminal ${id} on app quit: ${e.message}`);
      }
    }
  }
  
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

module.exports = {
  exportConfigToFile,
  importConfigFromFile,
};
