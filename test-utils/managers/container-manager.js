/**
 * Container Manager - Manages Real Docker Containers
 * 
 * This module handles Docker container lifecycle management for the mock system.
 * It can start, stop, and manage real containers to simulate complex environments.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { loggers } = require('../../src/common/utils/debugUtils.js');

const log = loggers.app;

class ContainerManager {
  constructor(config) {
    this.config = config;
    this.silent = config.silent || false;
    this.containers = new Set();
    this.exec = require('child_process').exec;
  }

  async startContainers() {
    const containerNames = this.config.associatedContainers || [];
    if (!this.silent) {
      log.info(`[ContainerManager] Starting ${containerNames.length} real Docker containers`);
    }
    
    for (const containerName of containerNames) {
      await this.startContainer(containerName);
    }
  }

  async startContainer(containerName) {
    try {
      // Force remove existing container to prevent conflicts
      await this.execAsync(`docker rm -f "${containerName}"`).catch(() => {
        // Ignore errors if container doesn't exist
      });
      
      // Get container configuration
      const containerConfig = this.getContainerConfig(containerName);
      
      if (!this.silent) {
        log.debug(`[ContainerManager] Starting container: ${containerName}`);
      }
      
      // Start lightweight container with configurable behavior
      const command = this.buildDockerCommand(containerName, containerConfig);
      
      await this.execAsync(command);
      this.containers.add(containerName);
      
      if (!this.silent) {
        log.debug(`[ContainerManager] Container ${containerName} started successfully`);
      }
      
    } catch (error) {
      if (!this.silent) {
        log.error(`[ContainerManager] Failed to start container ${containerName}:`, error.message);
      }
    }
  }

  getContainerConfig(containerName) {
    // Load container-specific config from mock-config.json
    try {
      const configPath = path.join(__dirname, '..', 'config', 'mock-config.json');
      const config = require(configPath);
      
      if (config.containers && config.containers[containerName]) {
        return config.containers[containerName];
      }
    } catch (error) {
      if (!this.silent) {
        log.debug(`[ContainerManager] Could not load config for container ${containerName}: ${error.message}`);
      }
    }
    
    // Return default config
    return this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      image: 'alpine:latest',
      startupDelay: 0,
      healthCheck: true,
      command: 'sleep 3600' // Run for 1 hour
    };
  }

  buildDockerCommand(containerName, config) {
    const image = config.image || 'alpine:latest';
    const command = config.command || 'sleep 3600';
    const startupDelay = config.startupDelay || 0;
    
    let dockerCmd = `docker run -d --name "${containerName}" --rm`;
    
    // Add health check if configured
    if (config.healthCheck) {
      dockerCmd += ` --health-cmd="echo healthy" --health-interval=10s --health-retries=3 --health-start-period=5s`;
    }
    
    // Add startup delay if configured
    if (startupDelay > 0) {
      dockerCmd += ` ${image} sh -c "sleep ${startupDelay/1000} && ${command}"`;
    } else {
      dockerCmd += ` ${image} ${command}`;
    }
    
    return dockerCmd;
  }

  async execAsync(command) {
    return new Promise((resolve, reject) => {
      this.exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${command}\nError: ${error.message}\nStderr: ${stderr}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async stopAll() {
    if (!this.silent) {
      log.debug(`[ContainerManager] Stopping all Docker containers`);
    }
    
    for (const containerName of this.containers) {
      try {
        if (!this.silent) {
          log.debug(`[ContainerManager] Stopping container: ${containerName}`);
        }
        await this.execAsync(`docker stop "${containerName}"`);
        if (!this.silent) {
          log.debug(`[ContainerManager] Container ${containerName} stopped`);
        }
      } catch (error) {
        if (!this.silent) {
          log.error(`[ContainerManager] Error stopping container ${containerName}:`, error.message);
        }
      }
    }
  }

  async cleanup() {
    // Stop all containers (they'll auto-remove due to --rm flag)
    await this.stopAll();
    this.containers.clear();
    if (!this.silent) {
      log.debug(`[ContainerManager] Cleanup completed`);
    }
  }
}

module.exports = { ContainerManager }; 