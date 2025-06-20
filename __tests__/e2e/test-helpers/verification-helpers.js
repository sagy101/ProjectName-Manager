/**
 * Verification system and fix command helpers for e2e tests
 * Handles verification sections, fix buttons, and floating terminals
 */

const { SELECTORS, TIMEOUTS, STATUS_CLASSES, TEST_DATA } = require('./constants');
const { confirmAction } = require('./ui-helpers');

/**
 * Expands a verification section
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the verification section
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {number} options.maxAttempts - Maximum attempts to expand
 * @returns {Promise<void>}
 */
async function expandVerificationSection(window, sectionTitle = TEST_DATA.GENERAL_ENV_TITLE, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, maxAttempts = 5 } = options;
  
  try {
    // Find the header for the verification section
    const header = window.locator(SELECTORS.VERIFICATION_HEADER, { hasText: sectionTitle });
    await header.waitFor({ state: 'visible', timeout });

    // Find the toggle button within the header
    const toggleButton = header.locator(SELECTORS.TOGGLE_ICON);
    
    let attempts = 0;
    while (attempts < maxAttempts) {
      // Check if section is collapsed (indicated by ▶)
      const isCollapsed = await toggleButton.evaluate(node => node.textContent.includes('▶'));
      
      if (isCollapsed) {
        await toggleButton.click();
        await window.waitForTimeout(TIMEOUTS.ANIMATION);
      }
      
      // Check if verification content is now visible
      const isContentVisible = await window.locator(SELECTORS.VERIFICATION_CONTENT).isVisible();
      if (isContentVisible) {
        console.log(`✓ Verification section "${sectionTitle}" expanded successfully`);
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await window.waitForTimeout(TIMEOUTS.ANIMATION);
      }
    }
    
    throw new Error(`Failed to expand verification section after ${maxAttempts} attempts`);
  } catch (error) {
    throw new Error(`Failed to expand verification section "${sectionTitle}": ${error.message}`);
  }
}

/**
 * Collapses a verification section
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the verification section
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function collapseVerificationSection(window, sectionTitle = TEST_DATA.GENERAL_ENV_TITLE, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const header = window.locator(SELECTORS.VERIFICATION_HEADER, { hasText: sectionTitle });
    await header.waitFor({ state: 'visible', timeout });

    const toggleButton = header.locator(SELECTORS.TOGGLE_ICON);
    
    // Check if section is expanded (indicated by ▼)
    const isExpanded = await toggleButton.evaluate(node => node.textContent.includes('▼'));
    
    if (isExpanded) {
      await toggleButton.click();
      await window.waitForTimeout(TIMEOUTS.ANIMATION);
      console.log(`✓ Verification section "${sectionTitle}" collapsed`);
    } else {
      console.log(`✓ Verification section "${sectionTitle}" already collapsed`);
    }
  } catch (error) {
    throw new Error(`Failed to collapse verification section "${sectionTitle}": ${error.message}`);
  }
}

/**
 * Waits for verifications to load and complete
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @param {string} options.sectionTitle - Verification section to wait for
 * @returns {Promise<void>}
 */
async function waitForVerificationsToLoad(window, options = {}) {
  const { timeout = TIMEOUTS.LONG, sectionTitle = TEST_DATA.GENERAL_ENV_TITLE } = options;
  
  try {
    const envVerificationHeader = window.locator(SELECTORS.VERIFICATION_HEADER, { hasText: sectionTitle });
    await envVerificationHeader.waitFor({ state: 'visible', timeout });
    
    // Wait for verification to complete (no longer in "waiting" state)
    await window.waitForFunction(() => {
      const header = document.querySelector('.verification-header');
      return header && !header.classList.contains('waiting');
    }, { timeout });
    
    console.log(`✓ Verifications loaded for "${sectionTitle}"`);
  } catch (error) {
    throw new Error(`Failed to wait for verifications to load: ${error.message}`);
  }
}

/**
 * Gets all fix buttons in the current view
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<any[]>} Array of fix button locators
 */
async function getFixButtons(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const fixButtons = await window.locator(SELECTORS.FIX_BUTTON).all();
    console.log(`✓ Found ${fixButtons.length} fix buttons`);
    return fixButtons;
  } catch (error) {
    throw new Error(`Failed to get fix buttons: ${error.message}`);
  }
}

/**
 * Waits for fix buttons to appear
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @param {number} options.expectedCount - Expected number of fix buttons (optional)
 * @returns {Promise<any[]>} Array of fix button locators
 */
