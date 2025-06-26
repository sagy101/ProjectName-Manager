/**
 * Application lifecycle management helpers for e2e tests
 * Handles app launch, setup, teardown and basic initialization
 */

const { _electron: electron } = require('playwright');
const { SELECTORS, TIMEOUTS } = require('./constants');

/**
 * Launch Electron for E2E tests
 * @param {Object} options - Launch options
 * @param {string[]} options.args - Additional command line arguments
 * @param {Object} options.env - Environment variables
 * @param {boolean} options.enableLogging - Enable debug logging
 * @returns {Promise<{electronApp: any, window: any}>}
 */
async function launchElectron(options = {}) {
  const {
    args = [],
    env = {},
    enableLogging = process.env.CI && process.env.DEBUG_LOGS === 'true'
  } = options;

  const defaultArgs = [
    '.', 
    '--no-sandbox', 
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=VizDisplayCompositor'
  ];

  const defaultEnv = {
    ...process.env,
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    NODE_ENV: 'test'
  };

  const electronApp = await electron.launch({ 
    args: [...defaultArgs, ...args],
    env: { ...defaultEnv, ...env }
  });
  
  // Forward main process logs to terminal when debug logs are enabled
  if (enableLogging) {
    const proc = electronApp.process();
    if (proc && proc.stdout) {
      proc.stdout.on('data', (data) => {
        process.stdout.write(`[MAIN STDOUT] ${data}`);
      });
    }
    if (proc && proc.stderr) {
      proc.stderr.on('data', (data) => {
        process.stderr.write(`[MAIN STDERR] ${data}`);
      });
    }
  }

  const window = await electronApp.firstWindow({ timeout: TIMEOUTS.APP_LAUNCH });
  
  // Capture and log all console messages from the Electron app when debug logs are enabled
  if (enableLogging) {
    window.on('console', async (msg) => {
      if (window.isClosed()) {
        return;
      }
      try {
        const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        console.log(`[APP CONSOLE] ${msg.type()}:`, ...args);
      } catch (error) {
        console.log(`[APP CONSOLE] Error reading console message: ${error.message}`);
      }
    });
  }
  
  return { electronApp, window };
}

/**
 * Waits for the application to be ready
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @param {string[]} options.waitForSelectors - Additional selectors to wait for
 * @returns {Promise<void>}
 */
async function waitForAppReady(window, options = {}) {
  const { 
    timeout = TIMEOUTS.VERY_LONG, 
    waitForSelectors = [SELECTORS.CONFIG_CONTAINER] 
  } = options;
  
  try {
    // Wait for main selectors to be ready
    for (const selector of waitForSelectors) {
      await window.waitForSelector(selector, { timeout });
    }
    
    // Give the app a moment to fully initialize
    await window.waitForTimeout(TIMEOUTS.SHORT);
    
    console.log('✓ Application ready');
  } catch (error) {
    throw new Error(`Failed to wait for app ready: ${error.message}`);
  }
}

/**
 * Sets up a clean test environment
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {boolean} options.mockVerificationStatuses - Mock verification status endpoints
 * @param {boolean} options.clearFloatingTerminals - Clear any existing floating terminals
 * @param {boolean} options.waitForReady - Wait for app to be ready
 * @returns {Promise<void>}
 */
async function setupTestEnvironment(window, options = {}) {
  const {
    mockVerificationStatuses = false,
    clearFloatingTerminals = true,
    waitForReady = true
  } = options;
  
  try {
    // Clean up any lingering floating terminals from previous tests
    if (clearFloatingTerminals) {
      try {
        await window.evaluate(() => {
          const terminals = document.querySelectorAll('.floating-terminal-window');
          terminals.forEach(terminal => terminal.remove());
        });
      } catch (error) {
        // Ignore errors during cleanup as the page might not be fully loaded yet
      }
    }
    
    // Mock verification status endpoints if requested
    if (mockVerificationStatuses) {
      await setupMockVerificationEndpoints(window);
    }
    
    // Wait for app to be ready
    if (waitForReady) {
      await waitForAppReady(window);
    }
    
    console.log('✓ Test environment setup complete');
  } catch (error) {
    throw new Error(`Failed to setup test environment: ${error.message}`);
  }
}

/**
 * Sets up mock verification endpoints for testing
 * @param {any} window - The Playwright window object
 * @param {Object} mockStatuses - Mock status data
 * @returns {Promise<void>}
 */
