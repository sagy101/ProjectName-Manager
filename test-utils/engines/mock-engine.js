/**
 * Mock Engine - Core Execution Engine
 * 
 * This module handles the core execution logic for mock commands including:
 * - Configuration parsing and merging
 * - Status management
 * - Transition scheduling
 * - Signal handling
 * - Cleanup operations
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const { PatternManager } = require('../managers/pattern-manager');
const { ContainerManager } = require('../managers/container-manager');
const { loggers } = require('../../src/common/utils/debugUtils.js');

const log = loggers.app;

class MockEngine extends EventEmitter {
  constructor(args = []) {
    super();
    
    // Handle both array args (legacy) and config object (new)
    if (Array.isArray(args)) {
    this.config = this.parseConfig(args);
    } else {
      // If passed a config object directly, merge with defaults and file config
      const defaults = this.getDefaultConfig(args.service);
      const fileConfig = this.loadFileConfig(args.service);
      const envConfig = this.loadEnvConfig(args.service);
      
      this.config = { 
        ...defaults, 
        ...fileConfig, 
        ...envConfig, 
        ...args 
      };
      
      // Load transitions after config is merged, pass silent flag
      this.patternManager = new PatternManager(this.config.silent);
      this.config.transitions = this.patternManager.loadTransitions(this.config.service, this.config.pattern, this.config.silent);
      
      if (!this.config.silent) {
        log.debug(`[MockEngine] Using provided config:`, JSON.stringify(this.config, null, 2));
      }
    }
    
    // Create pattern manager if not created above
    if (!this.patternManager) {
      this.patternManager = new PatternManager(this.config.silent);
    }
    
    this.startTime = Date.now();
    this.statusFile = this.getStatusFilePath();
    this.containerManager = new ContainerManager(this.config);
    this.isShuttingDown = false;
    this.timers = [];
    
    // Bind methods to ensure correct 'this' context
    this.handleShutdown = this.handleShutdown.bind(this);

    if (!this.config.silent) {
      log.debug(`[MockEngine] Starting with args:`, process.argv.slice(2));
    }
  }

  /**
   * Parse and merge configuration from various sources
   * @param {Array} args - Command line arguments
   * @returns {Object} Merged configuration object
   */
  parseConfig(args) {
    // Parse command line arguments
    const params = this.parseArgs(args);
    
    // Add silent mode support
    const silent = params.silent === 'true' || params.silent === true;
    
    if (!silent) {
      log.debug(`[MockEngine] Starting with args:`, args);
    }
    
    // Load configuration hierarchy: defaults < file < env < args
    const defaults = this.getDefaultConfig(params.service);
    const fileConfig = this.loadFileConfig(params.service);
    const envConfig = this.loadEnvConfig(params.service);
    
    const finalConfig = {
      ...defaults,
      ...fileConfig,
      ...envConfig,
      ...params,
      silent // Ensure silent mode is preserved
    };
    
    // Create pattern manager with silent flag and load transitions after all config is merged
    this.patternManager = new PatternManager(silent);
    finalConfig.transitions = this.patternManager.loadTransitions(finalConfig.service, finalConfig.pattern, silent);
    
    if (!silent) {
      log.debug(`[MockEngine] Final config:`, JSON.stringify(finalConfig, null, 2));
    }
    return finalConfig;
  }

  /**
   * Parse command line arguments
   * @param {Array} args - Command line arguments
   * @returns {Object} Parsed parameters
   */
  parseArgs(args) {
    const params = {};
    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.split('=');
        if (key && value) {
          params[key.replace('--', '')] = value;
        }
      }
    });
    return params;
  }

  /**
   * Get default configuration for a service
   * @param {string} service - Service name
   * @returns {Object} Default configuration
   */
  getDefaultConfig(service) {
    return {
      service: service || 'unknown',
      pattern: 'infinite',
      logInterval: 10000,
      statusUpdateInterval: 5000,
      debug: null,
      mode: null,
      port: null
    };
  }

  /**
   * Load configuration from file
   * @param {string} service - Service name
   * @returns {Object} File configuration
   */
  loadFileConfig(service) {
    try {
      const configPath = path.join(__dirname, '..', 'config', 'mock-config.json');
      const config = require(configPath);
      return config.services?.[service] || {};
    } catch (error) {
      log.debug(`[MockEngine] No file config found: ${error.message}`);
      return {};
    }
  }

  /**
   * Load configuration from environment variables
   * @param {string} service - Service name
   * @returns {Object} Environment configuration
   */
  loadEnvConfig(service) {
    const config = {};
    const prefix = `MOCK_${service?.toUpperCase()}_`;
    
    Object.keys(process.env).forEach(key => {
      if (key.startsWith(prefix)) {
        const configKey = key.replace(prefix, '').toLowerCase();
        let value = process.env[key];
        
        // Try to parse JSON values
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
        
        config[configKey] = value;
      }
    });
    
    return config;
  }

  /**
   * Get status file path
   * @returns {string} Status file path
   */
  getStatusFilePath() {
    return path.join('/tmp', `mock-status-${this.config.service}-${process.pid}.json`);
  }

  /**
   * Update status and write to file
   * @param {string} status - Status value
   * @param {string} message - Status message
   * @param {number|null} exitCode - Exit code (if applicable)
   */
  async updateStatus(status, message, exitCode = null) {
    const statusData = {
      service: this.config.service,
      pid: process.pid,
      status,
      message,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      exitCode
    };
    
    try {
      await fs.writeFile(this.statusFile, JSON.stringify(statusData, null, 2));
    } catch (error) {
      if (!this.config.silent) {
        log.error(`[MockEngine] Failed to update status file: ${error.message}`);
      }
    }
    
    const logMessage = `[${new Date().toISOString()}] [${this.config.service}] ${message}`;
    if (!this.config.silent) {
      log.info(logMessage);
    }
    
    // Emit status change event
    this.emit('statusChange', { status, message, exitCode });
  }

  /**
   * Main execution method
   */
  async run() {
    try {
      if (!this.config.silent) {
        log.info(`[${new Date().toISOString()}] Starting ${this.config.service} with pattern: ${this.config.pattern}`);
      }
      
      // Debug mode logging
      if (this.config.debug && !this.config.silent) {
        log.debug(`[${new Date().toISOString()}] Debug mode: ${this.config.debug}${this.config.port ? ` on port ${this.config.port}` : ''}`);
      }
      if (this.config.mode && !this.config.silent) {
        log.debug(`[${new Date().toISOString()}] Service mode: ${this.config.mode}`);
      }
      
      // Initialize status
      await this.updateStatus('starting', 'Service starting...');
      
      // Start real Docker containers if configured
      if (this.config.associatedContainers && this.config.associatedContainers.length > 0) {
        await this.containerManager.startContainers();
      }
      
      // Schedule status transitions
      this.scheduleTransitions();
      
      // Set up periodic status updates for infinite patterns
      if (this.shouldRunIndefinitely()) {
        this.startPeriodicUpdates();
      }
      
      // Set up signal handlers
      this.setupSignalHandlers();
      
      if (!this.config.silent) {
        log.debug(`[${new Date().toISOString()}] ${this.config.service} initialization complete`);
      }
      
    } catch (error) {
      if (!this.config.silent) {
        log.error(`[MockEngine] Failed to start: ${error.message}`);
      }
      await this.updateStatus('error', `Failed to start: ${error.message}`, 1);
      throw error;
    }
  }

  /**
   * Schedule status transitions based on configuration
   */
  scheduleTransitions() {
    this.config.transitions.forEach((transition, index) => {
      const timer = setTimeout(async () => {
        if (this.isShuttingDown) return;
        
        await this.updateStatus(transition.status, transition.log, transition.exit);
        
        if (transition.exit !== undefined) {
          if (!this.config.silent) {
            log.debug(`[MockEngine] Completing with code: ${transition.exit}`);
          }
          
          // Output success data to stdout for successful completions
          if (transition.exit === 0 && this.config.outputs?.success) {
            const output = Array.isArray(this.config.outputs.success) 
              ? this.config.outputs.success.join('\n')
              : this.config.outputs.success;
            process.stdout.write(output + '\n');
          }
          
          await this.cleanup();
          if (transition.exit === 0) {
            if (!this.config.silent) {
              log.debug(`[MockEngine] ${this.config.service} completed successfully`);
            }
          } else {
            throw new Error(`${this.config.service} exited with code ${transition.exit}`);
          }
        }
      }, transition.at);
      
      this.timers.push(timer);
    });
  }

  /**
   * Check if service should run indefinitely
   * @returns {boolean} True if should run indefinitely
   */
  shouldRunIndefinitely() {
    return this.patternManager.shouldRunIndefinitely(this.config.transitions);
  }

  /**
   * Start periodic status updates for infinite patterns
   */
  startPeriodicUpdates() {
    const interval = setInterval(async () => {
      if (this.isShuttingDown) {
        clearInterval(interval);
        return;
      }
      await this.updateStatus('running', `${this.config.service} is healthy`);
    }, this.config.logInterval);
    
    // Store interval reference for cleanup
    this.timers.push(interval);
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    ['SIGTERM', 'SIGINT', 'SIGHUP'].forEach(signal => {
      process.on(signal, () => this.handleShutdown(signal));
    });
    
    // Handle uncaught exceptions (ignore EPIPE errors)
    process.on('uncaughtException', async (error) => {
      if (error.code === 'EPIPE') {
        // EPIPE errors are common when output is piped to commands like 'head'
        if (!this.config.silent) {
          log.debug(`[MockEngine] Output pipe closed, exiting gracefully`);
        }
        await this.cleanup();
        this.emit('exit', 0);
        return;
      }
      
      if (!this.config.silent) {
        log.error(`[MockEngine] Uncaught exception: ${error.message}`);
      }
      await this.updateStatus('error', `Uncaught exception: ${error.message}`, 1);
      await this.cleanup();
      throw error;
    });
  }

  /**
   * Handle shutdown signals
   * @param {string} signal - Signal name
   */
  async handleShutdown(signal) {
    if (this.isShuttingDown) {
      if (!this.config.silent) {
        log.debug(`[MockEngine] Already shutting down, ignoring ${signal}`);
      }
      return;
    }
    
    this.isShuttingDown = true;
    
    if (!this.config.silent) {
      log.info(`[${new Date().toISOString()}] ${this.config.service} received ${signal}, shutting down gracefully...`);
    }
    await this.updateStatus('stopping', `Received ${signal}, shutting down...`);
    
    // Stop container simulation
    if (this.containerManager) {
      await this.containerManager.stopAll();
    }
    
    // Clear all timers
    this.timers.forEach(timer => {
      if (timer && typeof timer === 'object' && timer.unref) {
        clearInterval(timer);
      } else if (timer) {
        clearTimeout(timer);
      }
    });
    this.timers = [];
    
    // Give time for cleanup
    setTimeout(async () => {
      await this.cleanup();
      if (!this.config.silent) {
        log.debug(`[MockEngine] ${this.config.service} shutdown complete`);
      }
      this.emit('exit', 0);
    }, 2000);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await fs.unlink(this.statusFile).catch(() => {}); // Ignore if file doesn't exist
      
      if (this.containerManager) {
        await this.containerManager.cleanup();
      }
      
      if (!this.config.silent) {
        log.debug(`[MockEngine] Cleanup completed for ${this.config.service}`);
      }
    } catch (error) {
      if (!this.config.silent) {
        log.error(`[MockEngine] Error during cleanup: ${error.message}`);
      }
    }
  }

  // Legacy compatibility methods for tests
  hasExitTransition() {
    return this.patternManager.hasExitTransition(this.config.transitions);
  }

  // Additional start method for backward compatibility
  async start() {
    return this.run();
  }
}

module.exports = { MockEngine }; 