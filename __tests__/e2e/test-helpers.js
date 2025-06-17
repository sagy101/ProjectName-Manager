const { _electron: electron } = require('playwright');

/**
 * Launch Electron for E2E tests
 * @returns {Promise<{electronApp: any, window: any}>}
 */
async function launchElectron() {
  const electronApp = await electron.launch({ 
    args: [
      '.', 
      '--no-sandbox', 
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=VizDisplayCompositor'
    ],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      NODE_ENV: 'test'
    }
  });
  
  const window = await electronApp.firstWindow({ timeout: 60000 });
  
  // Capture and log all console messages from the Electron app,
  // but only in CI when debug logs are explicitly enabled.
  if (process.env.CI && process.env.DEBUG_LOGS === 'true') {
    window.on('console', async (msg) => {
      const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
      console.log(`[APP CONSOLE] ${msg.type()}:`, ...args);
    });
  }
  
  // Simply return the window - don't try to manipulate visibility
  // The --no-sandbox and other flags should make it less visible
  
  return { electronApp, window };
}

/**
 * Waits for an element to be visible with a longer timeout and polling.
 * @param {any} window - The Playwright window object.
 * @param {string} selector - The CSS selector for the element.
 * @param {number} timeout - The maximum time to wait in milliseconds.
 * @returns {Promise<void>}
 */
async function waitForElement(window, selector, timeout = 30000) {
  await window.waitForSelector(selector, { state: 'visible', timeout });
}

module.exports = { launchElectron, waitForElement }; 