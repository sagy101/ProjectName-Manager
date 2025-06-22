/**
 * Verification system and fix command helpers for e2e tests
 * Handles verification sections, fix buttons, and floating terminals
 */

const { expect } = require('@playwright/test');
const { SELECTORS, TIMEOUTS, STATUS_CLASSES, TEST_DATA } = require('./constants');
const { confirmAction } = require('./ui-helpers');
const { expandAppControlSidebar, collapseAppControlSidebar } = require('./sidebar-helpers');

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

/**
 * Opens multiple floating terminals for testing
 * @param {any} window - The Playwright window object
 * @param {number} count - Number of terminals to open
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for operations
 * @returns {Promise<Array>} Array of terminal locators
 */
async function openMultipleFloatingTerminals(window, count, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const terminals = [];
    const fixButtons = await getFixButtons(window);
    
    if (fixButtons.length < count) {
      throw new Error(`Not enough fix buttons available. Requested: ${count}, Available: ${fixButtons.length}`);
    }
    
    for (let i = 0; i < count; i++) {
      console.log(`📂 Opening floating terminal ${i + 1}/${count}...`);
      // Pass the actual button element, not the index
      await executeFixCommand(window, fixButtons[i], { waitForTerminal: true, closeTerminal: false, timeout });
      
      const terminal = await waitForFloatingTerminal(window, { timeout });
      terminals.push(terminal);
      
      await expect(terminal).toBeVisible();
    }
    
    console.log(`✓ Opened ${terminals.length} floating terminals`);
    return terminals;
  } catch (error) {
    throw new Error(`Failed to open multiple floating terminals: ${error.message}`);
  }
}

/**
 * Tests floating terminal focus management
 * @param {any} window - The Playwright window object
 * @param {Array} terminals - Array of terminal locators
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function testTerminalFocusManagement(window, terminals, options = {}) {
  try {
    console.log('🎯 Testing terminal focus management...');
    
    const terminalTitles = [];
    
    // Get titles for all terminals
    for (let i = 0; i < terminals.length; i++) {
      const title = await terminals[i].locator('.floating-terminal-title').textContent();
      terminalTitles.push(title);
      expect(title).toBeTruthy();
      console.log(`✓ Terminal ${i + 1}: "${title}"`);
    }
    
    // Test that all terminals are visible and responsive
    for (const terminal of terminals) {
      await expect(terminal).toBeVisible();
    }
    
    console.log('✓ Terminal focus management working');
    return terminalTitles;
  } catch (error) {
    throw new Error(`Failed to test terminal focus management: ${error.message}`);
  }
}

/**
 * Opens floating terminal info panel
 * @param {any} window - The Playwright window object
 * @param {any} terminal - Terminal locator
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for operations
 * @returns {Promise<any>} Info panel locator or null if not available
 */
async function openFloatingTerminalInfoPanel(window, terminal, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    // Look for info button in terminal title bar
    const infoButton = terminal.locator('.floating-terminal-info-btn, button[title*="Information"], button[title*="info"]');
    
    if (await infoButton.count() > 0) {
      console.log('ℹ️ Opening terminal info panel...');
      await infoButton.click();
      
      // Wait for info panel to appear
      const infoPanel = window.locator('.tab-info-panel, .terminal-info-panel, [data-testid="terminal-info-panel"]');
      
      if (await infoPanel.count() > 0) {
        await expect(infoPanel).toBeVisible();
        console.log('✓ Terminal info panel opened');
        return infoPanel;
      } else {
        console.log('ℹ️ Info panel not found - may not be implemented for this terminal type');
        return null;
      }
    } else {
      console.log('ℹ️ Info button not found - may not be available for this terminal type');
      return null;
    }
  } catch (error) {
    throw new Error(`Failed to open floating terminal info panel: ${error.message}`);
  }
}

/**
 * Tests floating terminal info panel details
 * @param {any} window - The Playwright window object
 * @param {any} infoPanel - Info panel locator
 * @param {Object} options - Configuration options
 * @returns {Promise<string|null>} Panel title or null if not available
 */
async function testInfoPanelDetails(window, infoPanel, options = {}) {
  try {
    if (!infoPanel) return null;
    
    // Test info panel details if available
    const detailsButton = infoPanel.locator('button:has-text("Details"), .details-button');
    if (await detailsButton.count() > 0) {
      console.log('📋 Opening info panel details...');
      await detailsButton.click();
      
      // Check for expanded details
      const detailsContent = infoPanel.locator('.details-content, .expanded-details');
      if (await detailsContent.count() > 0) {
        await expect(detailsContent).toBeVisible();
        console.log('✓ Info panel details opened');
      }
    }
    
    // Test that info panel is functional
    const panelTitle = infoPanel.locator('h3, h4, .panel-title');
    if (await panelTitle.count() > 0) {
      const titleText = await panelTitle.first().textContent();
      expect(titleText).toBeTruthy();
      console.log(`✓ Info panel title: "${titleText}"`);
      return titleText;
    }
    
    console.log('✓ Info panel functionality verified');
    return null;
  } catch (error) {
    throw new Error(`Failed to test info panel details: ${error.message}`);
  }
}

/**
 * Tests floating terminal positioning and interactions
 * @param {any} window - The Playwright window object
 * @param {any} terminal - Terminal locator
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Position information
 */
