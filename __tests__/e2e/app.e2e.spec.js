const { launchElectron, getTimeout } = require('./test-helpers');
const { test, expect } = require('@playwright/test');
const { settings } = require('../../src/project-config/config/configurationSidebarSections.json');

const isMock = process.env.E2E_ENV === 'mock';
const sectionsConfig = isMock
  ? require('../mock-data/mockConfigurationSidebarSections.json')
  : require('../../src/project-config/config/configurationSidebarSections.json');

const expectedTitle = `${sectionsConfig.settings.projectName} Manager`;

test('App starts and has correct title', async () => {
  const { electronApp, window } = await launchElectron();
  
  await window.waitForSelector('h1', { timeout: getTimeout(10000) });
  const title = await window.title();
  expect(title).toBe(expectedTitle);
  await electronApp.close();
}); 