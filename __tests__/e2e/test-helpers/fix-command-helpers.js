const { expect } = require('@playwright/test');
const { getTimeout } = require('./constants');
const { expandAppControlSidebar } = require('./sidebar-helpers');

/**
 * Set up the fix command testing environment
 * This replicates the complex beforeEach setup from FixCommandFeature.e2e.spec.js
 * @param {Page} page - Playwright page object
 */
async function setupFixCommandEnvironment(page) {
  try {
    console.log('Setting up fix command environment...');
    
    // Wait for app to fully load
    await page.waitForSelector('.config-container', { timeout: getTimeout(30000) });
    await page.waitForTimeout(getTimeout(2000));
    
    // Expand the sidebar first to access debug tools
    await expandAppControlSidebar(page);
    
    // Click the debug tools button in the App Control Sidebar
    const debugButton = await page.locator('.debug-section-toggle-button');
    await debugButton.click();
    
    // Wait for debug section to expand
    await expect(page.locator('.debug-section-content')).toBeVisible();
    
    // Toggle verifications to invalid state so fix buttons appear
    const toggleVerificationsButton = await page.locator('.debug-section-content button').filter({ hasText: /Toggle Verifications/i });
    if (await toggleVerificationsButton.isVisible()) {
      await toggleVerificationsButton.click();
      await page.waitForTimeout(getTimeout(1500)); // Wait longer for status changes to propagate
    }
    
    // Close debug tools
    await debugButton.click();
    await page.waitForTimeout(getTimeout(500)); // Wait for debug panel to close

    // Find the header for "General Environment" and ensure it's expanded
    const header = page.locator('.verification-header', { hasText: 'General Environment' });
    await header.waitFor({ state: 'visible', timeout: getTimeout(10000) });

    // Find the toggle button within the header and ensure section is expanded
    const toggleButton = header.locator('.toggle-icon');
    
    // Keep trying to expand until we see the verification content
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      // Check if section is collapsed (indicated by ▶)
      const isCollapsed = await toggleButton.evaluate(node => node.textContent.includes('▶'));
      
      if (isCollapsed) {
        await toggleButton.click();
        await page.waitForTimeout(getTimeout(1000)); // Wait for animation
      }
      
      // Check if verification content is now visible
      const isContentVisible = await page.locator('.verification-content').isVisible();
      if (isContentVisible) {
        console.log('✓ General Environment section expanded successfully');
        break;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await page.waitForTimeout(getTimeout(500)); // Wait before next attempt
      }
    }

    // Now, confirm that the "General Environment" link is visible before proceeding.
    await page.waitForSelector('text=General Environment', { state: 'visible', timeout: getTimeout(10000) });
    
    // Most importantly, wait for the verification content to be visible
    await page.waitForSelector('.verification-content', { state: 'visible', timeout: getTimeout(15000) });
    
    // Wait for fix buttons to appear
    await page.waitForFunction(() => {
      const fixButtons = document.querySelectorAll('.fix-button');
      return fixButtons.length > 0;
    }, { timeout: getTimeout(10000) });
    
    console.log('✓ Setup complete - verification content and fix buttons are visible');
  } catch (error) {
    console.error('Failed to setup fix command environment:', error.message);
    throw error;
  }
}

/**
 * Click a fix button and handle the confirmation popup
 * @param {Page} page - Playwright page object
 * @param {Locator} fixButton - The fix button locator to click
 */
async function clickFixButtonWithConfirmation(page, fixButton) {
  try {
    console.log('Clicking fix button with confirmation...');
    
    // Click the fix button
    await fixButton.click();
    
    // Wait for confirmation popup to appear
    await page.waitForSelector('.command-popup-overlay', { timeout: getTimeout(5000) });
    console.log('✓ Popup ".command-popup-overlay" appeared');
    
    // Click the confirm button in the popup
    const confirmButton = page.locator('.confirm-button');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    console.log('✓ Action confirmed');
    
    // Wait for popup to disappear
    await page.waitForSelector('.command-popup-overlay', { state: 'hidden', timeout: getTimeout(5000) });
    console.log('✓ Fix button clicked and action confirmed');
  } catch (error) {
    console.error('Failed to click fix button with confirmation:', error.message);
    throw error;
  }
}

