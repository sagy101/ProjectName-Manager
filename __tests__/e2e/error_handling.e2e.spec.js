// @ts-check
const { test, expect } = require('@playwright/test');
const {
  enableSidebarSection,
  runSidebarSection, // Assumes this helper enables and clicks run
  enableSidebarSection,
  runSidebarSection,
  getSidebarSection,
  // TODO: Add other helpers as needed, e.g. openAppControlSidebarSection
} = require('../test-helpers');

// Selectors - More specific where possible
const CONFIG_SECTION_SELECTOR = (id) => `#section-${id}`; // Main container for a sidebar section
const SECTION_ERROR_INDICATOR_SELECTOR = '.section-error-indicator'; // Visual error on section (e.g. in info panel or border)
const SECTION_RUN_BUTTON_SELECTOR = (sectionId) => `${CONFIG_SECTION_SELECTOR(sectionId)} .run-button-class`; // Placeholder if run button is per section
const GLOBAL_RUN_BUTTON_SELECTOR = 'button#run-configuration-button'; // Global run button
const NOTIFICATION_AREA_SELECTOR = '.notifications-container'; // Main notification area
const NOTIFICATION_MESSAGE_SELECTOR = '.notification-item .message-content'; // Specific message part of a notification
const MAIN_TERMINAL_TAB_SELECTOR = '.main-terminal-tab';
const XTERM_ROWS_SELECTOR = '.xterm-rows';
const DROPDOWN_SELECTOR = (dropdownId) => `${CONFIG_SECTION_SELECTOR(E2E_REQ_DROPDOWN_SECTION_ID)} select#${dropdownId}`; // Dropdown within its section
const APP_CONTROL_SIDEBAR_NO_RUN_MODE_TOGGLE_SELECTOR = 'input#debug-no-run-mode';


// E2E src/ Configuration Constants
const E2E_FAILING_VERIFY_SECTION_ID = 'e2e-failing-verify';
// const E2E_FAILING_VERIFY_COMMAND_ID = 'e2e-failing-verify'; // Command ID is same as section ID

const E2E_MISSING_COMMAND_SECTION_ID = 'e2e-missing-command';

const E2E_REQ_DROPDOWN_SECTION_ID = 'e2e-req-dropdown';
// const E2E_REQ_DROPDOWN_COMMAND_ID = 'e2e-req-dropdown'; // Command ID is same as section ID
const E2E_REQ_DROPDOWN_DROPDOWN_ID = 'e2eRequiredDropdown';
const E2E_REQ_DROPDOWN_TERMINAL_TITLE = 'E2EReqDropdownRun';
const E2E_REQ_DROPDOWN_OPTION_A_LABEL = 'OptionA'; // From echo "OptionA\nOptionB"
const E2E_REQ_DROPDOWN_EXPECTED_OUTPUT = `Dropdown selected: ${E2E_REQ_DROPDOWN_OPTION_A_LABEL}`;


