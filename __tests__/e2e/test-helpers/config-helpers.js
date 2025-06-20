/**
 * Configuration section management helpers for e2e tests
 * Handles section toggling, attachment, mode selection, and navigation
 */

const { SELECTORS, TIMEOUTS, STATUS_CLASSES, TEST_DATA } = require('./constants');

/**
 * Finds a configuration section by title
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section to find
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for finding the section
 * @returns {Promise<any>} The section locator
 */
async function findConfigSection(window, sectionTitle, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    // Find the section by its title
    const sectionTitleLocator = window.locator(`h2:has-text("${sectionTitle}")`);
    await sectionTitleLocator.waitFor({ state: 'visible', timeout });
    
    // Navigate to the parent config section
    const sectionLocator = sectionTitleLocator.locator('..').locator('..');
    
    return sectionLocator;
  } catch (error) {
    throw new Error(`Failed to find config section "${sectionTitle}": ${error.message}`);
  }
}

/**
 * Gets the checkbox toggle for a configuration section
 * @param {any} sectionLocator - The section locator
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for finding the toggle
 * @returns {Promise<any>} The toggle checkbox locator
 */
async function getSectionToggle(sectionLocator, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const toggle = sectionLocator.locator(SELECTORS.CONFIG_SECTION_TOGGLE).first();
    await toggle.waitFor({ state: 'visible', timeout });
    return toggle;
  } catch (error) {
    throw new Error(`Failed to find section toggle: ${error.message}`);
  }
}

/**
 * Checks if a configuration section is enabled
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section to check
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} True if section is enabled
 */
async function isSectionEnabled(window, sectionTitle, options = {}) {
  try {
    const sectionLocator = await findConfigSection(window, sectionTitle, options);
    const toggle = await getSectionToggle(sectionLocator, options);
    return await toggle.isChecked();
  } catch (error) {
    console.warn(`Error checking if section "${sectionTitle}" is enabled:`, error.message);
    return false;
  }
}

/**
 * Toggles a configuration section on or off
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section to toggle
 * @param {boolean} enabled - True to enable, false to disable
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force toggle even if already in desired state
 * @param {number} options.waitAfterToggle - Time to wait after toggling
 * @returns {Promise<void>}
 */
