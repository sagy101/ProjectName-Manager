/**
 * UI interaction helpers for e2e tests
 * Handles common UI operations like button clicks, notifications, popups, etc.
 */

const { SELECTORS, TIMEOUTS, STATUS_CLASSES } = require('./constants');

/**
 * Waits for an element to be visible with a longer timeout and polling
 * @param {any} window - The Playwright window object
 * @param {string} selector - The CSS selector for the element
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - The maximum time to wait in milliseconds
 * @param {string} options.state - The state to wait for ('visible', 'hidden', 'attached', 'detached')
 * @returns {Promise<void>}
 */
async function waitForElement(window, selector, options = {}) {
  const { timeout = TIMEOUTS.VERY_LONG, state = 'visible' } = options;
  
  try {
    await window.waitForSelector(selector, { state, timeout });
    console.log(`✓ Element "${selector}" is ${state}`);
  } catch (error) {
    throw new Error(`Failed to wait for element "${selector}" to be ${state}: ${error.message}`);
  }
}

/**
 * Clicks a button by its text content
 * @param {any} window - The Playwright window object
 * @param {string} text - The text content of the button
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.exact - Whether to match text exactly
 * @param {boolean} options.caseSensitive - Whether the match should be case sensitive
 * @returns {Promise<void>}
 */
async function clickButtonWithText(window, text, options = {}) {
  const { 
    timeout = TIMEOUTS.MEDIUM, 
    exact = false, 
    caseSensitive = false 
  } = options;
  
  try {
    const buttonSelector = exact 
      ? `button:has-text("${text}")` 
      : `button:has-text("${text}")`;
    
    const button = window.locator(buttonSelector);
    await button.waitFor({ state: 'visible', timeout });
    await button.click();
    
    console.log(`✓ Clicked button with text "${text}"`);
  } catch (error) {
    throw new Error(`Failed to click button with text "${text}": ${error.message}`);
  }
}

/**
 * Waits for a notification to appear
 * @param {any} window - The Playwright window object
 * @param {string} type - Type of notification ('info', 'success', 'error', 'warning')
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @param {string} options.expectedText - Expected text content in the notification
 * @returns {Promise<any>} The notification element locator
 */
async function waitForNotification(window, type = 'info', options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, expectedText = null } = options;
  
  try {
    let notificationSelector = SELECTORS.NOTIFICATION;
    
    // Add type-specific class if specified
    if (type && type !== 'info') {
      notificationSelector = `.notification-${type}`;
    } else if (type === 'info') {
      notificationSelector = SELECTORS.NOTIFICATION_INFO;
    }
    
    const notification = window.locator(notificationSelector);
    await notification.waitFor({ state: 'visible', timeout });
    
    // Check for expected text if provided
    if (expectedText) {
      await window.waitForFunction((args) => {
        const { selector, text } = args;
        const element = document.querySelector(selector);
        return element && element.textContent.includes(text);
      }, { selector: notificationSelector, text: expectedText }, { timeout });
    }
    
    console.log(`✓ ${type} notification appeared${expectedText ? ` with text "${expectedText}"` : ''}`);
    return notification;
  } catch (error) {
    throw new Error(`Failed to wait for ${type} notification: ${error.message}`);
  }
}

/**
 * Dismisses a notification
 * @param {any} window - The Playwright window object
 * @param {any} notification - The notification element locator (optional)
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function dismissNotification(window, notification = null, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const targetNotification = notification || window.locator(SELECTORS.NOTIFICATION);
    
    // Try to find and click a close button within the notification
    const closeButton = targetNotification.locator(SELECTORS.CLOSE_BUTTON);
    
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // If no close button, click the notification itself (some notifications auto-close on click)
      await targetNotification.click();
    }
    
    // Wait for notification to disappear
    await targetNotification.waitFor({ state: 'hidden', timeout });
    
    console.log('✓ Notification dismissed');
  } catch (error) {
    throw new Error(`Failed to dismiss notification: ${error.message}`);
  }
}

/**
 * Waits for a popup/modal to appear
 * @param {any} window - The Playwright window object
 * @param {string} popupSelector - The CSS selector for the popup
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @returns {Promise<any>} The popup element locator
 */
async function waitForPopup(window, popupSelector, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const popup = window.locator(popupSelector);
    await popup.waitFor({ state: 'visible', timeout });
    
    console.log(`✓ Popup "${popupSelector}" appeared`);
    return popup;
  } catch (error) {
    throw new Error(`Failed to wait for popup "${popupSelector}": ${error.message}`);
  }
}

/**
 * Closes a popup/modal
 * @param {any} window - The Playwright window object
 * @param {string} popupSelector - The CSS selector for the popup
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {string} options.closeMethod - How to close ('close-button', 'escape', 'overlay-click')
 * @returns {Promise<void>}
 */
async function closePopup(window, popupSelector, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, closeMethod = 'close-button' } = options;
  
  try {
    const popup = window.locator(popupSelector);
    
    switch (closeMethod) {
      case 'close-button':
        const closeButton = popup.locator(SELECTORS.CLOSE_BUTTON);
        await closeButton.waitFor({ state: 'visible', timeout });
        await closeButton.click();
        break;
        
      case 'escape':
        await window.keyboard.press('Escape');
        break;
        
      case 'overlay-click':
        // Click outside the popup content
        const overlay = popup.locator('..'); // Assuming overlay is parent
        await overlay.click({ position: { x: 0, y: 0 } });
        break;
        
      default:
        throw new Error(`Unknown close method: ${closeMethod}`);
    }
    
    // Wait for popup to disappear
    await popup.waitFor({ state: 'hidden', timeout });
    
    console.log(`✓ Popup "${popupSelector}" closed`);
  } catch (error) {
    throw new Error(`Failed to close popup "${popupSelector}": ${error.message}`);
  }
}

