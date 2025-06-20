/**
 * Terminal management helpers for e2e tests
 * Handles terminal operations, process management, and tab interactions
 */

const { SELECTORS, TIMEOUTS, STATUS_CLASSES, TEST_DATA } = require('./constants');

/**
 * Runs the current configuration
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.waitForTabs - Whether to wait for terminal tabs to appear
 * @returns {Promise<void>}
 */
async function runConfiguration(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, waitForTabs = false } = options;
  
  try {
    const runButton = window.locator(SELECTORS.RUN_BUTTON);
    await runButton.waitFor({ state: 'visible', timeout });
    
    // Check if button is enabled
    const isEnabled = await runButton.isEnabled();
    if (!isEnabled) {
      throw new Error('Run button is not enabled - configuration may be invalid');
    }
    
    await runButton.click();
    
    if (waitForTabs) {
      // Wait for at least one terminal tab to appear
      await window.waitForSelector(SELECTORS.TERMINAL_TAB, { timeout });
    }
    
    console.log('✓ Configuration run started');
  } catch (error) {
    throw new Error(`Failed to run configuration: ${error.message}`);
  }
}

/**
 * Stops the current configuration
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.waitForComplete - Whether to wait for stopping to complete
 * @param {boolean} options.handleStoppingOverlay - Whether to handle the stopping overlay
 * @returns {Promise<void>}
 */
async function stopConfiguration(window, options = {}) {
  const { 
    timeout = TIMEOUTS.MEDIUM, 
    waitForComplete = true, 
    handleStoppingOverlay = true 
  } = options;
  
  try {
    const stopButton = window.locator(SELECTORS.STOP_BUTTON);
    await stopButton.waitFor({ state: 'visible', timeout });
    await stopButton.click();
    
    if (waitForComplete && handleStoppingOverlay) {
      await waitForStoppingOverlay(window, { timeout: TIMEOUTS.VERY_LONG });
      await closeStoppingOverlay(window, { timeout });
    }
    
    console.log('✓ Configuration stopped');
  } catch (error) {
    throw new Error(`Failed to stop configuration: ${error.message}`);
  }
}

/**
 * Waits for the stopping overlay to appear and complete
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function waitForStoppingOverlay(window, options = {}) {
  const { timeout = TIMEOUTS.VERY_LONG } = options;
  
  try {
    const stoppingScreen = window.locator(SELECTORS.STOPPING_OVERLAY);
    
    // Wait for overlay to appear
    await stoppingScreen.waitFor({ state: 'visible', timeout: TIMEOUTS.MEDIUM });
    
    // Wait for the Close button to appear (when isComplete is true)
    const closeButton = stoppingScreen.locator(SELECTORS.STOPPING_CLOSE_BTN);
    await closeButton.waitFor({ state: 'visible', timeout });
    
    console.log('✓ Stopping overlay completed');
  } catch (error) {
    throw new Error(`Failed to wait for stopping overlay: ${error.message}`);
  }
}

/**
 * Closes the stopping overlay
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function closeStoppingOverlay(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const stoppingScreen = window.locator(SELECTORS.STOPPING_OVERLAY);
    const closeButton = stoppingScreen.locator(SELECTORS.STOPPING_CLOSE_BTN);
    
    await closeButton.waitFor({ state: 'visible', timeout });
    await closeButton.click();
    
    // Wait for overlay to disappear
    await stoppingScreen.waitFor({ state: 'hidden', timeout });
    
    console.log('✓ Stopping overlay closed');
  } catch (error) {
    throw new Error(`Failed to close stopping overlay: ${error.message}`);
  }
}

/**
 * Waits for a terminal tab with specific title to appear
 * @param {any} window - The Playwright window object
 * @param {string} tabTitle - The title or partial title of the tab to wait for
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @param {boolean} options.exact - Whether to match title exactly
 * @returns {Promise<any>} The tab element locator
 */
async function waitForTerminalTab(window, tabTitle, options = {}) {
  const { timeout = TIMEOUTS.LONG, exact = false } = options;
  
  try {
    const tabSelector = exact 
      ? `.tab:has(.tab-title:text("${tabTitle}"))`
      : `.tab:has(.tab-title:text-matches(".*${tabTitle}.*", "i"))`;
    
    const tab = window.locator(tabSelector);
    await tab.waitFor({ state: 'visible', timeout });
    
    console.log(`✓ Terminal tab "${tabTitle}" appeared`);
    return tab;
  } catch (error) {
    throw new Error(`Failed to wait for terminal tab "${tabTitle}": ${error.message}`);
  }
}

/**
 * Gets all terminal tabs
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<any[]>} Array of tab element locators
 */
async function getTerminalTabs(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const tabs = await window.locator(SELECTORS.TERMINAL_TAB).all();
    console.log(`✓ Found ${tabs.length} terminal tabs`);
    return tabs;
  } catch (error) {
    throw new Error(`Failed to get terminal tabs: ${error.message}`);
  }
}

/**
 * Clicks on a terminal tab
 * @param {any} window - The Playwright window object
 * @param {string} tabTitle - The title or partial title of the tab to click
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.exact - Whether to match title exactly
 * @returns {Promise<void>}
 */
async function clickTerminalTab(window, tabTitle, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, exact = false } = options;
  
  try {
    const tab = await waitForTerminalTab(window, tabTitle, { timeout, exact });
    await tab.click();
    
    // Wait for tab to become active
    await window.waitForFunction((title) => {
      const tabs = document.querySelectorAll('.tab');
      return Array.from(tabs).some(tab => {
        const titleEl = tab.querySelector('.tab-title');
        return titleEl && 
               titleEl.textContent.includes(title) && 
               tab.classList.contains('active');
      });
    }, tabTitle, { timeout: TIMEOUTS.ANIMATION });
    
    console.log(`✓ Clicked terminal tab "${tabTitle}"`);
  } catch (error) {
    throw new Error(`Failed to click terminal tab "${tabTitle}": ${error.message}`);
  }
}

