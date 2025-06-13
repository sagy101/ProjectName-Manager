// @ts-check
const { test, expect } = require('@playwright/test');
const {
  enableExperiment,
  disableExperiment,
  openAppControlSidebarSection,
  enableSidebarSection,
  runSidebarSection, // Helper to enable and run a section
  // TODO: Add other helpers as needed
} = require('../test-helpers');

// Selectors
const CONFIG_SECTION_SELECTOR = (id) => `#section-${id}`;
const MAIN_TERMINAL_TAB_SELECTOR = '.main-terminal-tab';
const TAB_INFO_ICON_SELECTOR = '.tab-info-icon';
const TAB_INFO_PANEL_SELECTOR = '.tab-info-panel';
const TAB_INFO_PANEL_CLOSE_BUTTON_SELECTOR = '.tab-info-panel-close-button';
const TAB_INFO_PANEL_TAB_NAME_SELECTOR = '.tab-info-panel-tab-name';
const TAB_INFO_PANEL_TERMINAL_ID_SELECTOR = '.tab-info-panel-terminal-id';
const TAB_INFO_PANEL_SECTION_ID_SELECTOR = '.tab-info-panel-section-id';
const TAB_INFO_PANEL_MORE_DETAILS_BUTTON_SELECTOR = '.tab-info-panel-more-details-button';
const TAB_INFO_PANEL_REFRESH_BUTTON_SELECTOR = '.tab-info-panel-refresh-button';

const MORE_DETAILS_POPUP_SELECTOR = '.more-details-popup';
const MORE_DETAILS_POPUP_COMMAND_SELECTOR = '.more-details-popup-command';
const MORE_DETAILS_POPUP_COPY_COMMAND_BUTTON_SELECTOR = '.more-details-popup-copy-command-button';
const MORE_DETAILS_POPUP_CONTAINERS_SELECTOR = '.more-details-popup-containers';
const MORE_DETAILS_POPUP_CLOSE_BUTTON_SELECTOR = '.more-details-popup-close-button';

const XTERM_ROWS_SELECTOR = '.xterm-rows';
const APP_CONTROL_SIDEBAR_NO_RUN_MODE_TOGGLE_SELECTOR = 'input#debug-no-run-mode';

// E2E src/ Configuration Constants
const E2E_TEST_SECTION_ID = 'e2e-main-tab-info';
const E2E_TEST_COMMAND_BASE = 'echo E2E Main Tab Ready for Info Panel';
const E2E_TEST_TERMINAL_TITLE = 'E2ETabInfoTest';
const E2E_TEST_INITIAL_OUTPUT = 'E2E Main Tab Ready for Info Panel';
const E2E_TEST_REFRESH_OUTPUT_FRAGMENT = 'E2E Main Tab Refreshed'; // Fragment from prependCommands

