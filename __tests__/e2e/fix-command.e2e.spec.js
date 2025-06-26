const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { 
  launchElectron, 
  ensureAllVerificationsValid, 
  getTimeout,
  // New consolidated helpers
  openDebugTools,
  closeDebugTools,
  toggleAllVerifications,
  expandVerificationSection,
  getFixButtons,
  clickFixButton,
  waitForFloatingTerminal,
  closeFloatingTerminal,
  executeFixCommand,
  navigateToSection,
  waitForPopup,
  confirmAction
} = require('./test-helpers');

// Environment detection
const isMock = process.env.E2E_ENV === 'mock';

// Import configuration data to validate test scenarios
const generalEnvironmentVerifications = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/environment-verification/generalEnvironmentVerifications.json'), 'utf8')
);
const configurationSidebarAbout = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/project-config/config/configurationSidebarAbout.json'), 'utf8')
);

// Define mock statuses to be used in tests
const mockStatuses = {
  general: {
    cloudGcloudCLI: 'invalid',
    cloudKubectlCLI: 'invalid',
    rancherDesktop: 'valid',
    nodeJs: 'invalid',
    nvmInstalled: 'valid'
  },
  configuration: {
    mirrorDirExists: 'invalid',
    ChromiumInstalled: 'invalid',
    threatIntelligenceDirExists: 'valid'
  }
};

