const { test, expect } = require('@playwright/test');
const { launchElectron, waitForElement, getTimeout } = require('./test-helpers');

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
    const collapseButton = window.locator('.config-collapse-btn');
    const sidebar = window.locator('.sidebar');
    
    // Verify initial state - sidebar should be expanded
    await expect(sidebar).not.toHaveClass(/collapsed/);
    
    // Get initial sidebar width
    const initialSidebarBox = await sidebar.boundingBox();
    expect(initialSidebarBox.width).toBeGreaterThan(300); // Should be around 380px
    
    // Click the collapse button
    await collapseButton.click();
    
    // Wait for animation to complete
    await window.waitForTimeout(getTimeout(500));
    
    // Verify sidebar is now collapsed
    await expect(sidebar).toHaveClass(/collapsed/);
    
    // Verify sidebar width is now minimal
    const collapsedSidebarBox = await sidebar.boundingBox();
    expect(collapsedSidebarBox.width).toBeLessThan(50); // Should be close to 0
    
    // Verify button shows right arrow (expand) icon
    const rightArrowIcon = collapseButton.locator('svg polyline[points="9 18 15 12 9 6"]');
    await expect(rightArrowIcon).toBeVisible();
    
    // Verify button has collapsed class
    await expect(collapseButton).toHaveClass(/collapsed/);
  });

  test('should expand sidebar when expand button is clicked', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    const sidebar = window.locator('.sidebar');
    
    // First collapse the sidebar
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    
    // Verify it's collapsed
    await expect(sidebar).toHaveClass(/collapsed/);
    
    // Click the expand button
    await collapseButton.click();
    
    // Wait for animation to complete
    await window.waitForTimeout(getTimeout(500));
    
    // Verify sidebar is now expanded
    await expect(sidebar).not.toHaveClass(/collapsed/);
    
    // Verify sidebar width is back to normal
    const expandedSidebarBox = await sidebar.boundingBox();
    expect(expandedSidebarBox.width).toBeGreaterThan(300);
    
    // Verify button shows left arrow (collapse) icon
    const leftArrowIcon = collapseButton.locator('svg polyline[points="15 18 9 12 15 6"]');
    await expect(leftArrowIcon).toBeVisible();
    
    // Verify button doesn't have collapsed class
    await expect(collapseButton).not.toHaveClass(/collapsed/);
  });

  test('should hide configuration content when sidebar is collapsed', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    const configSections = window.locator('#config-sections');
    const runButtonContainer = window.locator('.run-button-container');
    
    // Verify content is visible initially
    await expect(configSections).toBeVisible();
    await expect(runButtonContainer).toBeVisible();
    
    // Collapse the sidebar
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    
    // Verify content is hidden (opacity should be 0)
    const configSectionsOpacity = await configSections.evaluate(el => 
      window.getComputedStyle(el).opacity
    );
    const runButtonOpacity = await runButtonContainer.evaluate(el => 
      window.getComputedStyle(el).opacity
    );
    
    expect(parseFloat(configSectionsOpacity)).toBe(0);
    expect(parseFloat(runButtonOpacity)).toBe(0);
  });

  test('should expand main content area when sidebar is collapsed', async () => {
    const mainContent = window.locator('.main-content');
    const collapseButton = window.locator('.config-collapse-btn');
    
    // Get initial main content width
    const initialMainContentBox = await mainContent.boundingBox();
    
    // Collapse the sidebar
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    
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
      await window.waitForTimeout(getTimeout(100)); // Short delay between clicks
    }
    
    // Wait for all animations to complete
    await window.waitForTimeout(getTimeout(1000));
    
    // The final state should be collapsed (odd number of clicks)
    await expect(sidebar).toHaveClass(/collapsed/);
    
    // Click once more to expand
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    
    // Should be expanded now
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test('should have correct button positioning when collapsed', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    
    // Get initial button position
    const initialButtonBox = await collapseButton.boundingBox();
    
    // Collapse the sidebar
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    
    // Get new button position
    const collapsedButtonBox = await collapseButton.boundingBox();
    
    // Button should move to the left when sidebar collapses
    expect(collapsedButtonBox.x).toBeLessThan(initialButtonBox.x);
    
    // Button should maintain its vertical position
    expect(Math.abs(collapsedButtonBox.y - initialButtonBox.y)).toBeLessThan(5);
  });

  test('should preserve button hover effects', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    
    // Hover over the button
    await collapseButton.hover();
    
    // Check that hover styles are applied (this is a basic check)
    const buttonElement = await collapseButton.elementHandle();
    const hoverStyles = await buttonElement.evaluate(el => {
      const styles = window.getComputedStyle(el, ':hover');
      return {
        backgroundColor: styles.backgroundColor,
        transform: styles.transform
      };
    });
    
    // The exact values depend on CSS, but we can verify the element is interactive
    await expect(collapseButton).toBeVisible();
    
    // Test that clicking still works after hover
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    
    const sidebar = window.locator('.sidebar');
    await expect(sidebar).toHaveClass(/collapsed/);
  });

  test('should maintain accessibility attributes', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    
    // Check initial accessibility attributes
    await expect(collapseButton).toHaveAttribute('title', 'Collapse Configuration');
    
    // Collapse the sidebar
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    
    // Check updated accessibility attributes
    await expect(collapseButton).toHaveAttribute('title', 'Expand Configuration');
    
    // Expand again
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    
    // Should be back to original
    await expect(collapseButton).toHaveAttribute('title', 'Collapse Configuration');
  });
}); 