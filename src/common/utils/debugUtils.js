/**
 * Debug logging utility
 * Provides consistent debug logging across the application
 */

const debugLog = (...args) => {
  if (process.env.DEBUG_LOGS === 'true') {
    console.log('[DEBUG]', ...args);
  }
};

module.exports = {
  debugLog
}; 