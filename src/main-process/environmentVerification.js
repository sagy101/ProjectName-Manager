const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const { resolveEnvVars, checkPathExists } = require('./mainUtils');
const { getGitBranch, clearGitBranchCache } = require('./gitManagement');
const { loggers } = require('../common/utils/debugUtils.js');

const logger = loggers.verification;

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
const VERIFICATIONS_CONFIG_PATH = path.join(__dirname, '..', 'environment-verification', 'generalEnvironmentVerifications.json');
const CONFIG_SIDEBAR_ABOUT_PATH = path.join(__dirname, '..', 'project-config', 'config', 'configurationSidebarAbout.json');
const CONFIG_SIDEBAR_SECTIONS_PATH = path.join(__dirname, '..', 'project-config', 'config', 'configurationSidebarSections.json');

// Modified execCommand to use enhanced logging
async function execCommand(commandString, options = {}) {
  const { timeout = 15000, forceRefresh = false } = options;
  logger.debug(`Executing command: ${commandString}`);
  return new Promise((resolve) => {
    // Set a reasonable timeout for commands
    const timeout = setTimeout(() => {
      logger.warn(`Command timed out after 15 seconds: ${commandString}`);
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
        logger.debug(`Found nvm.sh via NVM_DIR: ${nvmScriptPath}`);
      } else if (fsSync.existsSync(homeNvmPath)) {
        nvmScriptPath = homeNvmPath;
        logger.debug(`Found nvm.sh at default home location: ${nvmScriptPath}`);
      } else if (process.platform === 'darwin' && fsSync.existsSync(homebrewNvmPath)) {
        nvmScriptPath = homebrewNvmPath;
        logger.debug(`Found nvm.sh at Homebrew location: ${nvmScriptPath}`);
      }

      if (nvmScriptPath) {
        finalCommand = `. "${nvmScriptPath}" && ${commandString}`; // Ensure path with spaces is quoted
        logger.debug(`Modified nvm command to: ${finalCommand}`);
      } else {
        logger.warn('nvm.sh not found via NVM_DIR, ~/.nvm/nvm.sh, or Homebrew path. Running nvm command without explicit sourcing.');
      }
    }
    
    // Using -l (login) flag to load shell configurations
    // and -c (command) flag to execute the command
    const shellCommand = `${userShell} -l -c "${finalCommand.replace(/"/g, '\"')}"`;
    
    exec(shellCommand, { 
      timeout: 10000, // 10 second timeout
      maxBuffer: 1024 * 1024, // 1MB buffer for output
      cwd: path.resolve(process.cwd(), '..')
    }, (error, stdout, stderr) => {
      clearTimeout(timeout);
      const sStdout = stdout.trim();
      const sStderr = stderr.trim();
      if (error) {
        logger.warn(`Command failed: ${commandString}. Stderr: "${sStderr}". Error:`, error.message);
        resolve({ success: false, stdout: sStdout, stderr: sStderr });
      } else {
        logger.debug(`Command succeeded: ${commandString}. Stdout: "${sStdout}"`);
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
  logger.debug('Starting full environment verification process...');
  
  // Log current working directory and project root for debugging
  logger.debug('[ENVIRONMENT VERIFICATION] Starting verification process:');
  logger.debug(`  - process.cwd(): ${process.cwd()}`);
  logger.debug(`  - __dirname: ${__dirname}`);
  logger.debug(`  - projectRoot: ${projectRoot}`);
  logger.debug(`  - projectRoot resolved: ${path.resolve(projectRoot)}`);

  // For generalResults, we'll populate statuses directly. The config will be stored alongside.
  const generalResultsStatuses = {};
  let parsedVerificationsConfig = {}; // To store the config read from JSON

  // Load configuration sidebar verifications
  let configSidebarAbout = [];
  let configSidebarSections = [];
  
  try {
    const configAboutFile = await fs.readFile(CONFIG_SIDEBAR_ABOUT_PATH, 'utf-8');
    const parsed = JSON.parse(configAboutFile);
    configSidebarAbout = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.error('Error reading configurationSidebarAbout.json:', err);
    configSidebarAbout = []; // Ensure it's always an array
  }
  
  try {
    const configSectionsFile = await fs.readFile(CONFIG_SIDEBAR_SECTIONS_PATH, 'utf-8');
    const sectionsData = JSON.parse(configSectionsFile);
    configSidebarSections = sectionsData.sections || [];
  } catch (err) {
    logger.error('Error reading configurationSidebarSections.json:', err);
    // Continue without test section filtering if this fails
  }
  
  // Create a map of section IDs to their testSection status
  const testSectionMap = {};
  configSidebarSections.forEach(section => {
    testSectionMap[section.id] = section.testSection === true;
  });

  // Initialize progress tracking at function scope
  let completedCount = 0;
  let totalVerifications = 0;

  // Load generalEnvironmentVerifications.json
  try {
    const verificationsConfigFile = await fs.readFile(VERIFICATIONS_CONFIG_PATH, 'utf-8');
    parsedVerificationsConfig = JSON.parse(verificationsConfigFile);

    // Extract header and categories from new structure
    const { header = {}, categories = [] } = parsedVerificationsConfig;

    // Calculate total verifications including sidebar section verifications
    const generalCount = categories.reduce((sum, item) =>
      sum + (item.category.verifications?.length || 0), 0);
    const sectionCount = configSidebarAbout.reduce((sum, section) =>
      sum + ((section.verifications || []).length), 0);
    totalVerifications = generalCount + sectionCount;

    if (totalVerifications === 0 && mainWindow) {
      mainWindow.webContents.send('verification-progress', {
        completed: 0,
        total: 0,
        percentage: 70
      });
    }

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
                  // Store the output for export
                  verificationOutputs[id] = {
                    command,
                    stdout: execResult.stdout,
                    stderr: execResult.stderr,
                    status: result,
                    title
                  };
                } else {
                  logger.warn(`Verification ID [${id}] is commandSuccess but no command provided.`);
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
                  logger.warn(`Verification ID [${id}] is outputContains but no command provided.`);
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
                  // Add detailed logging for path verification
                  logger.debug(`[GENERAL PATH VERIFICATION] ${id}:`);
                  logger.debug(`  - pathValue: ${pathValue}`);
                  logger.debug(`  - resolvedPathValue: ${resolvedPathValue}`);
                  logger.debug(`  - process.cwd(): ${process.cwd()}`);
                  logger.debug(`  - __dirname: ${__dirname}`);
                  
                  const stats = await fs.stat(resolvedPathValue);
                  if (pathType === 'directory' && stats.isDirectory()) result = 'valid';
                  else if (pathType === 'file' && stats.isFile()) result = 'valid';
                  else if (!pathType && (stats.isFile() || stats.isDirectory())) result = 'valid';
                  else result = 'invalid';
                  logger.debug(`  - result: ${result}`);
                } catch (e) {
                  logger.debug(`  - error: ${e.message}`);
                  result = 'invalid';
                }
                break;
              default:
                logger.warn(`Unknown checkType: ${checkType} for verification ID [${id}]`);
                result = 'invalid';
            }
          } catch (execError) {
            logger.error(`Error executing verification for ${title} (ID: ${id}):`, execError);
            result = 'invalid';
          }
          
          generalResultsStatuses[id] = result;
          
          // Update progress
          completedCount++;
          if (mainWindow) {
            const percentage = totalVerifications === 0
              ? 70
              : Math.round((completedCount / totalVerifications) * 70);
            mainWindow.webContents.send('verification-progress', {
              completed: completedCount,
              total: totalVerifications,
              percentage
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
    logger.error('Error reading or parsing generalEnvironmentVerifications.json:', err);
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
      logger.debug(`${sectionId} Environment Cache:`, environmentCaches[cacheKey]);
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
            
            // Add detailed logging for path verification
            logger.debug(`[PATH VERIFICATION] ${id}:`);
            logger.debug(`  - pathValue: ${pathValue}`);
            logger.debug(`  - projectRoot: ${projectRoot}`);
            logger.debug(`  - resolvedPath: ${resolvedPath}`);
            logger.debug(`  - process.cwd(): ${process.cwd()}`);
            logger.debug(`  - __dirname: ${__dirname}`);
            
            const pathStatus = await checkPathExists(projectRoot, pathValue.slice(2), pathType);
            logger.debug(`  - result: ${pathStatus}`);
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
            logger.warn(`Unknown checkType: ${checkType} for verification ID [${id}]`);
            result = 'invalid';
        }
      } catch (error) {
        logger.error(`Error checking verification ${id}:`, error);
        result = 'invalid';
      }
      
      // Update progress for each verification within sections
      completedCount++;
      if (mainWindow) {
        const percentage = totalVerifications === 0
          ? 70
          : Math.round((completedCount / totalVerifications) * 70);
        mainWindow.webContents.send('verification-progress', {
          completed: completedCount,
          total: totalVerifications,
          percentage
        });
      }

      return { id, result };
    });
    
    // Wait for all verifications for this section
    const verificationResults = await Promise.all(sectionVerificationPromises);
    verificationResults.forEach(({ id, result }) => {
      sectionResults[id] = result;
    });
    
    // Get git branch using directoryPath from JSON (can run in parallel with verifications)
    // Skip test sections to avoid Git errors for non-existent directories
    let gitBranch = 'N/A';
    if (directoryPath) {
      if (testSectionMap[sectionId]) {
        logger.debug(`Skipping git branch check for test section: ${sectionId}`);
        gitBranch = 'N/A';
      } else {
        gitBranch = await getGitBranch(directoryPath);
      }
    }
    
    // Store all verification results, not just the first one
    environmentCaches[cacheKey] = {
      ...sectionResults,
      gitBranch
    };
    
    logger.debug(`${sectionId} Environment Cache:`, environmentCaches[cacheKey]);
    
  });
  
  // Wait for all sections to complete
  await Promise.all(sectionPromises);

  logger.debug('Overall Environment Verification Completed. Composite Results:\n', JSON.stringify(environmentCaches, null, 2));

  isVerifyingEnvironment = false;
  logger.debug('Environment verification completed.');
  
  // Send final verification progress (70%) and completion event to frontend
  if (mainWindow) {
    // Send final verification progress
    mainWindow.webContents.send('verification-progress', {
      completed: totalVerifications,
      total: totalVerifications,
      percentage: 70
    });
    
    // Send completion event
    mainWindow.webContents.send('environment-verification-complete', { ...environmentCaches, discoveredVersions });
  }
  
  return { ...environmentCaches, discoveredVersions };
}

