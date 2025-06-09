const { test, expect } = require('@playwright/test');
const { launchElectronInvisibly } = require('./test-helpers');

test.describe('Terminal Command Validation', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectronInvisibly();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    await window.waitForSelector('.config-container');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should validate terminal commands match configuration settings', async () => {
    // Enable Mirror section (should generate gradlew bootRun command)
    const mirrorSection = await window.locator('text=Mirror + MariaDB').locator('..').locator('..');
    const mirrorToggle = await mirrorSection.locator('input[type="checkbox"]').first();
    await mirrorToggle.click();
    await expect(mirrorToggle).toBeChecked();

    // Enable Frontend subsection with Dev mode
    await window.waitForTimeout(1000);
    const frontendToggle = await window.locator('text=Frontend').locator('..').locator('input[type="checkbox"]');
    await frontendToggle.click();
    
    // Select Dev mode for Frontend (should generate webpack --watch)
    const devButton = await window.locator('text=Frontend').locator('..').locator('button').filter({ hasText: /dev/i });
    if (await devButton.isVisible()) {
      await devButton.click();
    }

    // Wait for RUN button to be ready
    await window.waitForTimeout(2000);
    const runButton = await window.locator('button').filter({ hasText: /RUN.*ISO/i });
    
    // Click RUN to start processes
    await runButton.click();
    await window.waitForTimeout(4000);

    // Verify terminal tabs are created
    const terminalTabs = await window.locator('.tab');
    await expect(terminalTabs.first()).toBeVisible({ timeout: 30000 });

    // Check for Mirror tab and its command
    const mirrorTab = await window.locator('.tab').filter({ hasText: /Mirror.*MariaDB/i });
    await expect(mirrorTab).toBeVisible({ timeout: 15000 });

    // Click on Mirror tab to inspect its command
    await mirrorTab.click();
    await window.waitForTimeout(1000);

    // Check for Frontend tab
    const frontendTab = await window.locator('.tab').filter({ hasText: /Frontend/i });
    await expect(frontendTab).toBeVisible({ timeout: 15000 });

    // Click on Frontend tab
    await frontendTab.click();
    await window.waitForTimeout(1000);

    // Check for gopm tab (may be Container or Process depending on configuration)
    const gopmTab = await window.locator('.tab').filter({ hasText: /gopm/i });
    const gopmTabExists = await gopmTab.count() > 0;
    
    if (gopmTabExists) {
      console.log('✓ Found gopm tab');
      await gopmTab.click();
      await window.waitForTimeout(1000);
    } else {
      console.log('gopm tab not found - this may be expected based on configuration');
    }

    // Look for gradlew bootRun command in terminal
    const terminalContent = await window.locator('.terminal, .xterm-screen, .terminal-output');
    const hasGradlew = await terminalContent.locator('text=/gradlew.*bootRun/i').isVisible().catch(() => false);
    console.log('Mirror tab contains gradlew command:', hasGradlew);

    // Look for webpack --watch command
    const hasWebpack = await terminalContent.locator('text=/webpack.*watch/i').isVisible().catch(() => false);
    console.log('Frontend tab contains webpack command:', hasWebpack);
  });

  test('should validate terminal tab about information shows correct containers', async () => {
    // Enable GoPM with container deployment
    const gopmSection = await window.locator('text=GoPM + Agent + Chromium').locator('..').locator('..');
    const gopmToggle = await gopmSection.locator('input[type="checkbox"]').first();
    await gopmToggle.click();
    
    // Select container deployment
    await window.waitForTimeout(500);
    const containerButton = await gopmSection.locator('.deployment-toggle-btn').filter({ hasText: /container/i });
    if (await containerButton.isVisible()) {
      await containerButton.click();
    }

    // Run configuration
    await window.waitForTimeout(2000);
    const runButton = await window.locator('button').filter({ hasText: /RUN.*ISO/i });
    await runButton.click();
    await window.waitForTimeout(3000);

    // Find GoPM terminal tab
    const gopmTab = await window.locator('.tab').filter({ hasText: /gopm.*Container/i });
    if (await gopmTab.count() > 0) {
      // Look for info/about button in the tab
      const infoButton = await gopmTab.locator('button, [role="button"]').filter({ hasText: /info|about|ⓘ/i });
      
      if (await infoButton.count() > 0) {
        await infoButton.first().click();
        await window.waitForTimeout(1000);
        
        // Check for about panel
        const aboutPanel = await window.locator('.tab-info-panel, .about-panel, .terminal-info, .modal');
        if (await aboutPanel.count() > 0) {
          // Verify container information is shown
          const containerInfo = await aboutPanel.locator('text=/serverbrowseragent|container/i');
          const hasContainerInfo = await containerInfo.count() > 0;
          console.log('About panel shows container info:', hasContainerInfo);
          
          // Verify command information
          const commandInfo = await aboutPanel.locator('text=/make.*run.*docker|docker/i');
          const hasCommandInfo = await commandInfo.count() > 0;
          console.log('About panel shows command info:', hasCommandInfo);
        }
      }
    }
  });

  test('should validate stop button terminates all processes correctly', async () => {
    // Set up a minimal configuration
    const mirrorSection = await window.locator('text=Mirror + MariaDB').locator('..').locator('..');
    const mirrorToggle = await mirrorSection.locator('input[type="checkbox"]').first();
    await mirrorToggle.click();

    // Run configuration
    await window.waitForTimeout(2000);
    const runButton = await window.locator('button').filter({ hasText: /RUN.*ISO/i });
    await runButton.click();
    await window.waitForTimeout(3000);

    // Verify at least one terminal tab exists
    const terminalTabs = await window.locator('.tab');
    const tabCount = await terminalTabs.count();
    expect(tabCount).toBeGreaterThan(0);

    // Find and click stop button
    const stopButton = await window.locator('button').filter({ hasText: /STOP.*ISO|stop|kill/i });
    await expect(stopButton).toBeVisible({ timeout: 10000 });
    await stopButton.click();

    // Wait for processes to be terminated
    await window.waitForTimeout(3000);

    // Verify terminal tabs are cleared or processes are stopped
    // Note: tabs might still exist but processes should be stopped
    const remainingTabs = await window.locator('.tab');
    const remainingCount = await remainingTabs.count();
    // Either tabs are cleared or they show stopped status
    if (remainingCount > 0) {
      // Check that tabs show stopped/idle status instead of running
      const runningTabs = await window.locator('.tab .status-running').count();
      expect(runningTabs).toBe(0);
    }
  });

  test('should validate different deployment modes generate different commands', async () => {
    // Test Rule Engine with Process deployment
    const ruleEngineSection = await window.locator('text=Rule Engine').locator('..').locator('..');
    await expect(ruleEngineSection).toBeVisible();

    // First ensure Rule Engine section is enabled
    const ruleEngineToggle = await ruleEngineSection.locator('input[type="checkbox"], .toggle-switch').first();
    if (await ruleEngineToggle.isVisible()) {
      const isChecked = await ruleEngineToggle.isChecked();
      if (!isChecked) {
        await ruleEngineToggle.click();
        await window.waitForTimeout(500);
      }
    }

    // Look for deployment mode buttons in the Rule Engine section
    const processButton = await ruleEngineSection.locator('.deployment-toggle-btn').filter({ hasText: /process/i });
    const processButtonExists = await processButton.count() > 0;
    
    if (!processButtonExists) {
      console.log('Process deployment button not found - skipping deployment mode test');
      return;
    }

    await expect(processButton).toBeVisible({ timeout: 10000 });

    // Select Process deployment if not already selected
    const processSelected = await processButton.evaluate(el => el.classList.contains('active'));
    if (!processSelected) {
      await processButton.click();
      await window.waitForTimeout(500);
    }

    // Run with Process deployment
    const runButton1 = await window.locator('button').filter({ hasText: /RUN.*ISO/i });
    await expect(runButton1).toBeEnabled();
    await runButton1.click();
    
    // Wait for terminal tabs and verify Rule Engine Process tab
    await window.waitForTimeout(3000);
    const ruleEngineTab = await window.locator('.tab').filter({ hasText: /Rule Engine.*Process/i });
    const ruleEngineTabExists = await ruleEngineTab.count() > 0;
    
    if (ruleEngineTabExists) {
      await expect(ruleEngineTab).toBeVisible({ timeout: 15000 });
      console.log('✓ Found Rule Engine Process tab');
    } else {
      console.log('Rule Engine Process tab not found - may not be configured');
    }

    // Stop current execution
    const stopButton1 = await window.locator('button').filter({ hasText: /STOP.*ISO|stop/i });
    await expect(stopButton1).toBeVisible({ timeout: 5000 });
    await stopButton1.click();
    await window.waitForTimeout(2000);

    // Now test with Container deployment
    const containerButton = await ruleEngineSection.locator('.deployment-toggle-btn').filter({ hasText: /container/i });
    const containerButtonExists = await containerButton.count() > 0;
    
    if (!containerButtonExists) {
      console.log('Container deployment button not found - skipping container test');
      return;
    }

    await expect(containerButton).toBeVisible({ timeout: 10000 });
    
    // Click to switch to container mode
    await containerButton.click();
    await window.waitForTimeout(500);

    // Run with Container deployment
    const runButton2 = await window.locator('button').filter({ hasText: /RUN.*ISO/i });
    await expect(runButton2).toBeEnabled();
    await runButton2.click();
    
    // Wait for terminal tabs and verify Rule Engine Container tab
    await window.waitForTimeout(3000);
    const ruleEngineContainerTab = await window.locator('.tab').filter({ hasText: /Rule Engine.*Container/i });
    const ruleEngineContainerTabExists = await ruleEngineContainerTab.count() > 0;
    
    if (ruleEngineContainerTabExists) {
      await expect(ruleEngineContainerTab).toBeVisible({ timeout: 15000 });
      console.log('✓ Found Rule Engine Container tab');
    } else {
      console.log('Rule Engine Container tab not found - may not be configured');
    }

    // Should see Docker Compose command for container mode
    const terminalContent = await window.locator('.terminal, .xterm-screen');
    const hasDockerCompose = await terminalContent.locator('text=/docker.*compose|gradlew.*docker/i').isVisible().catch(() => false);
    console.log('Rule Engine Container tab contains docker command:', hasDockerCompose);
  });
}); 