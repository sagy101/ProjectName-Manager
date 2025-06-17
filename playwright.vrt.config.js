const base = require('./playwright.config');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  ...base,
  testDir: './__tests__/visual',
  testMatch: /.*\.visual\.spec\.js/,
};
