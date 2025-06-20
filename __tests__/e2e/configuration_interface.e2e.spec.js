const { test, expect } = require('@playwright/test');
const { launchElectron, waitForElement, getTimeout } = require('./test-helpers');

const isMock = process.env.E2E_ENV === 'mock';
const config = isMock
  ? require('../mock-data/mockConfigurationSidebarSections.json')
  : require('../../src/project-config/config/configurationSidebarSections.json');

const { sections, settings } = config;

test.describe('Configuration Interface', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectron();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    // Wait for the main configuration interface to load
    await window.waitForSelector('.config-container');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should display main configuration sections', async () => {
    for (const section of sections) {
      if (section.testSection && !isMock) continue;
      await expect(window.locator(`h2:has-text("${section.title}")`)).toBeVisible();
    }
  });

  test('should allow toggling configuration sections', async () => {
    const firstSection = sections[0];
    const sectionLocator = await window.locator(`h2:has-text("${firstSection.title}")`).locator('..').locator('..');
    const toggleCheckbox = await sectionLocator.locator('input[type="checkbox"]').first();
    
    const initialChecked = await toggleCheckbox.isChecked();
    await toggleCheckbox.click();
    expect(await toggleCheckbox.isChecked()).toBe(!initialChecked);
  });

  test('should allow enabling and disabling sections', async () => {
    const sectionWithToggle = sections.find(s => s.components.toggle);
    expect(sectionWithToggle, 'Test requires a section with a toggle').toBeDefined();

    const sectionLocator = await window.locator(`h2:has-text("${sectionWithToggle.title}")`).locator('..').locator('..');
    const toggleCheckbox = await sectionLocator.locator('input[type="checkbox"]').first();
    
    if (await toggleCheckbox.isChecked()) {
      await toggleCheckbox.click();
    }
    await expect(toggleCheckbox).not.toBeChecked();
    
    await toggleCheckbox.click();
    await expect(toggleCheckbox).toBeChecked();
  });

  test('should display environment verification section', async () => {
    const verificationElements = await window.locator('[class*="verification"], [class*="environment"]');
    await expect(verificationElements.first()).toBeVisible();
  });

  test('should show RUN button in correct initial state', async () => {
    const runButton = await window.locator('button').filter({ hasText: new RegExp(`RUN.*${settings.projectName}`, 'i') });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeDisabled();
  });

  test('should show information buttons for sections', async () => {
    const infoButtons = await window.locator('[data-verification-btn="true"]');
    await expect(infoButtons.first()).toBeVisible();
  });

  test('should show subsections when parent section is enabled', async () => {
    const parentSection = sections.find(s => s.components.subSections && s.components.subSections.length > 0);
    expect(parentSection, 'Test requires a section with subsections').toBeDefined();

    const sectionLocator = window.locator(`h2:has-text("${parentSection.title}")`).locator('..').locator('..');
    const toggleCheckbox = sectionLocator.locator('input[type="checkbox"]').first();

    // Ensure the section is enabled
    if (!await toggleCheckbox.isChecked()) {
      await toggleCheckbox.click();
    }
    await expect(toggleCheckbox).toBeChecked();

    // Now, verify that the subsection is visible
    const subSection = parentSection.components.subSections[0];
    const subSectionLocator = window.locator(`h4:has-text("${subSection.title}")`);
    await expect(subSectionLocator).toBeVisible({ timeout: getTimeout(10000) });
  });
}); 