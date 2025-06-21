const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { loggers } = require('../common/utils/debugUtils.js');

const log = loggers.container;

// Function to stop Docker containers
async function stopContainers(containerNames, mainWindow = null) {
  log.debug('Attempting to stop containers:', containerNames);

  if (!containerNames || containerNames.length === 0) {
    return { success: false, error: 'No containers specified to stop', results: [] };
  }

  const stopPromises = containerNames.map(containerName => {
    return stopSingleContainer(containerName, mainWindow)
      .catch(error => {
        log.error(`Error stopping container ${containerName}:`, error);
        // Ensure that even a rejected promise provides a consistent result shape
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('container-terminated', {
            containerName,
            success: false,
            error: error.message
          });
        }
        return { containerName, success: false, error: error.message };
      });
  });

  const results = await Promise.all(stopPromises);
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  return {
    success: failureCount === 0,
    results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failureCount
    }
  };
}

// Function to stop a single Docker container
async function stopSingleContainer(containerName, mainWindow = null) {
  // Emit container terminating event
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('container-terminating', { containerName });
  }
  
  return new Promise((resolve) => {
    const command = `docker stop "${containerName}"`;
    log.debug(`Executing: ${command}`);

    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        log.error(`Failed to stop container ${containerName}:`, error);
        // Emit container terminated event with error
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('container-terminated', { 
            containerName, 
            success: false, 
            error: stderr || error.message 
          });
        }
        resolve({
          success: false,
          error: stderr || error.message,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      } else {
        log.debug(`Successfully stopped container ${containerName}`);
        // Emit container terminated event with success
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('container-terminated', { 
            containerName, 
            success: true 
          });
        }
        resolve({
          success: true,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      }
    });
  });
}

// Function to get container status
async function getContainerStatus(containerName) {
  if (!containerName) {
    return 'unknown';
  }

  return new Promise((resolve) => {
    const command = `docker inspect --format='{{.State.Status}}' "${containerName}"`;
    log.debug(`Checking container status: ${command}`);

    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        log.warn(`Failed to get status for container ${containerName}:`, stderr || error.message);
        // Container might not exist or other error - return 'unknown' like original
        resolve('unknown');
      } else {
        const status = stdout.trim();
        log.debug(`Container ${containerName} status: ${status}`);
        resolve(status || 'unknown');
      }
    });
  });
}

// Function to list all containers (with optional filters)
async function listContainers(options = {}) {
  const { all = false, format = 'table' } = options;
  
  let command = 'docker ps';
  if (all) {
    command += ' -a';
  }
  
  if (format === 'json') {
    command += ' --format "{{json .}}"';
  } else if (format === 'names') {
    command += ' --format "{{.Names}}"';
  }

  return new Promise((resolve) => {
    log.debug(`Listing containers: ${command}`);

    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        log.error(`Failed to list containers:`, stderr || error.message);
        resolve({
          success: false,
          error: stderr || error.message,
          containers: []
        });
      } else {
        let containers = [];
        
        if (format === 'json') {
          try {
            containers = stdout.trim().split('\n')
              .filter(line => line.trim())
              .map(line => JSON.parse(line));
          } catch (parseError) {
            log.error('Error parsing container JSON:', parseError);
            resolve({
              success: false,
              error: 'Failed to parse container information',
              containers: []
            });
            return;
          }
        } else if (format === 'names') {
          containers = stdout.trim().split('\n')
            .filter(name => name.trim())
            .map(name => name.trim());
        } else {
          // Raw table format
          containers = stdout.trim();
        }

        resolve({
          success: true,
          containers: containers
        });
      }
    });
  });
}

// Function to remove containers
async function removeContainers(containerNames, options = {}) {
  if (!containerNames || !Array.isArray(containerNames) || containerNames.length === 0) {
    return { 
      success: false, 
      error: 'No container names provided',
      results: []
    };
  }

  const { force = false, volumes = false } = options;
  log.debug('Attempting to remove containers:', containerNames);
  const results = [];

  for (const containerName of containerNames) {
    try {
      const result = await removeSingleContainer(containerName, { force, volumes });
      results.push({ containerName, ...result });
    } catch (error) {
      log.error(`Error removing container ${containerName}:`, error);
      results.push({ 
        containerName, 
        success: false, 
        error: error.message 
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  return {
    success: failureCount === 0,
    results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failureCount
    }
  };
}

// Function to remove a single container
async function removeSingleContainer(containerName, options = {}) {
  const { force = false, volumes = false } = options;
  
  let command = 'docker rm';
  if (force) command += ' -f';
  if (volumes) command += ' -v';
  command += ` "${containerName}"`;

  return new Promise((resolve) => {
    log.debug(`Executing: ${command}`);

    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        log.error(`Failed to remove container ${containerName}:`, error);
        resolve({
          success: false,
          error: stderr || error.message,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      } else {
        log.debug(`Successfully removed container ${containerName}`);
        resolve({
          success: true,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      }
    });
  });
}

// Function to check if Docker is available
async function isDockerAvailable() {
  return new Promise((resolve) => {
    exec('docker --version', { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        log.warn('Docker not available:', error.message);
        resolve(false);
      } else {
        log.debug('Docker version:', stdout.trim());
        resolve(true);
      }
    });
  });
}

module.exports = {
  stopContainers,
  stopSingleContainer,
  getContainerStatus,
  listContainers,
  removeContainers,
  removeSingleContainer,
  isDockerAvailable
}; 