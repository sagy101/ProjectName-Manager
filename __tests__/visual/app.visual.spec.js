const { test, expect } = require('@playwright/test');
const { launchElectron, getTimeout } = require('../e2e/test-helpers');

// Helper to ensure a verification section is expanded
async function expandGeneralVerification(window) {
  const envHeader = window.locator('.environment-verification-container .verification-header');
  const toggle = envHeader.locator('.toggle-icon');
  const isCollapsed = await toggle.evaluate(el => el.textContent.includes('▶'));
  if (isCollapsed) {
    await toggle.click();
    await window.waitForTimeout(getTimeout(500));
  }
}

test.describe('Visual Regression', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectron();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    await window.waitForSelector('.config-container', { timeout: getTimeout(20000) });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('main app', async () => {
    expect(await window.screenshot()).toMatchSnapshot('main-app.png');
  });

  test('sidebar expanded', async () => {
    const collapseButton = window.locator('.config-collapse-btn');
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    await collapseButton.click();
    await window.waitForTimeout(getTimeout(500));
    expect(await window.screenshot()).toMatchSnapshot('sidebar-expanded.png');
  });

  test('general verification expanded', async () => {
    await expandGeneralVerification(window);
    const container = window.locator('.environment-verification-container');
    expect(await container.screenshot()).toMatchSnapshot('general-verification-expanded.png');
  });

  test('stopping status screen', async () => {
    const mirrorSection = window.locator('h2:has-text("Mirror + MariaDB")').locator('..').locator('..');
    const toggle = mirrorSection.locator('input[type="checkbox"]').first();
    await toggle.click();
    await window.waitForTimeout(500);
    const attachToggle = mirrorSection.locator('#attach-mirror');
    await attachToggle.click();
    const runOptionSelector = `[data-testid="mode-selector-btn-mirror-run"]`;
    await window.waitForSelector(runOptionSelector);
    await window.click(runOptionSelector);

    const runButton = window.locator('#run-configuration-button');
    await runButton.click();
    await expect(window.locator('.tab').first()).toBeVisible({ timeout: getTimeout(10000) });

    await runButton.click();
    const overlay = window.locator('.stopping-status-overlay');
    await expect(overlay).toBeVisible({ timeout: getTimeout(5000) });
    expect(await overlay.screenshot()).toMatchSnapshot('stopping-status-screen.png');

    const closeBtn = overlay.locator('button.close-button');
    await closeBtn.waitFor({ state: 'visible', timeout: getTimeout(30000) });
    await closeBtn.click();
    await expect(overlay).not.toBeVisible({ timeout: getTimeout(5000) });
  });

  test('health report screen', async () => {
    const expandButton = window.locator('[title="Expand Sidebar"]');
    await expandButton.click();
    const healthReportButton = window.locator('[data-testid="health-report-button"]');
    await healthReportButton.click();
    await expect(window.locator('.health-report-container')).toBeVisible({ timeout: getTimeout(10000) });
    expect(await window.screenshot()).toMatchSnapshot('health-report-screen.png');
  });

  test('floating terminal', async () => {
    await expandGeneralVerification(window);
    const fixButton = window.locator('.fix-button').first();
    await fixButton.click();
    const confirm = window.locator('.confirm-button');
    await confirm.click();
    const terminal = window.locator('.floating-terminal-window').first();
    await expect(terminal).toBeVisible({ timeout: getTimeout(10000) });
    expect(await terminal.screenshot()).toMatchSnapshot('floating-terminal.png');
  });

  test('tab info panel', async () => {
    // ensure terminal from previous test exists
    const infoButton = window.locator('.tab-info-button').first();
    await infoButton.click();
    const panel = window.locator('.tab-info-panel');
    await expect(panel).toBeVisible({ timeout: getTimeout(10000) });
    expect(await panel.screenshot()).toMatchSnapshot('tab-info.png');
  });

  test('tab info more details', async () => {
    const panel = window.locator('.tab-info-panel');
    const moreDetails = panel.locator('button', { hasText: 'More Details' });
    await moreDetails.click();
    const popup = window.locator('.command-popup');
    await expect(popup).toBeVisible({ timeout: getTimeout(10000) });
    expect(await popup.screenshot()).toMatchSnapshot('tab-info-more-details.png');
  });
});