test.describe('Error Handling E2E Tests (src config)', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');

    // Open App Control Sidebar, then Debug Tools, then Show Test Sections
    await page.locator('button[title="Expand Sidebar"]').click();
    await page.locator('button[title*="Debug Tools"]').click();

    const showTestsButton = page.locator('button:has-text("Show Test Sections")');
    if (await showTestsButton.isVisible()) {
      await showTestsButton.click();
    }
    await expect(page.locator('button:has-text("Hide Test Sections")')).toBeVisible();
    // Verify one of the test sections is now visible
    await expect(page.locator(CONFIG_SECTION_SELECTOR(E2E_FAILING_VERIFY_SECTION_ID))).toBeVisible();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    // Ensure "No Run Mode" is OFF
    const noRunModeToggle = page.locator(APP_CONTROL_SIDEBAR_NO_RUN_MODE_TOGGLE_SELECTOR);
    if (await noRunModeToggle.count() > 0 && await noRunModeToggle.isChecked()) {
        await page.locator('button[title="Expand Sidebar"]').click();
        await page.locator('button[title*="Debug Tools"]').click();
        await noRunModeToggle.uncheck();
    }
    // Close any existing notifications or tabs
    const closeNotificationButtons = await page.locator(`${NOTIFICATION_AREA_SELECTOR} .close-button`); // Assuming notifications have close buttons
    for (let i = 0; i < await closeNotificationButtons.count(); i++) {
      await closeNotificationButtons.nth(i).click();
    }
    const openTabs = await page.locator(`${MAIN_TERMINAL_TAB_SELECTOR} .tab-close-button`).count();
    for (let i = 0; i < openTabs; i++) {
      await page.locator(`${MAIN_TERMINAL_TAB_SELECTOR} .tab-close-button`).first().click();
    }
  });

  test('1. Handling Failing Environment Verifications', async () => {
    const sectionElement = page.locator(CONFIG_SECTION_SELECTOR(E2E_FAILING_VERIFY_SECTION_ID));
    await enableSidebarSection(page, E2E_FAILING_VERIFY_SECTION_ID);

    // Verify UI indicates verification failure. This might be an icon in the section header, or in an info panel for the section.
    // For this example, let's assume an error indicator becomes visible within the section's info panel (if one were opened)
    // or directly on the section. A more robust selector is needed based on actual UI.
    // Here, we'll check for a general error indicator on the section itself.
    await expect(sectionElement.locator(SECTION_ERROR_INDICATOR_SELECTOR)).toBeVisible({timeout: 5000}); // Give time for verification to run

    // Check state of the global "RUN" button.
    // It might be disabled, or clicking it might show an error for the specific section.
    const runButton = page.locator(GLOBAL_RUN_BUTTON_SELECTOR);

    // Option 1: Global run button is disabled if any enabled section has verification errors.
    // await expect(runButton).toBeDisabled();
    // OR Option 2: Clicking it shows an error / does not run the failing section.
    // This test assumes the run button might still be enabled globally, but the specific section won't run.
    await runButton.click();

    const notification = page.locator(NOTIFICATION_AREA_SELECTOR);
    await expect(notification).toBeVisible();
    // Check for a general message or one specific to the section
    await expect(notification.locator(NOTIFICATION_MESSAGE_SELECTOR)).toContainText(/verification failed for E2E Failing Verification Test/i, {timeout: 2000});

    await expect(page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}:has-text("E2EFailVerify")`)).toHaveCount(0);
  });

  test('2. Handling Missing Command Configuration', async () => {
    await enableSidebarSection(page, E2E_MISSING_COMMAND_SECTION_ID);

    const runButton = page.locator(GLOBAL_RUN_BUTTON_SELECTOR);
    await runButton.click();

    const notification = page.locator(NOTIFICATION_AREA_SELECTOR);
    await expect(notification).toBeVisible();
    await expect(notification.locator(NOTIFICATION_MESSAGE_SELECTOR)).toContainText(/Command not found for section E2E Missing Command Test/i, {timeout: 2000});

    await expect(page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}`)).toHaveCount(0); // No tab should open
  });

  test('3. Handling Command Dependency on Unselected Dropdown', async () => {
    await enableSidebarSection(page, E2E_REQ_DROPDOWN_SECTION_ID);
    const runButton = page.locator(GLOBAL_RUN_BUTTON_SELECTOR);

    // Check state of the global "RUN" button - should be disabled or prevent running this specific section
    // if 'isRequired' is enforced by disabling the run button for the section or globally.
    // More robustly, the application should prevent this section from running if the dropdown is not selected.
    // Let's assume the run button is globally enabled, but the section won't proceed.
    await expect(runButton).toBeEnabled(); // Global button might still be enabled

    // Try to run - expect error or no action for this section
    await runButton.click();
    let notification = page.locator(NOTIFICATION_AREA_SELECTOR);
    await expect(notification).toBeVisible();
    // Expect a notification about the missing required dropdown for "E2E Required Dropdown Test"
    await expect(notification.locator(NOTIFICATION_MESSAGE_SELECTOR)).toContainText(/E2E Required Dropdown Test: Missing required selection for e2eRequiredDropdown/i, {timeout: 2000});
    await expect(page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}:has-text("${E2E_REQ_DROPDOWN_TERMINAL_TITLE}")`)).toHaveCount(0);

    // Close notification if possible
     const closeNotificationButtons = await page.locator(`${NOTIFICATION_AREA_SELECTOR} .close-button`);
    if(await closeNotificationButtons.count() > 0) await closeNotificationButtons.first().click();


    // Select a value for the dropdown
    const dropdown = page.locator(DROPDOWN_SELECTOR(E2E_REQ_DROPDOWN_DROPDOWN_ID));
    await dropdown.selectOption({ label: E2E_REQ_DROPDOWN_OPTION_A_LABEL });

    // Verify the RUN button is enabled (it was already, but now the condition for the section should pass)
    await expect(runButton).toBeEnabled();

    // Run and verify it works now
    await runButton.click();
    const mainTab = page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}:has-text("${E2E_REQ_DROPDOWN_TERMINAL_TITLE}")`);
    await expect(mainTab).toBeVisible({ timeout: 10000 });
    const terminalContent = mainTab.locator(XTERM_ROWS_SELECTOR);
    await expect(terminalContent).toContainText(E2E_REQ_DROPDOWN_EXPECTED_OUTPUT, { timeout: 10000 });

    // Close the tab
    if (await mainTab.isVisible()) await mainTab.locator('.tab-close-button').click();
  });
});
