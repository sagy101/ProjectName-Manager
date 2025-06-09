const { test, expect } = require('@playwright/test');
const { launchElectronInvisibly } = require('./test-helpers');

test.describe('Debug Menu Functionality', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectronInvisibly();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    await window.waitForSelector('.config-container');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should toggle no run mode and display commands without execution', async () => {
    // First expand the sidebar to access debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    // Click the debug tools button to expand debug section
    const debugButton = await window.locator('[title*="Debug Tools"]');
    await debugButton.click();
    
    // Verify debug tools are visible
    await expect(window.locator('text=Debug Tools')).toBeVisible();
    
    // Enable No Run Mode
    const noRunModeButton = await window.locator('text=No Run Mode').locator('..');
    await noRunModeButton.click();
    
    // Verify button shows active state
    await expect(noRunModeButton).toHaveClass(/active/);
    
    // Now enable a section and run to test no-run mode
    const mirrorSection = await window.locator('text=Mirror + MariaDB').locator('..').locator('..');
    const mirrorToggle = await mirrorSection.locator('input[type="checkbox"]').first();
    await mirrorToggle.click();
    
    // Wait for RUN button to be ready
    await window.waitForTimeout(2000);
    const runButton = await window.locator('button').filter({ hasText: /RUN.*ISO/i });
    await runButton.click();
    
    // Wait for terminal tabs
    await window.waitForTimeout(3000);
    
    // Verify terminal tabs are created
    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs.first()).toBeVisible({ timeout: 15000 });
    
    // Click on the terminal tab to check content
    const mirrorTab = await window.locator('.tab').filter({ hasText: /Mirror.*MariaDB/i });
    await expect(mirrorTab).toBeVisible();
    await mirrorTab.click();
    
    // Verify NO-RUN MODE indicator is shown in terminal
    const noRunIndicator = await window.locator('text=/\\[NO-RUN MODE\\]/i');
    await expect(noRunIndicator).toBeVisible({ timeout: 10000 });
    
    // Verify the command is displayed (should contain gradle commands)
    const terminalContent = await window.locator('.terminal, .xterm-screen');
    const hasGradleCommand = await terminalContent.locator('text=/gradlew.*bootRun/i').isVisible().catch(() => false);
    expect(hasGradleCommand).toBe(true);
  });

  test('should toggle test sections visibility', async () => {
    // Expand sidebar and open debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    const debugButton = await window.locator('[title*="Debug Tools"]');
    await debugButton.click();
    
    // Check initial state - test sections should be hidden by default
    const showTestSectionsButton = await window.locator('button').filter({ hasText: /Show Tests/i });
    await expect(showTestSectionsButton).toBeVisible();
    
    // Click to show test sections
    await showTestSectionsButton.click();
    
    // Verify button text changes and becomes active
    await expect(window.locator('button').filter({ hasText: /Hide Tests/i })).toBeVisible();
    const hideTestSectionsButton = await window.locator('button').filter({ hasText: /Hide Tests/i });
    await expect(hideTestSectionsButton).toHaveClass(/active/);
    
    // Verify debug button shows active options indicator
    const mainDebugButton = await window.locator('.debug-section-toggle-button');
    await expect(mainDebugButton).toHaveClass(/has-active-options/);
    
    // Click to hide test sections again
    await hideTestSectionsButton.click();
    
    // Verify button returns to show state
    await expect(window.locator('button').filter({ hasText: /Show Tests/i })).toBeVisible();
    await expect(window.locator('button').filter({ hasText: /Show Tests/i })).not.toHaveClass(/active/);
  });

  test('should toggle terminal read-only/writable mode', async () => {
    // Expand sidebar and open debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    const debugButton = await window.locator('[title*="Debug Tools"]');
    await debugButton.click();
    
    // Find the terminal read-only toggle button
    const terminalModeButton = await window.locator('button').filter({ hasText: /Terminals Read-Only|Terminals Writable/i });
    await expect(terminalModeButton).toBeVisible();
    
    // Get initial state
    const initialText = await terminalModeButton.textContent();
    
    // Click to toggle mode
    await terminalModeButton.click();
    
    // Verify the text changed
    const newText = await terminalModeButton.textContent();
    expect(newText).not.toBe(initialText);
    
    // Verify one of the expected states
    const isReadOnlyMode = newText.includes('Read-Only');
    const isWritableMode = newText.includes('Writable');
    expect(isReadOnlyMode || isWritableMode).toBe(true);
  });

  test('should prevent debug mode changes when ISO is running', async () => {
    // Enable a section first
    const mirrorSection = await window.locator('text=Mirror + MariaDB').locator('..').locator('..');
    const mirrorToggle = await mirrorSection.locator('input[type="checkbox"]').first();
    await mirrorToggle.click();
    
    // Start ISO
    await window.waitForTimeout(2000);
    const runButton = await window.locator('button').filter({ hasText: /RUN.*ISO/i });
    await runButton.click();
    await window.waitForTimeout(2000);
    
    // Expand sidebar and open debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    const debugButton = await window.locator('[title*="Debug Tools"]');
    await debugButton.click();
    
    // Verify debug buttons are disabled when ISO is running
    const noRunModeButton = await window.locator('button').filter({ hasText: /No Run Mode/i });
    const testSectionsButton = await window.locator('button').filter({ hasText: /Show Tests|Hide Tests/i });
    const terminalModeButton = await window.locator('button').filter({ hasText: /Terminals Read-Only|Terminals Writable/i });
    
    await expect(noRunModeButton).toBeDisabled();
    await expect(testSectionsButton).toBeDisabled();
    await expect(terminalModeButton).toBeDisabled();
    
    // Verify buttons have disabled styling
    await expect(noRunModeButton).toHaveClass(/disabled/);
    await expect(testSectionsButton).toHaveClass(/disabled/);
    await expect(terminalModeButton).toHaveClass(/disabled/);
  });

  test('should show active options indicator when debug modes are enabled', async () => {
    // Expand sidebar and open debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    const debugButton = await window.locator('[title*="Debug Tools"]');
    
    // Initially should not have active options
    await expect(debugButton).not.toHaveClass(/has-active-options/);
    
    await debugButton.click();
    
    // Verify tooltip says "Hide Debug Tools" when expanded
    const expandedTooltip = await debugButton.getAttribute('title');
    expect(expandedTooltip).toContain('Hide Debug Tools');
    
    // Enable No Run Mode
    const noRunModeButton = await window.locator('text=No Run Mode').locator('..');
    await noRunModeButton.click();
    
    // Verify debug button shows active options indicator
    await expect(debugButton).toHaveClass(/has-active-options/);
    
    // Close debug section to check tooltip with active options
    await debugButton.click();
    
    // Verify tooltip includes "Active Options" when section is closed and has active options
    const collapsedTooltip = await debugButton.getAttribute('title');
    expect(collapsedTooltip).toContain('(Active Options)');
    
    // Reopen debug section and disable No Run Mode
    await debugButton.click();
    await noRunModeButton.click();
    
    // Close debug section again
    await debugButton.click();
    
    // Verify active options indicator is removed
    await expect(debugButton).not.toHaveClass(/has-active-options/);
    
    // Verify tooltip no longer includes "Active Options"
    const finalTooltip = await debugButton.getAttribute('title');
    expect(finalTooltip).not.toContain('(Active Options)');
  });

  test('should access developer tools functions', async () => {
    // Expand sidebar and open debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    const debugButton = await window.locator('[title*="Debug Tools"]');
    await debugButton.click();
    
    // Verify developer tools buttons are present
    await expect(window.locator('button').filter({ hasText: /DevTools/i })).toBeVisible();
    await expect(window.locator('button').filter({ hasText: /Reload/i })).toBeVisible();
    
    // Note: We can't actually test DevTools opening or app reloading in e2e tests
    // as they would interfere with the test execution, but we can verify the buttons exist
    
    const devToolsButton = await window.locator('button').filter({ hasText: /DevTools/i });
    const reloadButton = await window.locator('button').filter({ hasText: /Reload/i });
    
    await expect(devToolsButton).toBeEnabled();
    await expect(reloadButton).toBeEnabled();
  });

  test('should handle import/export configuration', async () => {
    // Expand sidebar and open debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    const debugButton = await window.locator('[title*="Debug Tools"]');
    await debugButton.click();
    
    // Look for import/export buttons (may be present in debug tools)
    const exportButton = await window.locator('button').filter({ hasText: /Export/i });
    const importButton = await window.locator('button').filter({ hasText: /Import/i });
    
    // Check if import/export buttons exist (they might be in the debug section)
    const exportExists = await exportButton.count() > 0;
    const importExists = await importButton.count() > 0;
    
    if (exportExists) {
      await expect(exportButton).toBeVisible();
      await expect(exportButton).toBeEnabled();
      console.log('✓ Export configuration button found and enabled');
    }
    
    if (importExists) {
      await expect(importButton).toBeVisible();  
      await expect(importButton).toBeEnabled();
      console.log('✓ Import configuration button found and enabled');
    }
    
    // Note: We can't actually test file dialogs in e2e tests as they require user interaction
    // But we can verify the buttons are present and enabled
    console.log(`Export button exists: ${exportExists}, Import button exists: ${importExists}`);
  });

  test('should maintain debug state across sidebar collapse/expand', async () => {
    // Expand sidebar and open debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    const debugButton = await window.locator('[title*="Debug Tools"]');
    await debugButton.click();
    
    // Enable No Run Mode
    const noRunModeButton = await window.locator('text=No Run Mode').locator('..');
    await noRunModeButton.click();
    
    // Verify it's active
    await expect(noRunModeButton).toHaveClass(/active/);
    await expect(debugButton).toHaveClass(/has-active-options/);
    
    // Collapse sidebar
    const collapseButton = await window.locator('[title="Collapse Sidebar"]');
    await collapseButton.click();
    
    // Verify debug button still shows active indicator when collapsed
    await expect(debugButton).toHaveClass(/has-active-options/);
    
    // Expand sidebar again
    await debugButton.click(); // This should expand and open debug tools
    
    // Verify No Run Mode is still active
    await expect(window.locator('text=No Run Mode').locator('..')).toHaveClass(/active/);
  });
}); 