/**
 * Confirms an action in a confirmation popup
 * @param {any} window - The Playwright window object
 * @param {string} popupSelector - The CSS selector for the popup (default: command popup)
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function confirmAction(window, popupSelector = SELECTORS.COMMAND_POPUP, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    // Wait for popup to appear
    await waitForPopup(window, popupSelector, { timeout });
    
    // Click the confirm button
    const confirmButton = window.locator(SELECTORS.CONFIRM_BUTTON);
    await confirmButton.waitFor({ state: 'visible', timeout });
    await confirmButton.click();
    
    // Wait for popup to disappear
    await window.waitForSelector(popupSelector, { state: 'hidden', timeout });
    
    console.log('✓ Action confirmed');
  } catch (error) {
    throw new Error(`Failed to confirm action: ${error.message}`);
  }
}

/**
 * Cancels an action in a confirmation popup
 * @param {any} window - The Playwright window object
 * @param {string} popupSelector - The CSS selector for the popup (default: command popup)
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function cancelAction(window, popupSelector = SELECTORS.COMMAND_POPUP, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    // Wait for popup to appear
    await waitForPopup(window, popupSelector, { timeout });
    
    // Click the cancel button
    const cancelButton = window.locator(SELECTORS.CANCEL_BUTTON);
    await cancelButton.waitFor({ state: 'visible', timeout });
    await cancelButton.click();
    
    // Wait for popup to disappear
    await window.waitForSelector(popupSelector, { state: 'hidden', timeout });
    
    console.log('✓ Action cancelled');
  } catch (error) {
    throw new Error(`Failed to cancel action: ${error.message}`);
  }
}

/**
 * Hovers over an element
 * @param {any} window - The Playwright window object
 * @param {string} selector - The CSS selector for the element to hover
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function hoverElement(window, selector, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const element = window.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await element.hover();
    
    console.log(`✓ Hovered over element "${selector}"`);
  } catch (error) {
    throw new Error(`Failed to hover over element "${selector}": ${error.message}`);
  }
}

/**
 * Scrolls an element into view
 * @param {any} window - The Playwright window object
 * @param {string} selector - The CSS selector for the element to scroll to
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {'top'|'center'|'bottom'} options.position - Where to position the element
 * @returns {Promise<void>}
 */
async function scrollIntoView(window, selector, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, position = 'center' } = options;
  
  try {
    const element = window.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await element.scrollIntoViewIfNeeded();
    
    console.log(`✓ Scrolled element "${selector}" into view`);
  } catch (error) {
    throw new Error(`Failed to scroll element "${selector}" into view: ${error.message}`);
  }
}

/**
 * Waits for text content to appear in an element
 * @param {any} window - The Playwright window object
 * @param {string} selector - The CSS selector for the element
 * @param {string} expectedText - The text to wait for
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @param {boolean} options.exact - Whether to match text exactly
 * @returns {Promise<void>}
 */
async function waitForTextContent(window, selector, expectedText, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, exact = false } = options;
  
  try {
    await window.waitForFunction((args) => {
      const { selector, text, exact } = args;
      const element = document.querySelector(selector);
      if (!element) return false;
      
      const elementText = element.textContent || '';
      return exact ? elementText === text : elementText.includes(text);
    }, { selector, text: expectedText, exact }, { timeout });
    
    console.log(`✓ Text "${expectedText}" appeared in element "${selector}"`);
  } catch (error) {
    throw new Error(`Failed to wait for text "${expectedText}" in element "${selector}": ${error.message}`);
  }
}

/**
 * Checks if an element has a specific class
 * @param {any} window - The Playwright window object
 * @param {string} selector - The CSS selector for the element
 * @param {string} className - The class name to check for
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<boolean>} True if element has the class
 */
async function hasClass(window, selector, className, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const element = window.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    
    return await element.evaluate((el, cls) => {
      return el.classList.contains(cls);
    }, className);
  } catch (error) {
    console.warn(`Error checking class "${className}" on element "${selector}":`, error.message);
    return false;
  }
}

/**
 * Waits for an element to have a specific class
 * @param {any} window - The Playwright window object
 * @param {string} selector - The CSS selector for the element
 * @param {string} className - The class name to wait for
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for waiting
 * @param {boolean} options.shouldHave - Whether the element should have the class (true) or not have it (false)
 * @returns {Promise<void>}
 */
async function waitForClass(window, selector, className, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, shouldHave = true } = options;
  
  try {
    await window.waitForFunction((args) => {
      const { selector, className, shouldHave } = args;
      const element = document.querySelector(selector);
      if (!element) return false;
      
      const hasClass = element.classList.contains(className);
      return shouldHave ? hasClass : !hasClass;
    }, { selector, className, shouldHave }, { timeout });
    
    console.log(`✓ Element "${selector}" ${shouldHave ? 'has' : 'does not have'} class "${className}"`);
  } catch (error) {
    throw new Error(`Failed to wait for class "${className}" on element "${selector}": ${error.message}`);
  }
}

module.exports = {
  // Element interactions
  waitForElement,
  clickButtonWithText,
  hoverElement,
  scrollIntoView,
  
  // Notifications
  waitForNotification,
  dismissNotification,
  
  // Popups and modals
  waitForPopup,
  closePopup,
  confirmAction,
  cancelAction,
  
  // Text and content
  waitForTextContent,
  
  // CSS classes
  hasClass,
  waitForClass,
}; 