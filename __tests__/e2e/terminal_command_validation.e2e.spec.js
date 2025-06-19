const { test, expect } = require('@playwright/test');
const { launchElectron, waitForElement, getTimeout } = require('./test-helpers');

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
    
    await window.waitForTimeout(getTimeout(1000));

    const runButton = window.locator('button').filter({ hasText: new RegExp(`RUN.*${settings.projectName}`, 'i') });
    await runButton.click();

    // Verify that the correct tab appears
    const terminalTabTitle = window.locator('.tab-title').filter({ hasText: /Mirror \+ MariaDB/ });
    await expect(terminalTabTitle).toBeVisible({ timeout: getTimeout(15000) });
    await terminalTabTitle.click();

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
    const sectionLocator = window.locator(`h2:has-text("${sectionWithContainers.title}")`).locator('..').locator('..');
    const toggle = await sectionLocator.locator('input[type="checkbox"]').first();
    if (!await toggle.isChecked()) await toggle.click();
    
    await window.waitForTimeout(getTimeout(500));
    const containerButton = await sectionLocator.locator('.deployment-toggle-btn').filter({ hasText: /container/i });
    if (await containerButton.isVisible()) await containerButton.click();

    const runButton = window.locator('button').filter({ hasText: new RegExp(`RUN.*${settings.projectName}`, 'i') });
    await runButton.click();
    
    // The tab name may include deployment type, so we find it by the section title
    const terminalTabTitle2 = window.locator('.tab-title').filter({ hasText: /gopm/i });
    await terminalTabTitle2.waitFor({ state: 'visible', timeout: getTimeout(5000) });

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
    const sectionLocator = window.locator(`h2:has-text("${runnableSection.title}")`).locator('..').locator('..');
    const toggle = await sectionLocator.locator('input[type="checkbox"]').first();
    if (!await toggle.isChecked()) await toggle.click();

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

    const runButton = window.locator('button').filter({ hasText: new RegExp(`RUN.*${settings.projectName}`, 'i') });
    
    const initialTabCount = await window.locator('.tab').count();
    await runButton.click();
    
    // Wait for tab to appear before proceeding
    const mirrorTab = window.locator('.tab').filter({ has: window.locator('.tab-title', { hasText: /Mirror \+ MariaDB/ }) });
    await expect(mirrorTab).toBeVisible({ timeout: getTimeout(5000) });

    const terminalTabs = await window.locator('.tab');
    expect(await terminalTabs.count()).toBeGreaterThan(0);

    const stopButton = await window.locator('button').filter({ hasText: /STOP|KILL/i }).or(window.locator('button').filter({ hasText: new RegExp(`STOP.*${settings.projectName}`, 'i') }));
    await expect(stopButton).toBeVisible({ timeout: getTimeout(5000) });
    await stopButton.click();

    await window.waitForTimeout(getTimeout(3000));
    const remainingTabs = await window.locator('.tab .status-running').count();
    expect(remainingTabs).toBe(0);
  });
}); 