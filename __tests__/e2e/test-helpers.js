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
  
  // Forward main process logs to terminal when DEBUG_LOGS=true
  if (process.env.CI && process.env.DEBUG_LOGS === 'true') {
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

  const window = await electronApp.firstWindow({ timeout: 60000 });
  
  // Capture and log all console messages from the Electron app when debug logs are enabled.
  if (process.env.CI && process.env.DEBUG_LOGS === 'true') {
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

/**
 * Ensure all verifications (in config sections and environment) are valid before toggling
 * @param {any} window - The Playwright window or page object
 */
async function ensureAllVerificationsValid(window) {
  const pollForAllValid = async (evaluateFn, arg, timeoutMs) => {
    const interval = 200;
    const maxTime = Date.now() + timeoutMs;
    while (Date.now() < maxTime) {
      const allValid = await window.evaluate(evaluateFn, arg);
      if (allValid) return true;
      await window.waitForTimeout(interval);
    }
    return false;
  };

  // 1. For each config section, open the info drawer, check indicators, close drawer
  const configSections = await window.locator('.config-section').all();
  for (const section of configSections) {
    const sectionId = await section.getAttribute('id');
    const sectionTitle = await section.locator('h2').textContent();
    const drawerBtn = section.locator('.drawer-toggle.verification-info-btn');
    const isOpen = await drawerBtn.getAttribute('class').then(cls => cls.includes('open'));
    if (!isOpen) {
      await drawerBtn.click();
      await window.waitForTimeout(300);
    }
    const allValidInSection = await pollForAllValid(
      (sectionId) => {
        const section = document.getElementById(sectionId);
        if (!section) return false;
        const indicators = Array.from(section.querySelectorAll('.verification-indicator'));
        if (indicators.length === 0) return true; // No indicators means valid for this section
        return indicators.every(el => el.classList.contains('valid'));
      },
      sectionId,
      getTimeout(10000)
    );
    if (!allValidInSection) {
      const debugInfo = await window.evaluate((id) => {
        const section = document.getElementById(id);
        if (!section) return { error: 'Section not found' };
        return Array.from(section.querySelectorAll('.verification-indicator:not(.valid)'))
          .map(ind => ({ label: ind.querySelector('.label')?.textContent || 'N/A', classes: ind.className }));
      }, sectionId);
      console.error(`[ensureAllVerificationsValid] Failing indicators in section '${sectionTitle}':`, JSON.stringify(debugInfo, null, 2));
      throw new Error(`Not all verifications are valid in section '${sectionTitle}' (${sectionId})`);
    }
    if (!isOpen) {
      await drawerBtn.click();
      await window.waitForTimeout(200);
    }
  }

  // 2. Expand environment verification section and check indicators
  const envContainer = window.locator('.environment-verification-container');
  const envHeader = envContainer.locator('.verification-header');
  const toggleIcon = envHeader.locator('.toggle-icon');
  const expanded = await toggleIcon.evaluate(node => node.textContent.includes('▼'));
  if (!expanded) {
    await toggleIcon.click();
    await window.waitForTimeout(300);
  }
  const allEnvValid = await pollForAllValid(
    () => {
      const env = document.querySelector('.environment-verification-container');
      if (!env) return false;
      const indicators = Array.from(env.querySelectorAll('.verification-indicator'));
      if (indicators.length === 0) return true; // No indicators means valid
      return indicators.every(el => el.classList.contains('valid'));
    },
    undefined,
    getTimeout(10000)
  );
  if (!allEnvValid) {
    const debugInfo = await window.evaluate(() => {
      const env = document.querySelector('.environment-verification-container');
      if (!env) return { error: 'Env container not found' };
      return Array.from(env.querySelectorAll('.verification-indicator:not(.valid)'))
        .map(ind => ({ label: ind.querySelector('.label')?.textContent || 'N/A', classes: ind.className }));
    });
    console.error(`[ensureAllVerificationsValid] Failing indicators in environment section:`, JSON.stringify(debugInfo, null, 2));
    throw new Error('Not all environment verifications are valid');
  }

  console.log('[ensureAllVerificationsValid] All verifications are valid!');
  return true;
}

/**
 * Returns a timeout value, doubled if running in CI
 * @param {number} base - The base timeout in ms
 * @returns {number}
 */
function getTimeout(base) {
  return process.env.CI ? base * 2 : base;
}

module.exports = { launchElectron, waitForElement, ensureAllVerificationsValid, getTimeout }; 