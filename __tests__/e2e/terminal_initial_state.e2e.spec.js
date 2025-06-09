const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test('Terminal container shows placeholder on startup', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow({ timeout: 60000 });

  // Wait for the main container to be visible
  await window.waitForSelector('.terminal-main-container');

  // Check for the placeholder text
  const placeholder = await window.locator('.terminal-placeholder');
  await expect(placeholder).toBeVisible();

  // Check the heading text
  const heading = await placeholder.locator('h2');
  await expect(heading).toHaveText(/Waiting to Run ISO/);

  // Check that no tabs are rendered initially
  const tabs = await window.locator('.tab');
  await expect(tabs).toHaveCount(0);

  // Close the app
  await electronApp.close();
}); 