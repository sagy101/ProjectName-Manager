const { test, expect } = require('@playwright/test');
const { launchElectronInvisibly } = require('./test-helpers');

test('App starts and has correct title', async () => {
  const { electronApp, window } = await launchElectronInvisibly();
  
  await window.waitForSelector('h1');
  const title = await window.title();
  expect(title).toBe('ISO Manager');
  await electronApp.close();
}); 