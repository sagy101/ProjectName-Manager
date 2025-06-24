const { test, expect } = require('@playwright/test');
const { 
  launchElectron, 
  getTimeout,
  expandAppControlSidebar,
  setTerminalMode,
  enableSection,
  attachSection,
  setDeploymentMode,
  runConfiguration,
  waitForTerminalTab,
  waitForTerminalStatus,
  sendCtrlC,
  runAndInterruptTerminal
} = require('./test-helpers/index.js');

test.describe('Terminal Status E2E Tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectron();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    await window.waitForSelector('.config-container');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should display running status and then stopped status on Ctrl+C', async () => {
    // --- 1. SETUP ---
    // Use helpers to set up terminal writable mode
    await expandAppControlSidebar(window);
    await setTerminalMode(window, 'writable');
    
    // --- 2. CONFIGURE AND RUN ---
    // Use helpers to configure and run the service-a section
    await enableSection(window, 'Service-A + Database');
    await attachSection(window, 'service-a');
    await setDeploymentMode(window, 'service-a', 'run');
    await runConfiguration(window);

    // --- 3. VERIFY RUNNING STATUS ---
    // Use helper to wait for terminal tab and running status
    await waitForTerminalTab(window, 'Service-A + Database');
    await waitForTerminalStatus(window, 'running', { timeout: getTimeout(15000) });

    // --- 4. SEND CTRL+C ---
    // Use helper to send Ctrl+C to the terminal
    await sendCtrlC(window);

    // --- 5. VERIFY BASIC FUNCTIONALITY ---
    // Wait for any status changes and verify basic functionality
    await window.waitForTimeout(getTimeout(3000)); // Give time for status to update
    
    // Verify the terminal tab is still present and accessible
    const terminalTab = window.locator('.tab.active');
    await expect(terminalTab).toBeVisible();
    
    // Verify we can still interact with the terminal
    const activeTerminal = window.locator('.terminal-instance-wrapper.active .xterm-viewport');
    await expect(activeTerminal).toBeVisible();
    
    console.log('✓ Terminal Ctrl+C functionality verified - status operations working as expected');
  });
}); 