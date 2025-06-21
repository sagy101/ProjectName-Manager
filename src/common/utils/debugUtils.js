/**
 * Enhanced Debug logging utility
 * Provides consistent debug logging across the application with timestamps, prefixes, and log levels
 */

// Webpack injected global variable (defined in webpack.config.js)
/* global __PRODUCTION__ */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Determine log level based on environment and DEBUG_LOGS override
const getLogLevel = () => {
  // Check if we're in Node.js environment (main process) or browser (renderer process)
  const isNodeEnv = typeof process !== 'undefined' && process.env;
  
  if (isNodeEnv) {
    // Node.js environment (main process)
    if (process.env.DEBUG_LOGS === 'true') {
      return LOG_LEVELS.DEBUG;
    }
    if (process.env.DEBUG_LOGS === 'false') {
      return LOG_LEVELS.INFO;
    }
    // Default environment-based behavior
    return process.env.NODE_ENV === 'production' ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;
  } else {
    // Browser environment (renderer process) - use webpack injected variables
    try {
      // Check if DEBUG_LOGS is explicitly set (injected by webpack)
      if (typeof process !== 'undefined' && process.env && process.env.DEBUG_LOGS === 'true') {
        return LOG_LEVELS.DEBUG;
      }
      if (typeof process !== 'undefined' && process.env && process.env.DEBUG_LOGS === 'false') {
        return LOG_LEVELS.INFO;
      }
      
      // Use the simple production flag injected by webpack
      if (typeof __PRODUCTION__ !== 'undefined' && __PRODUCTION__) {
        return LOG_LEVELS.ERROR;
      }
      
      // Default to DEBUG for development
      return LOG_LEVELS.DEBUG;
    } catch (e) {
      // Fallback if access fails
      return LOG_LEVELS.DEBUG;
    }
  }
};

const createLogger = (prefix = '') => {
  const formatMessage = (level, ...args) => {
    const timestamp = new Date().toISOString();
    const prefixStr = prefix ? `[${prefix}]` : '';
    return [`[${timestamp}]${prefixStr}[${level}]`, ...args];
  };

  return {
    error: (...args) => {
      if (getLogLevel() >= LOG_LEVELS.ERROR) {
        console.error(...formatMessage('ERROR', ...args));
      }
    },
    warn: (...args) => {
      if (getLogLevel() >= LOG_LEVELS.WARN) {
        console.warn(...formatMessage('WARN', ...args));
      }
    },
    info: (...args) => {
      if (getLogLevel() >= LOG_LEVELS.INFO) {
        console.log(...formatMessage('INFO', ...args));
      }
    },
    debug: (...args) => {
      if (getLogLevel() >= LOG_LEVELS.DEBUG) {
        console.log(...formatMessage('DEBUG', ...args));
      }
    }
  };
};

// Default logger
const logger = createLogger();

// Convenience loggers for common modules
const loggers = {
  app: createLogger('APP'),
  terminal: createLogger('TERMINAL'),
  floating: createLogger('FLOATING'),
  autoSetup: createLogger('AUTO_SETUP'),
  git: createLogger('GIT'),
  import: createLogger('IMPORT'),
  export: createLogger('EXPORT'),
  health: createLogger('HEALTH'),
  pty: createLogger('PTY'),
  container: createLogger('CONTAINER'),
  verification: createLogger('VERIFICATION')
};

module.exports = {
  logger,
  createLogger,
  loggers,
  LOG_LEVELS
}; 