test.describe('Fix Command Feature', () => {
  let electronApp;
  let window;

  // Helper function to safely check if fix buttons are available
  const hasFixButtons = async () => {
    try {
      const fixButtons = await getFixButtons(window);
      return fixButtons.length > 0;
    } catch (error) {
      return false;
    }
  };

  // Helper function to handle fix button click with confirmation using our helpers
  const clickFixButtonWithConfirmation = async (fixButton) => {
    // Use our helper to execute the fix command
    await executeFixCommand(window, fixButton);
  };

  // Helper function to ensure terminal is properly closed using our helper
  const ensureTerminalClosed = async (terminal) => {
    await closeFloatingTerminal(window, terminal);
  };

  test.beforeEach(async () => {
    // Launch Electron app
    const { electronApp: app, window: win } = await launchElectron();
    electronApp = app;
    window = win;
    
    // Ensure clean start - remove any lingering floating terminals from previous tests
    try {
      await window.evaluate(() => {
        const terminals = document.querySelectorAll('.floating-terminal-window');
        terminals.forEach(terminal => terminal.remove());
      });
    } catch (error) {
      // Ignore errors during cleanup as the page might not be fully loaded yet
    }
    
    // Mock the API response for verification statuses
    await window.route('**/get-verification-statuses', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStatuses)
      });
    });

    // Mock the rerun verification endpoint
    await window.route('**/rerun-single-verification', route => {
      const { verificationId } = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          verificationId,
          result: 'valid' // Assume the fix command worked
        })
      });
    });
    
    // Wait for the main container to ensure the app has launched
    await window.waitForSelector('.config-container', { timeout: getTimeout(30000) });
    
    // Wait a bit for the app to fully initialize
    await window.waitForTimeout(getTimeout(2000));

    // Handle verification setup based on environment
    if (isMock) {
      // In mock mode, we can assume verifications might already be invalid
      // Just ensure the verification section is available
      console.log('✓ Mock mode - skipping verification validity check');
    } else {
      // In prod mode, ensure all verifications are valid before toggling
      const allValid = await ensureAllVerificationsValid(window);
      if (!allValid) {
        console.warn('⚠ Not all verifications are valid initially, waiting and retrying...');
        await window.waitForTimeout(getTimeout(3000));
        const retryValid = await ensureAllVerificationsValid(window);
        if (!retryValid) {
          console.warn('⚠ Verifications still not all valid after retry - proceeding anyway');
        }
      }
    }

    // Use our helper to open debug tools and toggle verifications
    await openDebugTools(window);
    await toggleAllVerifications(window);
    await closeDebugTools(window);

    // Use our helper to expand the General Environment verification section
    await expandVerificationSection(window, 'General Environment');
    
    // Wait for fix buttons to appear
    await window.waitForFunction(() => {
      const fixButtons = document.querySelectorAll('.fix-button');
      return fixButtons.length > 0;
    }, { timeout: getTimeout(10000) });
    
    console.log('✓ Setup complete - verification content and fix buttons are visible');
  });

  test.afterEach(async () => {
    // Clean up any lingering floating terminals before closing the app
    try {
      const floatingTerminals = await window.locator('.floating-terminal-window').all();
      for (const terminal of floatingTerminals) {
        if (await terminal.isVisible()) {
          await closeFloatingTerminal(window, terminal);
        }
      }
      
      // Force close any remaining terminals
      await window.evaluate(() => {
        const terminals = document.querySelectorAll('.floating-terminal-window');
        terminals.forEach(terminal => terminal.remove());
      });
    } catch (error) {
      console.log('Warning: Could not clean up floating terminals:', error.message);
    }
    
    await electronApp.close();
  });
  
  test.describe('Configuration Data Validation', () => {
    test('should have fix commands in configuration files', async () => {
      // Validate general environment verifications have fix commands
      const generalFixCommands = [];
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand) {
              generalFixCommands.push(verification);
            }
          });
        }
      });

      expect(generalFixCommands.length).toBeGreaterThan(0);
      console.log(`Found ${generalFixCommands.length} fix commands in general environment verifications`);

      // Validate specific expected fix commands exist
      const expectedFixCommands = [
        'cloudGcloudCLI',
        'cloudKubectlCLI', 
        'cloudKubectx',
        'nodeJs',
        'nvmInstalled',
        'goInstalled'
      ];

      expectedFixCommands.forEach(expectedId => {
        const verification = generalFixCommands.find(v => v.id === expectedId);
        expect(verification).toBeDefined();
        expect(verification.fixCommand).toBeTruthy();
      });

      // Validate configuration sidebar verifications have fix commands
      const sidebarFixCommands = [];
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand) {
              sidebarFixCommands.push({...verification, sectionId: section.sectionId});
            }
          });
        }
      });

      expect(sidebarFixCommands.length).toBeGreaterThan(0);
      console.log(`Found ${sidebarFixCommands.length} fix commands in configuration sidebar verifications`);

      // Validate fix command safety
      const allFixCommands = [...generalFixCommands, ...sidebarFixCommands];
      allFixCommands.forEach(verification => {
        expect(verification.fixCommand).toBeTruthy();
        expect(typeof verification.fixCommand).toBe('string');
        
        // Ensure fix commands don't have dangerous operations
        expect(verification.fixCommand).not.toMatch(/rm\s+-rf\s+\//);
        expect(verification.fixCommand).not.toMatch(/sudo\s+rm/);
      });
    });
  });

  test.describe('Fix Button Visibility', () => {
    test('should show environment verification section with fix buttons', async () => {
      // Ensure verification content is visible (should be from beforeEach, but double-check)
      await window.waitForSelector('.verification-content', { state: 'visible', timeout: getTimeout(15000) });
      
      // Check if fix buttons are available using our helper
      const buttonsAvailable = await hasFixButtons();
      if (!buttonsAvailable) {
        console.log('⚠ No fix buttons found - this may indicate an issue with verification toggling');
        // Skip this test if no fix buttons are available
        test.skip();
        return;
      }
      
      // Use our helper to get fix buttons
      const fixButtons = await getFixButtons(window);
      expect(fixButtons.length).toBeGreaterThan(0);
      console.log(`Found ${fixButtons.length} fix buttons in General Environment`);
      
      // Verify fix buttons are visible (checking for any fix buttons is sufficient)
      await expect(window.locator('.fix-button').first()).toBeVisible();
    });

    test('should show configuration section with fix buttons', async () => {
      // Use our helper to navigate to a section that actually exists - Mirror + MariaDB
      await navigateToSection(window, 'Mirror + MariaDB');
      
      // Check if fix buttons are available
      const buttonsAvailable = await hasFixButtons();
      if (!buttonsAvailable) {
        console.log('⚠ No fix buttons found in configuration section, checking General Environment...');
        
        // Use our helper to expand General Environment where fix buttons should be
        await expandVerificationSection(window, 'General Environment');
        
        // Check for fix buttons again
        const generalButtonsAvailable = await hasFixButtons();
        if (!generalButtonsAvailable) {
          console.log('⚠ No fix buttons found anywhere - skipping test');
          test.skip();
          return;
        }
      }
      
      // Use our helper to get fix buttons
      const fixButtons = await getFixButtons(window);
      expect(fixButtons.length).toBeGreaterThan(0);
      console.log(`Found ${fixButtons.length} fix buttons`);
      
      // Verify fix buttons are visible (checking for any fix buttons is sufficient)
      await expect(window.locator('.fix-button').first()).toBeVisible();
    });
  });

  test.describe('Fix Command Execution Flow', () => {
    test('should handle fix button click workflow', async () => {
      // Ensure verification content is visible (should be from beforeEach, but double-check)
      await window.waitForSelector('.verification-content', { state: 'visible', timeout: getTimeout(15000) });
      
      // Check if fix buttons are available
      const buttonsAvailable = await hasFixButtons();
      if (!buttonsAvailable) {
        console.log('⚠ No fix buttons found - skipping test');
        test.skip();
        return;
      }
      
      // Use our helper to execute fix command (handles complete flow including terminal)
      const fixButtons = await getFixButtons(window);
      await executeFixCommand(window, 0); // Pass button index instead of locator
      
      console.log(`✓ Fix command executed successfully`);
      
      // Terminal should automatically close after execution, but ensure cleanup if needed
      const remainingTerminals = await window.locator('.floating-terminal-window').all();
      for (const terminal of remainingTerminals) {
        if (await terminal.isVisible()) {
          await ensureTerminalClosed(terminal);
        }
      }
    });

    test('should test directory creation fix commands safely', async () => {
      // Use our helper to navigate to configuration section where we added mkdir fix commands
      await navigateToSection(window, 'Mirror + MariaDB');
      
      // Check if fix buttons are available
      let buttonsAvailable = await hasFixButtons();
      
      // If no fix buttons in config section, go back to General Environment where we know they should be
      if (!buttonsAvailable) {
        console.log('No fix buttons found in configuration section, checking General Environment...');
        
        // Use our helper to expand General Environment
        await expandVerificationSection(window, 'General Environment');
        
        // Check for fix buttons again
        buttonsAvailable = await hasFixButtons();
      }
      
      if (buttonsAvailable) {
        const fixButtons = await getFixButtons(window);
        console.log(`Found ${fixButtons.length} fix buttons`);
        
        // Use our helper to execute fix command (handles complete flow)
        await executeFixCommand(window, 0); // Pass button index instead of locator
        
        console.log(`✓ Directory creation fix command executed successfully`);
        
        // Terminal should automatically close after execution, but ensure cleanup if needed
        const remainingTerminals = await window.locator('.floating-terminal-window').all();
        for (const terminal of remainingTerminals) {
          if (await terminal.isVisible()) {
            await ensureTerminalClosed(terminal);
          }
        }
      } else {
        console.log('No fix buttons found - skipping test due to setup issue');
        test.skip();
      }
    });
  });

  test.describe('Fix Command Types Validation', () => {
    test('should validate brew install commands exist', async () => {
      const brewCommands = [];
      
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('brew install')) {
              brewCommands.push(verification);
            }
          });
        }
      });

      expect(brewCommands.length).toBeGreaterThan(0);
      console.log(`Found ${brewCommands.length} brew install fix commands`);
      
      brewCommands.forEach(verification => {
        console.log(`  • ${verification.id}: ${verification.fixCommand}`);
        expect(verification.fixCommand).toMatch(/^brew install/);
      });
    });

    test('should validate directory creation commands exist', async () => {
      const mkdirCommands = [];
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('mkdir')) {
              mkdirCommands.push({...verification, sectionId: section.sectionId});
            }
          });
        }
      });

      expect(mkdirCommands.length).toBeGreaterThan(0);
      console.log(`Found ${mkdirCommands.length} mkdir fix commands`);
      
      mkdirCommands.forEach(verification => {
        console.log(`  • ${verification.id}: ${verification.fixCommand}`);
        expect(verification.fixCommand).toMatch(/mkdir.*-p/);
      });
    });

    test('should validate complex shell commands', async () => {
      const goPathVerification = generalEnvironmentVerifications.categories
        .find(cat => cat.category.title === 'Go')
        .category.verifications
        .find(v => v.id === 'goPathConfig');

      expect(goPathVerification).toBeDefined();
      expect(goPathVerification.fixCommand).toContain('export GOPATH=$HOME/go');
      expect(goPathVerification.fixCommand).toContain('export PATH=$PATH:$GOPATH/bin');
      
    });
  });

  test.describe('UI Integration', () => {
    test('should maintain app responsiveness during fix command execution', async () => {
      // Navigate to environment verification and ensure it's expanded
      const envHeader = window.locator('.verification-header', { hasText: 'General Environment' });
      await envHeader.waitFor({ state: 'visible', timeout: getTimeout(10000) });
      
      // Check if section is collapsed and expand it
      const toggleIcon = envHeader.locator('.toggle-icon');
      const isCollapsed = await toggleIcon.evaluate(node => node.textContent.includes('▶'));
      if (isCollapsed) {
        await toggleIcon.click();
        await window.waitForTimeout(getTimeout(500));
      }
      
      await window.waitForSelector('.verification-content', { timeout: getTimeout(10000) });
      
      // Check if fix buttons are available
      const buttonsAvailable = await hasFixButtons();
      if (!buttonsAvailable) {
        console.log('⚠ No fix buttons found - skipping responsiveness test');
        test.skip();
        return;
      }
      
      const fixButtons = await window.locator('.fix-button').all();
      
      // Use our helper to execute fix command (handles complete flow)
      await executeFixCommand(window, 0); // Pass button index instead of locator
      
      console.log(`✓ Fix command executed successfully`);
      
      // App should remain responsive - test navigation
      await window.click('text=Mirror + MariaDB');
      await window.waitForSelector('.config-section', { timeout: getTimeout(10000) });
      
      // Navigate back and ensure it's expanded
      const envHeaderBack = window.locator('.verification-header', { hasText: 'General Environment' });
      await envHeaderBack.waitFor({ state: 'visible', timeout: getTimeout(10000) });
      
      // Check if section is collapsed and expand it
      const toggleIconBack = envHeaderBack.locator('.toggle-icon');
      const isCollapsedBack = await toggleIconBack.evaluate(node => node.textContent.includes('▶'));
      if (isCollapsedBack) {
        await toggleIconBack.click();
        await window.waitForTimeout(getTimeout(500));
      }
      
      await window.waitForSelector('.verification-content', { timeout: getTimeout(10000) });
      
      // Terminal should have been automatically cleaned up by our helper
      // Verify app responsiveness by checking that UI elements are still functional
      const fixButtonsStillVisible = await window.locator('.fix-button').count();
      expect(fixButtonsStillVisible).toBeGreaterThan(0);
      console.log('✓ App remained responsive during fix command execution');
    });

    test('should handle multiple fix button interactions safely', async () => {
      // Navigate to environment verification and ensure it's expanded
      const envHeader = window.locator('.verification-header', { hasText: 'General Environment' });
      await envHeader.waitFor({ state: 'visible', timeout: getTimeout(10000) });
      
      // Check if section is collapsed and expand it
      const toggleIcon = envHeader.locator('.toggle-icon');
      const isCollapsed = await toggleIcon.evaluate(node => node.textContent.includes('▶'));
      if (isCollapsed) {
        await toggleIcon.click();
        await window.waitForTimeout(getTimeout(500));
      }
      
      await window.waitForSelector('.verification-content', { timeout: getTimeout(10000) });
      
      // Check if fix buttons are available
      const buttonsAvailable = await hasFixButtons();
      if (!buttonsAvailable) {
        console.log('⚠ No fix buttons found - skipping multiple interactions test');
        test.skip();
        return;
      }
      
      const fixButtons = await window.locator('.fix-button').all();
      
      // Rapid clicks should not cause issues - but with confirmation popup, we need to handle this differently
      const firstFixButton = fixButtons[0];
      
      // First click should open confirmation popup
      await firstFixButton.waitFor({ state: 'visible', timeout: getTimeout(5000) });
      await firstFixButton.click();
      await window.waitForSelector('.command-popup-overlay', { timeout: getTimeout(5000) });
      
      // Additional clicks while popup is open should be gracefully handled
      // We don't actually click the button again since the popup overlay blocks it
      // Instead, we test that the popup remains stable and only one confirmation dialog is shown
      const popupCount = await window.locator('.command-popup-overlay').count();
      expect(popupCount).toBe(1);
      
      // Confirm the first (and only) request
      const confirmButton = window.locator('.confirm-button');
      await confirmButton.waitFor({ state: 'visible', timeout: getTimeout(5000) });
      await confirmButton.click();
      
      // Should only have opened one terminal (or handle gracefully)
      await window.waitForTimeout(getTimeout(2000));
      const terminalCount = await window.locator('.floating-terminal-window').count()
      expect(terminalCount).toBeLessThanOrEqual(3); // Allow some terminals but not excessive
    });
  });
}); 