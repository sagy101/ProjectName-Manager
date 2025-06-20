const { test, expect } = require('@playwright/test');
const { 
  launchElectron, 
  waitForElement, 
  getTimeout,
  // New consolidated helpers
  findConfigSection,
  enableSection,
  disableSection,
  isSectionEnabled,
  toggleSection
} = require('./test-helpers/index.js');

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
      // Use helper to find section instead of hardcoded selector
      const sectionElement = await findConfigSection(window, section.title);
      await expect(sectionElement).toBeVisible();
    }
  });

  test('should allow toggling configuration sections', async () => {
    const firstSection = sections[0];
    
    // Get initial state using our helper
    const initialState = await isSectionEnabled(window, firstSection.title);
    
    // Toggle the section using our helper
    await toggleSection(window, firstSection.title, !initialState);
    
    // Verify the state changed
    const newState = await isSectionEnabled(window, firstSection.title);
    expect(newState).toBe(!initialState);
  });

  test('should allow enabling and disabling sections', async () => {
    const sectionWithToggle = sections.find(s => s.components.toggle);
    expect(sectionWithToggle, 'Test requires a section with a toggle').toBeDefined();

    // Use our helpers to disable and enable the section
    await disableSection(window, sectionWithToggle.title);
    
    // Verify the section is disabled
    expect(await isSectionEnabled(window, sectionWithToggle.title)).toBe(false);
    
    // Use our helper to enable the section
    await enableSection(window, sectionWithToggle.title);
    
    // Verify the section is enabled
    expect(await isSectionEnabled(window, sectionWithToggle.title)).toBe(true);
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

    // Use our helper to enable the parent section
    await enableSection(window, parentSection.title);

    // Verify the section is enabled
    expect(await isSectionEnabled(window, parentSection.title)).toBe(true);

    // Now, verify that the subsection is visible
    const subSection = parentSection.components.subSections[0];
    // Use a more flexible selector for subsections instead of hardcoded h4
    const subSectionLocator = window.locator(`text="${subSection.title}"`);
    await expect(subSectionLocator).toBeVisible({ timeout: getTimeout(10000) });
  });
}); 