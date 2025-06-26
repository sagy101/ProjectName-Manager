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
    
    // Based on actual HTML structure, the button has title="Start Priority X"
    // and class="start-priority-button"
    const priorityButton = page.locator(`.start-priority-button[title="Start Priority ${priority}"]`);
    
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
    
    // Based on actual HTML structure, look for completion status
    // The HTML shows: <span class="group-status-label status-waiting">Waiting</span>
    // and <span class="group-progress">0/2 completed</span>
    
    // Find the priority group container that contains "Priority X"
    const priorityGroupContainer = page.locator('.priority-group-header').filter({
      hasText: `Priority ${priority}`
    });
    
    // Check for completed status in multiple ways
    const completionChecks = [
      // Check if status label shows "Complete" or "Success"
      priorityGroupContainer.locator('.group-status-label').filter({ hasText: /complete|success|done/i }),
      
      // Check if progress shows all items completed (like "2/2 completed")
      priorityGroupContainer.locator('.group-progress').filter({ hasText: /(\d+)\/\1\s+completed/i }),
      
      // Check for success icon or completed class
      priorityGroupContainer.locator('.group-status-icon.success, .group-status-icon.completed'),
      
      // Check if status is not "waiting" or "running"
      priorityGroupContainer.locator('.group-status-label').filter({ hasText: /^(?!.*(waiting|running|in progress)).*$/i })
    ];
    
    let completed = false;
    for (const check of completionChecks) {
      try {
        if (await check.count() > 0 && await check.first().isVisible()) {
          completed = true;
          break;
        }
      } catch {
        // Continue to next check
      }
    }
    
    // Additional check: wait for a reasonable time for completion status to appear
    if (!completed) {
      try {
        await priorityGroupContainer.locator('.group-status-label').filter({ 
          hasText: /complete|success|done/i 
        }).waitFor({ timeout: getTimeout(10000) });
        completed = true;
      } catch {
        // Final fallback: check if waiting/running status is gone
        const isStillWaiting = await priorityGroupContainer.locator('.group-status-label.status-waiting').count() > 0;
        const isStillRunning = await priorityGroupContainer.locator('.group-status-label').filter({ hasText: /running|in progress/i }).count() > 0;
        completed = !isStillWaiting && !isStillRunning;
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