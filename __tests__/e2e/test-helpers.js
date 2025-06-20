// Legacy test-helpers.js - now imports from the new consolidated helper structure
// This maintains backwards compatibility while using the new organized helpers

// Import all the new helpers
const allHelpers = require('./test-helpers/index');

// Re-export everything from the new helpers for backwards compatibility
module.exports = {
  // Re-export all new helpers
  ...allHelpers,
  
  // Maintain legacy function names and any specific implementations that might be different
  // These can override the new helpers if needed for backwards compatibility
}; 