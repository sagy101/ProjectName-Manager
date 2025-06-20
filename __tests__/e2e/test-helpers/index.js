// Main export file for e2e test helpers
// Consolidates all helper modules for easy importing

const appLifecycle = require('./app-lifecycle');
const sidebarHelpers = require('./sidebar-helpers');
const debugHelpers = require('./debug-helpers');
const configHelpers = require('./config-helpers');
const terminalHelpers = require('./terminal-helpers');
const verificationHelpers = require('./verification-helpers');
const uiHelpers = require('./ui-helpers');
const autoSetupHelpers = require('./auto-setup-helpers');
const healthReportHelpers = require('./health-report-helpers');
const terminalStatusHelpers = require('./terminal-status-helpers');
const fixCommandHelpers = require('./fix-command-helpers');
const constants = require('./constants');

// Re-export legacy helpers for backwards compatibility
const legacyHelpers = require('../test-helpers');

module.exports = {
  // New organized helpers
  ...appLifecycle,
  ...sidebarHelpers,
  ...debugHelpers,
  ...configHelpers,
  ...terminalHelpers,
  ...verificationHelpers,
  ...uiHelpers,
  ...autoSetupHelpers,
  ...healthReportHelpers,
  ...terminalStatusHelpers,
  ...fixCommandHelpers,
  ...constants,
  
  // Legacy helpers (for backwards compatibility during migration)
  ...legacyHelpers,
}; 