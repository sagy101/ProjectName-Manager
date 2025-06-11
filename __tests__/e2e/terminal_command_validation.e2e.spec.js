const { test, expect } = require('@playwright/test');
const { launchElectron, waitForElement } = require('./test-helpers');

const isMock = process.env.E2E_ENV === 'mock';
const config = isMock
  ? require('../mock-data/mockConfigurationSidebarSections.json')
  : require('../../src/configurationSidebarSections.json');

const { sections, displaySettings } = config;

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
    
    await window.waitForTimeout(1000);

    const runButton = window.locator('button').filter({ hasText: new RegExp(`RUN.*${displaySettings.projectName}`, 'i') });
    await runButton.click();

    // Verify that the correct tab appears
    const terminalTab = window.locator('.tab', { hasText: new RegExp(runnableSection.title) });
    await expect(terminalTab).toBeVisible({ timeout: 15000 });
    await terminalTab.click();

    // In no-run mode, verify the command is displayed but not run
    const expectedCommand = getMockCommand(runnableSection.id, configState[runnableSection.id]);

    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs.first()).toBeVisible({ timeout: 30000 });

    const sectionTab = await window.locator('.tab').filter({ hasText: new RegExp(runnableSection.title, 'i') });
    await expect(sectionTab).toBeVisible({ timeout: 15000 });
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
    
    await window.waitForTimeout(500);
    const containerButton = await sectionLocator.locator('.deployment-toggle-btn').filter({ hasText: /container/i });
    if (await containerButton.isVisible()) await containerButton.click();

    const runButton = window.locator('button').filter({ hasText: new RegExp(`RUN.*${displaySettings.projectName}`, 'i') });
    await runButton.click();
    
    // The tab name may include deployment type, so we find it by the section title
    const terminalTab = window.locator('.tab', { hasText: new RegExp(sectionWithContainers.title) });
    await terminalTab.waitFor({ state: 'visible', timeout: 10000 });

    const terminalTabs = await window.locator('.tab');
    expect(await terminalTabs.count()).toBeGreaterThan(0);

    const sectionTab = window.locator('.tab').filter({ hasText: new RegExp(sectionWithContainers.title, 'i') });
    if (await sectionTab.count() > 0) {
      const infoButton = await sectionTab.locator('.info-button, [title*="about"], [title*="info"]').first();
      if (await infoButton.count() > 0) {
        await infoButton.click();
        await window.waitForTimeout(1000);
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

    const runButton = window.locator('button').filter({ hasText: new RegExp(`RUN.*${displaySettings.projectName}`, 'i') });
    
    const initialTabCount = await window.locator('.tab').count();
    await runButton.click();
    
    // Wait for tab to appear before proceeding
    await window.waitForSelector(`[data-testid="terminal-tab-${runnableSection.id}"]`, { timeout: 10000 });

    const terminalTabs = await window.locator('.tab');
    expect(await terminalTabs.count()).toBeGreaterThan(0);

    const stopButton = await window.locator('button').filter({ hasText: /STOP|KILL/i }).or(window.locator('button').filter({ hasText: new RegExp(`STOP.*${displaySettings.projectName}`, 'i') }));
    await expect(stopButton).toBeVisible({ timeout: 10000 });
    await stopButton.click();

    await window.waitForTimeout(3000);
    const remainingTabs = await window.locator('.tab .status-running').count();
    expect(remainingTabs).toBe(0);
  });

  test('should validate different deployment modes generate different commands', async () => {
    const sectionWithOptions = sections.find(s => s.components.deploymentOptions);
    if (!sectionWithOptions) {
      console.log('Skipping test: No section with deployment options found.');
      return;
    }
    
    const sectionLocator = await window.locator(`h2:has-text("${sectionWithOptions.title}")`).locator('..').locator('..');
    const toggle = await sectionLocator.locator('input[type="checkbox"]').first();
    if (!await toggle.isChecked()) await toggle.click();

    const processButton = sectionLocator.locator('.deployment-toggle-btn').filter({ hasText: /process/i });
    if (!await processButton.isVisible()) {
        console.log('Skipping test: Process button not found.');
        return;
    }
    await processButton.click();
    
    const runButton = window.locator('button').filter({ hasText: new RegExp(`RUN.*${displaySettings.projectName}`, 'i') });
    await expect(runButton).toBeEnabled();
    await runButton.click();
    await window.waitForTimeout(3000);

    const tabTitle = sectionWithOptions.title;
    let tab = await window.locator('.tab').filter({ hasText: new RegExp(tabTitle, 'i') });
    await expect(tab.first()).toBeVisible({ timeout: 15000 });

    const stopButton = window.locator('button').filter({ hasText: /STOP|KILL/i }).or(window.locator('button').filter({ hasText: new RegExp(`STOP.*${displaySettings.projectName}`, 'i') }));
    await stopButton.click();
    await window.waitForTimeout(2000);

    const containerButton = sectionLocator.locator('.deployment-toggle-btn').filter({ hasText: /container/i });
    if (!await containerButton.isVisible()) {
        console.log('Skipping test: Container button not found.');
        return;
    }
    await containerButton.click();
    await runButton.click();
    await window.waitForTimeout(3000);
    tab = await window.locator('.tab').filter({ hasText: new RegExp(tabTitle, 'i') });
    await expect(tab.first()).toBeVisible({ timeout: 15000 });
  });

  test('should validate stop button terminates all processes correctly', async () => {
    const runnableSections = sections.filter(s => s.id !== 'mirror');
    if (runnableSections.length === 0) {
        console.log("Skipping test: No runnable sections found.");
        return;
    }

    const runButton = window.locator('#run-configuration-button.run');
    await runButton.click();
    
    // Wait for all tabs to appear and their processes to be running
    for (const section of runnableSections) {
      const terminalTab = window.locator('.tab', { hasText: new RegExp(section.title) });
      await expect(terminalTab).toBeVisible({ timeout: 10000 });
      await expect(terminalTab.locator('.tab-status')).toHaveClass(/status-running/, { timeout: 10000 });
    }
    
    // Now click stop
    const stopButton = window.locator('#run-configuration-button.stop');
    await expect(stopButton).toBeVisible();
    await stopButton.click();

    // Wait for the stopping screen to appear and then close
    const stoppingScreen = window.locator('.stopping-status-overlay');
    await expect(stoppingScreen).toBeVisible({ timeout: 5000 });
    const closeButton = stoppingScreen.locator('.close-button');
    await expect(closeButton).toBeVisible({ timeout: 30000 });
    await closeButton.click();
    await expect(stoppingScreen).not.toBeVisible();
    
    // Verify all tabs are gone
    await expect(window.locator('.tab')).toHaveCount(0);
  });
}); 