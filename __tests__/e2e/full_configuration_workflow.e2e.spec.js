const { test, expect } = require('@playwright/test');
const { launchElectron, waitForElement, getTimeout } = require('./test-helpers');

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
    const gcloudDropdownContainer = window.locator('.environment-header');
    const gcloudDropdown = gcloudDropdownContainer.locator('.dropdown-selector');

    // Click to open the dropdown
    await gcloudDropdown.click();

    // Wait for the options list to be visible, then click the first item
    const dropdownList = window.locator('.dropdown-item-list');
    await dropdownList.waitFor({ state: 'visible', timeout: getTimeout(15000) });
    await dropdownList.locator('.dropdown-item').first().click();

    // Verify a selection was made
    await expect(gcloudDropdown.locator('.selected-value')).not.toHaveText('Select project...', { timeout: getTimeout(5000) });

    // Phase 2: Enable and configure sections
    const sectionsToEnable = ['mirror', 'gopm', 'url-intelligence'];
    for (const sectionId of sectionsToEnable) {
      const sectionConfig = sections.find(s => s.id === sectionId);
      const sectionLocator = window.locator(`h2:has-text("${sectionConfig.title}")`).locator('..').locator('..');
      
      const mainToggle = sectionLocator.locator('input[type="checkbox"]').first();
      await mainToggle.check();
      await expect(mainToggle).toBeChecked();

      // Special handling for the 'mirror' section to click 'attach'
      if (sectionId === 'mirror') {
        await window.waitForTimeout(500); // Give UI time to enable attach
        const attachToggle = sectionLocator.locator('#attach-mirror');
        await attachToggle.click();
        await expect(attachToggle).toHaveClass(/attached/);
      }
    }

    // Phase 3: Run and verify terminals
    const runButton = window.locator('#run-configuration-button');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // Verify that the correct tabs appear
    await expect(window.locator('.tab', { hasText: /Mirror \+ MariaDB/ })).toBeVisible({ timeout: getTimeout(15000) });
    await expect(window.locator('.tab', { hasText: /gopm \(Process\)/ })).toBeVisible({ timeout: getTimeout(15000) });
    await expect(window.locator('.tab.error-tab-button', { hasText: /URL Intelligence \+ TI \(Cloud\)/ })).toBeVisible({ timeout: getTimeout(15000) });
    
    // Phase 4: Stop and verify
    const stopButton = window.locator('#run-configuration-button.stop');
    await expect(stopButton).toBeVisible();
    await stopButton.click();

    // Log overlay state before waiting for it to disappear
    const stoppingScreen = window.locator('.stopping-status-overlay');

    await expect(stoppingScreen).toBeVisible({ timeout: getTimeout(5000) });
    // Wait for the Close button to appear (when isComplete is true)
    const closeButton = stoppingScreen.locator('button.close-button');
    await expect(closeButton).toBeVisible({ timeout: getTimeout(30000) });
    await closeButton.click();

    await expect(stoppingScreen).not.toBeVisible({ timeout: getTimeout(5000) });

    // The tabs should be gone
    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs).toHaveCount(0, { timeout: getTimeout(5000) });
  });

  test('should handle individual section toggling during runtime', async () => {
    // Enable a section and run
    const gopmSection = sections.find(s => s.id === 'gopm');
    const gopmLocator = window.locator(`h2:has-text("${gopmSection.title}")`).locator('..').locator('..');
    await gopmLocator.locator('input[type="checkbox"]').first().check();
    
    await window.locator('#run-configuration-button').click();
    await expect(window.locator('.tab', { hasText: /gopm/i })).toBeVisible();

    // Now, disable the section while it's "running"
    // The UI should prevent this, but we confirm the toggle is at least locked
    await expect(gopmLocator.locator('input[type="checkbox"]').first()).toBeDisabled();
  });

  test('should validate deployment option changes affect configuration', async () => {
    const gopmSection = sections.find(s => s.id === 'gopm');
    const gopmLocator = window.locator(`h2:has-text("${gopmSection.title}")`).locator('..').locator('..');
    await gopmLocator.locator('input[type="checkbox"]').first().check();

    // Initial run with default (process, since container is TBD)
    await window.locator('#run-configuration-button').click();
    const gopmTab = window.locator('.tab', { hasText: /gopm \(Process\)/i });
    await expect(gopmTab).toBeVisible({ timeout: getTimeout(15000) });

    await window.locator('#run-configuration-button.stop').click();
    
    // Wait for stopping screen to appear and complete
    const stoppingScreen = window.locator('.stopping-status-overlay');
    await expect(stoppingScreen).toBeVisible({ timeout: getTimeout(5000) });

    // Wait for the screen to disappear on its own once processes are stopped
    const closeButton2 = stoppingScreen.locator('button.close-button');
    await expect(closeButton2).toBeVisible({ timeout: getTimeout(15000) });
    await closeButton2.click();
    await expect(stoppingScreen).not.toBeVisible({ timeout: getTimeout(5000) });

    // Since container is TBD, we can't test switching to it. 
    // Instead, verify that the process button is already selected (as it's the default)
    const processButton = window.locator('[data-testid="mode-selector-btn-gopm-process"]');
    await expect(processButton).toHaveClass(/active/, { timeout: 5000 });

    // Verify container button is disabled/TBD
    const containerButton = window.locator('[data-testid="mode-selector-btn-gopm-container"]');
    await expect(containerButton).toHaveClass(/tbd/, { timeout: 5000 });

    // Run again and verify the tab name is still process
    await window.locator('#run-configuration-button').click();
    await expect(window.locator('.tab-title').filter({ hasText: /gopm \(Process\)/i })).toBeVisible();
  });
}); 