async function setupMockVerificationEndpoints(window, mockStatuses = null) {
  const defaultMockStatuses = {
    general: {
      cloudGcloudCLI: 'invalid',
      cloudKubectlCLI: 'invalid',
      rancherDesktop: 'valid',
      nodeJs: 'invalid',
      nvmInstalled: 'valid'
    },
    configuration: {
      mirrorDirExists: 'invalid',
      ChromiumInstalled: 'invalid',
      threatIntelligenceDirExists: 'valid'
    }
  };

  const statusesToUse = mockStatuses || defaultMockStatuses;

  try {
    // Mock the API response for verification statuses
    await window.route('**/get-verification-statuses', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(statusesToUse)
      });
    });

    // Mock the rerun verification endpoint
    await window.route('**/rerun-single-verification', route => {
      const { verificationId } = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          verificationId,
          result: 'valid' // Assume the fix command worked
        })
      });
    });

    console.log('✓ Mock verification endpoints setup');
  } catch (error) {
    throw new Error(`Failed to setup mock verification endpoints: ${error.message}`);
  }
}

/**
 * Cleans up the test environment
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {boolean} options.closeFloatingTerminals - Close floating terminals
 * @param {boolean} options.forceDOMCleanup - Force DOM cleanup if terminals won't close normally
 * @returns {Promise<void>}
 */
async function cleanupTestEnvironment(window, options = {}) {
  const { 
    closeFloatingTerminals = true, 
    forceDOMCleanup = true 
  } = options;
  
  try {
    if (closeFloatingTerminals) {
      await cleanupFloatingTerminals(window, { forceDOMCleanup });
    }
    
    console.log('✓ Test environment cleanup complete');
  } catch (error) {
    console.warn('Warning: Could not fully clean up test environment:', error.message);
  }
}

/**
 * Cleans up floating terminals
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {boolean} options.forceDOMCleanup - Force DOM cleanup if terminals won't close normally
 * @returns {Promise<void>}
 */
async function cleanupFloatingTerminals(window, options = {}) {
  const { forceDOMCleanup = true } = options;
  
  try {
    const floatingTerminals = await window.locator(SELECTORS.FLOATING_TERMINAL).all();
    
    for (const terminal of floatingTerminals) {
      if (await terminal.isVisible()) {
        // Try to close the terminal using the close button
        const closeButton = terminal.locator(`${SELECTORS.FLOATING_TERMINAL_CLOSE}, ${SELECTORS.CLOSE_BUTTON}, button[title*="close"], button[title*="Close"]`);
        
        if (await closeButton.isVisible() && await closeButton.isEnabled()) {
          await closeButton.click();
          await window.waitForTimeout(TIMEOUTS.ANIMATION);
        }
      }
    }
    
    // Force close any remaining terminals if requested
    if (forceDOMCleanup) {
      await window.evaluate(() => {
        const terminals = document.querySelectorAll('.floating-terminal-window');
        terminals.forEach(terminal => terminal.remove());
      });
    }
    
    console.log('✓ Floating terminals cleaned up');
  } catch (error) {
    console.warn('Warning: Could not clean up floating terminals:', error.message);
  }
}

/**
 * Closes the Electron application
 * @param {any} electronApp - The Electron app instance
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for closing
 * @returns {Promise<void>}
 */
async function closeApp(electronApp, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    if (electronApp) {
      await electronApp.close();
      console.log('✓ Application closed');
    }
  } catch (error) {
    console.warn('Warning: Could not close application cleanly:', error.message);
  }
}

/**
 * Comprehensive test setup that includes app launch and environment setup
 * @param {Object} options - Configuration options
 * @param {Object} options.launchOptions - Options for launchElectron
 * @param {Object} options.setupOptions - Options for setupTestEnvironment
 * @returns {Promise<{electronApp: any, window: any}>}
 */
async function setupTest(options = {}) {
  const { launchOptions = {}, setupOptions = {} } = options;
  
  try {
    // Launch the app
    const { electronApp, window } = await launchElectron(launchOptions);
    
    // Setup the test environment
    await setupTestEnvironment(window, setupOptions);
    
    return { electronApp, window };
  } catch (error) {
    throw new Error(`Failed to setup test: ${error.message}`);
  }
}

/**
 * Comprehensive test teardown
 * @param {any} electronApp - The Electron app instance
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function teardownTest(electronApp, window, options = {}) {
  try {
    // Clean up the test environment first
    if (window && !window.isClosed()) {
      await cleanupTestEnvironment(window, options);
    }
    
    // Close the app
    await closeApp(electronApp, options);
  } catch (error) {
    console.warn('Warning: Could not teardown test cleanly:', error.message);
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use launchElectron instead
 */
async function launchElectronApp() {
  console.warn('launchElectronApp is deprecated, use launchElectron instead');
  const { electronApp, window } = await launchElectron();
  return { app: electronApp, window };
}

module.exports = {
  // Core lifecycle functions
  launchElectron,
  waitForAppReady,
  closeApp,
  
  // Environment management
  setupTestEnvironment,
  cleanupTestEnvironment,
  setupMockVerificationEndpoints,
  
  // Terminal cleanup
  cleanupFloatingTerminals,
  
  // High-level test setup/teardown
  setupTest,
  teardownTest,
  
  // Legacy compatibility
  launchElectronApp,
}; 