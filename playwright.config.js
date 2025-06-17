// @ts-check
const { devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 * @type {import('@playwright/test').PlaywrightTestConfig}
 */
const config = {
  testDir: './__tests__/e2e',
  /* Only run files with .e2e.spec.js */
  testMatch: /.*\.e2e\.spec\.js/,
  /* Overall timeout for each test file - increased for invisible mode */
  timeout: 90 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 15000
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 0 : 1,
  /* Opt out of parallel tests on CI. */
  // Use 6 workers on CI for faster E2E, unless overridden
  workers: process.env.CI ? 6 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Run tests headlessly (invisible) */
    headless: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Ensure headless mode for all tests */
        headless: true,
      },
      /* Exclude fix-command tests from main project */
      testIgnore: ['**/fix-command.e2e.spec.js'],
    },
    {
      name: 'fix-command-tests',
      use: {
        ...devices['Desktop Chrome'],
        /* Ensure headless mode for all tests */
        headless: true,
      },
      /* Only run fix-command tests in this project */
      testMatch: ['**/fix-command.e2e.spec.js'],
      /* Run fix-command tests with single worker to avoid interference */
      fullyParallel: false,
    },
  ],
};

module.exports = config; 