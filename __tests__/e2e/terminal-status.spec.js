const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const path = require('path');
const { launchElectron, getTimeout } = require('./test-helpers');

test.describe('Terminal Status E2E Tests', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    // Launch the Electron application before all tests
    electronApp = await electron.launch({ 
      args: [path.join(__dirname, '..', 'main.js')],
      // Increase timeout for slower machines or complex startups
      timeout: getTimeout(60000) 
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    // Close the app after all tests
    await electronApp.close();
  });

  test('should display running status and then stopped status on Ctrl+C', async () => {
    // --- 1. SETUP ---
    // Make the main terminal writable for the test
    // Click the AppControlSidebar button to open it
    await window.locator('button[aria-label="Toggle App Controls"]').click();
    // Click the toggle to make terminals writable
    await window.locator('input[name="terminal-writable"]').click();
    
    // --- 2. EXECUTE COMMAND ---
    // Locate the "Mirror" section's run button and click it
    // Using a selector that finds the run button within the section identified by its header
    const mirrorSection = window.locator('div.config-section:has(h2:has-text("Mirror"))');
    await mirrorSection.locator('button:has-text("Run")').click();

    // --- 3. VERIFY RUNNING STATUS ---
    // Wait for the tab to appear and check for the "running" status class
    // We target the active tab's status indicator
    const activeTabStatus = window.locator('.tab.active .status-indicator');
    
    // Use expect with a timeout to wait for the status to become 'running'
    await expect(activeTabStatus).toHaveClass(/running/, { timeout: getTimeout(15000) });

    // --- 4. SEND CTRL+C ---
    // Focus the active terminal's viewport and send the Ctrl+C key combination
    const activeTerminal = window.locator('.terminal-instance-wrapper.active .xterm-viewport');
    await activeTerminal.focus();
    await window.keyboard.press('Control+C');

    // --- 5. VERIFY STOPPED STATUS ---
    // Wait for the status indicator to update to 'stopped'
    await expect(activeTabStatus).toHaveClass(/stopped/, { timeout: getTimeout(10000) });

    // Optional: Check the text in the TabInfoPanel to be more specific
    await window.locator('.tab.active .info-icon').click();
    const tabInfoPanel = window.locator('.tab-info-panel');
    await expect(tabInfoPanel).toContainText('Command was terminated (Ctrl+C)');
  });
}); 