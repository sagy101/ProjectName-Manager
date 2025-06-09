const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test('App starts and has correct title', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow({ timeout: 60000 });
  await window.waitForSelector('h1');
  const title = await window.title();
  expect(title).toBe('ISO Manager');
  await electronApp.close();
}); 