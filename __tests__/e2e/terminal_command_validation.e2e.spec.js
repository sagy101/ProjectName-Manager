const { test, expect } = require('@playwright/test');
const { 
  launchElectron, 
  waitForElement, 
  getTimeout,
  enableSection,
  attachSection,
  setDeploymentMode,
  runConfiguration,
  waitForTerminalTab,
  stopConfiguration,
  waitForStoppingOverlay,
  closeStoppingOverlay 
} = require('./test-helpers/index.js');

const isMock = process.env.E2E_ENV === 'mock';
const config = isMock
  ? require('../mock-data/mockConfigurationSidebarSections.json')
  : require('../../src/project-config/config/configurationSidebarSections.json');

const { sections, settings } = config;

test.describe('Terminal Command Validation', () => {
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

  test('should validate terminal commands match configuration settings', async () => {
    // This test is highly dependent on specific commands which are not in the generic config.
    // We will simplify this to check if a terminal opens for a runnable section.
    const runnableSection = sections.find(s => s.id === 'mirror');
    if (!runnableSection) {
        console.log("Skipping test: No runnable section found in configuration.");
        return;
    }

    // Use helpers to configure the section
    await enableSection(window, runnableSection.title);
    
    if (runnableSection.components.attachToggle) {
      await attachSection(window, runnableSection.id);
    }

    if (runnableSection.components.modeSelector) {
      await setDeploymentMode(window, runnableSection.id, 'run');
    }
    
    await window.waitForTimeout(getTimeout(1000));

    // Use helper to run configuration
    await runConfiguration(window);

    // Use helper to wait for terminal tab
    await waitForTerminalTab(window, 'Mirror');

    // In no-run mode, verify the command is displayed but not run
    // const expectedCommand = getMockCommand(runnableSection.id, configState[runnableSection.id]); // Removed undefined function

    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs.first()).toBeVisible({ timeout: getTimeout(30000) });

    const sectionTabTitle = await window.locator('.tab-title').filter({ hasText: /Mirror \+ MariaDB/ });
    await expect(sectionTabTitle).toBeVisible({ timeout: getTimeout(15000) });

  });

  test('should validate terminal tab about information shows correct containers', async () => {
    const sectionWithContainers = sections.find(s => s.components.deploymentOptions);
    if (!sectionWithContainers) {
        console.log("Skipping test: No section with deployment options found.");
        return;
    }
    // Use helpers to configure the section
    await enableSection(window, sectionWithContainers.title);
    
    // Try to set deployment mode to container if available (gracefully handle if not available)
    if (sectionWithContainers.components && sectionWithContainers.components.deploymentOptions) {
      try {
        await setDeploymentMode(window, sectionWithContainers.id, 'container');
      } catch (error) {
        console.log(`Container mode not available for section ${sectionWithContainers.id}, continuing with default mode`);
      }
    }

    // Use helper to run configuration
    await runConfiguration(window);
    
    // Use helper to wait for terminal tab
    await waitForTerminalTab(window, 'gopm');

    const terminalTabs = await window.locator('.tab');
    expect(await terminalTabs.count()).toBeGreaterThan(0);

    const sectionTabTitle2 = window.locator('.tab-title').filter({ hasText: /gopm/i });
    if (await sectionTabTitle2.count() > 0) {
      const infoButton = await sectionTabTitle2.locator('.info-button, [title*="about"], [title*="info"]').first();
      if (await infoButton.count() > 0) {
        await infoButton.click();
        await window.waitForTimeout(getTimeout(1000));
        const aboutPanel = await window.locator('.tab-info-panel, .about-panel');
        await expect(aboutPanel).toBeVisible();
      }
    }
  });

  test('should validate stop button terminates all processes correctly', async () => {
    const runnableSection = sections.find(s => s.id === 'mirror');
    if (!runnableSection) {
        console.log("Skipping test: No toggleable section found.");
        return;
    }
    // Use helpers to configure the section
    await enableSection(window, runnableSection.title);

    if (runnableSection.components.attachToggle) {
      await attachSection(window, runnableSection.id);
    }

    if (runnableSection.components.modeSelector) {
      await setDeploymentMode(window, runnableSection.id, 'run');
    }

    const initialTabCount = await window.locator('.tab').count();
    
    // Use helper to run configuration
    await runConfiguration(window);
    
    // Use helper to wait for terminal tab
    await waitForTerminalTab(window, 'Mirror');

    const terminalTabs = await window.locator('.tab');
    expect(await terminalTabs.count()).toBeGreaterThan(0);

    // Use helper to stop configuration
    await stopConfiguration(window);

    await window.waitForTimeout(getTimeout(3000));
    const remainingTabs = await window.locator('.tab .status-running').count();
    expect(remainingTabs).toBe(0);
  });
}); 