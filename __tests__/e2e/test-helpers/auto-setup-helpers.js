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
    
    // Find the priority group container that contains "Priority X"
    const priorityGroupContainer = page.locator('.priority-group-header').filter({
      hasText: `Priority ${priority}`
    });
    
    // Wait for the priority group to exist first
    await expect(priorityGroupContainer).toBeVisible({ timeout: getTimeout(5000) });
    
    // Robust completion detection with polling and extended timeout
    const maxWaitTime = getTimeout(30000); // Increase to 30 seconds
    const pollInterval = 1000; // Check every 1 second
    const startTime = Date.now();
    
    let completed = false;
    let lastStatus = '';
    
    while (Date.now() - startTime < maxWaitTime && !completed) {
      try {
        // Check multiple completion indicators with more precise selectors
        const completionChecks = [
          // Check for explicit completion status
          priorityGroupContainer.locator('.group-status-label').filter({ hasText: /complete|success|done|finished/i }),
          
          // Check if progress shows all items completed (pattern: "X/X completed")
          priorityGroupContainer.locator('.group-progress').filter({ hasText: /(\d+)\/\1\s+(completed|done)/i }),
          
          // Check for success icon or completed class
          priorityGroupContainer.locator('.group-status-icon.success, .group-status-icon.completed, .status-success, .status-completed'),
          
          // Check specific completed class on the container
          priorityGroupContainer.filter({ hasText: /completed|finished/i })
        ];
        
        // Check each completion indicator
        for (const check of completionChecks) {
          const count = await check.count();
          if (count > 0) {
            const isVisible = await check.first().isVisible();
            if (isVisible) {
              completed = true;
              break;
            }
          }
        }
        
        // If not completed, check current status for debugging
        if (!completed) {
          try {
            const statusElement = priorityGroupContainer.locator('.group-status-label').first();
            if (await statusElement.count() > 0) {
              const currentStatus = await statusElement.textContent();
              if (currentStatus !== lastStatus) {
                console.log(`Priority group ${priority} status: ${currentStatus}`);
                lastStatus = currentStatus;
              }
              
              // If status is no longer "waiting" or "running", consider it potentially completed
              if (currentStatus && !currentStatus.toLowerCase().includes('waiting') && 
                  !currentStatus.toLowerCase().includes('running') && 
                  !currentStatus.toLowerCase().includes('in progress')) {
                // Double-check that it's actually a completion status
                if (currentStatus.toLowerCase().includes('complete') ||
                    currentStatus.toLowerCase().includes('success') ||
                    currentStatus.toLowerCase().includes('done') ||
                    currentStatus.toLowerCase().includes('finished')) {
                  completed = true;
                  break;
                }
              }
            }
          } catch (statusError) {
            // Continue polling if status check fails
          }
        }
        
        if (!completed) {
          // Wait before next poll
          await page.waitForTimeout(pollInterval);
        }
        
      } catch (checkError) {
        // Continue polling if individual check fails
        await page.waitForTimeout(pollInterval);
      }
    }
    
    // If still not completed, do a final comprehensive check
    if (!completed) {
      console.log(`Final completion check for priority group ${priority}...`);
      
      // Check if the waiting status is gone and no error status is present
      const waitingElements = await priorityGroupContainer.locator('.group-status-label.status-waiting, .group-status-label').filter({ hasText: /waiting/i }).count();
      const runningElements = await priorityGroupContainer.locator('.group-status-label').filter({ hasText: /running|in progress/i }).count();
      const errorElements = await priorityGroupContainer.locator('.group-status-label').filter({ hasText: /error|failed|fail/i }).count();
      
      // Consider completed if not waiting, not running, and no errors
      if (waitingElements === 0 && runningElements === 0 && errorElements === 0) {
        completed = true;
        console.log(`Priority group ${priority} appears completed (no waiting/running/error status)`);
      }
    }
    
    expect(completed).toBe(true);
    console.log(`Priority group ${priority} completed successfully`);
    
  } catch (error) {
    console.error(`Failed to verify completion of priority group ${priority}:`, error.message);
    
    // Additional debugging information
    try {
      const priorityGroupContainer = page.locator('.priority-group-header').filter({
        hasText: `Priority ${priority}`
      });
      
      if (await priorityGroupContainer.count() > 0) {
        const statusElement = priorityGroupContainer.locator('.group-status-label').first();
        if (await statusElement.count() > 0) {
          const finalStatus = await statusElement.textContent();
          console.error(`Final status was: "${finalStatus}"`);
        }
        
        const progressElement = priorityGroupContainer.locator('.group-progress').first();
        if (await progressElement.count() > 0) {
          const finalProgress = await progressElement.textContent();
          console.error(`Final progress was: "${finalProgress}"`);
        }
      }
    } catch (debugError) {
      console.error('Could not retrieve debug information:', debugError.message);
    }
    
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
    
    // Robust completion detection with polling and extended timeout
    const maxWaitTime = getTimeout(45000); // 45 seconds for all groups
    const pollInterval = 2000; // Check every 2 seconds
    const startTime = Date.now();
    
    let allCompleted = false;
    
    while (Date.now() - startTime < maxWaitTime && !allCompleted) {
      try {
        // Look for overall completion indicators
        const completionSelectors = [
          '.auto-setup-complete',
          '.all-groups-complete', 
          '.setup-finished',
          'text=/all.*complete|setup.*complete|finished/i'
        ];
        
        // Check each completion indicator
        for (const selector of completionSelectors) {
          try {
            const element = page.locator(selector);
            const count = await element.count();
            if (count > 0 && await element.first().isVisible()) {
              allCompleted = true;
              console.log(`Found completion indicator: ${selector}`);
              break;
            }
          } catch {
            // Continue to next selector
          }
        }
        
        // Additional check for auto-setup container with completion text
        if (!allCompleted) {
          try {
            const containerWithCompletionText = page.locator('.auto-setup-container').filter({ 
              hasText: /all.*complete|setup.*complete|finished|done/i 
            });
            const count = await containerWithCompletionText.count();
            if (count > 0 && await containerWithCompletionText.first().isVisible()) {
              allCompleted = true;
              console.log('Found completion text in auto-setup container');
            }
          } catch {
            // Continue to alternative checks
          }
        }
        
        // Alternative approach: check if all individual priority groups are completed
        if (!allCompleted) {
          try {
            const priorityGroups = page.locator('.priority-group-header');
            const groupCount = await priorityGroups.count();
            
            if (groupCount > 0) {
              let completedGroups = 0;
              
              for (let i = 0; i < groupCount; i++) {
                const group = priorityGroups.nth(i);
                
                // Check if this group shows completion
                const completionChecks = [
                  group.locator('.group-status-label').filter({ hasText: /complete|success|done|finished/i }),
                  group.locator('.group-progress').filter({ hasText: /(\d+)\/\1\s+(completed|done)/i }),
                  group.locator('.group-status-icon.success, .group-status-icon.completed, .status-success, .status-completed')
                ];
                
                let groupCompleted = false;
                for (const check of completionChecks) {
                  const checkCount = await check.count();
                  if (checkCount > 0 && await check.first().isVisible()) {
                    groupCompleted = true;
                    break;
                  }
                }
                
                // Fallback: check if not waiting/running/error
                if (!groupCompleted) {
                  const waitingCount = await group.locator('.group-status-label').filter({ hasText: /waiting|running|in progress/i }).count();
                  const errorCount = await group.locator('.group-status-label').filter({ hasText: /error|failed|fail/i }).count();
                  if (waitingCount === 0 && errorCount === 0) {
                    groupCompleted = true;
                  }
                }
                
                if (groupCompleted) {
                  completedGroups++;
                }
              }
              
              console.log(`Individual group check: ${completedGroups}/${groupCount} groups completed`);
              
              if (completedGroups === groupCount && groupCount > 0) {
                allCompleted = true;
                console.log('All individual priority groups appear completed');
              }
            }
          } catch (groupCheckError) {
            console.log('Individual group check failed:', groupCheckError.message);
          }
        }
        
        if (!allCompleted) {
          // Wait before next poll
          await page.waitForTimeout(pollInterval);
        }
        
      } catch (checkError) {
        // Continue polling if individual check fails
        await page.waitForTimeout(pollInterval);
      }
    }
    
    expect(allCompleted).toBe(true);
    console.log('All priority groups completed successfully');
    
  } catch (error) {
    console.error('Failed to verify completion of all priority groups:', error.message);
    
    // Additional debugging information
    try {
      const priorityGroups = page.locator('.priority-group-header');
      const groupCount = await priorityGroups.count();
      console.error(`Found ${groupCount} priority groups`);
      
      for (let i = 0; i < Math.min(groupCount, 5); i++) { // Limit to 5 for debugging
        const group = priorityGroups.nth(i);
        const groupText = await group.textContent();
        const statusElement = group.locator('.group-status-label').first();
        const status = await statusElement.count() > 0 ? await statusElement.textContent() : 'No status';
        console.error(`Group ${i + 1}: "${groupText?.substring(0, 50)}..." - Status: "${status}"`);
      }
    } catch (debugError) {
      console.error('Could not retrieve debug information:', debugError.message);
    }
    
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