/**
 * Mock Command Engine - Main Entry Point
 * 
 * This is the main entry point for the mock system. It provides a simplified
 * interface and maintains backward compatibility while using the new modular architecture.
 * 
 * Features:
 * - Zero configuration defaults
 * - Configurable execution patterns
 * - Container simulation
 * - Smart status transitions
 * - Graceful shutdown handling
 */

const { MockEngine } = require('../engines/mock-engine');
const { PatternManager } = require('../managers/pattern-manager');
const { ContainerManager } = require('../managers/container-manager');
const { loggers } = require('../../src/common/utils/debugUtils.js');

const log = loggers.app;

/**
 * MockCommand - Legacy Compatibility Class
 * 
 * This class provides backward compatibility for existing tests
 * while delegating to the new modular architecture.
 */
class MockCommand {
  constructor() {
    this.config = {
      service: 'default-service',
      pattern: 'success-5',
      silent: false, // New silent mode for dropdown commands
      debug: null,
      mode: null,
      port: null
    };
  }

  parseArgs(args) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg.startsWith('--service=')) {
        this.config.service = arg.split('=')[1];
      } else if (arg.startsWith('--pattern=')) {
        this.config.pattern = arg.split('=')[1];
      } else if (arg.startsWith('--debug=')) {
        this.config.debug = arg.split('=')[1] === 'true';
      } else if (arg.startsWith('--mode=')) {
        this.config.mode = arg.split('=')[1];
      } else if (arg.startsWith('--port=')) {
        this.config.port = parseInt(arg.split('=')[1]);
      } else if (arg === '--silent' || arg.startsWith('--silent=')) {
        this.config.silent = arg === '--silent' || arg.split('=')[1] === 'true';
      } else if (arg === '--help' || arg === '-h') {
        this.showHelp();
        return true; // Indicate help was requested
      }
    }
    return false; // No help requested
  }

  showHelp() {
    console.log(`
Mock Command - Zero Configuration Service Mock

USAGE:
  node mock-command.js [OPTIONS]

OPTIONS:
  --service=NAME        Service name (default: default-service)
  --pattern=PATTERN     Execution pattern (default: success-5)
  --debug=BOOL          Enable debug mode (true/false)
  --mode=MODE           Execution mode (container/production/etc)
  --port=NUMBER         Port number for service
  --silent              Silent mode for dropdown commands (no debug logs)
  --help, -h            Show this help

PATTERNS:
  success-X             Complete successfully after X seconds
  fail-X                Fail after X seconds  
  timeout-X             Timeout after X seconds
  sleep-X               Sleep for X seconds then succeed
  infinite              Run indefinitely
  complex               Multi-stage transitions

EXAMPLES:
  node mock-command.js --service=web-server --pattern=success-10
  node mock-command.js --service=database --pattern=fail-5 --debug=true
  node mock-command.js --service=api --pattern=infinite --mode=container --port=3000
  node mock-command.js --service=environment-list --pattern=success-4 --silent
`);
    return true; // Indicate help was shown
  }

  async run() {
    try {
      const engine = new MockEngine(this.config);
      await engine.start();
    } catch (error) {
      log.error(`[MockCommand] Fatal error: ${error.message}`);
      if (!this.config.silent) {
        log.debug(error.stack);
      }
      throw error; // Re-throw to let caller handle exit
    }
  }

  // Delegate methods to engine for backward compatibility
  async updateStatus(status, message, exitCode = null) {
    return this.engine.updateStatus(status, message, exitCode);
  }

  shouldRunIndefinitely() {
    return this.engine.shouldRunIndefinitely();
  }

  hasExitTransition() {
    return this.engine.hasExitTransition();
  }

  scheduleTransitions() {
    return this.engine.scheduleTransitions();
  }

  startPeriodicUpdates() {
    return this.engine.startPeriodicUpdates();
  }

  setupSignalHandlers() {
    return this.engine.setupSignalHandlers();
  }

  async cleanup() {
    return this.engine.cleanup();
  }

  // Event delegation
  on(event, listener) {
    return this.engine.on(event, listener);
  }

  emit(event, ...args) {
    return this.engine.emit(event, ...args);
  }
}

// Main execution
if (require.main === module) {
  const mockCommand = new MockCommand();
  const helpRequested = mockCommand.parseArgs(process.argv.slice(2));
  
  if (helpRequested) {
    // Help was shown, exit successfully
    process.exit(0); // eslint-disable-line n/no-process-exit
  }
  
  mockCommand.run().catch(error => {
    process.exit(1); // eslint-disable-line n/no-process-exit  
  });
}

module.exports = { MockCommand, ContainerManager, MockEngine, PatternManager }; 