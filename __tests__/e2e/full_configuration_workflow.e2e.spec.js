const { test, expect } = require('@playwright/test');
const { 
  launchElectron, 
  waitForElement, 
  getTimeout,
  // New consolidated helpers
  selectGlobalProject,
  enableSection,
  attachSection,
  setDeploymentMode,
  runConfiguration,
  stopConfiguration,
  waitForTerminalTab,
  isSectionEnabled
} = require('./test-helpers/index.js');

const isMock = process.env.E2E_ENV === 'mock';
const config = isMock
  ? require('../mock-data/mockConfigurationSidebarSections.json')
  : require('../../src/project-config/config/configurationSidebarSections.json');

const { sections, settings } = config;

// Helper function to find a section by its ID from the config
const getSectionById = (id) => sections.find(s => s.id === id);

// Helper function to find a sub-section by its ID from the config
const getSubSectionById = (section, subSectionId) => {
    if (!section || !section.components.subSections) return null;
    return section.components.subSections.find(ss => ss.id === subSectionId);
};

test.describe('Full Configuration Workflow', () => {
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

  test('should configure, run, verify terminals, and stop complete workflow', async () => {
    // Phase 1: Wait for the app to be ready and select a global project
    await selectGlobalProject(window, 0, { timeout: getTimeout(15000) });

    // Phase 2: Enable and configure sections
    const sectionsToEnable = ['mirror', 'gopm', 'url-intelligence'];
    for (const sectionId of sectionsToEnable) {
      const sectionConfig = sections.find(s => s.id === sectionId);
      
      // Use our helper to enable the section
      await enableSection(window, sectionConfig.title);

      // Special handling for the 'mirror' section to click 'attach'
      if (sectionId === 'mirror') {
        await window.waitForTimeout(500); // Give UI time to enable attach
        await attachSection(window, sectionId);
      }
    }

    // Phase 3: Run and verify terminals
    await runConfiguration(window, { waitForTabs: true });

    // Verify that the correct tabs appear using our helpers
    await waitForTerminalTab(window, 'Mirror', { timeout: getTimeout(15000) });
    await waitForTerminalTab(window, 'gopm', { timeout: getTimeout(15000) });
    await expect(window.locator('.tab.error-tab-button', { hasText: /URL Intelligence \+ TI \(Cloud\)/ })).toBeVisible({ timeout: getTimeout(15000) });
    
    // Phase 4: Stop and verify using our helpers
    await stopConfiguration(window);

    // The tabs should be gone
    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs).toHaveCount(0, { timeout: getTimeout(5000) });
  });

  test('should handle individual section toggling during runtime', async () => {
    // Enable a section and run using our helpers
    const gopmSection = sections.find(s => s.id === 'gopm');
    await enableSection(window, gopmSection.title);
    
    await runConfiguration(window, { waitForTabs: true });
    await waitForTerminalTab(window, 'gopm', { timeout: getTimeout(15000) });

    // Now, disable the section while it's "running"
    // The UI should prevent this, but we confirm the toggle is at least locked
    const gopmSectionElement = await findConfigSection(window, gopmSection.title);
    await expect(gopmSectionElement.locator('input[type="checkbox"]').first()).toBeDisabled();
  });

  test('should validate deployment option changes affect configuration', async () => {
    const gopmSection = sections.find(s => s.id === 'gopm');
    
    // Use our helper to enable the section
    await enableSection(window, gopmSection.title);

    // Initial run with default (process, since container is TBD)
    await runConfiguration(window, { waitForTabs: true });
    await waitForTerminalTab(window, 'gopm', { timeout: getTimeout(15000) });

    // Use our helpers to stop configuration
    await stopConfiguration(window);

    // Since container is TBD, we can't test switching to it. 
    // Instead, verify that the process button is already selected (as it's the default)
    const processButton = window.locator('[data-testid="mode-selector-btn-gopm-process"]');
    await expect(processButton).toHaveClass(/active/, { timeout: 5000 });

    // Verify container button is disabled/TBD
    const containerButton = window.locator('[data-testid="mode-selector-btn-gopm-container"]');
    await expect(containerButton).toHaveClass(/tbd/, { timeout: 5000 });

    // Run again and verify the tab name is still process
    await runConfiguration(window, { waitForTabs: true });
    await expect(window.locator('.tab-title').filter({ hasText: /gopm \(Process\)/i })).toBeVisible();
  });
}); 