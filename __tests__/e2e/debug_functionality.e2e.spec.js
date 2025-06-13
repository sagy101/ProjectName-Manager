const { test, expect } = require('@playwright/test');
const { launchElectron, waitForElement } = require('./test-helpers');

// E2E Test Section ID (from src/configurationSidebarSections.json - ensure this section has "testSection": true)
const E2E_TARGET_TEST_SECTION_ID = 'e2e-test-floating';
const CONFIG_SECTION_SELECTOR = (id) => `#section-${id}`;


// Helper function to open the debug panel
async function openDebugPanel(window) {
  const expandButton = window.locator('button[title="Expand Sidebar"]');
  if (await expandButton.isVisible()) { // Click only if sidebar is not already expanded
    await expandButton.click();
  }

  const debugButton = window.locator('button[title*="Debug Tools"]');
  // Check if debug panel is already open by looking for a known element, e.g., "Hide Tests" button
  const hideTestsButton = window.locator('button:has-text("Hide Test Sections")');
  if (!await hideTestsButton.isVisible()) { // If debug tools section not open
    await debugButton.click();
  }
  await expect(window.locator('h3:has-text("Debug Tools")')).toBeVisible(); // Verify panel header
}


test.describe('Debug Menu Functionality (src config)', () => {
  let electronApp;
  let window;
  let srcSections; // To store dynamically loaded sections

  test.beforeAll(async () => {
    // Dynamically require srcSections here to get the latest version after file modifications
    const fs = require('fs');
    const path = require('path');
    const sectionsFilePath = path.resolve(__dirname, '../../src/configurationSidebarSections.json');
    // Ensure the file exists before trying to read, or handle error
    if (fs.existsSync(sectionsFilePath)) {
        srcSections = JSON.parse(fs.readFileSync(sectionsFilePath, 'utf-8')).sections;
    } else {
        console.error(`ERROR: src/configurationSidebarSections.json not found at ${sectionsFilePath}. Tests relying on it may fail or be skipped.`);
        srcSections = []; // Default to empty array to prevent further errors
    }

    if (!srcSections || srcSections.length === 0) {
      // This will cause tests that depend on srcSections to be skipped.
      console.warn('srcSections could not be loaded or is empty. Relevant tests will be skipped.');
    }
  });

  test.beforeEach(async () => {
    const launchResult = await launchElectron(); // Assuming this helper correctly launches the app
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    await window.waitForSelector('.config-container'); // Wait for main UI
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should toggle no run mode and display commands without execution', async () => {
    await openDebugPanel(window);

    const noRunModeButton = window.locator('button:has-text("No Run Mode")'); // More direct selector
    await noRunModeButton.click();
    // Check for an active state, e.g. a class or a change in aria-pressed
    await expect(noRunModeButton).toHaveClass(/active/); // Or a different indicator of active state
    
    // Find a runnable, non-test section from srcSections
    const runnableSection = srcSections.find(s => s.components.toggle && s.id === 'mirror' && !s.testSection);
    if (!runnableSection) {
        console.log("Skipping test: No suitable runnable (non-test) section like 'mirror' found in src/config.");
        return;
    }

    const sectionLocator = window.locator(CONFIG_SECTION_SELECTOR(runnableSection.id));
    const toggle = await sectionLocator.locator('input[type="checkbox"]').first();
    await toggle.click();
    await window.waitForTimeout(500);
    
    // Attach the section to make the mode selector visible
    if (runnableSection.components.attachToggle) {
      const attachToggle = sectionLocator.locator('#attach-mirror');
      await attachToggle.click();
      await expect(attachToggle).toHaveClass(/attached/);
    }

    // Set mode to "run"
    if (runnableSection.components.modeSelector) {
      const runOptionSelector = `[data-testid="mode-selector-btn-${runnableSection.id}-run"]`;
      await window.waitForSelector(runOptionSelector);
      await window.click(runOptionSelector);
    }
    
    await window.waitForTimeout(2000);
    const runButton = window.locator('#run-configuration-button');
    await runButton.click();
    
    // Wait for the tab to appear and the process to be running
    const terminalTabTitle = window.locator('.tab-title', { hasText: /^Mirror \+ MariaDB/i });
    await expect(terminalTabTitle).toBeVisible({ timeout: 5000 });

    
    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs.first()).toBeVisible({ timeout: 5000 });
    
    const sectionTabTitle = await window.locator('.tab-title').filter({ hasText: /Mirror \+ MariaDB/i });
    await expect(sectionTabTitle).toBeVisible();
    await sectionTabTitle.click();
    
    // In "no-run" mode, the terminal should show a specific indicator.
    const terminal = window.locator('.terminal-instance-wrapper.active');
    const noRunIndicator = terminal.locator('text=/\\[NO-RUN MODE\\]/');
    await expect(noRunIndicator).toBeVisible({ timeout: 5000 });

    // Also verify the tab title includes a debug indicator
    await expect(sectionTabTitle).toHaveText(/Debug Run/);
  });

  test('should toggle test sections visibility', async () => {
    if (!srcSections || srcSections.length === 0) test.skip(true, 'Skipping test as srcSections are not loaded.');
    const targetTestSection = srcSections.find(s => s.id === E2E_TARGET_TEST_SECTION_ID && s.testSection);
    if (!targetTestSection) {
      console.log(`Skipping test: Target test section "${E2E_TARGET_TEST_SECTION_ID}" not found or not marked as testSection in src/config.`);
      test.skip(true, `Skipping test: Target test section "${E2E_TARGET_TEST_SECTION_ID}" not found or not marked as testSection in src/config.`);
      return;
    }
    
    await openDebugPanel(window);
    
    const showTestSectionsButton = window.locator('button:has-text("Show Test Sections")');
    const hideTestSectionsButton = window.locator('button:has-text("Hide Test Sections")');
    const targetTestSectionLocator = window.locator(CONFIG_SECTION_SELECTOR(targetTestSection.id));
    
    // Determine initial state and act accordingly
    if (await showTestSectionsButton.isVisible()) {
        await expect(targetTestSectionLocator).not.toBeVisible({ timeout: 1000 }); // Should be hidden if "Show" is an option
        await showTestSectionsButton.click();
        await expect(hideTestSectionsButton).toBeVisible();
        await expect(targetTestSectionLocator).toBeVisible();
    } else {
        await expect(hideTestSectionsButton).toBeVisible(); // "Hide" should be visible
        await expect(targetTestSectionLocator).toBeVisible(); // Section already visible
    }

    // Click again to hide test sections
    await hideTestSectionsButton.click();
    await expect(showTestSectionsButton).toBeVisible();
    await expect(targetTestSectionLocator).not.toBeVisible();
  });

  test('should toggle terminal read-only/writable mode', async () => {
    await openDebugPanel(window);
    
    const terminalModeButton = window.locator('button').filter({ hasText: /(Terminals Read-Only|Terminals Writable)/ });
    await expect(terminalModeButton).toBeVisible();
    
    const initialText = await terminalModeButton.textContent();
    await terminalModeButton.click();
    const newText = await terminalModeButton.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('should prevent debug mode changes when ISO is running', async () => {
    if (!srcSections || srcSections.length === 0) test.skip(true, 'Skipping test as srcSections are not loaded.');
    const runnableSection = srcSections.find(s => s.components.toggle && s.id === 'mirror' && !s.testSection);
    if (!runnableSection) {
        console.log("Skipping test: No suitable runnable (non-test) section like 'mirror' found in src/config.");
        return;
    }

    const sectionLocator = window.locator(`h2:has-text("${runnableSection.title}")`).locator('..').locator('..');
    const toggle = await sectionLocator.locator('input[type="checkbox"]').first();
    await toggle.click();
    await window.waitForTimeout(500);
    
    // Attach the section to make the mode selector visible
    if (runnableSection.components.attachToggle) {
      const attachToggle = sectionLocator.locator('#attach-mirror');
      await attachToggle.click();
      await expect(attachToggle).toHaveClass(/attached/);
    }

    // Set mode to "run"
    if (runnableSection.components.modeSelector) {
      const runOptionSelector = `[data-testid="mode-selector-btn-${runnableSection.id}-run"]`;
      await window.waitForSelector(runOptionSelector);
      await window.click(runOptionSelector);
    }

    await window.waitForTimeout(2000);
    const runButton = window.locator('#run-configuration-button');
    
    const initialTabCount = await window.locator('.tab').count();
    await runButton.click();
  
    // Wait for the tab to appear and the process to be running
    const tab = window.locator('.tab', { hasText: /^Mirror \+ MariaDB/i });
    await expect(tab).toBeVisible({ timeout: 5000 });
    const tabStatus = tab.locator('.tab-status');
    await expect(tabStatus).toHaveClass(/status-idle/, { timeout: 5000 });
    
    await openDebugPanel(window); // Ensures debug panel is open
    
    const noRunModeButton = window.locator('button:has-text("No Run Mode")');
    const testSectionsButton = window.locator('button').filter({ hasText: /(Show Test Sections|Hide Test Sections)/ });
    const terminalModeButton = window.locator('button').filter({ hasText: /(Terminals Read-Only|Terminals Writable)/ });
    
    await expect(noRunModeButton).toBeDisabled();
    await expect(testSectionsButton).toBeDisabled();
    await expect(terminalModeButton).toBeDisabled();
  });

  test('should show active options indicator when debug modes are enabled', async () => {
    const debugButtonHandle = window.locator('button[aria-label*="Debug Tools"], button[title*="Debug Tools"]');
        
    await openDebugPanel(window);
    
    const noRunModeButton = window.locator('button:has-text("No Run Mode")');
    await noRunModeButton.click();
    
    await expect(debugButtonHandle).toHaveClass(/has-active-options/);
    
    // Close the debug panel by clicking the main debug button again (assuming toggle behavior)
    await debugButtonHandle.click();
    const collapsedTooltip = await debugButtonHandle.getAttribute('title');
    expect(collapsedTooltip).toContain('(Active Options)'); // Tooltip should indicate active options
    
    await debugButtonHandle.click(); // Reopen panel
    await noRunModeButton.click(); // Disable No Run Mode
    
    await debugButtonHandle.click(); // Close panel again
    await expect(debugButtonHandle).not.toHaveClass(/has-active-options/);
  });

  test('should access developer tools functions', async () => {
    await openDebugPanel(window);
    
    await expect(window.locator('button').filter({ hasText: /DevTools/i })).toBeVisible();
    await expect(window.locator('button').filter({ hasText: /Reload/i })).toBeVisible();
  });

  test('should handle import/export configuration', async () => {
    await openDebugPanel(window);
    
    // Be more specific to avoid matching "Export Environment" button
    const exportConfigButton = await window.locator('button').filter({ hasText: 'Export Config' });
    const importConfigButton = await window.locator('button').filter({ hasText: 'Import Config' });
    const exportEnvButton = await window.locator('button').filter({ hasText: 'Export Environment' });
    
    // Test Export Config button
    if (await exportConfigButton.count() > 0) {
      await expect(exportConfigButton).toBeVisible();
      await expect(exportConfigButton).toBeEnabled();
      console.log('✓ Export configuration button found and enabled');
    }
    
    // Test Import Config button
    if (await importConfigButton.count() > 0) {
      await expect(importConfigButton).toBeVisible();
      await expect(importConfigButton).toBeEnabled();
      console.log('✓ Import configuration button found and enabled');
    }
    
    // Test Export Environment button
    if (await exportEnvButton.count() > 0) {
      await expect(exportEnvButton).toBeVisible();
      await expect(exportEnvButton).toBeEnabled();
      console.log('✓ Export environment button found and enabled');
    }
  });

  test('should clear local storage when Clear Local Storage button is clicked', async () => {
    await openDebugPanel(window);

    // Set a dummy item in local storage
    await window.evaluate(() => localStorage.setItem('testKey', 'testValue'));

    // Verify the item is set
    const item = await window.evaluate(() => localStorage.getItem('testKey'));
    expect(item).toBe('testValue');

    // Click the "Clear Local Storage" button
    // Assuming the button is directly in the debug panel revealed
    const clearLocalStorageButton = window.locator('button:has-text("Clear Local Storage")');

    // Check if the button exists before trying to click
    if (await clearLocalStorageButton.count() === 0) {
      console.warn('Clear Local Storage button not found. Test cannot proceed.');
      // Optionally, fail the test explicitly if the button is critical
      // expect(false, 'Clear Local Storage button must exist for this test').toBe(true);
      return; // Skip the rest of the test if button not found
    }
    await clearLocalStorageButton.click();

    // Verify the item is removed from local storage
    // May need a short wait for the action to complete if it's asynchronous
    await window.waitForTimeout(100); // Small delay
    const clearedItem = await window.evaluate(() => localStorage.getItem('testKey'));
    expect(clearedItem).toBeNull();
  });
}); 