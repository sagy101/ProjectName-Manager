const { expect } = require('@playwright/test');
const { getTimeout } = require('./constants');
const { expandAppControlSidebar } = require('./sidebar-helpers');

/**
 * Open the health report screen
 * @param {Page} page - Playwright page object
 */
async function openHealthReport(page) {
  try {
    console.log('Opening Health Report...');
    
    // First make sure sidebar is expanded
    await expandAppControlSidebar(page);
    
    // Click the health report button
    const healthReportButton = page.locator('[data-testid="health-report-button"]');
    await expect(healthReportButton).toBeVisible({ timeout: getTimeout(5000) });
    await healthReportButton.click();
    
    // Wait for health report to open
    await expect(page.locator('.health-report-container')).toBeVisible({ timeout: getTimeout(5000) });
    
    console.log('Health Report opened successfully');
  } catch (error) {
    console.error('Failed to open Health Report:', error.message);
    throw error;
  }
}

/**
 * Close the health report screen
 * @param {Page} page - Playwright page object
 */
async function closeHealthReport(page) {
  try {
    console.log('Closing Health Report...');
    
    const closeButton = page.locator('.health-report-container .close-button');
    await expect(closeButton).toBeVisible({ timeout: getTimeout(3000) });
    await closeButton.click();
    
    // Wait for health report to close
    await expect(page.locator('.health-report-container')).not.toBeVisible({ timeout: getTimeout(3000) });
    
    console.log('Health Report closed successfully');
  } catch (error) {
    console.error('Failed to close Health Report:', error.message);
    throw error;
  }
}

/**
 * Click the health report button in the sidebar
 * @param {Page} page - Playwright page object
 */
async function clickHealthReportButton(page) {
  try {
    console.log('Clicking Health Report button...');
    
    // Ensure sidebar is expanded first
    await expandAppControlSidebar(page);
    
    const healthReportButton = page.locator('[data-testid="health-report-button"]');
    await expect(healthReportButton).toBeVisible({ timeout: getTimeout(5000) });
    await healthReportButton.click();
    
    console.log('Health Report button clicked successfully');
  } catch (error) {
    console.error('Failed to click Health Report button:', error.message);
    throw error;
  }
}

/**
 * Expand a terminal section in the health report
 * @param {Page} page - Playwright page object
 * @param {number} index - Index of the terminal section to expand (0-based)
 */
async function expandTerminalSection(page, index = 0) {
  try {
    console.log(`Expanding terminal section ${index}...`);
    
    const terminalSections = page.locator('.terminal-section-header');
    const targetSection = terminalSections.nth(index);
    
    await expect(targetSection).toBeVisible({ timeout: getTimeout(5000) });
    
    // Check if already expanded (show ▼) or collapsed (show ▶)
    const expandIcon = targetSection.locator('.expand-icon');
    const iconText = await expandIcon.textContent();
    
    if (iconText?.includes('▶')) {
      // Section is collapsed, click to expand
      await targetSection.click();
      
      // Wait for expansion
      await expect(expandIcon).toContainText('▼', { timeout: getTimeout(3000) });
      
      // Wait for terminal details to be visible
      await expect(page.locator('.terminal-details')).toBeVisible({ timeout: getTimeout(3000) });
    }
    
    console.log(`Terminal section ${index} expanded successfully`);
  } catch (error) {
    console.error(`Failed to expand terminal section ${index}:`, error.message);
    throw error;
  }
}

/**
 * Click the focus tab button for a terminal in the health report
 * @param {Page} page - Playwright page object
 * @param {number} index - Index of the terminal section (0-based)
 */
async function clickFocusTabButton(page, index = 0) {
  try {
    console.log(`Clicking focus tab button for terminal ${index}...`);
    
    // Make sure the terminal section is expanded first
    await expandTerminalSection(page, index);
    
    const focusButtons = page.locator('[data-testid="focus-tab-button"]');
    const targetButton = focusButtons.nth(index);
    
    await expect(targetButton).toBeVisible({ timeout: getTimeout(3000) });
    await targetButton.click();
    
    console.log(`Focus tab button clicked for terminal ${index}`);
  } catch (error) {
    console.error(`Failed to click focus tab button for terminal ${index}:`, error.message);
    throw error;
  }
}

