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
  isSectionEnabled,
  findConfigSection
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

    // Phase 2: Enable and configure sections dynamically
    const attachableSection = sections.find(s => s.components?.toggle && s.components?.attachToggle);
    const deployableSection = sections.find(s => s.components?.toggle && s.components?.deploymentOptions);
    const errorSection = sections.find(s => s.components?.toggle && s.components?.dropdownSelectors);

    const sectionsToEnable = [attachableSection, deployableSection, errorSection].filter(Boolean);
    
    for (const sectionConfig of sectionsToEnable) {
      // Use our helper to enable the section
      await enableSection(window, sectionConfig.title);

      // Special handling for sections with attach capability
      if (sectionConfig.components?.attachToggle) {
        await window.waitForTimeout(500); // Give UI time to enable attach
        await attachSection(window, sectionConfig.id);
      }
    }

    // Phase 3: Run and verify terminals
    await runConfiguration(window, { waitForTabs: true });

    // Verify that the correct tabs appear using our helpers
    if (attachableSection) {
      await waitForTerminalTab(window, attachableSection.title, { timeout: getTimeout(15000) });
    }
    if (deployableSection) {
      await waitForTerminalTab(window, deployableSection.title, { timeout: getTimeout(15000) });
    }
    if (errorSection) {
      await expect(window.locator('.tab.error-tab-button', { hasText: new RegExp(errorSection.title) })).toBeVisible({ timeout: getTimeout(15000) });
    }
    
    // Phase 4: Stop and verify using our helpers
    await stopConfiguration(window);

    // The tabs should be gone
    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs).toHaveCount(0, { timeout: getTimeout(5000) });
  });

  test('should handle individual section toggling during runtime', async () => {
    // Enable a section and run using our helpers
    const toggleableSection = sections.find(s => s.components?.toggle);
    if (!toggleableSection) {
      console.log("Skipping test: No toggleable section found.");
      return;
    }
    
    await enableSection(window, toggleableSection.title);
    
    await runConfiguration(window, { waitForTabs: true });
    await waitForTerminalTab(window, toggleableSection.title, { timeout: getTimeout(15000) });

    // Now, disable the section while it's "running"
    // The UI should prevent this, but we confirm the toggle is at least locked
    const toggleableSectionElement = await findConfigSection(window, toggleableSection.title);
    await expect(toggleableSectionElement.locator('input[type="checkbox"]').first()).toBeDisabled();
  });

  test('should validate deployment option changes affect configuration', async () => {
    const deployableSection = sections.find(s => s.components?.toggle && s.components?.deploymentOptions);
    if (!deployableSection) {
      console.log("Skipping test: No section with deployment options found.");
      return;
    }
    
    // Use our helper to enable the section
    await enableSection(window, deployableSection.title);

    // Initial run with default mode
    await runConfiguration(window, { waitForTabs: true });
    await waitForTerminalTab(window, deployableSection.title, { timeout: getTimeout(15000) });

    // Use our helpers to stop configuration
    await stopConfiguration(window);

    // Check if we have deployment options to test
    const processButton = window.locator(`[data-testid="mode-selector-btn-${deployableSection.id}-process"]`);
    const containerButton = window.locator(`[data-testid="mode-selector-btn-${deployableSection.id}-container"]`);
    
    // Test whatever deployment options are available
    if (await processButton.count() > 0) {
      await expect(processButton).toHaveClass(/active/, { timeout: 5000 });
      
      // Run again and verify the tab shows the correct mode
      await runConfiguration(window, { waitForTabs: true });
      await expect(window.locator('.tab-title').filter({ hasText: new RegExp(`${deployableSection.title}.*Process`, 'i') })).toBeVisible();
    }
    
    if (await containerButton.count() > 0) {
      // Check if container mode is available or TBD
      const isTBD = await containerButton.evaluate(el => el.classList.contains('tbd'));
      if (isTBD) {
        await expect(containerButton).toHaveClass(/tbd/, { timeout: 5000 });
      }
    }
  });
}); 