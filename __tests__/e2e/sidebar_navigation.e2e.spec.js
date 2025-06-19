const { test, expect } = require('@playwright/test');
const { launchElectron } = require('./test-helpers');
const { sections } = require('../../src/project-config/config/configurationSidebarSections.json');

test.describe('Sidebar Navigation', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectron();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    await window.waitForSelector('.app-control-sidebar');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should show collapsed sidebar by default', async () => {
    // Check that sidebar is initially collapsed
    const sidebar = await window.locator('.app-control-sidebar');
    await expect(sidebar).toHaveClass(/collapsed/);
    
    // Verify expand button is visible
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expect(expandButton).toBeVisible();
  });

  test('should expand sidebar when expand button is clicked', async () => {
    // Click the expand button
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    // Wait for sidebar to expand
    const sidebar = await window.locator('.app-control-sidebar');
    await expect(sidebar).not.toHaveClass(/collapsed/);
    
    // Verify collapse button is now visible
    const collapseButton = await window.locator('[title="Collapse Sidebar"]');
    await expect(collapseButton).toBeVisible();
  });

  test('should show main navigation sections when expanded', async () => {
    // Expand the sidebar first
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    // Wait for sidebar to be expanded
    const sidebar = await window.locator('.app-control-sidebar');
    await expect(sidebar).not.toHaveClass(/collapsed/);
    
    // Check for actual sections that exist in the sidebar
    await expect(window.locator('text=Active Terminals')).toBeVisible();
    await expect(window.locator('text=No active floating terminals.')).toBeVisible();
    
    // Check for debug tools button
    const debugButton = await window.locator('[title*="Debug Tools"]');
    await expect(debugButton).toBeVisible();
  });

  test('should collapse sidebar when collapse button is clicked', async () => {
    // First expand the sidebar
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    // Wait for expansion
    const sidebar = await window.locator('.app-control-sidebar');
    await expect(sidebar).not.toHaveClass(/collapsed/);
    
    // Now collapse it
    const collapseButton = await window.locator('[title="Collapse Sidebar"]');
    await collapseButton.click();
    
    // Verify it's collapsed again
    await expect(sidebar).toHaveClass(/collapsed/);
  });

  test('should show debug tools when debug button is clicked', async () => {
    // Expand the sidebar first
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    // Click the debug tools button in the App Control Sidebar
    const debugButton = await window.locator('.debug-section-toggle-button');
    await debugButton.click();
    
    // Check that debug section content is now visible
    await expect(window.locator('.debug-section-content')).toBeVisible();
    await expect(window.locator('.debug-section-content button').filter({ hasText: /DevTools/i })).toBeVisible();
    await expect(window.locator('.debug-section-content button').filter({ hasText: /Reload/i })).toBeVisible();
    await expect(window.locator('.debug-section-content button').filter({ hasText: /No Run Mode/i })).toBeVisible();
  });
}); 