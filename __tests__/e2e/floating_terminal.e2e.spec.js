// @ts-check
const { test, expect } = require('@playwright/test');
const {
  enableExperiment,
  disableExperiment,
  openAppControlSidebarSection,
  enableSidebarSection,
  // TODO: Add other helpers as needed
} = require('../test-helpers'); // Assuming a helpers file

// Selectors
const FLOATING_TERMINAL_WINDOW_SELECTOR = '.floating-terminal-window';
const FLOATING_TERMINAL_TITLE_SELECTOR = '.floating-terminal-window-title';
const FLOATING_TERMINAL_MINIMIZE_BUTTON_SELECTOR = '.floating-terminal-window-controls .minimize-button'; // Example more specific selector
const FLOATING_TERMINAL_CLOSE_BUTTON_SELECTOR = '.floating-terminal-window-controls .close-button'; // Example more specific selector
const APP_CONTROL_SIDEBAR_SELECTOR = '.app-control-sidebar'; // Placeholder
const APP_CONTROL_SIDEBAR_DEBUG_SECTION_SELECTOR = '#app-control-sidebar-debug-section'; // Placeholder for actual debug section
const APP_CONTROL_SIDEBAR_NO_RUN_MODE_TOGGLE_SELECTOR = 'input#debug-no-run-mode'; // More specific
const APP_CONTROL_SIDEBAR_TERMINAL_LIST_ITEM_SELECTOR = '.terminal-list-item'; // Example
const APP_CONTROL_SIDEBAR_TERMINAL_SHOW_BUTTON_SELECTOR = '.show-terminal-button'; // Example
const APP_CONTROL_SIDEBAR_TERMINAL_CLOSE_BUTTON_SELECTOR = '.close-terminal-button'; // Example
const CONFIG_SECTION_SELECTOR = (id) => `#section-${id}`; // Selector for a config section container
const CUSTOM_BUTTON_SELECTOR = (id) => `button#${id}`; // Selector for a custom button by its direct ID.

// New constants for src/ config
const E2E_CUSTOM_BUTTON_ID = 'e2eTestFloatingBtn';
const E2E_CUSTOM_BUTTON_COMMAND_ID = 'e2eTestFloatingEchoCmd';
const E2E_CUSTOM_BUTTON_SECTION_ID = 'e2e-test-floating';
const E2E_FLOATING_TERMINAL_TITLE = 'E2E Floating Echo';
const E2E_TERMINAL_READY_TEXT = 'E2E Floating Terminal Ready';

const E2E_SUB_SECTION_CUSTOM_BUTTON_ID = 'e2eTestFloatingSubBtn';
const E2E_SUB_SECTION_CUSTOM_BUTTON_COMMAND_ID = 'e2eTestFloatingSubEchoCmd';
const E2E_SUB_SECTION_ID = 'e2e-test-floating-sub';
const E2E_SUB_SECTION_FLOATING_TERMINAL_TITLE = 'E2E Sub Floating Echo';
const E2E_SUB_TERMINAL_READY_TEXT = 'E2E Sub Floating Terminal Ready';