/**
 * Checks if a terminal is running
 * @param {any} window - The Playwright window object
 * @param {string} tabTitle - The title or partial title of the tab to check
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<boolean>} True if terminal is running
 */
async function isTerminalRunning(window, tabTitle, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const tab = await waitForTerminalTab(window, tabTitle, { timeout });
    const tabStatus = tab.locator(SELECTORS.TERMINAL_STATUS);
    
    return await tabStatus.evaluate(el => el.classList.contains(STATUS_CLASSES.RUNNING));
  } catch (error) {
    console.warn(`Error checking if terminal "${tabTitle}" is running:`, error.message);
    return false;
  }
}

/**
 * Waits for a terminal to start running
 * @param {any} window - The Playwright window object
 * @param {string} tabTitle - The title or partial title of the tab
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @returns {Promise<void>}
 */
async function waitForTerminalRunning(window, tabTitle, options = {}) {
  const { timeout = TIMEOUTS.LONG } = options;
  
  try {
    const tab = await waitForTerminalTab(window, tabTitle, { timeout });
    const tabStatus = tab.locator(SELECTORS.TERMINAL_STATUS);
    
    await window.waitForFunction((title) => {
      const tabs = document.querySelectorAll('.tab');
      return Array.from(tabs).some(tab => {
        const titleEl = tab.querySelector('.tab-title');
        const statusEl = tab.querySelector('.tab-status');
        return titleEl && 
               titleEl.textContent.includes(title) && 
               statusEl &&
               statusEl.classList.contains('status-running');
      });
    }, tabTitle, { timeout });
    
    console.log(`✓ Terminal "${tabTitle}" is running`);
  } catch (error) {
    throw new Error(`Failed to wait for terminal "${tabTitle}" to start running: ${error.message}`);
  }
}

/**
 * Gets the count of terminal tabs
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @returns {Promise<number>} Number of terminal tabs
 */
async function getTerminalTabCount(window, options = {}) {
  try {
    const tabs = await getTerminalTabs(window, options);
    return tabs.length;
  } catch (error) {
    console.warn('Error getting terminal tab count:', error.message);
    return 0;
  }
}

/**
 * Waits for all terminals to stop running
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @returns {Promise<void>}
 */
async function waitForAllTerminalsStopped(window, options = {}) {
  const { timeout = TIMEOUTS.VERY_LONG } = options;
  
  try {
    await window.waitForFunction(() => {
      const runningTabs = document.querySelectorAll('.tab .status-running');
      return runningTabs.length === 0;
    }, { timeout });
    
    console.log('✓ All terminals stopped');
  } catch (error) {
    throw new Error(`Failed to wait for all terminals to stop: ${error.message}`);
  }
}

/**
 * Waits for all terminal tabs to disappear
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @returns {Promise<void>}
 */
async function waitForAllTabsClosed(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    await window.waitForFunction(() => {
      const tabs = document.querySelectorAll('.tab');
      return tabs.length === 0;
    }, { timeout });
    
    console.log('✓ All terminal tabs closed');
  } catch (error) {
    throw new Error(`Failed to wait for all tabs to close: ${error.message}`);
  }
}

/**
 * Runs a configuration with specific sections
 * @param {any} window - The Playwright window object
 * @param {string[]} sectionTitles - Array of section titles to enable
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for operations
 * @param {boolean} options.waitForTabs - Whether to wait for tabs to appear
 * @returns {Promise<void>}
 */
async function runConfigurationWithSections(window, sectionTitles, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, waitForTabs = true } = options;
  
  try {
    // Enable the specified sections
    const { enableSection } = require('./config-helpers');
    
    for (const sectionTitle of sectionTitles) {
      await enableSection(window, sectionTitle, { timeout });
    }
    
    // Run the configuration
    await runConfiguration(window, { timeout, waitForTabs });
    
    console.log(`✓ Configuration run with sections: ${sectionTitles.join(', ')}`);
  } catch (error) {
    throw new Error(`Failed to run configuration with sections: ${error.message}`);
  }
}

/**
 * Gets terminal tab information
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of tab information objects
 */
async function getTerminalTabInfo(window, options = {}) {
  try {
    const tabInfo = await window.evaluate(() => {
      const tabs = document.querySelectorAll('.tab');
      return Array.from(tabs).map(tab => {
        const titleEl = tab.querySelector('.tab-title');
        const statusEl = tab.querySelector('.tab-status');
        
        return {
          title: titleEl ? titleEl.textContent.trim() : '',
          isActive: tab.classList.contains('active'),
          isRunning: statusEl ? statusEl.classList.contains('status-running') : false,
          hasError: statusEl ? statusEl.classList.contains('error') : false,
        };
      });
    });
    
    console.log(`✓ Retrieved info for ${tabInfo.length} terminal tabs`);
    return tabInfo;
  } catch (error) {
    throw new Error(`Failed to get terminal tab info: ${error.message}`);
  }
}

module.exports = {
  // Configuration control
  runConfiguration,
  stopConfiguration,
  
  // Stopping overlay
  waitForStoppingOverlay,
  closeStoppingOverlay,
  
  // Terminal tab management
  waitForTerminalTab,
  getTerminalTabs,
  clickTerminalTab,
  getTerminalTabCount,
  getTerminalTabInfo,
  
  // Terminal status
  isTerminalRunning,
  waitForTerminalRunning,
  waitForAllTerminalsStopped,
  waitForAllTabsClosed,
  
  // High-level operations
  runConfigurationWithSections,
}; 