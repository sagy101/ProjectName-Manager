/**
 * Verification Manager - Handles Verification State and Mock Results
 * 
 * This module manages verification command simulation with stateful behavior:
 * - Tracks which verifications have been "fixed"
 * - Returns different results based on fix history
 * - Supports various check types (commandSuccess, outputContains, etc.)
 * - Configurable via mock-config.json
 * - Persists state across command invocations
 */

const path = require('path');
const fs = require('fs').promises;
const { loggers } = require('../../src/common/utils/debugUtils.js');

const log = loggers.verification;

class VerificationManager {
  constructor(silent = false) {
    this.silent = silent;
    this.fixedVerifications = new Set();
    this.verificationConfig = this.loadVerificationConfig();
    this.stateFile = path.join('/tmp', 'mock-verification-state.json');
    
    // State will be loaded explicitly when needed
  }

  /**
   * Load verification configuration from mock-config.json
   * @returns {Object} Verification configuration
   */
  loadVerificationConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'config', 'mock-config.json');
      // Clear require cache to get fresh config
      delete require.cache[require.resolve(configPath)];
      const config = require(configPath);
      return config.verifications || {};
    } catch (error) {
      if (!this.silent) {
        log.warn(`[VerificationManager] No verification config found: ${error.message}`);
      }
      return {};
    }
  }

  /**
   * Load persisted state from file
   */
  async loadState() {
    try {
      const stateData = await fs.readFile(this.stateFile, 'utf8');
      const state = JSON.parse(stateData);
      this.fixedVerifications = new Set(state.fixedVerifications || []);
      if (!this.silent) {
        log.debug(`[VerificationManager] Loaded state: ${this.fixedVerifications.size} fixed verifications`);
      }
    } catch (error) {
      // File doesn't exist or is invalid - start with empty state
      if (!this.silent) {
        log.debug(`[VerificationManager] Starting with fresh state: ${error.message}`);
      }
      this.fixedVerifications = new Set();
    }
  }

  /**
   * Save current state to file
   */
  async saveState() {
    try {
      const state = {
        fixedVerifications: Array.from(this.fixedVerifications),
        timestamp: Date.now()
      };
      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
      if (!this.silent) {
        log.debug(`[VerificationManager] State saved: ${this.fixedVerifications.size} fixed verifications`);
      }
    } catch (error) {
      if (!this.silent) {
        log.error(`[VerificationManager] Failed to save state: ${error.message}`);
      }
    }
  }

  /**
   * Run a verification command and return appropriate result
   * @param {string} verificationId - Unique verification identifier
   * @param {Object} options - Additional options
   * @returns {Object} Verification result with output, exitCode, and optional version
   */
  async runVerification(verificationId, options = {}) {
    if (!this.silent) {
      log.debug(`[VerificationManager] Running verification: ${verificationId}`);
    }
    
    const config = this.getVerificationConfig(verificationId);
    const isFixed = this.fixedVerifications.has(verificationId);
    
    // Choose result based on whether verification has been "fixed"
    const result = isFixed ? config.fixed : config.initial;
    
    if (!result) {
      // If no specific config, provide default behavior
      return this.getDefaultVerificationResult(verificationId, isFixed);
    }
    
    if (!this.silent) {
      log.debug(`[VerificationManager] Verification ${verificationId} result: ${result.status} (fixed: ${isFixed})`);
    }
    
    return {
      output: result.output || '',
      exitCode: result.status === 'pass' ? 0 : 1,
      version: result.version || null
    };
  }

  /**
   * Get configuration for a specific verification
   * @param {string} verificationId - Verification identifier
   * @returns {Object} Verification configuration
   */
  getVerificationConfig(verificationId) {
    return this.verificationConfig[verificationId] || {};
  }

  /**
   * Get default verification result when no config is provided
   * @param {string} verificationId - Verification identifier
   * @param {boolean} isFixed - Whether verification has been fixed
   * @returns {Object} Default verification result
   */
  getDefaultVerificationResult(verificationId, isFixed) {
    // Default behavior: fail initially, pass after fix
    if (isFixed) {
      return {
        output: `${verificationId} is now working correctly`,
        exitCode: 0,
        version: null
      };
    } else {
      return {
        output: `${verificationId}: command not found or not working`,
        exitCode: 1,
        version: null
      };
    }
  }

  /**
   * Mark a verification as fixed
   * @param {string} verificationId - Verification identifier
   */
  async markAsFixed(verificationId) {
    if (!this.silent) {
      log.debug(`[VerificationManager] Marking ${verificationId} as fixed`);
    }
    this.fixedVerifications.add(verificationId);
    await this.saveState();
  }

  /**
   * Check if a verification has been fixed
   * @param {string} verificationId - Verification identifier
   * @returns {boolean} True if verification has been fixed
   */
  isFixed(verificationId) {
    return this.fixedVerifications.has(verificationId);
  }

  /**
   * Reset all fix states (useful for testing)
   */
  async resetAllFixes() {
    if (!this.silent) {
      log.debug(`[VerificationManager] Resetting all fix states`);
    }
    this.fixedVerifications.clear();
    await this.saveState();
  }

  /**
   * Get all fixed verifications
   * @returns {Array} Array of fixed verification IDs
   */
  getFixedVerifications() {
    return Array.from(this.fixedVerifications);
  }

  /**
   * Simulate running a fix command
   * @param {string} verificationId - Verification that needs fixing
   * @param {Object} options - Fix command options
   * @returns {Object} Fix simulation result
   */
  async runFixCommand(verificationId, options = {}) {
    if (!this.silent) {
      log.debug(`[VerificationManager] Running fix command for: ${verificationId}`);
    }
    
    const config = this.getVerificationConfig(verificationId);
    const fixConfig = config.fixCommand || {};
    
    // Simulate the fix command execution
    const result = {
      output: fixConfig.output || `Installing/fixing ${verificationId}...`,
      exitCode: fixConfig.exitCode || 0,
      duration: fixConfig.duration || 2000 // Default 2 second simulation
    };
    
    // Mark as fixed after successful fix command
    if (result.exitCode === 0) {
      await this.markAsFixed(verificationId);
    }
    
    if (!this.silent) {
      log.debug(`[VerificationManager] Fix command for ${verificationId} completed with exit code: ${result.exitCode}`);
    }
    return result;
  }

  /**
   * Get verification status summary
   * @returns {Object} Status summary
   */
  getStatusSummary() {
    const totalConfig = Object.keys(this.verificationConfig).length;
    const totalFixed = this.fixedVerifications.size;
    
    return {
      totalConfigured: totalConfig,
      totalFixed: totalFixed,
      fixedVerifications: this.getFixedVerifications()
    };
  }

  /**
   * Import verification state (for testing/demo purposes)
   * @param {Array} fixedIds - Array of verification IDs to mark as fixed
   */
  async importFixedState(fixedIds) {
    if (!this.silent) {
      log.debug(`[VerificationManager] Importing fixed state for: ${fixedIds.join(', ')}`);
    }
    fixedIds.forEach(id => this.fixedVerifications.add(id));
    await this.saveState();
  }

  /**
   * Export verification state
   * @returns {Array} Array of currently fixed verification IDs
   */
  exportFixedState() {
    return this.getFixedVerifications();
  }

  /**
   * Clean up state file (for testing)
   */
  async cleanup() {
    try {
      await fs.unlink(this.stateFile);
      if (!this.silent) {
        log.debug(`[VerificationManager] State file cleaned up`);
      }
    } catch (error) {
      // File doesn't exist - that's fine
    }
  }
}

module.exports = { VerificationManager }; 