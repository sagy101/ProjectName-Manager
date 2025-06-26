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
 * Finds a configuration section by title regardless of visibility state
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section to find
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for finding the section
 * @param {string} options.state - State to wait for ('visible', 'attached', 'hidden')
 * @returns {Promise<any>} The section locator
 */
async function findConfigSectionAnyState(window, sectionTitle, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM, state = 'attached' } = options;
  
  try {
    // Find the section by its title without requiring visibility
    const sectionTitleLocator = window.locator(`h2:has-text("${sectionTitle}")`);
    await sectionTitleLocator.waitFor({ state, timeout });
    
    // Navigate to the parent config section
    const sectionLocator = sectionTitleLocator.locator('..').locator('..');
    
    return sectionLocator;
  } catch (error) {
    throw new Error(`Failed to find config section "${sectionTitle}" in state "${state}": ${error.message}`);
  }
}

/**
 * Checks if a configuration section exists in the DOM regardless of visibility
 * @param {any} window - The Playwright window object
 * @param {string} sectionTitle - The title of the section to check
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} True if section exists in DOM
 */
async function sectionExistsInDOM(window, sectionTitle, options = {}) {
  try {
    const sectionTitleLocator = window.locator(`h2:has-text("${sectionTitle}")`);
    const count = await sectionTitleLocator.count();
    return count > 0;
  } catch (error) {
    console.warn(`Error checking if section "${sectionTitle}" exists:`, error.message);
    return false;
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
    console.log(`🔍 Attempting to select global project (index ${projectIndex})...`);
    
    // Wait for the app to be fully loaded first
    await window.waitForSelector('.config-container', { timeout });
    console.log('✓ App container found');
    
    // Find the global project dropdown in the environment header
    const gcloudDropdownContainer = window.locator('.environment-header');
    await gcloudDropdownContainer.waitFor({ state: 'visible', timeout });
    console.log('✓ Environment header found');
    
    const gcloudDropdown = gcloudDropdownContainer.locator('.dropdown-selector');
    await gcloudDropdown.waitFor({ state: 'visible', timeout });
    console.log('✓ Global project dropdown found');
    
    // Check if dropdown is already populated with data
    const currentText = await gcloudDropdown.locator('.selected-value').textContent();
    console.log(`Current dropdown text: "${currentText}"`);
    
    // Wait a bit for the dropdown command to execute and populate data
    await window.waitForTimeout(2000);
    
    await gcloudDropdown.click();
    console.log('✓ Dropdown clicked');
    
    // Wait for the options list to be visible with retry logic
    const dropdownList = window.locator('.dropdown-item-list');
    
    // Try multiple approaches to find the dropdown list
    let dropdownVisible = false;
    const maxRetries = 3;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        console.log(`Attempt ${retry + 1}/${maxRetries} to find dropdown list...`);
        await dropdownList.waitFor({ state: 'visible', timeout: timeout / maxRetries });
        dropdownVisible = true;
        break;
      } catch (e) {
        console.log(`Attempt ${retry + 1} failed: ${e.message}`);
        
        if (retry < maxRetries - 1) {
          // Click the dropdown again in case it closed
          await gcloudDropdown.click();
          await window.waitForTimeout(1000);
        }
      }
    }
    
    if (!dropdownVisible) {
      // Debug: check what's actually in the DOM
      const debugInfo = await window.evaluate(() => {
        const header = document.querySelector('.environment-header');
        const dropdown = document.querySelector('.environment-header .dropdown-selector');
        const list = document.querySelector('.dropdown-item-list');
        
        return {
          headerExists: !!header,
          dropdownExists: !!dropdown,
          dropdownHTML: dropdown ? dropdown.outerHTML.substring(0, 500) : null,
          listExists: !!list,
          listVisible: list ? !list.hidden && getComputedStyle(list).display !== 'none' : false,
          allDropdownLists: Array.from(document.querySelectorAll('.dropdown-item-list')).length
        };
      });
      
      console.error('Debug info:', JSON.stringify(debugInfo, null, 2));
      throw new Error('Dropdown list never became visible after multiple attempts');
    }
    
    console.log('✓ Dropdown list is visible');
    
    // Select the project at the specified index
    const projectItems = dropdownList.locator('.dropdown-item');
    const itemCount = await projectItems.count();
    console.log(`Found ${itemCount} dropdown items`);
    
    if (itemCount === 0) {
      throw new Error('No dropdown items found - dropdown may not have loaded properly');
    }
    
    if (projectIndex >= itemCount) {
      console.warn(`Requested index ${projectIndex} but only ${itemCount} items available, using index 0`);
      projectIndex = 0;
    }
    
    const targetProject = projectItems.nth(projectIndex);
    const projectText = await targetProject.textContent();
    console.log(`Selecting project: "${projectText}"`);
    
    await targetProject.waitFor({ state: 'visible', timeout });
    await targetProject.click();
    
    // Verify a selection was made (not the default "Select project..." text)
    const selectedValue = gcloudDropdown.locator('.selected-value');
    await window.waitForFunction(() => {
      const selectedEl = document.querySelector('.environment-header .dropdown-selector .selected-value');
      return selectedEl && !selectedEl.textContent.includes('Select project...') && selectedEl.textContent.trim().length > 0;
    }, { timeout });
    
    const finalSelection = await selectedValue.textContent();
    console.log(`✓ Global project selected: "${finalSelection}" (index ${projectIndex})`);
  } catch (error) {
    console.error(`❌ Failed to select global project:`, error);
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

/**
 * Captures the current configuration state of all sections
 * @param {any} window - The Playwright window object
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<Object>} Object containing the current state of all sections
 */
async function captureConfigurationState(window, options = {}) {
  const { timeout = TIMEOUTS.MEDIUM } = options;
  
  try {
    // Wait for config container to be ready
    await window.waitForSelector('.config-container', { timeout });
    
    const state = await window.evaluate(() => {
      const capturedState = {
        sections: {},
        globalSelections: {},
        timestamp: Date.now()
      };
      
      // Capture section states
      const sectionElements = document.querySelectorAll('.config-section');
      sectionElements.forEach(section => {
        const titleElement = section.querySelector('h2');
        if (!titleElement) return;
        
        const sectionTitle = titleElement.textContent.trim();
        const sectionId = section.getAttribute('data-section-id') || sectionTitle.toLowerCase().replace(/\s+/g, '-');
        
        // Capture main toggle state
        const mainToggle = section.querySelector('input[type="checkbox"]');
        const enabled = mainToggle ? mainToggle.checked : false;
        
        // Capture attach toggle state
        const attachToggle = section.querySelector('.attach-toggle');
        const attached = attachToggle ? attachToggle.classList.contains('attached') : false;
        
        // Capture deployment mode
        const activeModeButton = section.querySelector('.mode-selector .mode-button.active');
        const deploymentMode = activeModeButton ? activeModeButton.getAttribute('data-mode') : null;
        
        // Capture input field values
        const inputFields = {};
        const inputs = section.querySelectorAll('input[type="text"], input[type="number"]');
        inputs.forEach(input => {
          if (input.id || input.name) {
            inputFields[input.id || input.name] = input.value;
          }
        });
        
        // Capture dropdown selections
        const dropdownSelections = {};
        const dropdowns = section.querySelectorAll('.dropdown-selector');
        dropdowns.forEach(dropdown => {
          const id = dropdown.getAttribute('data-dropdown-id');
          const selectedValue = dropdown.querySelector('.selected-value');
          if (id && selectedValue) {
            dropdownSelections[id] = selectedValue.textContent.trim();
          }
        });
        
        capturedState.sections[sectionId] = {
          title: sectionTitle,
          enabled,
          attached,
          deploymentMode,
          inputFields,
          dropdownSelections
        };
      });
      
      // Capture global project selection
      const globalProjectDropdown = document.querySelector('.environment-header .dropdown-selector .selected-value');
      if (globalProjectDropdown) {
        capturedState.globalSelections.project = globalProjectDropdown.textContent.trim();
      }
      
      return capturedState;
    });
    
    console.log('✓ Configuration state captured');
    return state;
  } catch (error) {
    throw new Error(`Failed to capture configuration state: ${error.message}`);
  }
}

/**
 * Compares two configuration states and returns differences
 * @param {Object} state1 - First configuration state
 * @param {Object} state2 - Second configuration state
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.ignoreFields - Fields to ignore in comparison
 * @returns {Object} Object describing the differences
 */
function compareConfigurationStates(state1, state2, options = {}) {
  const { ignoreFields = ['timestamp'] } = options;
  
  const differences = {
    sections: {},
    globalSelections: {},
    hasChanges: false
  };
  
  try {
    // Compare global selections
    if (state1.globalSelections && state2.globalSelections) {
      Object.keys({ ...state1.globalSelections, ...state2.globalSelections }).forEach(key => {
        if (ignoreFields.includes(key)) return;
        
        const val1 = state1.globalSelections[key];
        const val2 = state2.globalSelections[key];
        
        if (val1 !== val2) {
          differences.globalSelections[key] = { before: val1, after: val2 };
          differences.hasChanges = true;
        }
      });
    }
    
    // Compare sections
    const allSectionIds = new Set([
      ...Object.keys(state1.sections || {}),
      ...Object.keys(state2.sections || {})
    ]);
    
    allSectionIds.forEach(sectionId => {
      const section1 = state1.sections?.[sectionId];
      const section2 = state2.sections?.[sectionId];
      
      if (!section1 && !section2) return;
      
      const sectionDiff = {};
      
      // Check if section was added or removed
      if (!section1) {
        sectionDiff.added = section2;
        differences.hasChanges = true;
      } else if (!section2) {
        sectionDiff.removed = section1;
        differences.hasChanges = true;
      } else {
        // Compare section properties
        ['enabled', 'attached', 'deploymentMode'].forEach(prop => {
          if (ignoreFields.includes(prop)) return;
          
          if (section1[prop] !== section2[prop]) {
            sectionDiff[prop] = { before: section1[prop], after: section2[prop] };
            differences.hasChanges = true;
          }
        });
        
        // Compare input fields
        const allInputFields = new Set([
          ...Object.keys(section1.inputFields || {}),
          ...Object.keys(section2.inputFields || {})
        ]);
        
        allInputFields.forEach(fieldId => {
          if (ignoreFields.includes(fieldId)) return;
          
          const val1 = section1.inputFields?.[fieldId];
          const val2 = section2.inputFields?.[fieldId];
          
          if (val1 !== val2) {
            if (!sectionDiff.inputFields) sectionDiff.inputFields = {};
            sectionDiff.inputFields[fieldId] = { before: val1, after: val2 };
            differences.hasChanges = true;
          }
        });
        
        // Compare dropdown selections
        const allDropdowns = new Set([
          ...Object.keys(section1.dropdownSelections || {}),
          ...Object.keys(section2.dropdownSelections || {})
        ]);
        
        allDropdowns.forEach(dropdownId => {
          if (ignoreFields.includes(dropdownId)) return;
          
          const val1 = section1.dropdownSelections?.[dropdownId];
          const val2 = section2.dropdownSelections?.[dropdownId];
          
          if (val1 !== val2) {
            if (!sectionDiff.dropdownSelections) sectionDiff.dropdownSelections = {};
            sectionDiff.dropdownSelections[dropdownId] = { before: val1, after: val2 };
            differences.hasChanges = true;
          }
        });
      }
      
      if (Object.keys(sectionDiff).length > 0) {
        differences.sections[sectionId] = sectionDiff;
      }
    });
    
    return differences;
  } catch (error) {
    throw new Error(`Failed to compare configuration states: ${error.message}`);
  }
}

/**
 * Verifies that two configuration states are equivalent
 * @param {Object} expectedState - Expected configuration state
 * @param {Object} actualState - Actual configuration state
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.ignoreFields - Fields to ignore in comparison
 * @returns {Promise<void>} Throws if states don't match
 */
async function verifyConfigurationState(expectedState, actualState, options = {}) {
  const differences = compareConfigurationStates(expectedState, actualState, options);
  
  if (differences.hasChanges) {
    const errorMessage = `Configuration states do not match:\n${JSON.stringify(differences, null, 2)}`;
    throw new Error(errorMessage);
  }
  
  console.log('✓ Configuration states match');
}

/**
 * Restores a configuration to a specific state
 * @param {any} window - The Playwright window object
 * @param {Object} targetState - Target configuration state to restore
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout for the operation
 * @returns {Promise<void>}
 */
async function restoreConfigurationState(window, targetState, options = {}) {
  const { timeout = TIMEOUTS.LONG } = options;
  
  try {
    // Restore global selections first
    if (targetState.globalSelections?.project) {
      // Note: This would need to be implemented based on available projects
      console.log(`Note: Global project restoration to "${targetState.globalSelections.project}" would need specific implementation`);
    }
    
    // Restore section states
    for (const [sectionId, sectionState] of Object.entries(targetState.sections || {})) {
      const { title, enabled, attached, deploymentMode, inputFields } = sectionState;
      
      try {
        // Enable/disable section
        await toggleSection(window, title, enabled, { timeout });
        
        // Handle attachment
        if (attached && enabled) {
          await attachSection(window, sectionId, { timeout });
        } else if (!attached) {
          await detachSection(window, sectionId, { timeout });
        }
        
        // Set deployment mode
        if (deploymentMode && enabled) {
          await setDeploymentMode(window, sectionId, deploymentMode, { timeout });
        }
        
        // Set input field values
        if (inputFields && Object.keys(inputFields).length > 0) {
          for (const [fieldId, value] of Object.entries(inputFields)) {
            // This would need specific implementation for setting input field values
            console.log(`Note: Input field "${fieldId}" restoration to "${value}" would need specific implementation`);
          }
        }
        
        console.log(`✓ Section "${title}" restored`);
      } catch (error) {
        console.warn(`Warning: Failed to restore section "${title}": ${error.message}`);
      }
    }
    
    console.log('✓ Configuration state restoration completed');
  } catch (error) {
    throw new Error(`Failed to restore configuration state: ${error.message}`);
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
  
  // New helper functions
  findConfigSectionAnyState,
  sectionExistsInDOM,
  
  // Configuration state management
  captureConfigurationState,
  compareConfigurationStates,
  verifyConfigurationState,
  restoreConfigurationState,
}; 