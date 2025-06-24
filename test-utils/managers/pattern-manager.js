/**
 * Pattern Manager - Handles Pattern Transitions and Behaviors
 * 
 * This module manages all pattern-related functionality including:
 * - Built-in patterns (success, fail, timeout, etc.)
 * - Dynamic pattern generation
 * - Custom pattern loading
 * - Transition scheduling
 */

const fs = require('fs').promises;
const path = require('path');
const { loggers } = require('../../src/common/utils/debugUtils.js');

const log = loggers.app;

class PatternManager {
  constructor(silent = false) {
    this.silent = silent;
    this.builtInPatterns = {
      'infinite': [
        { at: 2000, status: 'initializing', log: 'Service initializing...' },
        { at: 5000, status: 'running', log: 'Service is running' }
      ],
      'success-10': [
        { at: 2000, status: 'running', log: 'Service started' },
        { at: 10000, status: 'success', exit: 0, log: 'Completed successfully' }
      ],
      'success-30': [
        { at: 2000, status: 'running', log: 'Service started' },
        { at: 30000, status: 'success', exit: 0, log: 'Completed successfully' }
      ],
      'fail-10': [
        { at: 2000, status: 'running', log: 'Service started' },
        { at: 10000, status: 'error', exit: 1, log: 'Service failed with error' }
      ],
      'fail-15': [
        { at: 2000, status: 'running', log: 'Service started' },
        { at: 15000, status: 'error', exit: 1, log: 'Service failed with error' }
      ],
      'timeout-45': [
        { at: 2000, status: 'running', log: 'Service started' },
        { at: 45000, status: 'timeout', exit: 124, log: 'Operation timed out' }
      ],
      'sleep-20': [
        { at: 2000, status: 'running', log: 'Service started' },
        { at: 20000, status: 'sleeping', log: 'Service is sleeping' }
      ],
      'complex': [
        { at: 2000, status: 'initializing', log: 'Service initializing' },
        { at: 5000, status: 'running', log: 'Service running normally' },
        { at: 15000, status: 'degraded', log: 'Performance degraded' },
        { at: 25000, status: 'recovering', log: 'Attempting recovery' },
        { at: 35000, status: 'running', log: 'Service recovered' },
        { at: 60000, status: 'success', exit: 0, log: 'Service completed' }
      ]
    };
  }

  /**
   * Load transitions for a specific service and pattern
   * @param {string} service - Service name
   * @param {string} pattern - Pattern name
   * @param {boolean} silent - Silent mode flag
   * @returns {Array} Array of transitions
   */
  loadTransitions(service, pattern, silent = false) {
    this.silent = silent; // Update silent mode
    
    if (!this.silent) {
      log.debug(`[PatternManager] Loading transitions for service: ${service}, pattern: ${pattern}`);
    }

    // Check for environment variable override
    const envTransitions = this.loadEnvTransitions();
    if (envTransitions) {
      return envTransitions;
    }

    // Generate dynamic transitions based on pattern
    const transitions = this.generateTransitions(pattern);
    
    if (!this.silent) {
      log.debug(`[PatternManager] Getting transitions for pattern: ${pattern}`);
    }

    return transitions;
  }

  /**
   * Parse dynamic pattern transitions
   * @param {string} pattern - Pattern name (e.g., "success-10", "fail-5")
   * @returns {Array|null} Generated transitions or null
   */
  parseDynamicPattern(pattern) {
    const [type, timeStr] = pattern.split('-');
    const seconds = parseInt(timeStr);
    
    if (!isNaN(seconds)) {
      switch (type) {
        case 'success':
          return [
            { at: 2000, status: 'running', log: 'Service started' },
            { at: seconds * 1000, status: 'success', exit: 0, log: 'Completed successfully' }
          ];
        case 'fail':
          return [
            { at: 2000, status: 'running', log: 'Service started' },
            { at: seconds * 1000, status: 'error', exit: 1, log: 'Service failed with error' }
          ];
        case 'timeout':
          return [
            { at: 2000, status: 'running', log: 'Service started' },
            { at: seconds * 1000, status: 'timeout', exit: 124, log: 'Operation timed out' }
          ];
        case 'sleep':
          return [
            { at: 2000, status: 'running', log: 'Service started' },
            { at: seconds * 1000, status: 'sleeping', log: 'Service is sleeping' }
          ];
      }
    }
    
    return null;
  }

  /**
   * Check if a pattern runs indefinitely
   * @param {Array} transitions - Array of transition objects
   * @returns {boolean} True if pattern runs indefinitely
   */
  shouldRunIndefinitely(transitions) {
    return !this.hasExitTransition(transitions);
  }

  /**
   * Check if transitions contain an exit condition
   * @param {Array} transitions - Array of transition objects
   * @returns {boolean} True if transitions have exit condition
   */
  hasExitTransition(transitions) {
    return transitions.some(t => t.exit !== undefined);
  }

  /**
   * Get all available pattern names
   * @returns {Array} Array of pattern names
   */
  getAvailablePatterns() {
    return Object.keys(this.builtInPatterns);
  }

  /**
   * Validate a pattern name
   * @param {string} pattern - Pattern name to validate
   * @returns {boolean} True if pattern is valid
   */
  isValidPattern(pattern) {
    // Check built-in patterns
    if (this.builtInPatterns[pattern]) {
      return true;
    }
    
    // Check dynamic patterns
    if (pattern.includes('-')) {
      const [type, timeStr] = pattern.split('-');
      const seconds = parseInt(timeStr);
      return ['success', 'fail', 'timeout', 'sleep'].includes(type) && !isNaN(seconds);
    }
    
    return false;
  }

  /**
   * Generate transitions based on pattern name
   * @param {string} pattern - Pattern name (e.g., 'success-5', 'fail-3')
   * @returns {Array} Array of transitions
   */
  generateTransitions(pattern) {
    // Check if it's a built-in pattern
    if (this.builtInPatterns[pattern]) {
      return this.builtInPatterns[pattern];
    }

    // Parse dynamic patterns (success-X, fail-X, etc.)
    const dynamicTransitions = this.parseDynamicPattern(pattern);
    if (dynamicTransitions) {
      if (!this.silent) {
        log.debug(`[PatternManager] Using dynamic transitions:`, dynamicTransitions);
      }
      return dynamicTransitions;
    }

    // Default to success pattern
    const defaultTransitions = this.builtInPatterns['success-5'];
    if (!this.silent) {
      log.debug(`[PatternManager] Using transitions:`, defaultTransitions);
    }
    return defaultTransitions;
  }

  /**
   * Load transitions from environment variables
   * @returns {Array|null} Transitions or null if not found
   */
  loadEnvTransitions() {
    const transitionsEnv = process.env.MOCK_TRANSITIONS;
    if (!transitionsEnv) {
      return null;
    }

    try {
      return JSON.parse(transitionsEnv);
    } catch (error) {
      if (!this.silent) {
        log.warn(`[PatternManager] Invalid transitions JSON in env: ${error.message}`);
      }
      return null;
    }
  }
}

module.exports = { PatternManager }; 