async function toggleSection(window, sectionTitle, enabled, options = {}) {
  const { 
    timeout = TIMEOUTS.MEDIUM, 
    force = false, 
    waitAfterToggle = TIMEOUTS.ANIMATION 
  } = options;
  
  try {
    const sectionLocator = await findConfigSection(window, sectionTitle, { timeout });
    const toggle = await getSectionToggle(sectionLocator, { timeout });
    
    const currentState = await toggle.isChecked();
    
    if (currentState !== enabled || force) {
      await toggle.click();
      await window.waitForTimeout(waitAfterToggle);
      
      // Verify the toggle state changed
      const newState = await toggle.isChecked();
      if (newState !== enabled) {
        throw new Error(`Failed to toggle section "${sectionTitle}" to ${enabled ? 'enabled' : 'disabled'}`);
      }
      
      console.log(`✓ Section "${sectionTitle}" ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      console.log(`✓ Section "${sectionTitle}" already ${enabled ? 'enabled' : 'disabled'}`);
    }
  } catch (error) {
    throw new Error(`Failed to toggle section "${sectionTitle}": ${error.message}`);
  }
}

/**
 * Enables a configuration section
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section to enable
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function enableSection(window, sectionTitle, options = {}) {
  return toggleSection(window, sectionTitle, true, options);
}

/**
 * Disables a configuration section
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section to disable
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function disableSection(window, sectionTitle, options = {}) {
  return toggleSection(window, sectionTitle, false, options);
}

/**
 * Checks if a section is attached
 * @param {any} window - The Playwright window object
 * @param {string} sectionId - The ID of the section to check
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} True if section is attached
 */
async function isSectionAttached(window, sectionId, options = {}) {
  try {
    const attachToggle = window.locator(`${SELECTORS.ATTACH_TOGGLE_PREFIX}${sectionId}`);
    return await attachToggle.evaluate(el => el.classList.contains('attached'));
  } catch (error) {
    console.warn(`Error checking if section "${sectionId}" is attached:`, error.message);
    return false;
  }
}

/**
 * Attaches a configuration section
 * @param {any} window - The Playwright window object
 * @param {string} sectionId - The ID of the section to attach
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force attach even if already attached
 * @param {number} options.waitAfterAttach - Time to wait after attaching
 * @returns {Promise<void>}
 */
async function attachSection(window, sectionId, options = {}) {
  const { 
    timeout = TIMEOUTS.MEDIUM, 
    force = false, 
    waitAfterAttach = TIMEOUTS.ANIMATION 
  } = options;
  
  try {
    const attachToggle = window.locator(`${SELECTORS.ATTACH_TOGGLE_PREFIX}${sectionId}`);
    await attachToggle.waitFor({ state: 'visible', timeout });
    
    const isAttached = await isSectionAttached(window, sectionId);
    
    if (!isAttached || force) {
      await attachToggle.click();
      await window.waitForTimeout(waitAfterAttach);
      
      // Verify attachment
      const attachedState = await isSectionAttached(window, sectionId);
      if (!attachedState) {
        throw new Error(`Failed to attach section "${sectionId}"`);
      }
      
      console.log(`✓ Section "${sectionId}" attached`);
    } else {
      console.log(`✓ Section "${sectionId}" already attached`);
    }
  } catch (error) {
    throw new Error(`Failed to attach section "${sectionId}": ${error.message}`);
  }
}

/**
 * Detaches a configuration section
 * @param {any} window - The Playwright window object
 * @param {string} sectionId - The ID of the section to detach
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force detach even if already detached
 * @param {number} options.waitAfterDetach - Time to wait after detaching
 * @returns {Promise<void>}
 */
async function detachSection(window, sectionId, options = {}) {
  const { 
    timeout = TIMEOUTS.MEDIUM, 
    force = false, 
    waitAfterDetach = TIMEOUTS.ANIMATION 
  } = options;
  
  try {
    const attachToggle = window.locator(`${SELECTORS.ATTACH_TOGGLE_PREFIX}${sectionId}`);
    await attachToggle.waitFor({ state: 'visible', timeout });
    
    const isAttached = await isSectionAttached(window, sectionId);
    
    if (isAttached || force) {
      await attachToggle.click();
      await window.waitForTimeout(waitAfterDetach);
      
      // Verify detachment
      const attachedState = await isSectionAttached(window, sectionId);
      if (attachedState) {
        throw new Error(`Failed to detach section "${sectionId}"`);
      }
      
      console.log(`✓ Section "${sectionId}" detached`);
    } else {
      console.log(`✓ Section "${sectionId}" already detached`);
    }
  } catch (error) {
    throw new Error(`Failed to detach section "${sectionId}": ${error.message}`);
  }
}

/**
 * Sets the deployment mode for a section
 * @param {any} window - The Playwright window object
 * @param {string} sectionId - The ID of the section
 * @param {string} mode - The mode to set ('process', 'container', 'run', etc.)
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @param {boolean} options.force - Force set mode even if already selected
 * @param {number} options.waitAfterModeChange - Time to wait after mode change
 * @returns {Promise<void>}
 */
async function setDeploymentMode(window, sectionId, mode, options = {}) {
  const { 
    timeout = TIMEOUTS.MEDIUM, 
    force = false, 
    waitAfterModeChange = TIMEOUTS.ANIMATION 
  } = options;
  
  try {
    const modeSelector = `${SELECTORS.MODE_SELECTOR_PREFIX}${sectionId}-${mode}"]`;
    const modeButton = window.locator(modeSelector);
    
    await modeButton.waitFor({ state: 'visible', timeout });
    
    const isActive = await modeButton.evaluate(el => el.classList.contains('active'));
    
    if (!isActive || force) {
      await modeButton.click();
      await window.waitForTimeout(waitAfterModeChange);
      
      // Verify mode was set
      const newActiveState = await modeButton.evaluate(el => el.classList.contains('active'));
      if (!newActiveState) {
        throw new Error(`Failed to set mode "${mode}" for section "${sectionId}"`);
      }
      
      console.log(`✓ Section "${sectionId}" mode set to "${mode}"`);
    } else {
      console.log(`✓ Section "${sectionId}" already in "${mode}" mode`);
    }
  } catch (error) {
    throw new Error(`Failed to set deployment mode for section "${sectionId}": ${error.message}`);
  }
}

/**
 * Selects a global project from the dropdown
 * @param {any} window - The Playwright window object
 * @param {number} projectIndex - Index of the project to select (0 for first)
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function selectGlobalProject(window, projectIndex = 0, options = {}) {
  const { timeout = TIMEOUTS.LONG } = options;
  
  try {
    // Find the global project dropdown in the environment header
    const gcloudDropdownContainer = window.locator('.environment-header');
    const gcloudDropdown = gcloudDropdownContainer.locator('.dropdown-selector');
    
    await gcloudDropdown.waitFor({ state: 'visible', timeout });
    await gcloudDropdown.click();
    
    // Wait for the options list to be visible
    const dropdownList = window.locator('.dropdown-item-list');
    await dropdownList.waitFor({ state: 'visible', timeout });
    
    // Select the project at the specified index
    const projectItems = dropdownList.locator('.dropdown-item');
    const targetProject = projectItems.nth(projectIndex);
    
    await targetProject.waitFor({ state: 'visible', timeout });
    await targetProject.click();
    
    // Verify a selection was made (not the default "Select project..." text)
    const selectedValue = gcloudDropdown.locator('.selected-value');
    await window.waitForFunction(() => {
      const selectedEl = document.querySelector('.dropdown-selector .selected-value');
      return selectedEl && !selectedEl.textContent.includes('Select project...');
    }, { timeout });
    
    console.log(`✓ Global project selected (index ${projectIndex})`);
  } catch (error) {
    throw new Error(`Failed to select global project: ${error.message}`);
  }
}

/**
 * Opens the info drawer for a configuration section
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function openSectionInfoDrawer(window, sectionTitle, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const sectionLocator = await findConfigSection(window, sectionTitle, { timeout });
    const infoButton = sectionLocator.locator(SELECTORS.VERIFICATION_INFO_BTN);
    
    await infoButton.waitFor({ state: 'visible', timeout });
    
    // Check if drawer is already open
    const isOpen = await infoButton.evaluate(el => el.classList.contains('open'));
    
    if (!isOpen) {
      await infoButton.click();
      await window.waitForTimeout(TIMEOUTS.ANIMATION);
      console.log(`✓ Info drawer opened for section "${sectionTitle}"`);
    } else {
      console.log(`✓ Info drawer already open for section "${sectionTitle}"`);
    }
  } catch (error) {
    throw new Error(`Failed to open info drawer for section "${sectionTitle}": ${error.message}`);
  }
}

/**
 * Closes the info drawer for a configuration section
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function closeSectionInfoDrawer(window, sectionTitle, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const sectionLocator = await findConfigSection(window, sectionTitle, { timeout });
    const infoButton = sectionLocator.locator(SELECTORS.VERIFICATION_INFO_BTN);
    
    await infoButton.waitFor({ state: 'visible', timeout });
    
    // Check if drawer is open
    const isOpen = await infoButton.evaluate(el => el.classList.contains('open'));
    
    if (isOpen) {
      await infoButton.click();
      await window.waitForTimeout(TIMEOUTS.ANIMATION);
      console.log(`✓ Info drawer closed for section "${sectionTitle}"`);
    } else {
      console.log(`✓ Info drawer already closed for section "${sectionTitle}"`);
    }
  } catch (error) {
    throw new Error(`Failed to close info drawer for section "${sectionTitle}": ${error.message}`);
  }
}

/**
 * Navigates to a specific configuration section by clicking on its title
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section to navigate to
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function navigateToSection(window, sectionTitle, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    const sectionTitleElement = window.locator(`text=${sectionTitle}`);
    await sectionTitleElement.waitFor({ state: 'visible', timeout });
    await sectionTitleElement.click();
    
    // Wait for the section to be active/loaded
    await window.waitForSelector(SELECTORS.CONFIG_SECTION, { timeout });
    
    console.log(`✓ Navigated to section "${sectionTitle}"`);
  } catch (error) {
    throw new Error(`Failed to navigate to section "${sectionTitle}": ${error.message}`);
  }
}

/**
 * Configures a section with common settings (enable, attach, set mode)
 * @param {any} window - The Playwright window object
 * @param {Object} config - Configuration object
 * @param {string} config.sectionTitle - Title of the section
 * @param {string} config.sectionId - ID of the section
 * @param {boolean} config.enabled - Whether to enable the section
 * @param {boolean} config.attached - Whether to attach the section
 * @param {string} config.mode - Deployment mode to set
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function configureSection(window, config, options = {}) {
  const { sectionTitle, sectionId, enabled = true, attached = false, mode = null } = config;
  
  try {
    // Enable/disable section
    await toggleSection(window, sectionTitle, enabled, options);
    
    // Handle attachment if specified
    if (attached && enabled) {
      await attachSection(window, sectionId, options);
    }
    
    // Set deployment mode if specified
    if (mode && enabled) {
      await setDeploymentMode(window, sectionId, mode, options);
    }
    
    console.log(`✓ Section "${sectionTitle}" configured successfully`);
  } catch (error) {
    throw new Error(`Failed to configure section "${sectionTitle}": ${error.message}`);
  }
}

module.exports = {
  // Section finding and navigation
  findConfigSection,
  navigateToSection,
  
  // Section state management
  isSectionEnabled,
  toggleSection,
  enableSection,
  disableSection,
  
  // Attachment operations
  isSectionAttached,
  attachSection,
  detachSection,
  
  // Mode selection
  setDeploymentMode,
  
  // Global operations
  selectGlobalProject,
  
  // Info drawer operations
  openSectionInfoDrawer,
  closeSectionInfoDrawer,
  
  // High-level configuration
  configureSection,
  
  // Utility functions
  getSectionToggle,
}; 