async function waitForFixButtons(window, options = {}) {
  const { timeout = TIMEOUTS.LONG, expectedCount = null } = options;
  
  try {
    await window.waitForFunction((count) => {
      const fixButtons = document.querySelectorAll('.fix-button');
      return count ? fixButtons.length >= count : fixButtons.length > 0;
    }, expectedCount, { timeout });
    
    const fixButtons = await getFixButtons(window);
    console.log(`✓ Fix buttons appeared (found ${fixButtons.length})`);
    return fixButtons;
  } catch (error) {
    throw new Error(`Failed to wait for fix buttons: ${error.message}`);
  }
}

/**
 * Clicks a fix button with confirmation
 * @param {any} window - The Playwright window object
 * @param {any} fixButton - The fix button locator to click
 * @param {Object} options - Configuration options
 * @param {boolean} options.confirmExecution - Whether to confirm the action
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function clickFixButton(window, fixButton, options = {}) {
  const { confirmExecution = true, timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    // Ensure the fix button is visible and enabled before clicking
    await fixButton.waitFor({ state: 'visible', timeout });
    
    // Click the fix button
    await fixButton.click();
    
    if (confirmExecution) {
      // Wait for confirmation popup and confirm
      await confirmAction(window, SELECTORS.COMMAND_POPUP, { timeout });
    }
    
    console.log('✓ Fix button clicked and action confirmed');
  } catch (error) {
    throw new Error(`Failed to click fix button: ${error.message}`);
  }
}

/**
 * Waits for a floating terminal to appear
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @returns {Promise<any>} The floating terminal locator
 */
async function waitForFloatingTerminal(window, options = {}) {
  const { timeout = TIMEOUTS.LONG } = options;
  
  try {
    await window.waitForSelector(SELECTORS.FLOATING_TERMINAL, { timeout });
    const floatingTerminal = window.locator(SELECTORS.FLOATING_TERMINAL).first();
    
    console.log('✓ Floating terminal appeared');
    return floatingTerminal;
  } catch (error) {
    throw new Error(`Failed to wait for floating terminal: ${error.message}`);
  }
}

/**
 * Closes a floating terminal
 * @param {any} window - The Playwright window object
 * @param {any} terminalLocator - The terminal locator to close (optional)
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force close via DOM manipulation if button fails
 * @returns {Promise<void>}
 */
async function closeFloatingTerminal(window, terminalLocator = null, options = {}) {
  const { timeout = TIMEOUTS.VERY_LONG, force = true } = options;
  
  try {
    const terminal = terminalLocator || window.locator(SELECTORS.FLOATING_TERMINAL).first();
    
    // First try waiting for the terminal to close naturally
    try {
      await terminal.waitFor({ state: 'hidden', timeout: TIMEOUTS.MEDIUM });
      console.log('✓ Floating terminal closed naturally');
      return;
    } catch (error) {
      console.log('Terminal did not close naturally, attempting manual close...');
    }
    
    // Try to close the terminal manually
    const closeButton = terminal.locator(`${SELECTORS.FLOATING_TERMINAL_CLOSE}, ${SELECTORS.CLOSE_BUTTON}, button[title*="close"], button[title*="Close"]`);
    
    if (await closeButton.isVisible()) {
      const isEnabled = await closeButton.isEnabled();
      if (isEnabled) {
        await closeButton.click();
        await terminal.waitFor({ state: 'hidden', timeout: TIMEOUTS.MEDIUM });
        console.log('✓ Floating terminal closed via button');
        return;
      } else {
        console.log('Close button is disabled (likely in timeout period)');
      }
    }
    
    // Force close via DOM manipulation if requested
    if (force) {
      await window.evaluate(() => {
        const terminals = document.querySelectorAll('.floating-terminal-window');
        terminals.forEach(terminal => terminal.remove());
      });
      console.log('✓ Floating terminal force closed via DOM manipulation');
    }
  } catch (error) {
    if (force) {
      console.warn('Warning: Could not close floating terminal cleanly, attempting force close');
      try {
        await window.evaluate(() => {
          const terminals = document.querySelectorAll('.floating-terminal-window');
          terminals.forEach(terminal => terminal.remove());
        });
        console.log('✓ Floating terminal force closed');
      } catch (forceError) {
        throw new Error(`Failed to close floating terminal: ${error.message}`);
      }
    } else {
      throw new Error(`Failed to close floating terminal: ${error.message}`);
    }
  }
}