// Function to refresh environment verification
async function refreshEnvironmentVerification(mainWindow = null) {
  logger.debug('Forcefully refreshing all environment verification data...');

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

  logger.debug('Environment verification refresh has fully completed.');
  return { ...newResults, discoveredVersions };
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

// Function to re-run a single verification by ID
async function rerunSingleVerification(verificationId, mainWindow = null) {
  logger.debug(`Re-running single verification: ${verificationId}`);
  
  let found = false;
  let updatedData = null;
  
  try {
    // First, check if it's in generalEnvironmentVerifications.json
    const verificationsConfigFile = await fs.readFile(VERIFICATIONS_CONFIG_PATH, 'utf-8');
    const parsedVerificationsConfig = JSON.parse(verificationsConfigFile);
    
    for (const item of parsedVerificationsConfig.categories || []) {
      const verification = item.category.verifications?.find(v => v.id === verificationId);
      if (verification) {
        found = true;
        
        // Re-run this specific verification
        const { 
          command, id, title, checkType = 'commandSuccess', 
          expectedValue, outputStream = 'any', variableName, 
          pathValue, pathType 
        } = verification;
        
        let result = 'invalid';
        
        // Use the same logic as in verifyEnvironment
        const resolvedExpectedValue = resolveEnvVars(expectedValue);
        const resolvedPathValue = resolveEnvVars(pathValue);

        switch (checkType) {
          case 'commandSuccess':
            if (command) {
              const execResult = await execCommand(command);
              result = execResult.success ? 'valid' : 'invalid';
              verificationOutputs[id] = {
                command,
                stdout: execResult.stdout,
                stderr: execResult.stderr,
                status: result,
                title
              };
            }
            break;
          case 'outputContains':
            if (command) {
              const execResult = await execCommand(command);
              let output = '';
              if (outputStream === 'stdout') output = execResult.stdout;
              else if (outputStream === 'stderr') output = execResult.stderr;
              else output = `${execResult.stdout} ${execResult.stderr}`;
              
              if (!expectedValue || expectedValue.length === 0) {
                result = output.trim() !== '' ? 'valid' : 'invalid';
              } else if (Array.isArray(expectedValue)) {
                let matchFound = false;
                for (const value of expectedValue) {
                  const resolvedValue = resolveEnvVars(value);
                  if (output.includes(resolvedValue)) {
                    matchFound = true;
                    if (verification.versionId) {
                      const lines = output.split('\n');
                      for (const line of lines) {
                        if (line.includes(resolvedValue)) {
                          const versionMatch = line.match(/v\d+\.\d+\.\d+/);
                          if (versionMatch) {
                            discoveredVersions[verification.versionId] = versionMatch[0];
                            break;
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
              
              verificationOutputs[id] = {
                command,
                stdout: execResult.stdout,
                stderr: execResult.stderr,
                status: result,
                title,
                expectedValue: resolvedExpectedValue,
                outputStream
              };
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
        }
        
        // Update the cache
        if (environmentCaches.general && environmentCaches.general.statuses) {
          environmentCaches.general.statuses[verificationId] = result;
        }
        
        updatedData = {
          verificationId,
          result,
          source: 'general'
        };
        
        break;
      }
    }
    
    // If not found in general, check configurationSidebarAbout.json
    if (!found) {
      const configAboutFile = await fs.readFile(CONFIG_SIDEBAR_ABOUT_PATH, 'utf-8');
      const configSidebarAbout = JSON.parse(configAboutFile);
      
      for (const section of configSidebarAbout) {
        if (!section.verifications) continue;
        
        const verification = section.verifications.find(v => v.id === verificationId);
        if (verification) {
          found = true;
          
          const { id, checkType, pathValue, pathType, command, expectedValue, outputStream } = verification;
          let result = 'invalid';
          
          switch (checkType) {
            case 'pathExists':
              const pathStatus = await checkPathExists(projectRoot, pathValue.slice(2), pathType);
              result = pathStatus;
              break;
              
            case 'commandSuccess':
              try {
                const execResult = await execCommand(command);
                result = execResult.success ? 'valid' : 'invalid';
                verificationOutputs[id] = {
                  command,
                  stdout: execResult.stdout,
                  stderr: execResult.stderr,
                  status: result,
                  sectionId: section.sectionId
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
                verificationOutputs[id] = {
                  command,
                  stdout: execResult.stdout,
                  stderr: execResult.stderr,
                  status: result,
                  sectionId: section.sectionId,
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
          }
          
          // Update the appropriate section cache
          const cacheKey = section.sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          if (environmentCaches[cacheKey]) {
            environmentCaches[cacheKey][verificationId] = result;
          }
          
          updatedData = {
            verificationId,
            result,
            source: section.sectionId,
            cacheKey
          };
          
          break;
        }
      }
    }
    
    if (!found) {
      logger.warn(`Verification ${verificationId} not found in any configuration`);
      return { success: false, error: 'Verification not found' };
    }
    
    logger.debug(`Single verification ${verificationId} completed with result: ${updatedData.result}`);
    
    // Send updated result to frontend
    if (mainWindow) {
      mainWindow.webContents.send('single-verification-updated', updatedData);
    }
    
    return { 
      success: true, 
      verificationId, 
      result: updatedData.result,
      source: updatedData.source
    };
    
  } catch (error) {
    logger.error(`Error re-running verification ${verificationId}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  verifyEnvironment,
  refreshEnvironmentVerification,
  getEnvironmentVerification,
  getEnvironmentExportData,
  execCommand,
  rerunSingleVerification
};