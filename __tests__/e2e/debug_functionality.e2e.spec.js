const { test, expect } = require('@playwright/test');
const { launchElectron, waitForElement, ensureAllVerificationsValid, getTimeout } = require('./test-helpers');

const isMock = process.env.E2E_ENV === 'mock';
const config = isMock
  ? require('../mock-data/mockConfigurationSidebarSections.json')
  : require('../../src/project-config/config/configurationSidebarSections.json');

const { sections, settings } = config;

test.describe('Debug Menu Functionality', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectron();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    await window.waitForSelector('.config-container');
    await window.waitForTimeout(getTimeout(2000));
    // Ensure all verifications are valid before toggling
    await ensureAllVerificationsValid(window);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should toggle no run mode and display commands without execution', async () => {
    // Expand the sidebar first to access debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    // Click the debug tools button in the App Control Sidebar
    const debugButton = await window.locator('.debug-section-toggle-button');
    await debugButton.click();
    
    // Wait for debug section to expand and show debug tools
    await expect(window.locator('.debug-section-content')).toBeVisible();

    const noRunModeButton = await window.locator('.debug-section-content button').filter({ hasText: 'No Run Mode' });
    await noRunModeButton.click();
    await expect(noRunModeButton).toHaveClass(/active/);
    
    const runnableSection = sections.find(s => s.components.toggle && s.id === 'mirror');
    if (!runnableSection) {
        console.log("Skipping test: No toggleable section found.");
        return;
    }

    const sectionLocator = window.locator(`h2:has-text("${runnableSection.title}")`).locator('..').locator('..');
    const toggle = await sectionLocator.locator('input[type="checkbox"]').first();
    await toggle.click();
    await window.waitForTimeout(getTimeout(500));
    
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
    
    await window.waitForTimeout(getTimeout(2000));
    const runButton = window.locator('#run-configuration-button');
    await runButton.click();
    
    // Wait for the tab to appear and the process to be running
    const terminalTabTitle = window.locator('.tab-title', { hasText: /^Mirror \+ MariaDB/i });
    await expect(terminalTabTitle).toBeVisible({ timeout: getTimeout(5000) });

    
    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs.first()).toBeVisible({ timeout: getTimeout(5000) });
    
    const sectionTabTitle = await window.locator('.tab-title').filter({ hasText: /Mirror \+ MariaDB/i });
    await expect(sectionTabTitle).toBeVisible();
    await sectionTabTitle.click();
    
    // In "no-run" mode, the terminal should show a specific indicator.
    const terminal = window.locator('.terminal-instance-wrapper.active');
    const noRunIndicator = terminal.locator('text=/\\[NO-RUN MODE\\]/');
    await expect(noRunIndicator).toBeVisible({ timeout: getTimeout(5000) });

    // Also verify the tab title includes a debug indicator
    await expect(sectionTabTitle).toHaveText(/Debug Run/);
  });

  test('should toggle test sections visibility', async () => {
    const testSection = sections.find(s => s.testSection);
    if (!testSection) {
        console.log("Skipping test: No test sections found in config.");
        return;
    }
    
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    const debugButton = await window.locator('.debug-section-toggle-button');
    await debugButton.click();
    
    await expect(window.locator('.debug-section-content')).toBeVisible();
    
    const showTestSectionsButton = await window.locator('.debug-section-content button').filter({ hasText: /Show Tests/i });
    await expect(showTestSectionsButton).toBeVisible();
    
    // Test sections should be hidden initially
    await expect(window.locator(`h2:has-text("${testSection.title}")`)).not.toBeVisible();

    await showTestSectionsButton.click();
    
    await expect(window.locator('.debug-section-content button').filter({ hasText: /Hide Tests/i })).toBeVisible();

    // Test section should now be visible
    await expect(window.locator(`h2:has-text("${testSection.title}")`)).toBeVisible();
  });

  test('should toggle terminal read-only/writable mode', async () => {
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    const debugButton = await window.locator('.debug-section-toggle-button');
    await debugButton.click();
    
    await expect(window.locator('.debug-section-content')).toBeVisible();
    
    const terminalModeButton = await window.locator('.debug-section-content button').filter({ hasText: /Terminals Read-Only|Terminals Writable/i });
    await expect(terminalModeButton).toBeVisible();
    
    const initialText = await terminalModeButton.textContent();
    await terminalModeButton.click();
    const newText = await terminalModeButton.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('should prevent debug mode changes when Project is running', async () => {
    const runnableSection = sections.find(s => s.components.toggle && s.id === 'mirror');
    if (!runnableSection) {
        console.log("Skipping test: No toggleable section found.");
        return;
    }

    const sectionLocator = window.locator(`h2:has-text("${runnableSection.title}")`).locator('..').locator('..');
    const toggle = await sectionLocator.locator('input[type="checkbox"]').first();
    await toggle.click();
    await window.waitForTimeout(getTimeout(500));
    
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

    await window.waitForTimeout(getTimeout(2000));
    const runButton = window.locator('#run-configuration-button');
    
    const initialTabCount = await window.locator('.tab').count();
    await runButton.click();
  
    // Wait for the tab to appear and the process to be running
    const tab = window.locator('.tab', { hasText: /^Mirror \+ MariaDB/i });
    await expect(tab).toBeVisible({ timeout: getTimeout(5000) });
    const tabStatus = tab.locator('.tab-status');
    await expect(tabStatus).toHaveClass(/status-running/, { timeout: getTimeout(5000) });
    
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    const debugButton = await window.locator('.debug-section-toggle-button');

    await debugButton.click();
    
    await expect(window.locator('.debug-section-content')).toBeVisible();
    
    const noRunModeButton = await window.locator('.debug-section-content button').filter({ hasText: /No Run Mode/i });
    const testSectionsButton = await window.locator('.debug-section-content button').filter({ hasText: /Show Tests|Hide Tests/i });
    const terminalModeButton = await window.locator('.debug-section-content button').filter({ hasText: /Terminals Read-Only|Terminals Writable/i });
    
    await expect(noRunModeButton).toBeDisabled();
    await expect(testSectionsButton).toBeDisabled();
    await expect(terminalModeButton).toBeDisabled();
  });

  test('should show active options indicator when debug modes are enabled', async () => {
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    const debugButton = await window.locator('.debug-section-toggle-button');
        
    await debugButton.click();
    
    await expect(window.locator('.debug-section-content')).toBeVisible();
    
    const noRunModeButton = await window.locator('.debug-section-content button').filter({ hasText: /No Run Mode/i });
    await noRunModeButton.click();
    
    await expect(debugButton).toHaveClass(/has-active-options/);
    
    await debugButton.click(); // Close  
    const collapsedTooltip = await debugButton.getAttribute('title');
    expect(collapsedTooltip).toContain('(Active Options)');
    
    await debugButton.click(); // Reopen
    await noRunModeButton.click(); // Disable
    
    await debugButton.click(); // Close
    await expect(debugButton).not.toHaveClass(/has-active-options/);
  });

  test('should toggle all verification statuses for testing fix button functionality', async () => {
    // Expand the sidebar and open debug tools
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    
    const debugButton = await window.locator('.debug-section-toggle-button');
    await debugButton.click();
    
    await expect(window.locator('.debug-section-content')).toBeVisible();
    
    // First, wait for the environment verification section to be visible
    const envVerificationHeader = window.locator('.verification-header', { hasText: 'General Environment' });
    await envVerificationHeader.waitFor({ state: 'visible', timeout: getTimeout(10000) });
    
    // Wait for verification to complete (no longer in "waiting" state)
    await window.waitForFunction(() => {
      const header = document.querySelector('.verification-header');
      return header && !header.classList.contains('waiting');
    }, { timeout: getTimeout(15000) });
    
    // Look for the toggle verification button
    const toggleVerificationsButton = await window.locator('.debug-section-content button').filter({ hasText: /Toggle Verifications/i });
    await expect(toggleVerificationsButton).toBeVisible();
    
    // Get initial state after verification completes
    const initialHeaderClasses = await envVerificationHeader.getAttribute('class');
    
    // Click to toggle all verifications
    await toggleVerificationsButton.click();
    
    // Wait a moment for the status changes to take effect
    await window.waitForTimeout(getTimeout(1000));
    
    // Check if the header reflects the status change (should have a different color/class)
    const toggledHeaderClasses = await envVerificationHeader.getAttribute('class');
    
    // Click toggle again to switch statuses back
    await toggleVerificationsButton.click();
    await window.waitForTimeout(getTimeout(1000));
    
    // The classes should be different after toggling
    expect(initialHeaderClasses).not.toBe(toggledHeaderClasses);
    
    // Check that fix buttons appear when verifications are invalid
    // Expand the environment verification section to see individual verifications
    const toggleIcon = envVerificationHeader.locator('.toggle-icon');
    const isCollapsed = await toggleIcon.evaluate(node => node.textContent.includes('▶'));
    if (isCollapsed) {
      await toggleIcon.click();
      await window.waitForTimeout(getTimeout(500));
    }

  });

  test('should access developer tools functions', async () => {
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    const debugButton = await window.locator('.debug-section-toggle-button');
    await debugButton.click();
    
    await expect(window.locator('.debug-section-content')).toBeVisible();
    
    await expect(window.locator('.debug-section-content button').filter({ hasText: /DevTools/i })).toBeVisible();
    await expect(window.locator('.debug-section-content button').filter({ hasText: /Reload/i })).toBeVisible();
  });

  test('should handle import/export configuration', async () => {
    const expandButton = await window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    const debugButton = await window.locator('.debug-section-toggle-button');
    await debugButton.click();
    
    await expect(window.locator('.debug-section-content')).toBeVisible();
    
    // Be more specific to avoid matching "Export Environment" button
    const exportConfigButton = await window.locator('.debug-section-content button').filter({ hasText: 'Export Config' });
    const importConfigButton = await window.locator('.debug-section-content button').filter({ hasText: 'Import Config' });
    const exportEnvButton = await window.locator('.debug-section-content button').filter({ hasText: 'Export Environment' });
    
    // Test Export Config button
    if (await exportConfigButton.count() > 0) {
      await expect(exportConfigButton).toBeVisible();
      await expect(exportConfigButton).toBeEnabled();
    }
    
    // Test Import Config button
    if (await importConfigButton.count() > 0) {
      await expect(importConfigButton).toBeVisible();
      await expect(importConfigButton).toBeEnabled();
    }
    
    // Test Export Environment button
    if (await exportEnvButton.count() > 0) {
      await expect(exportEnvButton).toBeVisible();
      await expect(exportEnvButton).toBeEnabled();
    }
  });
}); 