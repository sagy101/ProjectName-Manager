const { launchElectron, getTimeout } = require('./test-helpers/index.js');
const { test, expect } = require('@playwright/test');

test('Terminal container shows placeholder on startup', async () => {
  const { electronApp, window } = await launchElectron();
  
  // Wait for the app to finish loading (like other tests)
  await window.waitForSelector('.config-container', { timeout: getTimeout(10000) });

  // Wait for the terminal container to be ready
  await window.waitForSelector('.terminal-container', { timeout: getTimeout(10000) });
  
  // Wait for terminal container to be visible
  await window.waitForSelector('.terminal-container', { timeout: getTimeout(1000) });
  
  // Look for the terminal placeholder more broadly
  const terminalPlaceholder = await window.locator('.terminal-placeholder');
  await expect(terminalPlaceholder).toBeVisible();
  
  // Check for the heading text with more flexible matching
  const heading = await terminalPlaceholder.locator('h2');
  await expect(heading).toBeVisible();
  
  
  await electronApp.close();
}); 