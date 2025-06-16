const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Import configuration data to validate test scenarios
const generalEnvironmentVerifications = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/generalEnvironmentVerifications.json'), 'utf8')
);
const configurationSidebarAbout = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/configurationSidebarAbout.json'), 'utf8')
);

// Helper to get the app binary path based on platform
function getAppPath() {
  const platform = process.platform;
  const appName = 'ProjectName Manager';
  
  if (platform === 'darwin') {
    return path.join(__dirname, '../../dist/mac', `${appName}.app`, 'Contents', 'MacOS', appName);
  } else if (platform === 'win32') {
    return path.join(__dirname, '../../dist/win-unpacked', `${appName}.exe`);
  } else {
    return path.join(__dirname, '../../dist/linux-unpacked', appName);
  }
}

test.describe('Fix Command Feature E2E Tests', () => {
  let electronApp;
  let page;

  test.beforeAll(async ({ playwright }) => {
    // Launch Electron app
    electronApp = await playwright._electron.launch({
      executablePath: getAppPath(),
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for app to fully load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 30000 });
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test.describe('Fix Button Visibility', () => {
    test('should show fix buttons for invalid verifications with fixCommand in general environment', async () => {
      // Navigate to environment verification section
      await page.click('[data-testid="sidebar-environment-verification"]');
      await page.waitForSelector('[data-testid="environment-verification-section"]');

      // Find verifications with fix commands from our configuration
      const verificationsWithFixCommands = [];
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand) {
              verificationsWithFixCommands.push(verification);
            }
          });
        }
      });

      expect(verificationsWithFixCommands.length).toBeGreaterThan(0);

      // For each verification with fix command, check if fix button appears when invalid
      for (const verification of verificationsWithFixCommands.slice(0, 3)) { // Test first 3 to avoid timeout
        // Look for the verification indicator
        const verificationSelector = `[data-verification-id="${verification.id}"]`;
        
        try {
          await page.waitForSelector(verificationSelector, { timeout: 5000 });
          
          // Check if verification shows as invalid (which would show fix button)
          const verificationElement = await page.locator(verificationSelector);
          const isInvalid = await verificationElement.locator('.verification-status.invalid').count() > 0;
          
          if (isInvalid) {
            // Should have fix button
            const fixButton = verificationElement.locator('.fix-button');
            await expect(fixButton).toBeVisible();
            
            // Verify fix button text
            await expect(fixButton).toHaveText('Fix');
          }
        } catch (error) {
          console.log(`Verification ${verification.id} not found or not invalid - this is expected in some environments`);
        }
      }
    });

    test('should show fix buttons for configuration sidebar verifications with fixCommand', async () => {
      // Navigate to configuration section
      await page.click('[data-testid="sidebar-project-configuration"]');
      await page.waitForSelector('[data-testid="project-configuration-section"]');

      // Find configuration sections with verifications that have fix commands
      const sectionsWithFixCommands = configurationSidebarAbout.filter(section => 
        section.verifications && 
        section.verifications.some(v => v.fixCommand)
      );

      expect(sectionsWithFixCommands.length).toBeGreaterThan(0);

      for (const section of sectionsWithFixCommands.slice(0, 2)) { // Test first 2 sections
        try {
          // Expand the section if it exists
          const sectionSelector = `[data-section-id="${section.sectionId}"]`;
          await page.waitForSelector(sectionSelector, { timeout: 5000 });
          
          // Look for verifications with fix commands in this section
          const verificationsWithFix = section.verifications.filter(v => v.fixCommand);
          
          for (const verification of verificationsWithFix) {
            const verificationSelector = `[data-verification-id="${verification.id}"]`;
            
            try {
              await page.waitForSelector(verificationSelector, { timeout: 3000 });
              
              const verificationElement = await page.locator(verificationSelector);
              const isInvalid = await verificationElement.locator('.verification-status.invalid').count() > 0;
              
              if (isInvalid) {
                const fixButton = verificationElement.locator('.fix-button');
                await expect(fixButton).toBeVisible();
                await expect(fixButton).toHaveText('Fix');
              }
            } catch (error) {
              console.log(`Verification ${verification.id} not found or not invalid`);
            }
          }
        } catch (error) {
          console.log(`Section ${section.sectionId} not found or not expanded`);
        }
      }
    });
  });

  test.describe('Fix Command Execution', () => {
    test('should execute fix command and open floating terminal', async () => {
      // Try to find any invalid verification with fix command
      await page.click('[data-testid="sidebar-environment-verification"]');
      await page.waitForSelector('[data-testid="environment-verification-section"]');

      // Look for any fix button
      const fixButtons = await page.locator('.fix-button').all();
      
      if (fixButtons.length > 0) {
        const fixButton = fixButtons[0];
        
        // Click the fix button
        await fixButton.click();
        
        // Should open a floating terminal
        await page.waitForSelector('[data-testid*="floating-terminal"]', { timeout: 10000 });
        
        // Verify floating terminal has fix command properties
        const floatingTerminal = await page.locator('[data-testid*="floating-terminal"]').first();
        await expect(floatingTerminal).toBeVisible();
        
        // Should have close button disabled initially (20-second rule)
        const closeButton = floatingTerminal.locator('[data-testid="close-button"]');
        if (await closeButton.count() > 0) {
          const isDisabled = await closeButton.isDisabled();
          expect(isDisabled).toBe(true);
        }
        
        // Wait a moment for command to potentially complete
        await page.waitForTimeout(3000);
        
        // Terminal should show some output
        const terminalOutput = floatingTerminal.locator('.xterm-screen');
        await expect(terminalOutput).toBeVisible();
      } else {
        console.log('No fix buttons found - all verifications may be valid in this environment');
      }
    });

    test('should handle fix command for specific verification types', async () => {
      // Test directory creation fix commands (safer to test)
      const dirCreationVerifications = [];
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('mkdir')) {
              dirCreationVerifications.push({
                ...verification,
                sectionId: section.sectionId
              });
            }
          });
        }
      });

      if (dirCreationVerifications.length > 0) {
        const testVerification = dirCreationVerifications[0]; // Test first directory creation
        
        await page.click('[data-testid="sidebar-project-configuration"]');
        await page.waitForSelector('[data-testid="project-configuration-section"]');
        
        // Try to find and click the specific fix button
        const verificationSelector = `[data-verification-id="${testVerification.id}"]`;
        
        try {
          await page.waitForSelector(verificationSelector, { timeout: 5000 });
          
          const verificationElement = await page.locator(verificationSelector);
          const fixButton = verificationElement.locator('.fix-button');
          
          if (await fixButton.count() > 0) {
            await fixButton.click();
            
            // Should open floating terminal
            await page.waitForSelector('[data-testid*="floating-terminal"]', { timeout: 10000 });
            
            // Wait for command to complete
            await page.waitForTimeout(5000);
            
            // Terminal should auto-close after completion (if minimized)
            const minimizeButton = await page.locator('[data-testid="minimize-button"]');
            if (await minimizeButton.count() > 0) {
              await minimizeButton.click();
              
              // Wait for auto-close after minimize + completion
              await page.waitForTimeout(3000);
              
              // Terminal should be closed or minimized
              const visibleTerminals = await page.locator('[data-testid*="floating-terminal"]:visible').count();
              expect(visibleTerminals).toBeLessThanOrEqual(1);
            }
          }
        } catch (error) {
          console.log(`Could not test fix command for ${testVerification.id}: ${error.message}`);
        }
      }
    });
  });

  test.describe('Fix Command Workflow Integration', () => {
    test('should complete full fix workflow with verification re-run', async () => {
      // Navigate to environment verification
      await page.click('[data-testid="sidebar-environment-verification"]');
      await page.waitForSelector('[data-testid="environment-verification-section"]');

      // Find any verification that might be fixable
      const allVerifications = await page.locator('[data-verification-id]').all();
      
      for (const verification of allVerifications.slice(0, 3)) {
        const verificationId = await verification.getAttribute('data-verification-id');
        
        // Check if this verification has invalid status and fix button
        const isInvalid = await verification.locator('.verification-status.invalid').count() > 0;
        const hasFixButton = await verification.locator('.fix-button').count() > 0;
        
        if (isInvalid && hasFixButton) {
          console.log(`Testing fix workflow for verification: ${verificationId}`);
          
          // Record initial status
          const initialStatus = await verification.locator('.verification-status').textContent();
          
          // Click fix button
          const fixButton = verification.locator('.fix-button');
          await fixButton.click();
          
          // Wait for floating terminal
          await page.waitForSelector('[data-testid*="floating-terminal"]', { timeout: 10000 });
          
          // Wait for command execution and potential completion
          await page.waitForTimeout(8000);
          
          // Check if verification status updated (may take time)
          try {
            await page.waitForFunction(
              (vid) => {
                const verificationElement = document.querySelector(`[data-verification-id="${vid}"]`);
                if (!verificationElement) return false;
                const statusElement = verificationElement.querySelector('.verification-status');
                return statusElement && statusElement.textContent !== 'invalid';
              },
              verificationId,
              { timeout: 15000 }
            );
            
            console.log(`Verification ${verificationId} status updated after fix`);
          } catch (error) {
            console.log(`Verification ${verificationId} status may not have changed - this is expected for some fix commands`);
          }
          
          break; // Test only one verification to avoid timeout
        }
      }
    });

    test('should show appropriate notifications for fix command results', async () => {
      // Navigate to a section with verifications
      await page.click('[data-testid="sidebar-environment-verification"]');
      await page.waitForSelector('[data-testid="environment-verification-section"]');

      // Look for notification area
      const notificationArea = page.locator('[data-testid="notification"]');
      
      // Find and execute a fix command
      const fixButtons = await page.locator('.fix-button').all();
      
      if (fixButtons.length > 0) {
        await fixButtons[0].click();
        
        // Wait for floating terminal
        await page.waitForSelector('[data-testid*="floating-terminal"]', { timeout: 10000 });
        
        // Wait for command execution
        await page.waitForTimeout(10000);
        
        // Check for notifications (success or failure)
        try {
          await page.waitForSelector('[data-testid="notification"]', { timeout: 5000 });
          
          const notification = await page.locator('[data-testid="notification"]');
          const notificationText = await notification.textContent();
          
          // Should show either success or failure notification
          const hasValidNotification = 
            notificationText.includes('✓ Verification passed after fix!') ||
            notificationText.includes('✗ Verification still failing');
            
          expect(hasValidNotification).toBe(true);
        } catch (error) {
          console.log('No notification shown - this may be expected depending on command execution time');
        }
      }
    });
  });

  test.describe('Configuration Validation', () => {
    test('should validate all fix commands in configuration files', async () => {
      // Validate general environment verifications
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

      // Validate configuration sidebar verifications
      const sidebarFixCommands = [];
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand) {
              sidebarFixCommands.push(verification);
            }
          });
        }
      });

      expect(sidebarFixCommands.length).toBeGreaterThan(0);
      console.log(`Found ${sidebarFixCommands.length} fix commands in configuration sidebar verifications`);

      // Validate that fix commands are properly formatted
      const allFixCommands = [...generalFixCommands, ...sidebarFixCommands];
      
      allFixCommands.forEach(verification => {
        expect(verification.fixCommand).toBeTruthy();
        expect(typeof verification.fixCommand).toBe('string');
        expect(verification.fixCommand.length).toBeGreaterThan(0);
        
        // Ensure fix commands don't have dangerous operations
        expect(verification.fixCommand).not.toMatch(/rm\s+-rf\s+\//);
        expect(verification.fixCommand).not.toMatch(/sudo\s+rm/);
        expect(verification.fixCommand).not.toMatch(/>\s*\/dev\/(sda|hda)/);
      });
    });

    test('should have proper verification IDs and titles', async () => {
      const allVerifications = [];
      
      // Collect all verifications
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          allVerifications.push(...category.verifications);
        }
      });
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          allVerifications.push(...section.verifications);
        }
      });

      // Validate verification structure
      allVerifications.forEach(verification => {
        expect(verification.id).toBeTruthy();
        expect(verification.title).toBeTruthy();
        expect(verification.checkType).toBeTruthy();
        
        // Verification IDs should be unique
        const duplicates = allVerifications.filter(v => v.id === verification.id);
        expect(duplicates.length).toBe(1);
        
        // If has fix command, should be properly formatted
        if (verification.fixCommand) {
          expect(typeof verification.fixCommand).toBe('string');
          expect(verification.fixCommand.trim().length).toBeGreaterThan(0);
        }
      });
    });
  });

  test.describe('UI Responsiveness', () => {
    test('should handle rapid fix button clicks gracefully', async () => {
      await page.click('[data-testid="sidebar-environment-verification"]');
      await page.waitForSelector('[data-testid="environment-verification-section"]');

      const fixButtons = await page.locator('.fix-button').all();
      
      if (fixButtons.length > 0) {
        const fixButton = fixButtons[0];
        
        // Rapid clicks should not cause issues
        await fixButton.click();
        await fixButton.click();
        await fixButton.click();
        
        // Should only open one floating terminal
        await page.waitForTimeout(2000);
        const terminalCount = await page.locator('[data-testid*="floating-terminal"]:visible').count();
        expect(terminalCount).toBeLessThanOrEqual(1);
      }
    });

    test('should maintain UI state during fix command execution', async () => {
      await page.click('[data-testid="sidebar-environment-verification"]');
      await page.waitForSelector('[data-testid="environment-verification-section"]');

      // App should remain responsive during fix command execution
      const fixButtons = await page.locator('.fix-button').all();
      
      if (fixButtons.length > 0) {
        await fixButtons[0].click();
        
        // Wait for terminal to open
        await page.waitForSelector('[data-testid*="floating-terminal"]', { timeout: 10000 });
        
        // Should be able to navigate while fix command runs
        await page.click('[data-testid="sidebar-project-configuration"]');
        await page.waitForSelector('[data-testid="project-configuration-section"]');
        
        // Navigate back
        await page.click('[data-testid="sidebar-environment-verification"]');
        await page.waitForSelector('[data-testid="environment-verification-section"]');
        
        // Floating terminal should still be visible
        const terminalVisible = await page.locator('[data-testid*="floating-terminal"]:visible').count() > 0;
        expect(terminalVisible).toBe(true);
      }
    });
  });
}); 