test.describe('Tab Information Panel E2E Tests (src config)', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    // await enableExperiment(page, 'tabInfoPanelExperiment'); // If needed

    // Open App Control Sidebar, then Debug Tools, then Show Test Sections
    await page.locator('button[title="Expand Sidebar"]').click();
    await page.locator('button[title*="Debug Tools"]').click();

    const showTestsButton = page.locator('button:has-text("Show Test Sections")');
    if (await showTestsButton.isVisible()) {
      await showTestsButton.click();
    }
    await expect(page.locator('button:has-text("Hide Test Sections")')).toBeVisible();
    await expect(page.locator(CONFIG_SECTION_SELECTOR(E2E_TEST_SECTION_ID))).toBeVisible();
  });

  test.afterAll(async () => {
    // await disableExperiment(page, 'tabInfoPanelExperiment'); // If needed
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
    // Close any existing tabs or panels
    const openTabs = await page.locator(`${MAIN_TERMINAL_TAB_SELECTOR} .tab-close-button`).count();
    for (let i = 0; i < openTabs; i++) {
      await page.locator(`${MAIN_TERMINAL_TAB_SELECTOR} .tab-close-button`).first().click();
    }
    const infoPanelClose = page.locator(TAB_INFO_PANEL_CLOSE_BUTTON_SELECTOR);
    if (await infoPanelClose.isVisible()) {
      await infoPanelClose.click();
    }
  });

  async function openE2ETestMainTabAndInfoPanel() {
    // Ensure the test section is enabled before running
    await enableSidebarSection(page, E2E_TEST_SECTION_ID);
    await runSidebarSection(page, E2E_TEST_SECTION_ID);

    const mainTab = page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}:has-text("${E2E_TEST_TERMINAL_TITLE}")`);
    await expect(mainTab).toBeVisible({ timeout: 10000 }); // Increased timeout for tab appearance

    const terminalContent = mainTab.locator(XTERM_ROWS_SELECTOR);
    await expect(terminalContent).toContainText(E2E_TEST_INITIAL_OUTPUT, { timeout: 10000 });

    await mainTab.locator(TAB_INFO_ICON_SELECTOR).click();
    const infoPanel = page.locator(TAB_INFO_PANEL_SELECTOR);
    await expect(infoPanel).toBeVisible();
    return infoPanel;
  }

  test('1. Open Panel and Verify Basic Information', async () => {
    const infoPanel = await openE2ETestMainTabAndInfoPanel();

    await expect(infoPanel.locator(TAB_INFO_PANEL_TAB_NAME_SELECTOR)).toHaveText(E2E_TEST_TERMINAL_TITLE);

    const terminalIdElement = infoPanel.locator(TAB_INFO_PANEL_TERMINAL_ID_SELECTOR);
    await expect(terminalIdElement).toBeVisible();
    await expect(terminalIdElement).not.toBeEmpty();

    await expect(infoPanel.locator(TAB_INFO_PANEL_SECTION_ID_SELECTOR)).toHaveText(E2E_TEST_SECTION_ID);

    // Close the panel for cleanup
    await infoPanel.locator(TAB_INFO_PANEL_CLOSE_BUTTON_SELECTOR).click();
    await expect(infoPanel).not.toBeVisible();
     // Close the tab
    const mainTab = page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}:has-text("${E2E_TEST_TERMINAL_TITLE}")`);
    if (await mainTab.isVisible()) await mainTab.locator('.tab-close-button').click();
  });

  test('2. "More Details" Popup and "Copy Command" Button', async () => {
    const infoPanel = await openE2ETestMainTabAndInfoPanel();
    await infoPanel.locator(TAB_INFO_PANEL_MORE_DETAILS_BUTTON_SELECTOR).click();

    const popup = page.locator(MORE_DETAILS_POPUP_SELECTOR);
    await expect(popup).toBeVisible();

    // Verify command in popup - uses src data
    const commands = require('../../src/configurationSidebarCommands.json');
    const commandEntry = commands.find(c => c.sectionId === E2E_TEST_SECTION_ID);
    expect(commandEntry).toBeDefined();
    const expectedSrcCommand = commandEntry.command.base;
    await expect(popup.locator(MORE_DETAILS_POPUP_COMMAND_SELECTOR)).toHaveText(expectedSrcCommand);

    // Click copy command and verify clipboard
    await popup.locator(MORE_DETAILS_POPUP_COPY_COMMAND_BUTTON_SELECTOR).click();
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(expectedSrcCommand);

    // Optional: Verify Associated Containers (if mock data setup for it)
    // const containerList = popup.locator(MORE_DETAILS_POPUP_CONTAINERS_SELECTOR);
    // await expect(containerList).toBeVisible();
    // await expect(containerList.locator('li').first()).toHaveText('container1_name_from_mock'); // If testing containers

    await popup.locator(MORE_DETAILS_POPUP_CLOSE_BUTTON_SELECTOR).click();
    await expect(popup).not.toBeVisible();

    await infoPanel.locator(TAB_INFO_PANEL_CLOSE_BUTTON_SELECTOR).click();
    await expect(infoPanel).not.toBeVisible();

    const mainTab = page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}:has-text("${E2E_TEST_TERMINAL_TITLE}")`);
    if (await mainTab.isVisible()) await mainTab.locator('.tab-close-button').click();
  });

  test('3. "Refresh" Button Functionality', async () => {
    const infoPanel = await openE2ETestMainTabAndInfoPanel();

    await infoPanel.locator(TAB_INFO_PANEL_REFRESH_BUTTON_SELECTOR).click();

    const mainTab = page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}:has-text("${E2E_TEST_TERMINAL_TITLE}")`);
    const terminalContent = mainTab.locator(XTERM_ROWS_SELECTOR);

    // Verify the specific output from the refreshConfig.prependCommands
    // It should show refreshed output then the original command output
    await expect(terminalContent).toContainText(E2E_TEST_REFRESH_OUTPUT_FRAGMENT, { timeout: 15000 });
    await expect(terminalContent).toContainText(E2E_TEST_INITIAL_OUTPUT, { timeout: 1000 }); // Original output should also appear

    await infoPanel.locator(TAB_INFO_PANEL_CLOSE_BUTTON_SELECTOR).click();
    await expect(infoPanel).not.toBeVisible();

    if (await mainTab.isVisible()) await mainTab.locator('.tab-close-button').click();
  });

  test('4. Close Panel (via Close Button)', async () => {
    const infoPanel = await openE2ETestMainTabAndInfoPanel();
    await infoPanel.locator(TAB_INFO_PANEL_CLOSE_BUTTON_SELECTOR).click();
    await expect(infoPanel).not.toBeVisible();

    const mainTab = page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}:has-text("${E2E_TEST_TERMINAL_TITLE}")`);
    if (await mainTab.isVisible()) await mainTab.locator('.tab-close-button').click();
  });

  test('5. Close Panel (via Clicking Outside - if applicable)', async () => {
    const infoPanel = await openE2ETestMainTabAndInfoPanel();

    // Click outside the panel (e.g., on the body or a known static element)
    await page.locator('body').click({ position: { x: 0, y: 0 }, force: true }); // Force click at a corner

    // This behavior depends on the panel's implementation (modal, click-outside listener)
    // For now, we'll assume it should close. If not, this test would need adjustment.
    await expect(infoPanel).not.toBeVisible();

     // Close the tab (if not already closed by clicking outside)
    const mainTab = page.locator(`${MAIN_TERMINAL_TAB_SELECTOR}:has-text("${TEST_MAIN_TAB_TERMINAL_TITLE}")`);
    if (await mainTab.isVisible()) {
      await mainTab.locator('.tab-close-button').click();
    }
  });
});
