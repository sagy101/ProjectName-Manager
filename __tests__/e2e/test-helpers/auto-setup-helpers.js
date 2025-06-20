const { expect } = require('@playwright/test');
const { getTimeout } = require('./constants');

/**
 * Click the Auto Setup button to open the auto setup interface
 * @param {Page} page - Playwright page object
 */
async function clickAutoSetupButton(page) {
  try {
    console.log('Opening Auto Setup interface...');
    
    // Look for auto setup button in various possible locations
    const autoSetupButton = page.locator('button').filter({ hasText: /auto setup|auto-setup/i }).first();
    
    await expect(autoSetupButton).toBeVisible({ timeout: getTimeout(5000) });
    await autoSetupButton.click();
    
    // Wait for auto setup interface to open
    await page.waitForSelector('.auto-setup-container, .auto-setup-screen', { timeout: getTimeout(5000) });
    
    console.log('Auto Setup interface opened successfully');
  } catch (error) {
    console.error('Failed to open Auto Setup interface:', error.message);
    throw error;
  }
}

/**
 * Click the "Start Auto Setup" button to begin the full auto setup process
 * @param {Page} page - Playwright page object
 */
async function clickStartAutoSetup(page) {
  try {
    console.log('Starting full Auto Setup process...');
    
    const startButton = page.locator('button').filter({ hasText: /start auto setup|begin setup/i }).first();
    
    await expect(startButton).toBeVisible({ timeout: getTimeout(5000) });
    await startButton.click();
    
    console.log('Auto Setup process started');
  } catch (error) {
    console.error('Failed to start Auto Setup process:', error.message);
    throw error;
  }
}

/**
 * Click the start button for a specific priority group
 * @param {Page} page - Playwright page object
 * @param {number} priority - Priority group number (1, 2, 3, etc.)
 */
async function clickStartPriorityGroup(page, priority) {
  try {
    console.log(`Starting priority group ${priority}...`);
    
    // Look for priority group start button
    const priorityButton = page.locator(`button`).filter({ 
      hasText: new RegExp(`priority\\s*${priority}|group\\s*${priority}`, 'i') 
    }).filter({ hasText: /start|run/i }).first();
    
    await expect(priorityButton).toBeVisible({ timeout: getTimeout(5000) });
    await priorityButton.click();
    
    console.log(`Priority group ${priority} started`);
  } catch (error) {
    console.error(`Failed to start priority group ${priority}:`, error.message);
    throw error;
  }
}

/**
 * Check if a specific priority group has completed successfully
 * @param {Page} page - Playwright page object
 * @param {number} priority - Priority group number to check
 */
async function checkGroupCompleted(page, priority) {
  try {
    console.log(`Checking if priority group ${priority} completed...`);
    
    // Look for completion indicators - could be checkmarks, "completed" text, success status, etc.
    const completionSelectors = [
      `.priority-${priority} .completed`,
      `.priority-${priority} .success`,
      `.priority-${priority} .status-completed`,
      `.group-${priority} .completed`,
      `.group-${priority} .success`,
      `[data-priority="${priority}"] .completed`,
      `[data-priority="${priority}"] .success`
    ];
    
    let completed = false;
    for (const selector of completionSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.count() > 0 && await element.first().isVisible()) {
          completed = true;
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
    
    // Alternative: look for success text or icons
    if (!completed) {
      const successIndicators = page.locator(`text=/priority\\s*${priority}.*complete|group\\s*${priority}.*complete|priority\\s*${priority}.*success/i`);
      if (await successIndicators.count() > 0) {
        completed = true;
      }
    }
    
    expect(completed).toBe(true);
    console.log(`Priority group ${priority} completed successfully`);
    
  } catch (error) {
    console.error(`Failed to verify completion of priority group ${priority}:`, error.message);
    throw error;
  }
}

/**
 * Check if all priority groups have completed successfully
 * @param {Page} page - Playwright page object
 */
async function checkAllGroupsCompleted(page) {
  try {
    console.log('Checking if all priority groups completed...');
    
    // Look for overall completion indicators
    const completionSelectors = [
      '.auto-setup-complete',
      '.all-groups-complete',
      '.setup-finished',
      'text=/all.*complete|setup.*complete|finished/i'
    ];
    
    let allCompleted = false;
    for (const selector of completionSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.count() > 0 && await element.first().isVisible()) {
          allCompleted = true;
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
    
    expect(allCompleted).toBe(true);
    console.log('All priority groups completed successfully');
    
  } catch (error) {
    console.error('Failed to verify completion of all priority groups:', error.message);
    throw error;
  }
}

module.exports = {
  clickAutoSetupButton,
  clickStartAutoSetup,
  clickStartPriorityGroup,
  checkGroupCompleted,
  checkAllGroupsCompleted
}; 