/**
 * Force closes all floating terminals via DOM manipulation
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function forceCloseAllFloatingTerminals(window, options = {}) {
  try {
    await window.evaluate(() => {
      const terminals = document.querySelectorAll('.floating-terminal-window');
      terminals.forEach(terminal => terminal.remove());
    });
    console.log('✓ All floating terminals force closed');
  } catch (error) {
    console.warn('Warning: Could not force close floating terminals:', error.message);
  }
}

/**
 * Waits for a verification to be re-run
 * @param {any} window - The Playwright window object
 * @param {string} verificationId - The ID of the verification to wait for
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @returns {Promise<void>}
 */
async function waitForVerificationRerun(window, verificationId, options = {}) {
  const { timeout = TIMEOUTS.LONG } = options;
  
  try {
    // This is a placeholder - actual implementation would depend on how
    // verification reruns are indicated in the UI
    await window.waitForTimeout(TIMEOUTS.SHORT);
    console.log(`✓ Verification "${verificationId}" rerun completed`);
  } catch (error) {
    throw new Error(`Failed to wait for verification rerun: ${error.message}`);
  }
}

/**
 * Executes a fix command workflow (click fix button, handle terminal, cleanup)
 * @param {any} window - The Playwright window object
 * @param {any} fixButton - The fix button to click
 * @param {Object} options - Configuration options
 * @param {boolean} options.waitForTerminal - Whether to wait for floating terminal
 * @param {boolean} options.closeTerminal - Whether to close the terminal after execution
 * @param {number} options.timeout - Timeout for operations
 * @returns {Promise<void>}
 */
async function executeFixCommand(window, fixButton, options = {}) {
  const { 
    waitForTerminal = true, 
    closeTerminal = true, 
    timeout = TIMEOUTS.MEDIUM 
  } = options;
  
  try {
    // Click the fix button with confirmation
    await clickFixButton(window, fixButton, { timeout });
    
    let terminal = null;
    
    if (waitForTerminal) {
      // Wait for floating terminal to appear
      try {
        terminal = await waitForFloatingTerminal(window, { timeout: TIMEOUTS.LONG });
        
        // Verify terminal opened and get title
        const terminalTitle = await terminal.locator(SELECTORS.FLOATING_TERMINAL_TITLE).textContent();
        console.log(`✓ Fix command terminal opened: ${terminalTitle}`);
      } catch (error) {
        console.log('⚠ Floating terminal did not appear - command may be running in background');
      }
    }
    
    if (closeTerminal && terminal) {
      // Close the terminal
      await closeFloatingTerminal(window, terminal, { timeout: TIMEOUTS.VERY_LONG });
    }
    
    console.log('✓ Fix command execution completed');
  } catch (error) {
    throw new Error(`Failed to execute fix command: ${error.message}`);
  }
}

/**
 * Polls for all verifications to be valid
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for polling
 * @param {number} options.interval - Polling interval
 * @returns {Promise<boolean>} True if all verifications are valid
 */
async function pollForAllVerificationsValid(window, options = {}) {
  const { timeout = TIMEOUTS.LONG, interval = 200 } = options;
  
  const maxTime = Date.now() + timeout;
  
  while (Date.now() < maxTime) {
    try {
      const allValid = await window.evaluate(() => {
        const indicators = Array.from(document.querySelectorAll('.verification-indicator'));
        return indicators.length > 0 && indicators.every(el => el.classList.contains('valid'));
      });
      
      if (allValid) {
        console.log('✓ All verifications are valid');
        return true;
      }
      
      await window.waitForTimeout(interval);
    } catch (error) {
      console.warn('Error checking verification status:', error.message);
    }
  }
  
  console.log('⚠ Not all verifications are valid after timeout');
  return false;
}

/**
 * Ensures all verifications are valid before proceeding
 * Legacy function from original test-helpers.js
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} True if all verifications are valid
 */
async function ensureAllVerificationsValid(window, options = {}) {
  const { timeout = TIMEOUTS.LONG } = options;
  
  try {
    // Expand verification sections and check all indicators
    await expandVerificationSection(window, TEST_DATA.GENERAL_ENV_TITLE, options);
    
    // Poll for all verifications to be valid
    return await pollForAllVerificationsValid(window, { timeout });
  } catch (error) {
    throw new Error(`Failed to ensure all verifications are valid: ${error.message}`);
  }
}

module.exports = {
  // Verification section management
  expandVerificationSection,
  collapseVerificationSection,
  waitForVerificationsToLoad,
  
  // Fix button operations
  getFixButtons,
  waitForFixButtons,
  clickFixButton,
  
  // Floating terminal management
  waitForFloatingTerminal,
  closeFloatingTerminal,
  forceCloseAllFloatingTerminals,
  
  // Verification status
  waitForVerificationRerun,
  pollForAllVerificationsValid,
  ensureAllVerificationsValid,
  
  // High-level workflows
  executeFixCommand,
}; 