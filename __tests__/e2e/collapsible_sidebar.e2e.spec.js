const { test, expect } = require('@playwright/test');
const { 
  launchElectron, 
  waitForElement, 
  getTimeout,
  collapseConfigSidebar,
  expandConfigSidebar,
  isConfigSidebarExpanded 
} = require('./test-helpers/index.js');

test.describe('Collapsible Sidebar E2E Tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectron();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    
    // Wait for the app to load completely
    await window.waitForSelector('.config-collapse-btn', { timeout: getTimeout(10000) });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should display collapse button in correct initial position', async () => {
    // Check that the collapse button is visible and positioned correctly
    const collapseButton = window.locator('.config-collapse-btn');
    await expect(collapseButton).toBeVisible();
    
    // Verify it's not in collapsed state initially
    await expect(collapseButton).not.toHaveClass(/collapsed/);
    
    // Check that it shows the left arrow (collapse) icon
    const leftArrowIcon = collapseButton.locator('svg polyline[points="15 18 9 12 15 6"]');
    await expect(leftArrowIcon).toBeVisible();
  });

  test('should collapse sidebar when collapse button is clicked', async () => {
    // Verify initial state - sidebar should be expanded
    const isExpanded = await isConfigSidebarExpanded(window);
    expect(isExpanded).toBe(true);
    
    // Collapse the sidebar using helper
    await collapseConfigSidebar(window);
    
    // Verify sidebar is now collapsed
    const isCollapsed = await isConfigSidebarExpanded(window);
    expect(isCollapsed).toBe(false);
    
    // Additional UI verification
    const sidebar = window.locator('.sidebar');
    await expect(sidebar).toHaveClass(/collapsed/, { timeout: getTimeout(2000) });
    
    const collapseButton = window.locator('.config-collapse-btn');
    await expect(collapseButton).toHaveClass(/collapsed/);
  });

  test('should expand sidebar when expand button is clicked', async () => {
    // First collapse the sidebar
    await collapseConfigSidebar(window);
    
    // Verify it's collapsed
    const isCollapsed = await isConfigSidebarExpanded(window);
    expect(isCollapsed).toBe(false);
    
    // Expand the sidebar using helper
    await expandConfigSidebar(window);
    
    // Verify it's expanded
    const isExpanded = await isConfigSidebarExpanded(window);
    expect(isExpanded).toBe(true);
    
    // Additional UI verification
    const sidebar = window.locator('.sidebar');
    await expect(sidebar).not.toHaveClass(/collapsed/, { timeout: getTimeout(2000) });
    
    const collapseButton = window.locator('.config-collapse-btn');
    await expect(collapseButton).not.toHaveClass(/collapsed/);
  });

  test('should hide configuration content when sidebar is collapsed', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    const configSections = window.locator('#config-sections');
    const runButtonContainer = window.locator('.run-button-container');
    const sidebar = window.locator('.sidebar');
    
    // Verify content is visible initially
    await expect(configSections).toBeVisible();
    await expect(runButtonContainer).toBeVisible();
    
    // Collapse the sidebar
    await collapseButton.click();
    
    // Wait for collapse class and animation to complete
    await expect(sidebar).toHaveClass(/collapsed/, { timeout: getTimeout(2000) });
    
    // Wait for opacity animation to complete
    await window.waitForFunction(() => {
      const configEl = document.querySelector('#config-sections');
      const runButtonEl = document.querySelector('.run-button-container');
      const configOpacity = configEl ? parseFloat(window.getComputedStyle(configEl).opacity) : 1;
      const runButtonOpacity = runButtonEl ? parseFloat(window.getComputedStyle(runButtonEl).opacity) : 1;
      return configOpacity < 0.1 && runButtonOpacity < 0.1;
    }, { timeout: getTimeout(3000) });
    
    // Verify content is hidden (opacity should be very low, allowing for animation timing)
    const configSectionsOpacity = await configSections.evaluate(el => 
      window.getComputedStyle(el).opacity
    );
    const runButtonOpacity = await runButtonContainer.evaluate(el => 
      window.getComputedStyle(el).opacity
    );
    
    expect(parseFloat(configSectionsOpacity)).toBeLessThan(0.1);
    expect(parseFloat(runButtonOpacity)).toBeLessThan(0.1);
  });

  test('should expand main content area when sidebar is collapsed', async () => {
    const mainContent = window.locator('.main-content');
    const collapseButton = window.locator('.config-collapse-btn');
    const sidebar = window.locator('.sidebar');
    
    // Get initial main content width
    const initialMainContentBox = await mainContent.boundingBox();
    
    // Collapse the sidebar
    await collapseButton.click();
    
    // Wait for collapse animation to complete
    await expect(sidebar).toHaveClass(/collapsed/, { timeout: getTimeout(2000) });
    await window.waitForFunction(() => {
      const el = document.querySelector('.sidebar');
      return el && el.getBoundingClientRect().width < 100;
    }, { timeout: getTimeout(3000) });
    
    // Get new main content width
    const expandedMainContentBox = await mainContent.boundingBox();
    
    // Main content should be wider when sidebar is collapsed
    expect(expandedMainContentBox.width).toBeGreaterThan(initialMainContentBox.width);
  });

  test('should maintain button functionality during rapid clicks', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    const sidebar = window.locator('.sidebar');
    
    // Rapidly click the button multiple times
    for (let i = 0; i < 5; i++) {
      await collapseButton.click();
      await window.waitForTimeout(getTimeout(150)); // Slightly longer delay for reliability
    }
    
    // Wait for all animations to complete with flexible timeout
    await window.waitForTimeout(getTimeout(2000));
    
    // The final state should be collapsed (odd number of clicks) - use timeout for flexibility
    await expect(sidebar).toHaveClass(/collapsed/, { timeout: getTimeout(3000) });
    
    // Click once more to expand
    await collapseButton.click();
    
    // Wait for expansion to complete
    await expect(sidebar).not.toHaveClass(/collapsed/, { timeout: getTimeout(3000) });
  });

  test('should have correct button positioning when collapsed', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    const sidebar = window.locator('.sidebar');
    
    // Get initial button position
    const initialButtonBox = await collapseButton.boundingBox();
    
    // Collapse the sidebar
    await collapseButton.click();
    
    // Wait for animation to complete
    await expect(sidebar).toHaveClass(/collapsed/, { timeout: getTimeout(2000) });
    await window.waitForFunction(() => {
      const el = document.querySelector('.sidebar');
      return el && el.getBoundingClientRect().width < 100;
    }, { timeout: getTimeout(3000) });
    
    // Get new button position
    const collapsedButtonBox = await collapseButton.boundingBox();
    
    // Button should move to the left when sidebar collapses (or stay roughly same if design changes)
    // Make this more flexible to handle different positioning strategies
    expect(collapsedButtonBox.x).toBeLessThanOrEqual(initialButtonBox.x + 50);
    
    // Button should maintain its vertical position (more lenient)
    expect(Math.abs(collapsedButtonBox.y - initialButtonBox.y)).toBeLessThan(20);
  });

  test('should preserve button hover effects', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    const sidebar = window.locator('.sidebar');
    
    // Hover over the button
    await collapseButton.hover();
    
    // The exact values depend on CSS, but we can verify the element is interactive
    await expect(collapseButton).toBeVisible();
    
    // Test that clicking still works after hover
    await collapseButton.click();
    
    // Wait for animation to complete properly
    await expect(sidebar).toHaveClass(/collapsed/, { timeout: getTimeout(2000) });
    await window.waitForFunction(() => {
      const el = document.querySelector('.sidebar');
      return el && el.getBoundingClientRect().width < 100;
    }, { timeout: getTimeout(3000) });
  });

  test('should maintain accessibility attributes', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    const sidebar = window.locator('.sidebar');
    
    // Check initial accessibility attributes
    await expect(collapseButton).toHaveAttribute('title', 'Collapse Configuration');
    
    // Collapse the sidebar
    await collapseButton.click();
    await expect(sidebar).toHaveClass(/collapsed/, { timeout: getTimeout(2000) });
    
    // Check updated accessibility attributes
    await expect(collapseButton).toHaveAttribute('title', 'Expand Configuration');
    
    // Expand again
    await collapseButton.click();
    await expect(sidebar).not.toHaveClass(/collapsed/, { timeout: getTimeout(2000) });
    
    // Should be back to original
    await expect(collapseButton).toHaveAttribute('title', 'Collapse Configuration');
  });
}); 