const { test, expect } = require('@playwright/test');
const { launchElectronInvisibly } = require('./test-helpers');

test.describe('Configuration Interface', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectronInvisibly();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    // Wait for the main configuration interface to load
    await window.waitForSelector('.config-container');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should display main configuration sections', async () => {
    // Check that main configuration sections are visible
    await expect(window.locator('text=Mirror + MariaDB')).toBeVisible();
    await expect(window.locator('text=GoPM + Agent + Chromium')).toBeVisible();
    await expect(window.locator('text=URL Intelligence + TI (Cloud)')).toBeVisible();
    await expect(window.locator('text=Activity Logger')).toBeVisible();
    await expect(window.locator('text=Rule Engine')).toBeVisible();
  });

  test('should allow toggling configuration sections', async () => {
    // Find the first toggle checkbox (Mirror + MariaDB section)
    const mirrorSection = await window.locator('text=Mirror + MariaDB').locator('..').locator('..'); // Navigate to parent section
    const toggleCheckbox = await mirrorSection.locator('input[type="checkbox"]').first();
    
    // Get initial state
    const initialChecked = await toggleCheckbox.isChecked();
    
    // Click the toggle
    await toggleCheckbox.click();
    
    // Verify the state changed
    const newChecked = await toggleCheckbox.isChecked();
    expect(newChecked).toBe(!initialChecked);
  });

  test('should allow enabling and disabling sections', async () => {
    // Test with GoPM section
    const gopmSection = await window.locator('text=GoPM + Agent + Chromium').locator('..').locator('..');
    const toggleCheckbox = await gopmSection.locator('input[type="checkbox"]').first();
    
    // Ensure it starts disabled
    if (await toggleCheckbox.isChecked()) {
      await toggleCheckbox.click();
    }
    
    // Verify it's disabled
    expect(await toggleCheckbox.isChecked()).toBe(false);
    
    // Enable it
    await toggleCheckbox.click();
    
    // Verify it's enabled
    expect(await toggleCheckbox.isChecked()).toBe(true);
  });

  test('should display environment verification section', async () => {
    // Check that some form of environment verification is present
    // This might be in the sidebar or main area
    const verificationElements = await window.locator('[class*="verification"], [class*="environment"]');
    await expect(verificationElements.first()).toBeVisible();
  });

  test('should show RUN ISO button in correct initial state', async () => {
    // Check that the main RUN button is visible
    const runButton = await window.locator('button').filter({ hasText: /RUN.*ISO/i });
    await expect(runButton).toBeVisible();
    
    // The button should be disabled initially (this is correct behavior)
    await expect(runButton).toBeDisabled();
  });

  test('should show information buttons for sections', async () => {
    // Check that sections have information buttons (these should always be visible)
    const infoButtons = await window.locator('[data-verification-btn="true"]');
    await expect(infoButtons.first()).toBeVisible();
  });

  test('should show subsections when parent section is enabled', async () => {
    // Find Mirror section which has a Frontend subsection
    const mirrorSection = await window.locator('text=Mirror + MariaDB').locator('..').locator('..');
    const toggleCheckbox = await mirrorSection.locator('input[type="checkbox"]').first();
    
    // Enable the section if it's not enabled
    if (!(await toggleCheckbox.isChecked())) {
      await toggleCheckbox.click();
    }
    
    // Wait a moment for subsections to appear
    await window.waitForTimeout(500);
    
    // Check for Frontend subsection
    await expect(window.locator('text=Frontend')).toBeVisible();
  });
}); 