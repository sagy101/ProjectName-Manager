const { expect } = require('@playwright/test');
const { getTimeout } = require('./constants');

/**
 * Send Ctrl+C to the active terminal
 * @param {Page} page - Playwright page object
 */
async function sendCtrlC(page) {
  try {
    console.log('Sending Ctrl+C to active terminal...');
    
    // Focus the active terminal's viewport
    const activeTerminal = page.locator('.terminal-instance-wrapper.active .xterm-viewport');
    await expect(activeTerminal).toBeVisible({ timeout: getTimeout(5000) });
    
    await activeTerminal.focus();
    await page.keyboard.press('Control+C');
    
    console.log('Ctrl+C sent successfully');
  } catch (error) {
    console.error('Failed to send Ctrl+C:', error.message);
    throw error;
  }
}

/**
 * Wait for a specific terminal status
 * @param {Page} page - Playwright page object
 * @param {string} status - Expected status (running, stopped, error, etc.)
 * @param {Object} options - Options for waiting
 */
async function waitForTerminalStatus(page, status, options = {}) {
  const { timeout = getTimeout(10000), tabSelector = '.tab.active' } = options;
  
  try {
    console.log(`Waiting for terminal status: ${status}...`);
    
    // Wait for the status indicator to show the expected status
    const statusIndicator = page.locator(`${tabSelector} .status-indicator, ${tabSelector} .tab-status`);
    
    // Create a regex pattern for the status class - handle special cases
    let statusPattern;
    if (status === 'stopped') {
      // For stopped status, also check for killed/terminated
      statusPattern = new RegExp(`status-stopped|stopped|status-killed|killed|status-terminated|terminated`, 'i');
    } else {
      statusPattern = new RegExp(`status-${status}|${status}`, 'i');
    }
    
    await expect(statusIndicator).toHaveClass(statusPattern, { timeout });
    
    console.log(`Terminal status "${status}" confirmed`);
  } catch (error) {
    console.error(`Failed to wait for terminal status "${status}":`, error.message);
    throw error;
  }
}

/**
 * Focus the active terminal viewport
 * @param {Page} page - Playwright page object
 */
async function focusActiveTerminal(page) {
  try {
    console.log('Focusing active terminal...');
    
    const activeTerminal = page.locator('.terminal-instance-wrapper.active .xterm-viewport');
    await expect(activeTerminal).toBeVisible({ timeout: getTimeout(5000) });
    
    await activeTerminal.focus();
    
    console.log('Active terminal focused successfully');
  } catch (error) {
    console.error('Failed to focus active terminal:', error.message);
    throw error;
  }
}

/**
 * Get the status of a terminal tab
 * @param {Page} page - Playwright page object
 * @param {string} tabSelector - Selector for the tab (default: active tab)
 * @returns {string} The current status
 */
async function getTerminalStatus(page, tabSelector = '.tab.active') {
  try {
    const statusIndicator = page.locator(`${tabSelector} .status-indicator, ${tabSelector} .tab-status`);
    await expect(statusIndicator).toBeVisible({ timeout: getTimeout(3000) });
    
    const statusClasses = await statusIndicator.getAttribute('class');
    
    // Extract status from class names
    if (statusClasses.includes('status-running') || statusClasses.includes('running')) {
      return 'running';
    } else if (statusClasses.includes('status-stopped') || statusClasses.includes('stopped') || 
               statusClasses.includes('status-killed') || statusClasses.includes('killed') ||
               statusClasses.includes('status-terminated') || statusClasses.includes('terminated')) {
      return 'stopped';
    } else if (statusClasses.includes('status-error') || statusClasses.includes('error')) {
      return 'error';
    } else if (statusClasses.includes('status-pending') || statusClasses.includes('pending')) {
      return 'pending';
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Failed to get terminal status:', error.message);
    return 'unknown';
  }
}

/**
 * Verify terminal status matches expected with detailed info
 * @param {Page} page - Playwright page object
 * @param {string} expectedStatus - Expected status
 * @param {Object} options - Options including tab selector and timeout
 */
async function verifyTerminalStatus(page, expectedStatus, options = {}) {
  const { tabSelector = '.tab.active', timeout = getTimeout(10000) } = options;
  
  try {
    console.log(`Verifying terminal status is "${expectedStatus}"...`);
    
    // Wait for the expected status
    await waitForTerminalStatus(page, expectedStatus, { timeout, tabSelector });
    
    // Double-check by getting the current status
    const currentStatus = await getTerminalStatus(page, tabSelector);
    expect(currentStatus).toBe(expectedStatus);
    
    console.log(`Terminal status verified: ${expectedStatus}`);
  } catch (error) {
    console.error(`Failed to verify terminal status "${expectedStatus}":`, error.message);
    throw error;
  }
}

/**
 * Wait for terminal to be running and then send Ctrl+C
 * @param {Page} page - Playwright page object
 * @param {Object} options - Options for waiting and tab selection
 */
async function runAndInterruptTerminal(page, options = {}) {
  const { tabSelector = '.tab.active', runTimeout = getTimeout(15000), stopTimeout = getTimeout(10000) } = options;
  
  try {
    console.log('Waiting for terminal to be running, then sending Ctrl+C...');
    
    // Wait for terminal to be running
    await waitForTerminalStatus(page, 'running', { timeout: runTimeout, tabSelector });
    
    // Send Ctrl+C to stop it
    await sendCtrlC(page);
    
    // Wait for it to be stopped
    await waitForTerminalStatus(page, 'stopped', { timeout: stopTimeout, tabSelector });
    
    console.log('Terminal successfully interrupted with Ctrl+C');
  } catch (error) {
    console.error('Failed to run and interrupt terminal:', error.message);
    throw error;
  }
}

module.exports = {
  sendCtrlC,
  waitForTerminalStatus,
  focusActiveTerminal,
  getTerminalStatus,
  verifyTerminalStatus,
  runAndInterruptTerminal
}; 