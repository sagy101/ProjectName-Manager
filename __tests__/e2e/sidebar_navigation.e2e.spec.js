const { test, expect } = require('@playwright/test');
const { 
  launchElectron,
  expandAppControlSidebar,
  collapseAppControlSidebar,
  isAppControlSidebarExpanded,
  openDebugTools
} = require('./test-helpers/index.js');
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
    // Check that sidebar is initially collapsed using our helper
    const isExpanded = await isAppControlSidebarExpanded(window);
    expect(isExpanded).toBe(false);
    
    // Verify expand button is visible
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expect(expandButton).toBeVisible();
  });

  test('should expand sidebar when expand button is clicked', async () => {
    // Use our helper to expand the sidebar
    await expandAppControlSidebar(window);
    
    // Verify sidebar is expanded using our helper
    const isExpanded = await isAppControlSidebarExpanded(window);
    expect(isExpanded).toBe(true);
    
    // Verify collapse button is now visible
    const collapseButton = await window.locator('[title="Collapse Sidebar"]');
    await expect(collapseButton).toBeVisible();
  });

  test('should show main navigation sections when expanded', async () => {
    // Use our helper to expand the sidebar
    await expandAppControlSidebar(window);
    
    // Check for actual sections that exist in the sidebar
    await expect(window.locator('text=Active Terminals')).toBeVisible();
    await expect(window.locator('text=No active floating terminals.')).toBeVisible();
    
    // Check for debug tools button
    const debugButton = await window.locator('[title*="Debug Tools"]');
    await expect(debugButton).toBeVisible();
  });

  test('should collapse sidebar when collapse button is clicked', async () => {
    // First expand the sidebar using our helper
    await expandAppControlSidebar(window);
    
    // Verify it's expanded
    let isExpanded = await isAppControlSidebarExpanded(window);
    expect(isExpanded).toBe(true);
    
    // Now collapse it using our helper
    await collapseAppControlSidebar(window);
    
    // Verify it's collapsed
    isExpanded = await isAppControlSidebarExpanded(window);
    expect(isExpanded).toBe(false);
  });

  test('should show debug tools when debug button is clicked', async () => {
    // Use our helper to open debug tools (which also expands sidebar)
    await openDebugTools(window);
    
    // Check that debug section content is now visible
    await expect(window.locator('.debug-section-content')).toBeVisible();
    await expect(window.locator('.debug-section-content button').filter({ hasText: /DevTools/i })).toBeVisible();
    await expect(window.locator('.debug-section-content button').filter({ hasText: /Reload/i })).toBeVisible();
    await expect(window.locator('.debug-section-content button').filter({ hasText: /No Run Mode/i })).toBeVisible();
  });
}); 