/**
 * Wait for fix command floating terminal to appear
 * @param {Page} page - Playwright page object
 * @param {Object} options - Options for waiting
 * @returns {Locator} The floating terminal locator
 */
async function waitForFixCommandTerminal(page, options = {}) {
  const { timeout = getTimeout(10000), expectedCommand = null } = options;
  
  try {
    console.log('Waiting for fix command floating terminal...');
    
    // Wait for floating terminal to appear
    await page.waitForSelector('.floating-terminal-window', { timeout });
    
    const floatingTerminal = page.locator('.floating-terminal-window').first();
    await expect(floatingTerminal).toBeVisible();
    console.log('✓ Floating terminal appeared');
    
    // If expected command is provided, verify it's in the title
    if (expectedCommand) {
      const terminalTitle = await floatingTerminal.locator('.floating-terminal-title').textContent();
      expect(terminalTitle.toLowerCase()).toContain(expectedCommand.toLowerCase());
      console.log(`✓ Fix command terminal opened: ${terminalTitle}`);
    } else {
      const terminalTitle = await floatingTerminal.locator('.floating-terminal-title').textContent();
      console.log(`✓ Fix command terminal opened: ${terminalTitle}`);
    }
    
    return floatingTerminal;
  } catch (error) {
    console.error('Failed to wait for fix command terminal:', error.message);
    throw error;
  }
}

/**
 * Close floating terminal forcefully if it's stuck
 * @param {Page} page - Playwright page object
 */
async function closeFloatingTerminalForcefully(page) {
  try {
    console.log('Attempting to close floating terminal...');
    
    const floatingTerminal = page.locator('.floating-terminal-window');
    
    if (await floatingTerminal.count() === 0) {
      console.log('✓ Floating terminal closed naturally');
      return;
    }
    
    // Try the close button first
    const closeButton = floatingTerminal.locator('.close-button, .floating-terminal-close');
    
    if (await closeButton.count() > 0 && await closeButton.isEnabled()) {
      await closeButton.click();
      
      // Wait to see if it closes
      try {
        await page.waitForSelector('.floating-terminal-window', { state: 'hidden', timeout: getTimeout(3000) });
        console.log('✓ Floating terminal closed via close button');
        return;
      } catch {
        // Continue to force close
      }
    }
    
    console.log('Terminal did not close naturally, attempting manual close...');
    
    // Check if close button is disabled (safety period)
    const isCloseDisabled = await closeButton.isDisabled().catch(() => true);
    if (isCloseDisabled) {
      console.log('Close button is disabled (likely in timeout period)');
    }
    
    // Force close by DOM manipulation
    await page.evaluate(() => {
      const terminals = document.querySelectorAll('.floating-terminal-window');
      terminals.forEach(terminal => terminal.remove());
    });
    
    console.log('✓ Floating terminal force closed via DOM manipulation');
    
    // Verify it's gone
    await page.waitForSelector('.floating-terminal-window', { state: 'hidden', timeout: getTimeout(2000) });
    
  } catch (error) {
    console.error('Failed to close floating terminal:', error.message);
    // Don't throw - this is a cleanup operation
  }
}

/**
 * Execute a fix command workflow (click button, confirm, wait for terminal)
 * @param {Page} page - Playwright page object
 * @param {number} buttonIndex - Index of the fix button to click (0-based)
 * @param {Object} options - Options for the workflow
 */
