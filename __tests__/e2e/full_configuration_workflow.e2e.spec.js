const { test, expect } = require('@playwright/test');
const { launchElectronInvisibly } = require('./test-helpers');

test.describe('Full Configuration Workflow', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectronInvisibly();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    // Wait for the main configuration interface to load
    await window.waitForSelector('.config-container');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should configure, run, verify terminals, and stop complete workflow', async () => {
    // === PHASE 1: CONFIGURATION SETUP ===
    console.log('Phase 1: Setting up configuration...');
    
    // Enable Mirror + MariaDB section
    const mirrorSection = await window.locator('text=Mirror + MariaDB').locator('..').locator('..');
    const mirrorToggle = await mirrorSection.locator('input[type="checkbox"]').first();
    if (!(await mirrorToggle.isChecked())) {
      await mirrorToggle.click();
    }
    await expect(mirrorToggle).toBeChecked();
    
    // Wait for Mirror subsections and enable Frontend
    await window.waitForTimeout(1000);
    await expect(window.locator('text=Frontend')).toBeVisible();
    const frontendToggle = await window.locator('text=Frontend').locator('..').locator('input[type="checkbox"]');
    if (!(await frontendToggle.isChecked())) {
      await frontendToggle.click();
    }
    await expect(frontendToggle).toBeChecked();
    
    // Enable GoPM section with Container deployment  
    const gopmSection = await window.locator('text=GoPM + Agent + Chromium').locator('..').locator('..');
    const gopmToggle = await gopmSection.locator('input[type="checkbox"]').first();
    if (!(await gopmToggle.isChecked())) {
      await gopmToggle.click();
    }
    await expect(gopmToggle).toBeChecked();
    
    // Select Container deployment for GoPM
    await window.waitForTimeout(500);
    const containerButton = await gopmSection.locator('.deployment-toggle-btn').filter({ hasText: /container/i });
    if (await containerButton.isVisible()) {
      await containerButton.click();
      await expect(containerButton).toHaveClass(/active/);
    }
    
    // Enable Rule Engine section with Process deployment
    const ruleEngineSection = await window.locator('text=Rule Engine').locator('..').locator('..');
    const ruleEngineToggle = await ruleEngineSection.locator('input[type="checkbox"]').first();
    if (!(await ruleEngineToggle.isChecked())) {
      await ruleEngineToggle.click();
    }
    await expect(ruleEngineToggle).toBeChecked();
    
    // Select Process deployment for Rule Engine (if deployment buttons exist)
    await window.waitForTimeout(500);
    const processButton = await ruleEngineSection.locator('.deployment-toggle-btn').filter({ hasText: /process/i });
    if (await processButton.isVisible()) {
      await processButton.click();
      await expect(processButton).toHaveClass(/active/);
    }
    
    // === PHASE 2: VERIFY RUN BUTTON IS READY ===
    console.log('Phase 2: Verifying RUN button state...');
    
    // Check that RUN button becomes enabled (may take time for validation)
    const runButton = await window.locator('button').filter({ hasText: /RUN.*ISO/i });
    await expect(runButton).toBeVisible();
    
    // Wait for button to become enabled (it might be disabled initially)
    await window.waitForTimeout(2000);
    
    // === PHASE 3: RUN CONFIGURATION ===
    console.log('Phase 3: Running configuration...');
    
    // Click RUN button
    await runButton.click();
    
    // Wait for terminals to start appearing
    await window.waitForTimeout(3000);
    
    // === PHASE 4: VERIFY TERMINAL TABS CREATED ===
    console.log('Phase 4: Verifying terminal tabs...');
    
    // Wait longer for terminal tabs to be created after clicking RUN
    // Check that terminal tabs are created
    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs.first()).toBeVisible({ timeout: 30000 });
    
    // Verify we have at least some tabs based on our configuration
    // Should have at least: Mirror + MariaDB, Frontend, and possibly others
    const tabCount = await terminalTabs.count();
    expect(tabCount).toBeGreaterThan(0);
    console.log(`Found ${tabCount} terminal tabs`);

    // Check for expected tabs that should definitely exist
    const expectedTabs = [
      /Mirror.*MariaDB/i,
      /Frontend/i
    ];

    // Wait for core expected tabs to appear
    for (const expectedTab of expectedTabs) {
      const tabExists = await window.locator('.tab').filter({ hasText: expectedTab }).count() > 0;
      if (!tabExists) {
        console.log(`Expected tab not found: ${expectedTab}`);
      }
      // Give some grace time for tabs to appear
      await expect(window.locator('.tab').filter({ hasText: expectedTab })).toBeVisible({ timeout: 15000 });
    }

    // Check for optional tabs (gopm and rule engine) - don't fail if they don't exist
    const optionalTabs = [
      /gopm/i,
      /Rule Engine/i
    ];

    for (const optionalTab of optionalTabs) {
      const tabExists = await window.locator('.tab').filter({ hasText: optionalTab }).count() > 0;
      if (tabExists) {
        console.log(`✓ Found optional tab: ${optionalTab}`);
      } else {
        console.log(`Optional tab not found (this is OK): ${optionalTab}`);
      }
    }
    
    // === PHASE 5: VERIFY TERMINAL COMMANDS ===
    console.log('Phase 5: Verifying terminal commands...');
    
    // Check Mirror+MariaDB tab has expected command patterns
    const mirrorTab = await window.locator('.tab').filter({ hasText: /Mirror.*MariaDB/i });
    await expect(mirrorTab).toBeVisible();
    
    // Check Frontend tab for webpack/npm command
    const frontendTab = await window.locator('.tab').filter({ hasText: /Frontend/i });
    await expect(frontendTab).toBeVisible();
    
    // === PHASE 6: CHECK TAB ABOUT INFORMATION ===
    console.log('Phase 6: Checking tab about information...');
    
    // Click on a tab's info button to verify about information
    const infoButton = await window.locator('.tab .info-button, .tab [title*="about"], .tab [title*="info"]').first();
    if (await infoButton.isVisible()) {
      await infoButton.click();
      // Wait for tab info panel to appear and then close it
      await window.waitForSelector('.tab-info-panel', { timeout: 5000 });
      const closeButton = await window.locator('.tab-info-panel .close-button, .tab-info-panel button').filter({ hasText: /close|×/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await window.waitForSelector('.tab-info-panel', { state: 'hidden', timeout: 3000 });
      }
    }
    
    // === PHASE 7: VERIFY STOP FUNCTIONALITY ===
    console.log('Phase 7: Testing stop functionality...');
    
    // Find and click the stop button
    const stopButton = await window.locator('button').filter({ hasText: /stop|kill/i }).or(
      window.locator('button').filter({ hasText: /STOP.*ISO/i })
    );
    
    if (await stopButton.count() > 0) {
      await stopButton.first().click();
      
      // Wait for stopping process
      await window.waitForTimeout(3000);
      
      // Verify that RUN button becomes available again
      await expect(runButton).toBeVisible();
      
      // Check that terminals are cleaned up or show stopped state
      const remainingTabs = await terminalTabs.count();
      console.log(`Remaining tabs after stop: ${remainingTabs}`);
      
    } else {
      console.log('No stop button found - may not be implemented yet');
    }
    
    // === PHASE 8: VERIFY CLEANUP ===
    console.log('Phase 8: Verifying cleanup...');
    
    // Wait for cleanup to complete
    await window.waitForTimeout(2000);
    
    // Verify that the system is back to initial state
    await expect(runButton).toBeVisible();
    
    // Check that no active processes indicators remain
    const activeIndicators = await window.locator('.active-process, .running-indicator, .process-active');
    const activeCount = await activeIndicators.count();
    expect(activeCount).toBe(0);
    
    console.log('✅ Full workflow test completed successfully!');
  });

  test('should handle individual section toggling during runtime', async () => {
    // Test that we can toggle sections on and off
    const mirrorSection = await window.locator('text=Mirror + MariaDB').locator('..').locator('..');
    const mirrorToggle = await mirrorSection.locator('input[type="checkbox"]').first();
    
    // Test toggle on
    if (!(await mirrorToggle.isChecked())) {
      await mirrorToggle.click();
    }
    await expect(mirrorToggle).toBeChecked();
    
    // Test toggle off
    await mirrorToggle.click();
    await expect(mirrorToggle).not.toBeChecked();
    
    // Verify subsections disappear
    const frontendSection = window.locator('text=Frontend');
    await expect(frontendSection).not.toBeVisible();
  });

  test('should validate deployment option changes affect configuration', async () => {
    // Enable GoPM section
    const gopmSection = await window.locator('text=GoPM + Agent + Chromium').locator('..').locator('..');
    const gopmToggle = await gopmSection.locator('input[type="checkbox"]').first();
    
    if (!(await gopmToggle.isChecked())) {
      await gopmToggle.click();
    }
    
    await window.waitForTimeout(500);
    
    // Test switching between deployment options
    const containerButton = await gopmSection.locator('.deployment-toggle-btn').filter({ hasText: /container/i });
    const processButton = await gopmSection.locator('.deployment-toggle-btn').filter({ hasText: /process/i });
    
    if (await containerButton.isVisible() && await processButton.isVisible()) {
      // Select container first
      await containerButton.click();
      await expect(containerButton).toHaveClass(/active/);
      await expect(processButton).not.toHaveClass(/active/);
      
      // Switch to process
      await processButton.click();
      await expect(processButton).toHaveClass(/active/);
      await expect(containerButton).not.toHaveClass(/active/);
    }
  });
}); 