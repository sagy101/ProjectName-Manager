/**
 * Sidebar management helpers for e2e tests
 * Handles both App Control Sidebar and Configuration Sidebar operations
 */

const { SELECTORS, TIMEOUTS, STATUS_CLASSES } = require('./constants');

/**
 * Checks if the App Control Sidebar is expanded
 * @param {any} window - The Playwright window object
 * @returns {Promise<boolean>} True if expanded, false if collapsed
 */
async function isAppControlSidebarExpanded(window) {
  try {
    const sidebar = window.locator(SELECTORS.APP_SIDEBAR);
    const hasCollapsedClass = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    return !hasCollapsedClass;
  } catch (error) {
    console.warn('Error checking App Control Sidebar state:', error.message);
    return false;
  }
}

/**
 * Expands the App Control Sidebar if it's collapsed
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force click even if already expanded
 * @returns {Promise<void>}
 */
async function expandAppControlSidebar(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, force = false } = options;
  
  try {
    const isExpanded = await isAppControlSidebarExpanded(window);
    
    if (!isExpanded || force) {
      const expandButton = window.locator(SELECTORS.APP_SIDEBAR_EXPAND_BTN);
      await expandButton.waitFor({ state: 'visible', timeout });
      await expandButton.click();
      
      // Wait for sidebar to expand
      const sidebar = window.locator(SELECTORS.APP_SIDEBAR);
      await sidebar.waitFor({ 
        state: 'visible', 
        timeout: TIMEOUTS.ANIMATION 
      });
      
      // Verify expansion by checking class
      await window.waitForFunction(() => {
        const sidebar = document.querySelector('.app-control-sidebar');
        return sidebar && !sidebar.classList.contains('collapsed');
      }, { timeout: TIMEOUTS.ANIMATION });
      
      console.log('✓ App Control Sidebar expanded');
    } else {
      console.log('✓ App Control Sidebar already expanded');
    }
  } catch (error) {
    throw new Error(`Failed to expand App Control Sidebar: ${error.message}`);
  }
}

/**
 * Collapses the App Control Sidebar if it's expanded
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force click even if already collapsed
 * @returns {Promise<void>}
 */
async function collapseAppControlSidebar(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, force = false } = options;
  
  try {
    const isExpanded = await isAppControlSidebarExpanded(window);
    
    if (isExpanded || force) {
      const collapseButton = window.locator(SELECTORS.APP_SIDEBAR_COLLAPSE_BTN);
      await collapseButton.waitFor({ state: 'visible', timeout });
      await collapseButton.click();
      
      // Wait for sidebar to collapse
      await window.waitForFunction(() => {
        const sidebar = document.querySelector('.app-control-sidebar');
        return sidebar && sidebar.classList.contains('collapsed');
      }, { timeout: TIMEOUTS.ANIMATION });
      
      console.log('✓ App Control Sidebar collapsed');
    } else {
      console.log('✓ App Control Sidebar already collapsed');
    }
  } catch (error) {
    throw new Error(`Failed to collapse App Control Sidebar: ${error.message}`);
  }
}

/**
 * Checks if the Configuration Sidebar is expanded
 * @param {any} window - The Playwright window object
 * @returns {Promise<boolean>} True if expanded, false if collapsed
 */
async function isConfigSidebarExpanded(window) {
  try {
    const sidebar = window.locator(SELECTORS.CONFIG_SIDEBAR);
    const hasCollapsedClass = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    return !hasCollapsedClass;
  } catch (error) {
    console.warn('Error checking Configuration Sidebar state:', error.message);
    return false;
  }
}

/**
 * Expands the Configuration Sidebar if it's collapsed
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force click even if already expanded
 * @returns {Promise<void>}
 */
async function expandConfigSidebar(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, force = false } = options;
  
  try {
    const isExpanded = await isConfigSidebarExpanded(window);
    
    if (!isExpanded || force) {
      const collapseButton = window.locator(SELECTORS.CONFIG_COLLAPSE_BTN);
      await collapseButton.waitFor({ state: 'visible', timeout });
      await collapseButton.click();
      
      // Wait for sidebar to expand
      await window.waitForFunction(() => {
        const sidebar = document.querySelector('.sidebar');
        return sidebar && !sidebar.classList.contains('collapsed');
      }, { timeout: TIMEOUTS.ANIMATION });
      
      console.log('✓ Configuration Sidebar expanded');
    } else {
      console.log('✓ Configuration Sidebar already expanded');
    }
  } catch (error) {
    throw new Error(`Failed to expand Configuration Sidebar: ${error.message}`);
  }
}

/**
 * Collapses the Configuration Sidebar if it's expanded
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force click even if already collapsed
 * @returns {Promise<void>}
 */
async function collapseConfigSidebar(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, force = false } = options;
  
  try {
    const isExpanded = await isConfigSidebarExpanded(window);
    
    if (isExpanded || force) {
      const collapseButton = window.locator(SELECTORS.CONFIG_COLLAPSE_BTN);
      await collapseButton.waitFor({ state: 'visible', timeout });
      await collapseButton.click();
      
      // Wait for sidebar to collapse
      await window.waitForFunction(() => {
        const sidebar = document.querySelector('.sidebar');
        return sidebar && sidebar.classList.contains('collapsed');
      }, { timeout: TIMEOUTS.ANIMATION });
      
      console.log('✓ Configuration Sidebar collapsed');
    } else {
      console.log('✓ Configuration Sidebar already collapsed');
    }
  } catch (error) {
    throw new Error(`Failed to collapse Configuration Sidebar: ${error.message}`);
  }
}

/**
 * Ensures the App Control Sidebar is in the desired state
 * @param {any} window - The Playwright window object
 * @param {boolean} shouldBeExpanded - True to expand, false to collapse
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function ensureAppControlSidebarState(window, shouldBeExpanded, options = {}) {
  if (shouldBeExpanded) {
    await expandAppControlSidebar(window, options);
  } else {
    await collapseAppControlSidebar(window, options);
  }
}

/**
 * Ensures the Configuration Sidebar is in the desired state
 * @param {any} window - The Playwright window object
 * @param {boolean} shouldBeExpanded - True to expand, false to collapse
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function ensureConfigSidebarState(window, shouldBeExpanded, options = {}) {
  if (shouldBeExpanded) {
    await expandConfigSidebar(window, options);
  } else {
    await collapseConfigSidebar(window, options);
  }
}

/**
 * Legacy function name for backwards compatibility
 * @deprecated Use expandAppControlSidebar instead
 */
async function expandSidebar(window) {
  console.warn('expandSidebar is deprecated, use expandAppControlSidebar instead');
  return expandAppControlSidebar(window);
}

module.exports = {
  // App Control Sidebar
  isAppControlSidebarExpanded,
  expandAppControlSidebar,
  collapseAppControlSidebar,
  ensureAppControlSidebarState,
  
  // Configuration Sidebar
  isConfigSidebarExpanded,
  expandConfigSidebar,
  collapseConfigSidebar,
  ensureConfigSidebarState,
  
  // Legacy compatibility
  expandSidebar,
}; 