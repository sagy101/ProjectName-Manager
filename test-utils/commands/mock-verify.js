#!/usr/bin/env node

/**
 * Mock Verification Command - Entry Point for Verification Mocking
 * 
 * This is the entry point for verification and fix command simulation.
 * It provides stateful verification behavior for testing the UI components.
 * 
 * Usage:
 *   node mock-verify.js --type=verification --id=NodeJSInstalled
 *   node mock-verify.js --type=fix --id=NodeJSInstalled
 * 
 * Features:
 * - Stateful verification results (initial fail → fixed pass)
 * - Configurable via mock-config.json
 * - Support for various check types
 * - Fix command simulation with state tracking
 */

const { VerificationManager } = require('../managers/verification-manager');

class MockVerificationCommand {
  constructor(args = []) {
    this.config = this.parseArgs(args);
    this.verificationManager = new VerificationManager(this.config.silent);
  }

  /**
   * Parse command line arguments
   * @param {Array} args - Command line arguments
   * @returns {Object} Parsed configuration
   */
  parseArgs(args) {
    const config = {
      type: 'verification', // verification or fix
      id: null,
      checkType: null,
      command: null,
      expectedOutput: null,
      debug: false,
      silent: false
    };

    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.split('=');
        if (key && value) {
          const configKey = key.replace('--', '');
          config[configKey] = value;
        }
      }
    });

    // Debug mode
    if (config.debug === 'true') {
      config.debug = true;
    }

    return config;
  }

  /**
   * Main execution method
   */
  async run() {
    try {
      // Initialize verification manager (load state)
      await this.verificationManager.loadState();
      
      if (this.config.debug) {
        console.log(`[MockVerify] Configuration:`, JSON.stringify(this.config, null, 2));
        console.log(`[MockVerify] Verification state:`, this.verificationManager.getStatusSummary());
      }

      if (!this.config.id) {
        console.error('[MockVerify] Error: --id parameter is required');
        process.exit(1); // eslint-disable-line no-process-exit
      }

      if (this.config.type === 'fix') {
        await this.runFixCommand();
      } else {
        await this.runVerification();
      }

    } catch (error) {
      console.error(`[MockVerify] Fatal error: ${error.message}`);
      if (this.config.debug) {
        console.error(error.stack);
      }
      process.exit(1); // eslint-disable-line no-process-exit
    }
  }

  /**
   * Run a verification command
   */
  async runVerification() {
    const result = await this.verificationManager.runVerification(this.config.id, {
      checkType: this.config.checkType,
      command: this.config.command,
      expectedOutput: this.config.expectedOutput
    });

    // Output the result
    if (result.output) {
      console.log(result.output);
    }

    if (result.version) {
      console.log(`Version: ${result.version}`);
    }

    if (this.config.debug) {
      console.log(`[MockVerify] Verification ${this.config.id} completed with exit code: ${result.exitCode}`);
    }

    process.exit(result.exitCode); // eslint-disable-line no-process-exit
  }

  /**
   * Run a fix command
   */
  async runFixCommand() {
    const result = await this.verificationManager.runFixCommand(this.config.id, {
      debug: this.config.debug
    });

    // Output the fix command result
    if (result.output) {
      console.log(result.output);
    }

    // Simulate the fix command duration
    if (result.duration > 0) {
      await new Promise(resolve => setTimeout(resolve, result.duration));
    }

    if (this.config.debug) {
      console.log(`[MockVerify] Fix command for ${this.config.id} completed with exit code: ${result.exitCode}`);
    }

    process.exit(result.exitCode); // eslint-disable-line no-process-exit
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
Mock Verification Command

Usage:
  node mock-verify.js --type=verification --id=<verification-id> [options]
  node mock-verify.js --type=fix --id=<verification-id> [options]

Parameters:
  --type=TYPE         Type of operation: 'verification' or 'fix'
  --id=ID            Verification identifier (e.g., 'NodeJSInstalled')
  --checkType=TYPE   Type of check: 'commandSuccess', 'outputContains', 'versionId'
  --command=CMD      Command to simulate checking
  --expectedOutput=OUT Expected output pattern
  --debug=true       Enable debug output
  --silent=true      Enable silent mode

Examples:
  # Run a verification (will fail initially, pass after fix)
  node mock-verify.js --type=verification --id=NodeJSInstalled
  
  # Run a fix command (marks verification as fixed)
  node mock-verify.js --type=fix --id=NodeJSInstalled
  
  # Run verification with debug output
  node mock-verify.js --type=verification --id=NodeJSInstalled --debug=true

Configuration:
  Configure verification behavior in test-utils/config/mock-config.json under 'verifications'
`);
  }
}

// Main execution when run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Show help if no arguments or --help
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    const mock = new MockVerificationCommand();
    mock.showHelp();
    process.exit(0); // eslint-disable-line no-process-exit
  }

  const mockVerification = new MockVerificationCommand(args);
  mockVerification.run();
}

module.exports = { MockVerificationCommand }; 