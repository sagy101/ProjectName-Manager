/**
 * Debug tools management helpers for e2e tests
 * Handles debug section operations, mode toggles, and development tools
 */

const { SELECTORS, TIMEOUTS, STATUS_CLASSES } = require('./constants');
const { expandAppControlSidebar } = require('./sidebar-helpers');

/**
 * Checks if the debug section is open
 * @param {any} window - The Playwright window object
 * @returns {Promise<boolean>} True if debug section is open
 */
async function isDebugSectionOpen(window) {
  try {
    const debugContent = window.locator(SELECTORS.DEBUG_SECTION_CONTENT);
    return await debugContent.isVisible();
  } catch (error) {
    console.warn('Error checking debug section state:', error.message);
    return false;
  }
}

/**
 * Opens the debug tools section
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force open even if already open
 * @param {boolean} options.ensureSidebarExpanded - Ensure App Control Sidebar is expanded first
 * @returns {Promise<void>}
 */
async function openDebugTools(window, options = {}) {
  const { 
    timeout = TIMEOUTS.MEDIUM, 
    force = false, 
    ensureSidebarExpanded = true 
  } = options;
  
  try {
    // Ensure App Control Sidebar is expanded first
    if (ensureSidebarExpanded) {
      await expandAppControlSidebar(window, { timeout });
    }
    
    const isOpen = await isDebugSectionOpen(window);
    
    if (!isOpen || force) {
      const debugButton = window.locator(SELECTORS.DEBUG_SECTION_TOGGLE);
      await debugButton.waitFor({ state: 'visible', timeout });
      await debugButton.click();
      
      // Wait for debug section to open
      const debugContent = window.locator(SELECTORS.DEBUG_SECTION_CONTENT);
      await debugContent.waitFor({ state: 'visible', timeout: TIMEOUTS.ANIMATION });
      
      console.log('✓ Debug tools section opened');
    } else {
      console.log('✓ Debug tools section already open');
    }
  } catch (error) {
    throw new Error(`Failed to open debug tools: ${error.message}`);
  }
}

/**
 * Closes the debug tools section
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force close even if already closed
 * @returns {Promise<void>}
 */
async function closeDebugTools(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, force = false } = options;
  
  try {
    const isOpen = await isDebugSectionOpen(window);
    
    if (isOpen || force) {
      const debugButton = window.locator(SELECTORS.DEBUG_SECTION_TOGGLE);
      await debugButton.waitFor({ state: 'visible', timeout });
      await debugButton.click();
      
      // Wait for debug section to close
      const debugContent = window.locator(SELECTORS.DEBUG_SECTION_CONTENT);
      await debugContent.waitFor({ state: 'hidden', timeout: TIMEOUTS.ANIMATION });
      
      console.log('✓ Debug tools section closed');
    } else {
      console.log('✓ Debug tools section already closed');
    }
  } catch (error) {
    throw new Error(`Failed to close debug tools: ${error.message}`);
  }
}

/**
 * Checks if No Run Mode is enabled
 * @param {any} window - The Playwright window object
 * @returns {Promise<boolean>} True if No Run Mode is active
 */
async function isNoRunModeEnabled(window) {
  try {
    await openDebugTools(window);
    const noRunButton = window.locator(SELECTORS.DEBUG_NO_RUN_MODE);
    return await noRunButton.evaluate(el => el.classList.contains('active'));
  } catch (error) {
    console.warn('Error checking No Run Mode state:', error.message);
    return false;
  }
}

/**
 * Enables No Run Mode
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force enable even if already enabled
 * @returns {Promise<void>}
 */
async function enableNoRunMode(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, force = false } = options;
  
  try {
    await openDebugTools(window, { timeout });
    
    const isEnabled = await isNoRunModeEnabled(window);
    
    if (!isEnabled || force) {
      const noRunButton = window.locator(SELECTORS.DEBUG_NO_RUN_MODE);
      await noRunButton.waitFor({ state: 'visible', timeout });
      await noRunButton.click();
      
      // Wait for button to become active
      await window.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(btn => btn.textContent.includes('No Run Mode'));
        return button && button.classList.contains('active');
      }, { timeout: TIMEOUTS.STATUS_CHANGE });
      
      console.log('✓ No Run Mode enabled');
    } else {
      console.log('✓ No Run Mode already enabled');
    }
  } catch (error) {
    throw new Error(`Failed to enable No Run Mode: ${error.message}`);
  }
}

/**
 * Disables No Run Mode
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force disable even if already disabled
 * @returns {Promise<void>}
 */
async function disableNoRunMode(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, force = false } = options;
  
  try {
    await openDebugTools(window, { timeout });
    
    const isEnabled = await isNoRunModeEnabled(window);
    
    if (isEnabled || force) {
      const noRunButton = window.locator(SELECTORS.DEBUG_NO_RUN_MODE);
      await noRunButton.waitFor({ state: 'visible', timeout });
      await noRunButton.click();
      
      // Wait for button to become inactive
      await window.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(btn => btn.textContent.includes('No Run Mode'));
        return button && !button.classList.contains('active');
      }, { timeout: TIMEOUTS.STATUS_CHANGE });
      
      console.log('✓ No Run Mode disabled');
    } else {
      console.log('✓ No Run Mode already disabled');
    }
  } catch (error) {
    throw new Error(`Failed to disable No Run Mode: ${error.message}`);
  }
}

/**
 * Toggles all verification statuses for testing
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {number} options.waitAfterToggle - Time to wait after toggling for status changes
 * @returns {Promise<void>}
 */
