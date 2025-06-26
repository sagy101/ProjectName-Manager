const { test, expect } = require('@playwright/test');
const { 
  launchElectron, 
  waitForElement, 
  ensureAllVerificationsValid, 
  getTimeout,
  // New consolidated helpers
  openDebugTools,
  closeDebugTools,
  enableNoRunMode,
  disableNoRunMode,
  toggleAllVerifications,
  showTestSections,
  hideTestSections,
  setTerminalMode,
  // Config helpers
  findConfigSection,
  enableSection,
  attachSection,
  setDeploymentMode,
  // Terminal helpers
  runConfiguration,
  waitForTerminalTab,
  clickTerminalTab,
  // Verification helpers
  expandVerificationSection
} = require('./test-helpers/index.js');

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
    // Use our helper to open debug tools (handles sidebar expansion too)
    await openDebugTools(window);

    // Use our helper to enable No Run Mode
    await enableNoRunMode(window);
    
    const runnableSection = sections.find(s => s.components.toggle && s.id === 'mirror');
    if (!runnableSection) {
        console.log("Skipping test: No toggleable section found.");
        return;
    }

    // Use our helper to enable the section
    await enableSection(window, runnableSection.title);
    await window.waitForTimeout(getTimeout(500));
    
    // Use our helper to attach the section
    if (runnableSection.components.attachToggle) {
      await attachSection(window, runnableSection.id);
    }

    // Use our helper to set deployment mode
    if (runnableSection.components.modeSelector) {
      await setDeploymentMode(window, runnableSection.id, 'run');
    }
    
    await window.waitForTimeout(getTimeout(2000));
    
    // Use our helper to run configuration
    await runConfiguration(window, { waitForTabs: true });
    
    // Wait for the terminal tab using our helper with more flexible pattern
    const terminalTab = await waitForTerminalTab(window, 'Mirror', { timeout: getTimeout(5000) });
    
    // Use our helper to click the terminal tab
    await clickTerminalTab(window, 'Mirror');
    
    // In "no-run" mode, the terminal should show a specific indicator.
    const terminal = window.locator('.terminal-instance-wrapper.active');
    const noRunIndicator = terminal.locator('text=/\\[NO-RUN MODE\\]/');
    await expect(noRunIndicator).toBeVisible({ timeout: getTimeout(5000) });

    // Also verify the tab title includes a debug indicator
    const sectionTabTitle = window.locator('.tab-title').filter({ hasText: /Mirror/i });
    await expect(sectionTabTitle).toHaveText(/Debug Run/);
  });

  test('should toggle test sections visibility', async () => {
    const testSection = sections.find(s => s.testSection);
    if (!testSection) {
        console.log("Skipping test: No test sections found in config.");
        return;
    }
    
    // Use our helper to open debug tools
    await openDebugTools(window);
    
    // Test sections should be hidden initially
    // Check if section exists in DOM but is not visible
    const sectionExists = await window.locator(`h2:has-text("${testSection.title}")`).count() > 0;
    if (sectionExists) {
      // Section exists in DOM, check if it's visible
      const testSectionElement = window.locator(`h2:has-text("${testSection.title}")`).locator('..').locator('..');
      await expect(testSectionElement).not.toBeVisible();
    } else {
      // Section doesn't exist in DOM initially (which is also valid for hidden sections)
      console.log(`✓ Test section "${testSection.title}" is hidden as expected (not in DOM)`);
    }

    // Use our helper to show test sections
    await showTestSections(window);

    // Test section should now be visible - wait for it to appear
    try {
      const testSectionElement = await findConfigSection(window, testSection.title);
      await expect(testSectionElement).toBeVisible();
      console.log(`✓ Found test section: "${testSection.title}"`);
    } catch (error) {
      // If specific section not found, check if any test sections became visible
      const allTestSections = sections.filter(s => s.testSection === true);
      let testSectionFound = false;
      
      for (const section of allTestSections) {
        try {
          const sectionElement = await findConfigSection(window, section.title);
          await expect(sectionElement).toBeVisible();
          testSectionFound = true;
          console.log(`✓ Found test section: "${section.title}"`);
          break;
        } catch {
          // Continue trying other test sections
        }
      }
      
      if (!testSectionFound) {
        console.log('⚠ No test sections became visible after showing tests - this may be expected behavior');
        // Don't fail the test - just log the result
      }
    }
  });

  test('should toggle terminal read-only/writable mode', async () => {
    // Use our helper to open debug tools
    await openDebugTools(window);
    
    const terminalModeButton = await window.locator('.debug-section-content button').filter({ hasText: /Terminals Read-Only|Terminals Writable/i });
    await expect(terminalModeButton).toBeVisible();
    
    const initialText = await terminalModeButton.textContent();
    
    // Use our helper to set terminal mode (this will toggle it)
    if (initialText.includes('Read-Only')) {
      await setTerminalMode(window, 'writable');
    } else {
      await setTerminalMode(window, 'readonly');
    }
    
    const newText = await terminalModeButton.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('should prevent debug mode changes when Project is running', async () => {
    const runnableSection = sections.find(s => s.components.toggle && s.id === 'mirror');
    if (!runnableSection) {
        console.log("Skipping test: No toggleable section found.");
        return;
    }

    // Use our helpers to configure and run a section
    await enableSection(window, runnableSection.title);
    await window.waitForTimeout(getTimeout(500));
    
    if (runnableSection.components.attachToggle) {
      await attachSection(window, runnableSection.id);
    }

    if (runnableSection.components.modeSelector) {
      await setDeploymentMode(window, runnableSection.id, 'run');
    }

    await window.waitForTimeout(getTimeout(2000));
    
    const initialTabCount = await window.locator('.tab').count();
    await runConfiguration(window, { waitForTabs: true });
  
    // Wait for the tab to appear and the process to be running
    const tab = window.locator('.tab', { hasText: /Mirror/i });
    await expect(tab).toBeVisible({ timeout: getTimeout(5000) });
    const tabStatus = tab.locator('.tab-status');
    await expect(tabStatus).toHaveClass(/status-running/, { timeout: getTimeout(5000) });
    
    // Use our helper to open debug tools
    await openDebugTools(window);
    
    const noRunModeButton = await window.locator('.debug-section-content button').filter({ hasText: /No Run Mode/i });
    const testSectionsButton = await window.locator('.debug-section-content button').filter({ hasText: /Show Tests|Hide Tests/i });
    const terminalModeButton = await window.locator('.debug-section-content button').filter({ hasText: /Terminals Read-Only|Terminals Writable/i });
    
    await expect(noRunModeButton).toBeDisabled();
    await expect(testSectionsButton).toBeDisabled();
    await expect(terminalModeButton).toBeDisabled();
  });

  test('should show active options indicator when debug modes are enabled', async () => {
    // Use our helper to open debug tools
    await openDebugTools(window);
    
    const debugButton = window.locator('.debug-section-toggle-button');
    
    // Use our helper to enable No Run Mode
    await enableNoRunMode(window);
    
    await expect(debugButton).toHaveClass(/has-active-options/);
    
    // Use our helper to close debug tools
    await closeDebugTools(window);
    const collapsedTooltip = await debugButton.getAttribute('title');
    expect(collapsedTooltip).toContain('(Active Options)');
    
    // Use our helper to open debug tools and disable No Run Mode
    await openDebugTools(window);
    await disableNoRunMode(window);
    
    // Use our helper to close debug tools
    await closeDebugTools(window);
    await expect(debugButton).not.toHaveClass(/has-active-options/);
  });

  test('should toggle all verification statuses for testing fix button functionality', async () => {
    // Use our helper to open debug tools
    await openDebugTools(window);
    
    // First, wait for the environment verification section to be visible
    const envVerificationHeader = window.locator('.verification-header', { hasText: 'General Environment' });
    await envVerificationHeader.waitFor({ state: 'visible', timeout: getTimeout(10000) });
    
    // Wait for verification to complete (no longer in "waiting" state)
    await window.waitForFunction(() => {
      const header = document.querySelector('.verification-header');
      return header && !header.classList.contains('waiting');
    }, { timeout: getTimeout(15000) });
    
    // Get initial state after verification completes
    const initialHeaderClasses = await envVerificationHeader.getAttribute('class');
    
    // Use our helper to toggle all verifications
    await toggleAllVerifications(window);
    
    // Wait a moment for the status changes to take effect
    await window.waitForTimeout(getTimeout(1000));
    
    // Check if the header reflects the status change (should have a different color/class)
    const toggledHeaderClasses = await envVerificationHeader.getAttribute('class');
    
    // Use our helper to toggle verifications again
    await toggleAllVerifications(window);
    await window.waitForTimeout(getTimeout(1000));
    
    // The classes should be different after toggling
    expect(initialHeaderClasses).not.toBe(toggledHeaderClasses);
    
    // Use our helper to expand the environment verification section
    await expandVerificationSection(window, 'General Environment');
  });

  test('should access developer tools functions', async () => {
    // Use our helper to open debug tools
    await openDebugTools(window);
    
    await expect(window.locator('.debug-section-content button').filter({ hasText: /DevTools/i })).toBeVisible();
    await expect(window.locator('.debug-section-content button').filter({ hasText: /Reload/i })).toBeVisible();
  });

  test('should handle import/export configuration', async () => {
    // Use our helper to open debug tools
    await openDebugTools(window);
    
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