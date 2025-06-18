import { test, expect } from '@playwright/test';
import { getTimeout, launchElectron, ensureAllVerificationsValid, toggleAllVerifications, clickAutoSetupButton, clickStartAutoSetup, clickStartPriorityGroup, checkGroupCompleted, checkAllGroupsCompleted, expandDebugMenu, clickNoRunMode } from './test-helpers.js';

test.describe('Auto Setup E2E Tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const launchResult = await launchElectron();
    electronApp = launchResult.electronApp;
    window = launchResult.window;
    
    // Wait for the app to load completely
    await window.waitForSelector('.config-collapse-btn', { timeout: getTimeout(10000) });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should run a specific priority group successfully', async () => {
    // 1. Ensure all verifications are valid, then toggle to make them invalid
    const allValid = await ensureAllVerificationsValid(window);
    if(!allValid) throw new Error('Not all verifications are valid before toggling verifications!');
    await toggleAllVerifications(window);

    // 2. Open Auto Setup and start priority 2
    await clickAutoSetupButton(window);
    await clickStartPriorityGroup(window, 2);
    
    // 3. Check that priority 3 completes successfully
    await checkGroupCompleted(window, 2);
  });

  test('should run all priority groups successfully in No Run Mode', async () => {
    // 1. Ensure all verifications are valid, then toggle to make them invalid
    await ensureAllVerificationsValid(window);
    await toggleAllVerifications(window);
    
    // 2. Enable No Run Mode and start auto setup
    await clickNoRunMode(window);
    await clickAutoSetupButton(window);
    await clickStartAutoSetup(window);
    
    // 3. Check that all priority groups complete successfully
    await checkAllGroupsCompleted(window);
  });
}); 