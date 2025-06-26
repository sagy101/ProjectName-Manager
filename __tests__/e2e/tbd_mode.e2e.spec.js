const { test, expect } = require('@playwright/test');
const { 
  launchElectron, 
  expandAppControlSidebar, 
  openDebugTools, 
  showTestSections,
  waitForNotification 
} = require('./test-helpers/index.js');

test.describe('TBD Mode Functionality', () => {
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

  test('should show TBD status and prevent switching', async () => {
    // Enable test sections to see the test-analytics section
    await expandAppControlSidebar(window);
    await openDebugTools(window);
    await showTestSections(window);

    // Find the test-analytics section and enable it
    const testAnalyticsSection = window.locator('#section-test-analytics');
    await testAnalyticsSection.locator('input[type="checkbox"]').check();

    // Find the "mock" button, which is marked as TBD
    const mockButton = testAnalyticsSection.locator('button:has-text("mock")');
    
    // Check for the 'tbd' class and the icon
    await expect(mockButton).toHaveClass(/tbd/);
    await expect(mockButton.locator('.tbd-icon')).toBeVisible();

    // Get the initial active mode
    const initialMode = await testAnalyticsSection.locator('.deployment-toggle-btn.active').textContent();
    expect(initialMode.trim()).toBe('Development');

    // Click the TBD button
    await mockButton.click();

    // Verify the mode did NOT change
    const newMode = await testAnalyticsSection.locator('.deployment-toggle-btn.active').textContent();
    expect(newMode.trim()).toBe('Development');

    // Verify the notification appeared  
    const notification = window.locator('.notification-info');
    await expect(notification).toBeVisible();
    await expect(notification).toContainText('This feature is not yet implemented.');
  });
}); 