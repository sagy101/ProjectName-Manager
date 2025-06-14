const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const { resolveEnvVars, checkPathExists } = require('../mainUtils');
const { getGitBranch, clearGitBranchCache } = require('./gitManagement');

// Dynamic cache for environment verification
let environmentCaches = {
  general: null
  // All other sections will be added dynamically from JSON
};
let discoveredVersions = {}; // To store dynamically found versions
let verificationOutputs = {}; // To store command outputs for export

let isVerifyingEnvironment = false; // Global flag for the whole process

const projectRoot = path.resolve(__dirname, '../../..'); // Adjusted for new location

// Path to the verifications configuration file
const VERIFICATIONS_CONFIG_PATH = path.join(__dirname, '../generalEnvironmentVerifications.json');
const CONFIG_SIDEBAR_ABOUT_PATH = path.join(__dirname, '../configurationSidebarAbout.json');

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
        console.log(`Command succeeded: ${commandString}. Stdout: "${sStdout}"`);
        resolve({ success: true, stdout: sStdout, stderr: sStderr });
      }
    });
  });
};

// Function to check environment requirements
async function verifyEnvironment(mainWindow = null) {
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
    const parsed = JSON.parse(configAboutFile);
    configSidebarAbout = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading or parsing configurationSidebarAbout.json:', err);
    configSidebarAbout = []; // Ensure it's always an array
  }

  // Initialize progress tracking at function scope
  let completedCount = 0;
  let totalVerifications = 0;

  // Load generalEnvironmentVerifications.json
  try {
    const verificationsConfigFile = await fs.readFile(VERIFICATIONS_CONFIG_PATH, 'utf-8');
    parsedVerificationsConfig = JSON.parse(verificationsConfigFile);

    // Extract header and categories from new structure
    const { header = {}, categories = [] } = parsedVerificationsConfig;

    // Calculate total verifications including sidebar sections
    totalVerifications = categories.reduce((sum, item) => 
      sum + (item.category.verifications?.length || 0), 0) + configSidebarAbout.length;

    // Process all verifications in parallel
    const verificationPromises = [];
    
    for (const item of categories) {
      const category = item.category;
      for (const verification of category.verifications) {
        generalResultsStatuses[verification.id] = 'waiting';
        
        // Create a promise for each verification
        const verificationPromise = (async () => {
          const { 
            command, id, title, checkType = 'commandSuccess', 
            expectedValue, outputStream = 'any', variableName, 
            pathValue, pathType, fixCommand // Ensure fixCommand is destructured
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
                  // Store the output for export
                  verificationOutputs[id] = {
                    command,
                    stdout: execResult.stdout,
                    stderr: execResult.stderr,
                    status: result,
                    title
                  };
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
                  let output = '';
                  if (outputStream === 'stdout') output = execResult.stdout;
                  else if (outputStream === 'stderr') output = execResult.stderr;
                  else output = `${execResult.stdout} ${execResult.stderr}`;
                  
                  // Handle empty expectedValue as "any non-empty output"
                  if (!expectedValue || expectedValue.length === 0) {
                    result = output.trim() !== '' ? 'valid' : 'invalid';
                  } else if (Array.isArray(expectedValue)) {
                    // If expectedValue is an array, check if any value is contained
                    let matchFound = false;
                    for (const value of expectedValue) {
                      const resolvedValue = resolveEnvVars(value);
                      if (output.includes(resolvedValue)) {
                        matchFound = true;
                        // Store the discovered version if an ID is provided
                        if (verification.versionId) {
                          const lines = output.split('\n');
                          for (const line of lines) {
                            if (line.includes(resolvedValue)) {
                              const versionMatch = line.match(/v\d+\.\d+\.\d+/);
                              if (versionMatch) {
                                discoveredVersions[verification.versionId] = versionMatch[0];
                                break; // Stop after finding the first matching line with a version
                              }
                            }
                          }
                        }
                        break; 
                      }
                    }
                    result = matchFound ? 'valid' : 'invalid';
                  } else {
                    const regex = new RegExp(resolvedExpectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                    result = regex.test(output) ? 'valid' : 'invalid';
                    if (result === 'valid' && verification.versionId) {
                        discoveredVersions[verification.versionId] = resolvedExpectedValue;
                    }
                  }
                  // Store the output for export
                  verificationOutputs[id] = {
                    command,
                    stdout: execResult.stdout,
                    stderr: execResult.stderr,
                    status: result,
                    title,
                    expectedValue: resolvedExpectedValue,
                    outputStream
                  };
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

  } catch (err) {
    console.error('Error reading or parsing generalEnvironmentVerifications.json:', err);
    environmentCaches.general = { 
      statuses: {},
      config: [],
      header: {}
    };
  }

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
              // Store the output for export
              verificationOutputs[id] = {
                command,
                stdout: execResult.stdout,
                stderr: execResult.stderr,
                status: result,
                sectionId
              };
            } catch (e) {
              result = 'invalid';
            }
            break;
            
          case 'outputContains':
            try {
              const execResult = await execCommand(command);
              const output = outputStream === 'stderr' ? execResult.stderr : execResult.stdout;
              result = output.includes(expectedValue) ? 'valid' : 'invalid';
              // Store the output for export
              verificationOutputs[id] = {
                command,
                stdout: execResult.stdout,
                stderr: execResult.stderr,
                status: result,
                sectionId,
                expectedValue,
                outputStream
              };
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

  isVerifyingEnvironment = false;
  console.log('Environment verification completed.');
  
  // Send completion event to frontend
  if (mainWindow) {
    mainWindow.webContents.send('environment-setup-complete', { ...environmentCaches, discoveredVersions });
  }
  
  return { ...environmentCaches, discoveredVersions };
}

// Function to refresh environment verification
async function refreshEnvironmentVerification(mainWindow = null) {
  console.log('Forcefully refreshing all environment verification data...');

  // Reset verification state flag to ensure the process runs
  isVerifyingEnvironment = false;

  // Clear all verification caches to force re-fetching
  environmentCaches = { general: null };
  verificationOutputs = {}; // Clear outputs cache
  clearGitBranchCache();

  // Re-run the entire verification process to get fresh data
  const newResults = await verifyEnvironment(mainWindow);

  // After verification is complete, send the new composite results to the renderer
  if (mainWindow) {
    mainWindow.webContents.send('environment-verification-complete', { ...newResults, discoveredVersions });
  }

  console.log('Environment verification refresh has fully completed.');
  return { ...newResults, discoveredVersions };
}

async function runFixCommand(verificationId, sectionId) {
  console.log(`Attempting to run fix command for verificationId: ${verificationId}, sectionId: ${sectionId}`);

  let verificationConfig;
  let commandToRun;
  let fixCommandToRun;

  try {
    if (!sectionId || sectionId === 'general') {
      // For general verifications, try to get from cache first, then fallback to file read.
      if (environmentCaches.general && environmentCaches.general.config) {
        for (const categoryItem of environmentCaches.general.config) {
          // Ensure categoryItem.category exists and has a verifications array
          if (categoryItem.category && Array.isArray(categoryItem.category.verifications)) {
            const found = categoryItem.category.verifications.find(v => v.id === verificationId);
            if (found) {
              verificationConfig = found;
              break;
            }
          }
        }
      }
      if (!verificationConfig) { // Fallback to reading file if not in cache or cache structure issue
        console.log(`Verification ${verificationId} (general) not found in cache or cache issue, reading from ${VERIFICATIONS_CONFIG_PATH}`);
        const verificationsConfigFile = await fs.readFile(VERIFICATIONS_CONFIG_PATH, 'utf-8');
        const parsedConfig = JSON.parse(verificationsConfigFile);
        for (const categoryItem of parsedConfig.categories) {
          if (categoryItem.category && Array.isArray(categoryItem.category.verifications)) {
            const found = categoryItem.category.verifications.find(v => v.id === verificationId);
            if (found) {
              verificationConfig = found;
              break;
            }
          }
        }
      }
    } else {
      // For section-specific, always read from file as their full config isn't cached reliably across all sections.
      console.log(`Reading section-specific verification ${verificationId} (section: ${sectionId}) from ${CONFIG_SIDEBAR_ABOUT_PATH}`);
      const configAboutFile = await fs.readFile(CONFIG_SIDEBAR_ABOUT_PATH, 'utf-8');
      const parsedConfig = JSON.parse(configAboutFile);
      const sectionConfig = parsedConfig.find(s => s.sectionId === sectionId);
      if (sectionConfig && sectionConfig.verifications) {
        verificationConfig = sectionConfig.verifications.find(v => v.id === verificationId);
      }
    }

    if (!verificationConfig) {
      console.error(`Verification config not found for ID: ${verificationId} in section: ${sectionId}`);
      return { success: false, error: 'Verification configuration not found.' };
    }

    commandToRun = verificationConfig.command;
    fixCommandToRun = verificationConfig.fixCommand;

    if (!fixCommandToRun) {
      console.warn(`No fixCommand found for verification ID: ${verificationId}`);
      return { success: false, error: 'No fix command defined for this verification.' };
    }

    const commandBasedCheckTypes = ['commandSuccess', 'outputContains'];
    if (!commandToRun && commandBasedCheckTypes.includes(verificationConfig.checkType)) {
      console.error(`No original command found for command-based verification ID: ${verificationId}. Cannot re-verify.`);
      return { success: false, error: 'Original verification command not found for command-based check.' };
    }

    // Execute the fix command
    console.log(`Executing fixCommand: ${fixCommandToRun}`);
    const fixResult = await execCommand(fixCommandToRun);
    verificationOutputs[`${verificationId}_fix_attempt`] = { // Store fix attempt output
        command: fixCommandToRun,
        stdout: fixResult.stdout,
        stderr: fixResult.stderr,
        status: fixResult.success ? 'executed_success' : 'executed_fail',
        title: verificationConfig.title + " (Fix Attempt)"
    };

    if (!fixResult.success) {
      console.error(`Fix command failed for ${verificationId}: ${fixResult.stderr || fixResult.stdout}`);
      return { success: false, error: `Fix command failed: ${fixResult.stderr || fixResult.stdout}`, fixOutput: fixResult.stdout + fixResult.stderr };
    }

    // If fix command was successful, re-run the original verification logic
    let newStatus = 'invalid'; // Default to invalid
    const verifyCmdOutputForReturn = { stdout: '', stderr: ''}; // To store output of verification command if it runs
    const { checkType = 'commandSuccess', expectedValue, outputStream = 'any', variableName, pathValue, pathType } = verificationConfig;

    if (commandToRun) { // Only execute command if one is defined for the checkType
        console.log(`Fix command successful. Re-running original verification command: ${commandToRun}`);
        const verifyResult = await execCommand(commandToRun);
        verifyCmdOutputForReturn.stdout = verifyResult.stdout;
        verifyCmdOutputForReturn.stderr = verifyResult.stderr;

        // Store/Update the output for export, ensure title and other details are present
        verificationOutputs[verificationId] = {
            ...(verificationOutputs[verificationId] || {}), // Preserve existing fields if any
            command: commandToRun,
            stdout: verifyResult.stdout,
            stderr: verifyResult.stderr,
            // status will be updated by the switch block below
            title: verificationConfig.title,
            lastFixAttempt: new Date().toISOString()
        };

        // Determine status based on command output
        switch (checkType) {
            case 'commandSuccess':
                newStatus = verifyResult.success ? 'valid' : 'invalid';
                break;
            case 'outputContains':
                let output = '';
                if (outputStream === 'stdout') output = verifyResult.stdout;
                else if (outputStream === 'stderr') output = verifyResult.stderr;
                else output = `${verifyResult.stdout} ${verifyResult.stderr}`;

                const resolvedExpected = resolveEnvVars(expectedValue);
                if (!resolvedExpected || resolvedExpected.length === 0) {
                    newStatus = output.trim() !== '' ? 'valid' : 'invalid';
                } else if (Array.isArray(resolvedExpected)) {
                    // Check if any value in the array is contained in the output
                    newStatus = resolvedExpected.some(val => output.includes(resolveEnvVars(val))) ? 'valid' : 'invalid';
                } else {
                    // Handle string expectedValue with regex
                    const regexPattern = typeof resolvedExpected === 'string' ? resolvedExpected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
                    const regex = new RegExp(regexPattern);
                    newStatus = regex.test(output) ? 'valid' : 'invalid';
                }
                break;
        }
    } else { // For non-command based checks like pathExists, envVarExists
        console.log(`Fix command successful. Re-evaluating non-command based verification: ${verificationId}`);
        // No command output to store for these, but we mark that a fix was attempted and title.
         verificationOutputs[verificationId] = {
            ...(verificationOutputs[verificationId] || {}),
            title: verificationConfig.title,
            lastFixAttempt: new Date().toISOString(),
            // status will be updated by the switch block below
        };
    }

    // Handle non-command checks and finalize status for command-based checks (if not already set)
    // This switch block determines `newStatus` based on `checkType`
    const resolvedExpectedValue = resolveEnvVars(expectedValue); // Re-resolve for non-command checks
    const resolvedPathValue = resolveEnvVars(pathValue); // Re-resolve for non-command checks

    switch (checkType) {
        case 'commandSuccess':
        case 'outputContains':
            // These statuses are determined above if commandToRun exists.
            // If commandToRun didn't exist (which is an issue for these types), newStatus remains 'invalid'.
            if (!commandToRun) newStatus = 'invalid';
            break;
        case 'envVarExists':
            newStatus = (process.env[variableName] !== undefined && process.env[variableName] !== '') ? 'valid' : 'invalid';
            break;
        case 'envVarEquals':
            newStatus = (process.env[variableName] === resolvedExpectedValue) ? 'valid' : 'invalid';
            break;
        case 'pathExists':
            try {
                const stats = await fs.stat(resolvedPathValue);
                if (pathType === 'directory' && stats.isDirectory()) newStatus = 'valid';
                else if (pathType === 'file' && stats.isFile()) newStatus = 'valid';
                else if (!pathType && (stats.isFile() || stats.isDirectory())) newStatus = 'valid'; // No specific type, just exists
                else newStatus = 'invalid';
            } catch (e) {
                newStatus = 'invalid'; // Path does not exist or other error
            }
            break;
        default:
            console.warn(`Unknown checkType for re-verification: ${checkType} for ID ${verificationId}`);
            newStatus = 'invalid'; // Fallback for unknown check types
    }

    // Update status in verificationOutputs as well, as this is used for export
    if(verificationOutputs[verificationId]) {
        verificationOutputs[verificationId].status = newStatus;
    } else {
         verificationOutputs[verificationId] = { // Should be rare, but good fallback
            title: verificationConfig.title,
            status: newStatus,
            lastFixAttempt: new Date().toISOString()
        };
    }

    // Update the status in the main cache
    if (!sectionId || sectionId === 'general') {
      if (environmentCaches.general && environmentCaches.general.statuses) {
        environmentCaches.general.statuses[verificationId] = newStatus;
      }
    } else {
      const cacheKey = sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      if (environmentCaches[cacheKey]) {
        // Ensure the cacheKey object exists and then update the verificationId property
        environmentCaches[cacheKey] = {
          ...environmentCaches[cacheKey], // Preserve other statuses and gitBranch
          [verificationId]: newStatus // Update specific verification status
        };
      } else {
         // This case should ideally not happen if verifyEnvironment ran for the section
         console.warn(`Cache key ${cacheKey} not found for section ${sectionId}. Initializing with current fix status.`);
         environmentCaches[cacheKey] = { [verificationId]: newStatus };
      }
    }

    console.log(`Re-verification for ${verificationId} (section ${sectionId || 'general'}) resulted in: ${newStatus}`);
    return {
      success: true,
      newStatus: newStatus,
      verificationId: verificationId, // Added verificationId
      sectionId: sectionId || 'general', // Added sectionId (normalized)
      fixOutput: fixResult.stdout + fixResult.stderr,
      verificationOutput: verifyCmdOutputForReturn.stdout + verifyCmdOutputForReturn.stderr
    };

  } catch (error) {
    console.error(`Error in runFixCommand for ${verificationId} (${sectionId || 'general'}):`, error);
    return { success: false, error: error.message };
  }
}

// Function to get current environment verification results
function getEnvironmentVerification() {
  return environmentCaches;
}

// Function to get environment export data with all outputs
function getEnvironmentExportData() {
  const timestamp = new Date().toISOString();
  const platform = {
    type: os.type(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname()
  };
  
  return {
    timestamp,
    platform,
    environmentCaches,
    verificationOutputs,
    discoveredVersions
  };
}

module.exports = {
  verifyEnvironment,
  refreshEnvironmentVerification,
  getEnvironmentVerification,
  getEnvironmentExportData,
  execCommand,
  runFixCommand // Added runFixCommand
}; 