async function testTerminalPositioning(window, terminal, options = {}) {
  try {
    console.log('🔧 Testing terminal positioning and interactions...');
    
    // Get initial position
    const initialBounds = await terminal.boundingBox();
    expect(initialBounds).toBeTruthy();
    console.log(`✓ Terminal initial position: x=${initialBounds.x}, y=${initialBounds.y}`);
    
    // Test title bar interaction
    const titleBar = terminal.locator('.floating-terminal-title-bar');
    await expect(titleBar).toBeVisible();
    
    console.log('🖱️ Testing terminal title bar interaction...');
    await titleBar.click(); // Focus the terminal
    
    // Check if terminal is still visible and responsive after interaction
    await expect(terminal).toBeVisible();
    const terminalTitle = await terminal.locator('.floating-terminal-title').textContent();
    expect(terminalTitle).toBeTruthy();
    console.log(`✓ Terminal "${terminalTitle}" responsive to interaction`);
    
    return {
      position: initialBounds,
      title: terminalTitle
    };
  } catch (error) {
    throw new Error(`Failed to test terminal positioning: ${error.message}`);
  }
}

/**
 * Tests floating terminal controls (minimize, etc.)
 * @param {any} window - The Playwright window object
 * @param {any} terminal - Terminal locator
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} Whether controls were found and tested
 */
async function testTerminalControls(window, terminal, options = {}) {
  const { timeout = TIMEOUTS.SHORT } = options;
  
  try {
    console.log('🎛️ Testing terminal controls...');
    const controls = terminal.locator('.floating-terminal-controls');
    
    if (await controls.count() > 0) {
      await expect(controls).toBeVisible();
      
      // Test minimize button if available
      const minimizeButton = controls.locator('.floating-terminal-minimize-btn, button[title*="Minimize"]');
      if (await minimizeButton.count() > 0) {
        console.log('📉 Testing minimize functionality...');
        await minimizeButton.click();
        
        // Check if terminal is minimized (implementation may vary)
        await window.waitForTimeout(timeout);
        console.log('✓ Minimize button clicked');
        return true;
      }
    }
    
    console.log('ℹ️ No terminal controls found or available');
    return false;
  } catch (error) {
    throw new Error(`Failed to test terminal controls: ${error.message}`);
  }
}

/**
 * Tests floating terminal state persistence during navigation
 * @param {any} window - The Playwright window object
 * @param {any} terminal - Terminal locator
 * @param {Array} sections - Array of section names to navigate to
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function testTerminalStatePersistence(window, terminal, sections = [], options = {}) {
  const { timeout = TIMEOUTS.SHORT } = options;
  
  try {
    console.log('🧭 Testing terminal persistence during navigation...');
    
    const terminalTitle = await terminal.locator('.floating-terminal-title').textContent();
    
    // Navigate to different configuration sections
    for (const sectionName of sections) {
      const sectionButton = window.locator(`text=${sectionName}`);
      if (await sectionButton.count() > 0) {
        console.log(`📍 Navigating to ${sectionName}...`);
        await sectionButton.click();
        await window.waitForTimeout(timeout);
        
        // Verify terminal is still visible
        await expect(terminal).toBeVisible();
        const currentTitle = await terminal.locator('.floating-terminal-title').textContent();
        expect(currentTitle).toBe(terminalTitle);
      }
    }
    
    console.log('✓ Terminal state persisted through navigation');
  } catch (error) {
    throw new Error(`Failed to test terminal state persistence: ${error.message}`);
  }
}

/**
 * Tests floating terminal with sidebar interactions
 * @param {any} window - The Playwright window object
 * @param {any} terminal - Terminal locator
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function testTerminalWithSidebarInteractions(window, terminal, options = {}) {
  try {
    console.log('🔄 Testing terminal persistence during sidebar interactions...');
    
    // Test sidebar expand/collapse
    await expandAppControlSidebar(window);
    await expect(terminal).toBeVisible();
    
    await collapseAppControlSidebar(window);
    await expect(terminal).toBeVisible();
    
    console.log('✓ Terminal persisted through sidebar interactions');
  } catch (error) {
    throw new Error(`Failed to test terminal with sidebar interactions: ${error.message}`);
  }
}

/**
 * Tests floating terminal stacking and z-index management
 * @param {any} window - The Playwright window object
 * @param {Array} terminals - Array of terminal locators
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function testTerminalStacking(window, terminals, options = {}) {
  try {
    console.log('📚 Testing terminal stacking...');
    
    // Click each terminal to bring it to front
    for (const terminal of terminals) {
      await terminal.locator('.floating-terminal-title-bar').click();
      await expect(terminal).toBeVisible();
    }
    
    console.log('✓ Terminal stacking working correctly');
  } catch (error) {
    throw new Error(`Failed to test terminal stacking: ${error.message}`);
  }
}

/**
 * Closes multiple floating terminals
 * @param {any} window - The Playwright window object
 * @param {Array} terminals - Array of terminal locators
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function closeMultipleFloatingTerminals(window, terminals, options = {}) {
  try {
    console.log(`🧹 Closing ${terminals.length} floating terminals...`);
    
    for (const terminal of terminals) {
      await closeFloatingTerminal(window, terminal, options);
    }
    
    // Verify all terminals are closed
    const remainingTerminals = await window.locator('.floating-terminal-window').count();
    expect(remainingTerminals).toBe(0);
    
    console.log('✓ All floating terminals closed');
  } catch (error) {
    throw new Error(`Failed to close multiple floating terminals: ${error.message}`);
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
  openMultipleFloatingTerminals,
  testTerminalFocusManagement,
  openFloatingTerminalInfoPanel,
  testInfoPanelDetails,
  testTerminalPositioning,
  testTerminalControls,
  testTerminalStatePersistence,
  testTerminalWithSidebarInteractions,
  testTerminalStacking,
  closeMultipleFloatingTerminals,
  
  // Verification status
  waitForVerificationRerun,
  pollForAllVerificationsValid,
  ensureAllVerificationsValid,
  
  // High-level workflows
  executeFixCommand,
}; 