async function executeFixCommand(page, buttonIndex = 0, options = {}) {
  const { expectedCommand = null, waitForCompletion = false } = options;
  
  try {
    console.log(`Executing fix command workflow (button ${buttonIndex})...`);
    
    // Get the fix buttons
    const fixButtons = await page.locator('.fix-button').all();
    
    if (fixButtons.length === 0) {
      throw new Error('No fix buttons found');
    }
    
    if (buttonIndex >= fixButtons.length) {
      throw new Error(`Button index ${buttonIndex} out of range (only ${fixButtons.length} buttons found)`);
    }
    
    const fixButton = fixButtons[buttonIndex];
    console.log(`✓ Found ${fixButtons.length} fix buttons`);
    
    // Click the fix button with confirmation
    await clickFixButtonWithConfirmation(page, fixButton);
    
    // Wait for floating terminal
    const terminal = await waitForFixCommandTerminal(page, { expectedCommand });
    
    if (waitForCompletion) {
      // Wait for command to complete (you might want to customize this)
      await page.waitForTimeout(getTimeout(5000));
    }
    
    console.log('✓ Fix command execution completed');
    
    return terminal;
  } catch (error) {
    console.error('Failed to execute fix command:', error.message);
    throw error;
  }
}

/**
 * Validate fix command configuration structure
 * @param {Array} verifications - Array of verification objects to validate
 * @returns {Object} Validation results
 */
function validateFixCommandConfiguration(verifications) {
  const results = {
    valid: true,
    errors: [],
    fixCommands: [],
    totalVerifications: verifications.length,
    verificationsWithFixCommands: 0
  };
  
  try {
    verifications.forEach((verification, index) => {
      // Check required fields
      if (!verification.id) {
        results.errors.push(`Verification ${index}: Missing 'id' field`);
        results.valid = false;
      }
      
      if (!verification.title) {
        results.errors.push(`Verification ${index}: Missing 'title' field`);
        results.valid = false;
      }
      
      if (!verification.checkType) {
        results.errors.push(`Verification ${index}: Missing 'checkType' field`);
        results.valid = false;
      }
      
      // Check fix command if present
      if (verification.fixCommand) {
        results.verificationsWithFixCommands++;
        results.fixCommands.push({
          id: verification.id,
          command: verification.fixCommand
        });
        
        if (typeof verification.fixCommand !== 'string') {
          results.errors.push(`Verification ${verification.id}: fixCommand must be a string`);
          results.valid = false;
        }
        
        if (verification.fixCommand.trim().length === 0) {
          results.errors.push(`Verification ${verification.id}: fixCommand cannot be empty`);
          results.valid = false;
        }
        
        // Check for dangerous operations
        const dangerousPatterns = [
          /rm\s+-rf\s+\//,
          /sudo\s+rm/,
          />\s*\/dev\/(sda|hda)/,
          /format\s+[A-Z]:/
        ];
        
        dangerousPatterns.forEach(pattern => {
          if (pattern.test(verification.fixCommand)) {
            results.errors.push(`Verification ${verification.id}: fixCommand contains potentially dangerous operation`);
            results.valid = false;
          }
        });
      }
      
      // Check for duplicate IDs
      const duplicates = verifications.filter(v => v.id === verification.id);
      if (duplicates.length > 1) {
        results.errors.push(`Verification ${verification.id}: Duplicate ID found`);
        results.valid = false;
      }
    });
    
    console.log(`Validation complete: ${results.totalVerifications} verifications, ${results.verificationsWithFixCommands} with fix commands`);
    
    if (!results.valid) {
      console.error(`Validation failed with ${results.errors.length} errors`);
    }
    
  } catch (error) {
    results.valid = false;
    results.errors.push(`Validation error: ${error.message}`);
  }
  
  return results;
}

module.exports = {
  setupFixCommandEnvironment,
  clickFixButtonWithConfirmation,
  waitForFixCommandTerminal,
  closeFloatingTerminalForcefully,
  executeFixCommand,
  validateFixCommandConfiguration
}; 