const { _electron: electron } = require('playwright');

/**
 * Launch Electron invisibly for E2E tests
 * @returns {Promise<{electronApp: any, window: any}>}
 */
async function launchElectronInvisibly() {
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
      NODE_ENV: 'test',
      HEADLESS: 'true'
    }
  });
  
  const window = await electronApp.firstWindow({ timeout: 60000 });
  
  // Simply return the window - don't try to manipulate visibility
  // The --no-sandbox and other flags should make it less visible
  
  return { electronApp, window };
}

module.exports = { launchElectronInvisibly }; 