test.describe('Floating Terminal E2E Tests (src config)', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');

    // Enable floating terminals experiment if needed (assuming helper exists)
    await enableExperiment(page, 'floatingTerminals');

    // Open App Control Sidebar, then Debug Tools, then Show Test Sections
    await page.locator('button[title="Expand Sidebar"]').click(); // Generic sidebar expand
    await page.locator('button[title*="Debug Tools"]').click(); // Generic debug tools button

    const showTestsButton = page.locator('button:has-text("Show Test Sections")');
    if (await showTestsButton.isVisible()) {
      await showTestsButton.click();
    }
    // Ensure it now says "Hide Test Sections" or that the section is visible
    await expect(page.locator('button:has-text("Hide Test Sections")')).toBeVisible();
    await expect(page.locator(CONFIG_SECTION_SELECTOR(E2E_CUSTOM_BUTTON_SECTION_ID))).toBeVisible();
  });

  test.afterAll(async () => {
    // Disable experiment if needed
    await disableExperiment(page, 'floatingTerminals');
    await page.close();
  });

  test.beforeEach(async () => {
    // Ensure no run mode is off before each test, if the toggle is visible
    const noRunModeToggle = page.locator(APP_CONTROL_SIDEBAR_NO_RUN_MODE_TOGGLE_SELECTOR);
    if (await noRunModeToggle.count() > 0 && await noRunModeToggle.isChecked()) {
        // Assuming the debug panel might need to be open to interact
        await page.locator('button[title="Expand Sidebar"]').click();
        await page.locator('button[title*="Debug Tools"]').click();
        await noRunModeToggle.uncheck();
    }
    // Close any floating terminals from previous tests
    const closeButtons = page.locator(FLOATING_TERMINAL_CLOSE_BUTTON_SELECTOR);
    while(await closeButtons.count() > 0) {
        await closeButtons.first().click();
    }
  });


  test('1. Launch Floating Terminal via Custom Button', async () => {
    // Enable the section containing the custom button
    await enableSidebarSection(page, E2E_CUSTOM_BUTTON_SECTION_ID);

    // Click the custom button
    await page.locator(CUSTOM_BUTTON_SELECTOR(E2E_CUSTOM_BUTTON_ID)).click();

    // Verify the floating terminal window appears
    const terminalWindow = page.locator(FLOATING_TERMINAL_WINDOW_SELECTOR);
    await expect(terminalWindow).toBeVisible();

    // Verify the floating terminal has the correct title
    const terminalTitle = page.locator(FLOATING_TERMINAL_TITLE_SELECTOR);
    await expect(terminalTitle).toHaveText(FLOATING_TERMINAL_TITLE);
  });

  test('2. Floating Terminal Content in "No Run Mode"', async ({ page }) => {
    // Enable "No Run Mode"
    await openAppControlSidebarSection(page, 'debug');
    await page.locator(APP_CONTROL_SIDEBAR_NO_RUN_MODE_TOGGLE_SELECTOR).check();

    // Enable the section containing the custom button
    await enableSidebarSection(page, CUSTOM_BUTTON_SECTION_ID);

    // Launch a floating terminal using a custom button
    await page.locator(`button#${CUSTOM_BUTTON_ID}`).click();

    // Verify the terminal displays the "[NO-RUN MODE]" indicator
    const terminalContent = page.locator(`${FLOATING_TERMINAL_WINDOW_SELECTOR} .xterm-rows`); // Adjust selector based on actual terminal rendering
    await expect(terminalContent).toContainText('[NO-RUN MODE]');

    // Verify the command string that would have been executed
    const commands = require('../../src/configurationSidebarCommands.json'); // Use src data
    const commandEntry = commands.find(c => c.sectionId === E2E_CUSTOM_BUTTON_COMMAND_ID);
    expect(commandEntry).toBeDefined();
    await expect(terminalContent).toContainText(commandEntry.command.base);
  });

  test('3. Minimize and Restore Floating Terminal', async () => {
    // Launch a floating terminal
    await enableSidebarSection(page, E2E_CUSTOM_BUTTON_SECTION_ID);
    await page.locator(CUSTOM_BUTTON_SELECTOR(E2E_CUSTOM_BUTTON_ID)).click();
    const terminalWindow = page.locator(FLOATING_TERMINAL_WINDOW_SELECTOR);
    await expect(terminalWindow).toBeVisible();

    // Click the minimize button
    const minimizeButton = terminalWindow.locator(FLOATING_TERMINAL_MINIMIZE_BUTTON_SELECTOR);
    await minimizeButton.click();

    // Verify the floating terminal window is no longer visible directly
    await expect(terminalWindow).not.toBeVisible();

    // Verify its representation in the AppControlSidebar indicates it's minimized
    await openAppControlSidebarSection(page, 'manage-terminals'); // Ensure helper opens the right panel
    const terminalListItem = page.locator(`${APP_CONTROL_SIDEBAR_TERMINAL_LIST_ITEM_SELECTOR}:has-text("${E2E_FLOATING_TERMINAL_TITLE}")`);
    const showButton = terminalListItem.locator(APP_CONTROL_SIDEBAR_TERMINAL_SHOW_BUTTON_SELECTOR);
    await expect(showButton).toBeVisible();

    // Click the "Show" button
    await showButton.click();

    // Verify the floating terminal window becomes visible again
    await expect(terminalWindow).toBeVisible();
  });

  test('4. Close Floating Terminal (from Window)', async ({ page }) => {
    // Launch a floating terminal
    await enableSidebarSection(page, CUSTOM_BUTTON_SECTION_ID);
    await page.locator(`button#${CUSTOM_BUTTON_ID}`).click();
    const terminalWindow = page.locator(FLOATING_TERMINAL_WINDOW_SELECTOR);
    await expect(terminalWindow).toBeVisible();

    // Click the close button on the floating terminal's title bar
    await terminalWindow.locator(FLOATING_TERMINAL_CLOSE_BUTTON_SELECTOR).click();

    // Verify the floating terminal window is removed
    await expect(terminalWindow).not.toBeVisible();
    await expect(terminalWindow).toHaveCount(0);


    // Verify it's removed from the AppControlSidebar list
    await openAppControlSidebarSection(page, 'manage-terminals');
    const terminalListItems = page.locator(APP_CONTROL_SIDEBAR_TERMINAL_LIST_ITEM_SELECTOR);
    await expect(terminalListItems.filter({ hasText: E2E_FLOATING_TERMINAL_TITLE })).toHaveCount(0);
  });

  test('5. Close Floating Terminal (from Sidebar)', async () => {
    // Launch a floating terminal
    await enableSidebarSection(page, E2E_CUSTOM_BUTTON_SECTION_ID);
    await page.locator(CUSTOM_BUTTON_SELECTOR(E2E_CUSTOM_BUTTON_ID)).click();
    const terminalWindow = page.locator(FLOATING_TERMINAL_WINDOW_SELECTOR);
    await expect(terminalWindow).toBeVisible();

    // Expand the AppControlSidebar and go to the manage terminals section
    await openAppControlSidebarSection(page, 'manage-terminals');

    // Click the close button for that terminal in the sidebar
    const terminalListItem = page.locator(`${APP_CONTROL_SIDEBAR_TERMINAL_LIST_ITEM_SELECTOR}:has-text("${E2E_FLOATING_TERMINAL_TITLE}")`);
    const closeButton = terminalListItem.locator(APP_CONTROL_SIDEBAR_TERMINAL_CLOSE_BUTTON_SELECTOR);
    await closeButton.click();

    // Verify the floating terminal window is removed
    await expect(terminalWindow).not.toBeVisible();
    await expect(terminalWindow).toHaveCount(0);


    // Verify it's removed from the AppControlSidebar list
    const terminalListItemsAfterClose = page.locator(APP_CONTROL_SIDEBAR_TERMINAL_LIST_ITEM_SELECTOR);
    await expect(terminalListItemsAfterClose.filter({ hasText: E2E_FLOATING_TERMINAL_TITLE })).toHaveCount(0);
  });

  test('6. Basic Interaction (if not in "No Run Mode")', async () => {
    // Ensure "No Run Mode" is disabled (already part of beforeEach, but can be explicit)
    const noRunModeToggle = page.locator(APP_CONTROL_SIDEBAR_NO_RUN_MODE_TOGGLE_SELECTOR);
    if (await noRunModeToggle.count() > 0 && await noRunModeToggle.isChecked()) {
        await page.locator('button[title="Expand Sidebar"]').click();
        await page.locator('button[title*="Debug Tools"]').click();
        await noRunModeToggle.uncheck();
    }

    // Launch a floating terminal
    await enableSidebarSection(page, E2E_CUSTOM_BUTTON_SECTION_ID);
    await page.locator(CUSTOM_BUTTON_SELECTOR(E2E_CUSTOM_BUTTON_ID)).click();
    const terminalWindow = page.locator(FLOATING_TERMINAL_WINDOW_SELECTOR);
    await expect(terminalWindow).toBeVisible();

    const terminalContent = terminalWindow.locator('.xterm-rows');

    // Verify the initial output
    await expect(terminalContent).toContainText(E2E_TERMINAL_READY_TEXT, { timeout: 10000 });

    // Attempt to type into the terminal and press Enter
    const terminalInput = terminalWindow.locator('textarea.xterm-helper-textarea');
    await terminalInput.type('E2E Test Input');
    await terminalInput.press('Enter');

    // Verify the subsequent output
    await expect(terminalContent).toContainText('E2E Test Input', { timeout: 5000 });
  });

  test('7. Custom Button in Sub-Section', async () => {
    // Enable the parent section
    await enableSidebarSection(page, E2E_CUSTOM_BUTTON_SECTION_ID);
    // Enable the sub-section - make sure its toggle is clicked
    await enableSidebarSection(page, E2E_SUB_SECTION_ID);


    // Click the custom button within the sub-section
    const subSectionElement = page.locator(CONFIG_SECTION_SELECTOR(E2E_SUB_SECTION_ID));
    await subSectionElement.locator(CUSTOM_BUTTON_SELECTOR(E2E_SUB_SECTION_CUSTOM_BUTTON_ID)).click();


    // Verify the floating terminal window appears
    const terminalWindow = page.locator(FLOATING_TERMINAL_WINDOW_SELECTOR);
    await expect(terminalWindow).toBeVisible();

    // Verify the floating terminal has the correct title
    const terminalTitle = terminalWindow.locator(FLOATING_TERMINAL_TITLE_SELECTOR);
    await expect(terminalTitle).toHaveText(E2E_SUB_SECTION_FLOATING_TERMINAL_TITLE);

    // Verify initial output for sub terminal
    const terminalContent = terminalWindow.locator('.xterm-rows');
    await expect(terminalContent).toContainText(E2E_SUB_TERMINAL_READY_TEXT, { timeout: 10000 });


    // Verify it can be closed
    await terminalWindow.locator(FLOATING_TERMINAL_CLOSE_BUTTON_SELECTOR).click();
    await expect(terminalWindow).not.toBeVisible();
    await expect(terminalWindow).toHaveCount(0);

    // Verify it's removed from the AppControlSidebar list
    await openAppControlSidebarSection(page, 'manage-terminals');
    const terminalListItems = page.locator(APP_CONTROL_SIDEBAR_TERMINAL_LIST_ITEM_SELECTOR);
    await expect(terminalListItems.filter({ hasText: E2E_SUB_SECTION_FLOATING_TERMINAL_TITLE })).toHaveCount(0);
  });
});
