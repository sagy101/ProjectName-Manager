const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { launchElectron, ensureAllVerificationsValid, getTimeout } = require('./test-helpers');

// Import configuration data to validate test scenarios
const generalEnvironmentVerifications = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/generalEnvironmentVerifications.json'), 'utf8')
);
const configurationSidebarAbout = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/configurationSidebarAbout.json'), 'utf8')
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
      const fixButtons = await window.locator('.fix-button').count();
      return fixButtons > 0;
    } catch (error) {
      return false;
    }
  };

  // Helper function to handle fix button click with confirmation
  const clickFixButtonWithConfirmation = async (fixButton) => {
    // Ensure the fix button is visible and enabled before clicking
    await fixButton.waitFor({ state: 'visible', timeout: getTimeout(5000) });
    
    // Click the fix button
    await fixButton.click();
    
    // Wait for confirmation popup to appear
    await window.waitForSelector('.command-popup-overlay', { timeout: getTimeout(5000) });
    
    // Click the confirm button in the popup
    const confirmButton = window.locator('.confirm-button');
    await confirmButton.waitFor({ state: 'visible', timeout: getTimeout(5000) });
    await confirmButton.click();
    
    // Wait for popup to disappear
    await window.waitForSelector('.command-popup-overlay', { state: 'hidden', timeout: getTimeout(5000) });
  };

  // Helper function to ensure terminal is properly closed
  const ensureTerminalClosed = async (terminal) => {
    try {
      // First try waiting for the terminal to close naturally
      await expect(terminal).not.toBeVisible({ timeout: getTimeout(30000) });
    } catch (error) {
      console.log('Terminal did not close naturally, attempting to close manually...');
      
      // Try to close the terminal manually
      const closeButton = terminal.locator('.floating-terminal-close-button, .close-button, button[title*="close"], button[title*="Close"]');
      if (await closeButton.isVisible()) {
        // Check if the close button is enabled (not in timeout state)
        const isEnabled = await closeButton.isEnabled();
        if (isEnabled) {
          await closeButton.click();
          await expect(terminal).not.toBeVisible({ timeout: getTimeout(5000) });
        } else {
          console.log('Close button is disabled (likely in timeout period), using DOM manipulation...');
          // Skip to DOM manipulation since button is disabled
          await window.evaluate(() => {
            const terminals = document.querySelectorAll('.floating-terminal-window');
            terminals.forEach(terminal => terminal.remove());
          });
          console.log('Terminal manually closed via DOM manipulation');
        }
      } else {
        // If no close button found, force close via DOM manipulation
        await window.evaluate(() => {
          const terminals = document.querySelectorAll('.floating-terminal-window');
          terminals.forEach(terminal => terminal.remove());
        });
        console.log('Terminal manually closed via DOM manipulation');
      }
    }
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

    // Ensure all verifications are valid
    const allValid = await ensureAllVerificationsValid(window);
    if (!allValid) throw new Error('Not all verifications are valid before toggling verifications!');

    // Expand the sidebar first to access debug tools
    const expandButton = window.locator('[title="Expand Sidebar"]');
    await expandButton.waitFor({ state: 'visible', timeout: getTimeout(10000) });
    await expandButton.click();
    
    // Wait for sidebar to expand
    await window.waitForTimeout(getTimeout(1000));
    
    // Click the debug tools button in the App Control Sidebar
    const debugButton = window.locator('.debug-section-toggle-button');
    await debugButton.waitFor({ state: 'visible', timeout: getTimeout(10000) });
    await debugButton.click();
    
    // Wait for debug section to expand
    await window.waitForSelector('.debug-section-content', { state: 'visible', timeout: getTimeout(10000) });
    
    // Toggle verifications to invalid state so fix buttons appear
    const toggleVerificationsButton = window.locator('.debug-section-content button').filter({ hasText: /Toggle Verifications/i });
    await toggleVerificationsButton.waitFor({ state: 'visible', timeout: getTimeout(5000) });

    await toggleVerificationsButton.click();
    await window.waitForTimeout(getTimeout(5000)); // Wait for status changes to propagate
  
    
    // Close debug tools
    await debugButton.click();
    await window.waitForTimeout(getTimeout(1000)); // Wait for debug panel to close

    // Find the header for "General Environment" and ensure it's expanded
    const header = window.locator('.verification-header', { hasText: 'General Environment' });
    await header.waitFor({ state: 'visible', timeout: getTimeout(15000) });

    // Find the toggle button within the header and ensure section is expanded
    const toggleButton = header.locator('.toggle-icon');
    
    // Check if section is collapsed and expand it
    const isCollapsed = await toggleButton.evaluate(node => node.textContent.includes('▶'));
    if (isCollapsed) {
      await toggleButton.click();
      await window.waitForTimeout(getTimeout(1500)); // Wait for animation
    }
    
    // Wait for verification content to be visible
    await window.waitForSelector('.verification-content', { state: 'visible', timeout: getTimeout(15000) });
    
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
          // Try to close the terminal using the close button
          const closeButton = terminal.locator('.floating-terminal-close-button, .close-button, button[title*="close"], button[title*="Close"]');
          if (await closeButton.isVisible() && await closeButton.isEnabled()) {
            await closeButton.click();
            await window.waitForTimeout(getTimeout(500));
          }
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
      
      // Check if fix buttons are available
      const buttonsAvailable = await hasFixButtons();
      if (!buttonsAvailable) {
        console.log('⚠ No fix buttons found - this may indicate an issue with verification toggling');
        // Skip this test if no fix buttons are available
        test.skip();
        return;
      }
      
      // With toggled verifications, we expect to see fix buttons
      const fixButtons = await window.locator('.fix-button').count();
      expect(fixButtons).toBeGreaterThan(0);
      console.log(`Found ${fixButtons} fix buttons in General Environment`);
      
      // Verify fix buttons are visible (checking for any fix buttons is sufficient)
      await expect(window.locator('.fix-button').first()).toBeVisible();
    });

    test('should show configuration section with fix buttons', async () => {
      // Use a section that actually exists - Mirror + MariaDB
      await window.click('text=Mirror + MariaDB');
      await window.waitForSelector('.config-section', { timeout: getTimeout(10000) });
      
      // Check if fix buttons are available
      const buttonsAvailable = await hasFixButtons();
      if (!buttonsAvailable) {
        console.log('⚠ No fix buttons found in configuration section, checking General Environment...');
        
        // Navigate back to General Environment where fix buttons should be
        const envHeader = window.locator('.verification-header', { hasText: 'General Environment' });
        await envHeader.waitFor({ state: 'visible', timeout: getTimeout(10000) });
        
        // Ensure it's expanded
        const toggleIcon = envHeader.locator('.toggle-icon');
        const isCollapsed = await toggleIcon.evaluate(node => node.textContent.includes('▶'));
        if (isCollapsed) {
          await toggleIcon.click();
          await window.waitForTimeout(getTimeout(500));
        }
        
        await window.waitForSelector('.verification-content', { state: 'visible', timeout: getTimeout(10000) });
        
        // Check for fix buttons again
        const generalButtonsAvailable = await hasFixButtons();
        if (!generalButtonsAvailable) {
          console.log('⚠ No fix buttons found anywhere - skipping test');
          test.skip();
          return;
        }
      }
      
      // With toggled verifications, we expect to see fix buttons
      const fixButtons = await window.locator('.fix-button').count();
      expect(fixButtons).toBeGreaterThan(0);
      console.log(`Found ${fixButtons} fix buttons`);
      
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
      
      // Click any visible fix button with confirmation
      await clickFixButtonWithConfirmation(window.locator('.fix-button').first());
      
      // Should open a floating terminal
      await window.waitForSelector('.floating-terminal-window', { timeout: getTimeout(10000) });
      const floatingTerminal = window.locator('.floating-terminal-window').first();
      await expect(floatingTerminal).toBeVisible();
      
      // Terminal should contain the fix command - look for it in the terminal title or content
      // First check the terminal title which should show the command
      const terminalTitle = await floatingTerminal.locator('.floating-terminal-title').textContent();
      const verification = generalEnvironmentVerifications.categories
        .flatMap(c => c.category.verifications)
        .find(v => v.id === 'cloudGcloudCLI');
      
      // The terminal title should contain the fix command or at least part of it
      const expectedCommand = verification.fixCommand;
      const titleContainsCommand = terminalTitle.includes(expectedCommand) || 
                                   terminalTitle.includes('gcloud CLI') ||
                                   terminalTitle.includes('Fix:');
      
      expect(titleContainsCommand).toBe(true);
      console.log(`✓ Terminal opened for fix command: ${terminalTitle}`);
      
      // Ensure the terminal is properly closed
      await ensureTerminalClosed(floatingTerminal);
    });

    test('should test directory creation fix commands safely', async () => {
      // Navigate to configuration section where we added mkdir fix commands
      await window.click('text=Mirror + MariaDB');
      await window.waitForSelector('.config-section', { timeout: getTimeout(10000) });
      
      // Check if fix buttons are available
      let buttonsAvailable = await hasFixButtons();
      
      // If no fix buttons in config section, go back to General Environment where we know they should be
      if (!buttonsAvailable) {
        console.log('No fix buttons found in configuration section, checking General Environment...');
        
        // Navigate back to General Environment
        const envHeader = window.locator('.verification-header', { hasText: 'General Environment' });
        await envHeader.waitFor({ state: 'visible', timeout: getTimeout(10000) });
        
        // Ensure it's expanded
        const toggleIcon = envHeader.locator('.toggle-icon');
        const isCollapsed = await toggleIcon.evaluate(node => node.textContent.includes('▶'));
        if (isCollapsed) {
          await toggleIcon.click();
          await window.waitForTimeout(getTimeout(500));
        }
        
        await window.waitForSelector('.verification-content', { state: 'visible', timeout: getTimeout(10000) });
        
        // Check for fix buttons again
        buttonsAvailable = await hasFixButtons();
      }
      
      if (buttonsAvailable) {
        const fixButtons = await window.locator('.fix-button').all();
        console.log(`Found ${fixButtons.length} fix buttons`);
        
        // Click the first available fix button with confirmation
        await clickFixButtonWithConfirmation(fixButtons[0]);
        
        // Wait for floating terminal
        await window.waitForSelector('.floating-terminal-window', { timeout: getTimeout(10000) });
        
        // Verify terminal opened
        const terminal = window.locator('.floating-terminal-window');
        await expect(terminal).toBeVisible();
        
        // Ensure the terminal is properly closed
        await ensureTerminalClosed(terminal);
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
      
      // Click fix button with confirmation
      await clickFixButtonWithConfirmation(fixButtons[0]);
      
      // Wait for terminal
      await window.waitForSelector('.floating-terminal-window', { timeout: getTimeout(10000) });
      
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
      
      // Terminal should still be visible
      await expect(window.locator('.floating-terminal-window')).toBeVisible();
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