async function toggleAllVerifications(window, options = {}) {
  const { 
    timeout = TIMEOUTS.MEDIUM, 
    waitAfterToggle = TIMEOUTS.STATUS_CHANGE 
  } = options;
  
  try {
    await openDebugTools(window, { timeout });
    
    const toggleButton = window.locator(SELECTORS.DEBUG_TOGGLE_VERIFICATIONS);
    await toggleButton.waitFor({ state: 'visible', timeout });
    await toggleButton.click();
    
    // Wait for verification status changes to propagate
    await window.waitForTimeout(waitAfterToggle);
    
    console.log('✓ All verifications toggled');
  } catch (error) {
    throw new Error(`Failed to toggle verifications: ${error.message}`);
  }
}

/**
 * Shows test sections
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function showTestSections(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    await openDebugTools(window, { timeout });
    
    const showTestsButton = window.locator(SELECTORS.DEBUG_SHOW_TESTS);
    
    if (await showTestsButton.isVisible()) {
      await showTestsButton.click();
      
      // Wait for button text to change to "Hide Tests"
      await window.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(btn => btn.textContent.includes('Hide Tests'));
        return button !== null;
      }, { timeout: TIMEOUTS.STATUS_CHANGE });
      
      console.log('✓ Test sections shown');
    } else {
      console.log('✓ Test sections already shown');
    }
  } catch (error) {
    throw new Error(`Failed to show test sections: ${error.message}`);
  }
}

/**
 * Hides test sections
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function hideTestSections(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    await openDebugTools(window, { timeout });
    
    const hideTestsButton = window.locator(SELECTORS.DEBUG_HIDE_TESTS);
    
    if (await hideTestsButton.isVisible()) {
      await hideTestsButton.click();
      
      // Wait for button text to change to "Show Tests"
      await window.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(btn => btn.textContent.includes('Show Tests'));
        return button !== null;
      }, { timeout: TIMEOUTS.STATUS_CHANGE });
      
      console.log('✓ Test sections hidden');
    } else {
      console.log('✓ Test sections already hidden');
    }
  } catch (error) {
    throw new Error(`Failed to hide test sections: ${error.message}`);
  }
}

/**
 * Sets terminal mode (read-only or writable)
 * @param {any} window - The Playwright window object
 * @param {string} mode - 'readonly' or 'writable'
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function setTerminalMode(window, mode, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  if (!['readonly', 'writable'].includes(mode)) {
    throw new Error('Terminal mode must be "readonly" or "writable"');
  }
  
  try {
    await openDebugTools(window, { timeout });
    
    // Find the terminal mode button (it toggles between read-only and writable)
    const terminalModeButton = window.locator('.debug-section-content button').filter({ hasText: /Terminals Read-Only|Terminals Writable/i });
    await terminalModeButton.waitFor({ state: 'visible', timeout });
    
    const currentText = await terminalModeButton.textContent();
    const currentMode = currentText.includes('Read-Only') ? 'readonly' : 'writable';
    
    if (currentMode !== mode) {
      await terminalModeButton.click();
      
      // Wait for the button text to change
      await window.waitForFunction((expectedMode) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const terminalButton = buttons.find(btn => btn.textContent.includes('Terminals'));
        if (!terminalButton) return false;
        
        const newMode = terminalButton.textContent.includes('Read-Only') ? 'readonly' : 'writable';
        return newMode === expectedMode;
      }, mode, { timeout: TIMEOUTS.STATUS_CHANGE });
      
      console.log(`✓ Terminal mode set to ${mode}`);
    } else {
      console.log(`✓ Terminal mode already set to ${mode}`);
    }
  } catch (error) {
    throw new Error(`Failed to set terminal mode to ${mode}: ${error.message}`);
  }
}

/**
 * Opens DevTools
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function openDevTools(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    await openDebugTools(window, { timeout });
    
    const devToolsButton = window.locator(SELECTORS.DEBUG_DEVTOOLS);
    await devToolsButton.waitFor({ state: 'visible', timeout });
    await devToolsButton.click();
    
    console.log('✓ DevTools opened');
  } catch (error) {
    throw new Error(`Failed to open DevTools: ${error.message}`);
  }
}

/**
 * Reloads the application
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function reloadApp(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    await openDebugTools(window, { timeout });
    
    const reloadButton = window.locator(SELECTORS.DEBUG_RELOAD);
    await reloadButton.waitFor({ state: 'visible', timeout });
    await reloadButton.click();
    
    console.log('✓ Application reload initiated');
  } catch (error) {
    throw new Error(`Failed to reload application: ${error.message}`);
  }
}

/**
 * Legacy function names for backwards compatibility
 */
async function expandDebugMenu(window) {
  console.warn('expandDebugMenu is deprecated, use openDebugTools instead');
  return openDebugTools(window);
}

async function clickNoRunMode(window) {
  console.warn('clickNoRunMode is deprecated, use enableNoRunMode instead');
  return enableNoRunMode(window);
}

module.exports = {
  // Debug section management
  isDebugSectionOpen,
  openDebugTools,
  closeDebugTools,
  
  // No Run Mode
  isNoRunModeEnabled,
  enableNoRunMode,
  disableNoRunMode,
  
  // Verification toggles
  toggleAllVerifications,
  
  // Test sections
  showTestSections,
  hideTestSections,
  
  // Terminal modes
  setTerminalMode,
  
  // Development tools
  openDevTools,
  reloadApp,
  
  // Legacy compatibility
  expandDebugMenu,
  clickNoRunMode,
}; 