/**
 * Click the show command button for a terminal in the health report
 * @param {Page} page - Playwright page object
 * @param {number} index - Index of the terminal section (0-based)
 */
async function clickShowCommandButton(page, index = 0) {
  try {
    console.log(`Clicking show command button for terminal ${index}...`);
    
    // Make sure the terminal section is expanded first
    await expandTerminalSection(page, index);
    
    const showCommandButtons = page.locator('[data-testid="show-command-button"]');
    const targetButton = showCommandButtons.nth(index);
    
    await expect(targetButton).toBeVisible({ timeout: getTimeout(3000) });
    await targetButton.click();
    
    // Wait for command popup to appear
    await expect(page.locator('.command-popup')).toBeVisible({ timeout: getTimeout(3000) });
    
    console.log(`Show command button clicked for terminal ${index}`);
  } catch (error) {
    console.error(`Failed to click show command button for terminal ${index}:`, error.message);
    throw error;
  }
}

/**
 * Click the refresh button for a terminal in the health report
 * @param {Page} page - Playwright page object
 * @param {number} index - Index of the terminal section (0-based)
 */
async function clickRefreshButton(page, index = 0) {
  try {
    console.log(`Clicking refresh button for terminal ${index}...`);
    
    // Make sure the terminal section is expanded first
    await expandTerminalSection(page, index);
    
    const refreshButtons = page.locator('[data-testid="refresh-button"]');
    const targetButton = refreshButtons.nth(index);
    
    await expect(targetButton).toBeVisible({ timeout: getTimeout(3000) });
    await targetButton.click();
    
    console.log(`Refresh button clicked for terminal ${index}`);
  } catch (error) {
    console.error(`Failed to click refresh button for terminal ${index}:`, error.message);
    throw error;
  }
}

/**
 * Click the "Refresh All" button in the health report
 * @param {Page} page - Playwright page object
 */
async function clickRefreshAllButton(page) {
  try {
    console.log('Clicking Refresh All button...');
    
    const refreshAllButton = page.locator('text=Refresh All');
    await expect(refreshAllButton).toBeVisible({ timeout: getTimeout(3000) });
    await refreshAllButton.click();
    
    // Wait for refresh to complete
    await page.waitForTimeout(getTimeout(1000));
    
    console.log('Refresh All button clicked successfully');
  } catch (error) {
    console.error('Failed to click Refresh All button:', error.message);
    throw error;
  }
}

/**
 * Close the command popup in the health report
 * @param {Page} page - Playwright page object
 */
async function closeCommandPopup(page) {
  try {
    console.log('Closing command popup...');
    
    const closeButton = page.locator('.command-popup .close-button');
    await expect(closeButton).toBeVisible({ timeout: getTimeout(3000) });
    await closeButton.click();
    
    // Wait for popup to close
    await expect(page.locator('.command-popup')).not.toBeVisible({ timeout: getTimeout(3000) });
    
    console.log('Command popup closed successfully');
  } catch (error) {
    console.error('Failed to close command popup:', error.message);
    throw error;
  }
}

/**
 * Verify health report status (green, blue, red, etc.)
 * @param {Page} page - Playwright page object
 * @param {string} expectedStatus - Expected status class (green, blue, red)
 */
async function verifyHealthReportStatus(page, expectedStatus) {
  try {
    console.log(`Verifying health report status: ${expectedStatus}...`);
    
    // First make sure sidebar is expanded
    await expandAppControlSidebar(page);
    
    const healthReportButton = page.locator('[data-testid="health-report-button"]');
    const statusPattern = new RegExp(`health-report-button--${expectedStatus}`, 'i');
    
    await expect(healthReportButton).toHaveClass(statusPattern, { timeout: getTimeout(5000) });
    
    console.log(`Health report status verified: ${expectedStatus}`);
  } catch (error) {
    console.error(`Failed to verify health report status ${expectedStatus}:`, error.message);
    throw error;
  }
}

module.exports = {
  openHealthReport,
  closeHealthReport,
  clickHealthReportButton,
  expandTerminalSection,
  clickFocusTabButton,
  clickShowCommandButton,
  clickRefreshButton,
  clickRefreshAllButton,
  closeCommandPopup,
  verifyHealthReportStatus
}; 