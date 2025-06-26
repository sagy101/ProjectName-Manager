/**
 * Shared constants for e2e tests
 * Centralizes selectors, timeouts, and other common values
 */

// Timeout utilities
const getTimeout = (base) => {
  return process.env.CI ? base * 2 : base;
};

// Common timeout values
const TIMEOUTS = {
  SHORT: getTimeout(2000),
  MEDIUM: getTimeout(5000),
  LONG: getTimeout(10000),
  VERY_LONG: getTimeout(30000),
  APP_LAUNCH: getTimeout(60000),
  ANIMATION: getTimeout(500),
  STATUS_CHANGE: getTimeout(1500),
};

// Selector constants
const SELECTORS = {
  // App Control Sidebar
  APP_SIDEBAR: '.app-control-sidebar',
  APP_SIDEBAR_EXPAND_BTN: '[title="Expand Sidebar"]',
  APP_SIDEBAR_COLLAPSE_BTN: '[title="Collapse Sidebar"]',
  
  // Configuration Sidebar
  CONFIG_SIDEBAR: '.sidebar',
  CONFIG_COLLAPSE_BTN: '.config-collapse-btn',
  CONFIG_CONTAINER: '.config-container',
  CONFIG_SECTIONS: '#config-sections',
  
  // Debug Tools
  DEBUG_SECTION_TOGGLE: '.debug-section-toggle-button',
  DEBUG_SECTION_CONTENT: '.debug-section-content',
  DEBUG_NO_RUN_MODE: 'button:has-text("No Run Mode")',
  DEBUG_TOGGLE_VERIFICATIONS: 'button:has-text("Toggle Verifications")',
  DEBUG_SHOW_TESTS: 'button:has-text("Show Tests")',
  DEBUG_HIDE_TESTS: 'button:has-text("Hide Tests")',
  DEBUG_TERMINALS_READONLY: 'button:has-text("Terminals Read-Only")',
  DEBUG_TERMINALS_WRITABLE: 'button:has-text("Terminals Writable")',
  DEBUG_DEVTOOLS: 'button:has-text("DevTools")',
  DEBUG_RELOAD: 'button:has-text("Reload")',
  DEBUG_EXPORT_CONFIG: 'button:has-text("Export Config")',
  DEBUG_IMPORT_CONFIG: 'button:has-text("Import Config")',
  DEBUG_EXPORT_ENV: 'button:has-text("Export Environment")',
  
  // Configuration Sections
  CONFIG_SECTION: '.config-section',
  CONFIG_SECTION_TITLE: 'h2',
  CONFIG_SECTION_TOGGLE: 'input[type="checkbox"]',
  ATTACH_TOGGLE_PREFIX: '#attach-',
  MODE_SELECTOR_PREFIX: '[data-testid="mode-selector-btn-',
  DEPLOYMENT_TOGGLE: '.deployment-toggle-btn',
  
  // Verification System
  VERIFICATION_HEADER: '.verification-header',
  VERIFICATION_CONTENT: '.verification-content',
  VERIFICATION_CONTAINER: '.environment-verification-container',
  VERIFICATION_INDICATOR: '.verification-indicator',
  VERIFICATION_INFO_BTN: '.verification-info-btn',
  TOGGLE_ICON: '.toggle-icon',
  FIX_BUTTON: '.fix-button',
  
  // Terminals
  RUN_BUTTON: '#run-configuration-button',
  STOP_BUTTON: '#run-configuration-button.stop',
  TERMINAL_TAB: '.tab',
  TERMINAL_TAB_TITLE: '.tab-title',
  TERMINAL_STATUS: '.tab-status',
  TERMINAL_CONTAINER: '.terminal-container',
  FLOATING_TERMINAL: '.floating-terminal-window',
  FLOATING_TERMINAL_TITLE: '.floating-terminal-title',
  FLOATING_TERMINAL_CLOSE: '.floating-terminal-close-button',
  
  // Status and Overlays
  STOPPING_OVERLAY: '.stopping-status-overlay',
  STOPPING_CLOSE_BTN: '.close-button',
  NOTIFICATION: '.notification',
  NOTIFICATION_INFO: '.notification-info',
  
  // Popups and Modals
  COMMAND_POPUP: '.command-popup-overlay',
  CONFIRM_BUTTON: '.confirm-button',
  CANCEL_BUTTON: '.cancel-button',
  CLOSE_BUTTON: '.close-button',
  
  // Health Report
  HEALTH_REPORT_BTN: '[data-testid="health-report-button"]',
  HEALTH_REPORT_CONTAINER: '.health-report-container',
  
  // Auto Setup
  AUTO_SETUP_BTN: '.auto-setup-button',
  AUTO_SETUP_CONTAINER: '.auto-setup-container',
  PRIORITY_GROUP: '.priority-group',
  START_PRIORITY_BTN: 'button:has-text("Start Priority")',
  START_AUTO_SETUP_BTN: 'button:has-text("Start Auto Setup")',
};

// Status classes
const STATUS_CLASSES = {
  EXPANDED: 'expanded',
  COLLAPSED: 'collapsed',
  ACTIVE: 'active',
  DISABLED: 'disabled',
  RUNNING: 'status-running',
  ERROR: 'error',
  SUCCESS: 'success',
  VALID: 'valid',
  INVALID: 'invalid',
  ATTACHED: 'attached',
  TBD: 'tbd',
};

// Common test data
const TEST_DATA = {
  DEFAULT_PROJECT_NAME: 'ProjectName',
  SERVICE_A_TITLE: 'Service A',
  SERVICE_B_TITLE: 'Service B',
  SERVICE_C_TITLE: 'Service C',
  GENERAL_ENV_TITLE: 'General Environment',
};

module.exports = {
  getTimeout,
  TIMEOUTS,
  SELECTORS,
  STATUS_CLASSES,
  TEST_DATA,
}; 