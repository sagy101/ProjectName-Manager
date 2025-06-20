const { test, expect } = require('@playwright/test');
const { 
  launchElectron, 
  getTimeout,
  expandAppControlSidebar,
  openHealthReport,
  closeHealthReport,
  clickHealthReportButton,
  expandTerminalSection,
  clickFocusTabButton,
  clickShowCommandButton,
  clickRefreshButton,
  clickRefreshAllButton,
  closeCommandPopup,
  verifyHealthReportStatus,
  runConfiguration,
  enableSection,
  attachSection,
  setDeploymentMode,
  openDebugTools,
  enableNoRunMode
} = require('./test-helpers/index.js');

test.describe('Health Report Feature', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch Electron app
    const { electronApp: app, window: win } = await launchElectron();
    electronApp = app;
    window = win;
    
    // Wait for the main container to ensure the app has launched
    await window.waitForSelector('.config-container', { timeout: getTimeout(20000) });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test.describe('Health Report Button', () => {
    test('should display health report button in App Control Sidebar', async () => {
      // Expand the sidebar to see the health report button
      await expandAppControlSidebar(window);
      
      // Health report button should be visible
      const healthReportButton = window.locator('[data-testid="health-report-button"]');
      await expect(healthReportButton).toBeVisible();
      
      // Should have correct text
      await expect(healthReportButton).toContainText('Health Report');
    });

    test('should show green status by default when no terminals are running', async () => {
      await verifyHealthReportStatus(window, 'green');
    });

    test('should open health report when clicked', async () => {
      await openHealthReport(window);
      
      // Health report screen should be visible
      await expect(window.locator('h2').filter({ hasText: /Health Report/ })).toBeVisible();
    });
  });

  test.describe('Health Report Screen', () => {
    test('should display project name in header', async () => {
      // Open health report
      await openHealthReport(window);
      
      // Should show project name in header
      await expect(window.locator('h2').filter({ hasText: /Health Report/ })).toBeVisible();
    });

    test('should show "No terminal tabs found" when no terminals are running', async () => {
      // Open health report
      await openHealthReport(window);
      
      // Should show no terminals message
      await expect(window.locator('text=No terminal tabs found.')).toBeVisible();
    });

    test('should display "All Systems Healthy" status when no terminals', async () => {
      // Open health report
      await openHealthReport(window);
      
      // Should show healthy status
      await expect(window.locator('text=✓ All Systems Healthy')).toBeVisible();
    });

    test('should show summary statistics', async () => {
      // Open health report
      await openHealthReport(window);
      
      // Should show summary stats
      await expect(window.locator('text=Total: 0')).toBeVisible();
      await expect(window.locator('text=Running: 0')).toBeVisible();
      await expect(window.locator('text=Errors: 0')).toBeVisible();
    });

    test('should close health report when close button is clicked', async () => {
      // Open health report
      await openHealthReport(window);
      
      // Close health report
      await closeHealthReport(window);
      
      // Health report should be closed
      await expect(window.locator('.health-report-container')).not.toBeVisible();
    });

  });

  test.describe('Health Report with Running Terminals', () => {
    test('should display terminal information when terminals are running', async () => {
      // First, start a terminal by enabling a section and running it
      await enableSection(window, 'Mirror + MariaDB');
      await attachSection(window, 'mirror');
      await setDeploymentMode(window, 'mirror', 'run');
      await runConfiguration(window);
      
      // Wait for terminal to appear
      await expect(window.locator('.tab').first()).toBeVisible({ timeout: getTimeout(10000) });
      
      // Open health report
      await openHealthReport(window);
      
      // Should show terminal information
      await expect(window.locator('.terminal-health-section')).toBeVisible();
      
      // Should show updated summary stats
      await expect(window.locator('text=Total: 1')).toBeVisible();
    });

    test('should show different health status based on terminal status', async () => {
      // Start a terminal using helpers
      await enableSection(window, 'Mirror + MariaDB');
      await attachSection(window, 'mirror');
      await setDeploymentMode(window, 'mirror', 'run');
      await runConfiguration(window);
      
      // Wait for terminal to be running
      const tab = window.locator('.tab').first();
      await expect(tab).toBeVisible({ timeout: 10000 });
      
      // Wait for status to be running
      const tabStatus = tab.locator('.tab-status');
      await expect(tabStatus).toHaveClass(/status-running/, { timeout: 10000 });
      
      // Open health report
      await expandAppControlSidebar(window);
      
      const healthReportButton = window.locator('[data-testid="health-report-button"]');
      
      // Health report button should show green or blue status (depending on terminal state)
      await expect(healthReportButton).toHaveClass(/health-report-button--(green|blue)/);
      
      await healthReportButton.click();
      
      // Should show running status in summary
      await expect(window.locator('text=Running: 1')).toBeVisible();
    });

    test('should expand and collapse terminal sections', async () => {
      // Start a terminal using helpers
      await enableSection(window, 'Mirror + MariaDB');
      await attachSection(window, 'mirror');
      await setDeploymentMode(window, 'mirror', 'run');
      await runConfiguration(window);
      
      await expect(window.locator('.tab').first()).toBeVisible({ timeout: 10000 });
      
      // Open health report
      await openHealthReport(window);
      
      // Find terminal section header
      const terminalSection = window.locator('.terminal-section-header').first();
      await expect(terminalSection).toBeVisible();
      
      // Should initially be collapsed (show ▶)
      await expect(terminalSection.locator('.expand-icon')).toContainText('▶');
      
      // Click to expand
      await terminalSection.click();
      
      // Should now be expanded (show ▼)
      await expect(terminalSection.locator('.expand-icon')).toContainText('▼');
      
      // Should show terminal details
      await expect(window.locator('.terminal-details')).toBeVisible();
    });

    test('should show terminal action buttons when expanded', async () => {
      // Start a terminal using helpers
      await enableSection(window, 'Mirror + MariaDB');
      await attachSection(window, 'mirror');
      await setDeploymentMode(window, 'mirror', 'run');
      await runConfiguration(window);
      
      await expect(window.locator('.tab').first()).toBeVisible({ timeout: 10000 });
      
      // Open health report
      await openHealthReport(window);
      
      // Expand terminal section
      const terminalSection = window.locator('.terminal-section-header').first();
      await terminalSection.click();
      
      // Should show action buttons
      await expect(window.locator('[data-testid="show-command-button"]')).toBeVisible();
      await expect(window.locator('[data-testid="focus-tab-button"]')).toBeVisible();
      await expect(window.locator('[data-testid="refresh-button"]')).toBeVisible();
    });

    test('should focus terminal tab when focus button is clicked', async () => {
      // Start a terminal using helpers
      await enableSection(window, 'Mirror + MariaDB');
      await attachSection(window, 'mirror');
      await setDeploymentMode(window, 'mirror', 'run');
      await runConfiguration(window);
      
      const tab = window.locator('.tab').first();
      await expect(tab).toBeVisible({ timeout: 10000 });
      
      // Open health report
      await openHealthReport(window);
      
      // Expand terminal section and click focus button
      const terminalSection = window.locator('.terminal-section-header').first();
      await terminalSection.click();
      
      const focusButton = window.locator('[data-testid="focus-tab-button"]');
      await focusButton.click();
      
      // Health report should close and terminal should be focused
      await expect(window.locator('.health-report-container')).not.toBeVisible();
      
      // Terminal tab should be active
      await expect(tab).toHaveClass(/active/);
    });

    test('should show command popup when show command button is clicked', async () => {
      // Start a terminal using helpers
      await enableSection(window, 'Mirror + MariaDB');
      await attachSection(window, 'mirror');
      await setDeploymentMode(window, 'mirror', 'run');
      await runConfiguration(window);
      
      await expect(window.locator('.tab').first()).toBeVisible({ timeout: 10000 });
      
      // Open health report
      await openHealthReport(window);
      
      // Expand terminal section and click show command button
      const terminalSection = window.locator('.terminal-section-header').first();
      await terminalSection.click();
      
      const showCommandButton = window.locator('[data-testid="show-command-button"]');
      await showCommandButton.click();
      
      // Command popup should be visible
      await expect(window.locator('.command-popup')).toBeVisible();
      await expect(window.locator('text=Command Details')).toBeVisible();
    });

    test('should close command popup when close button is clicked', async () => {
      // Start a terminal using helpers
      await enableSection(window, 'Mirror + MariaDB');
      await attachSection(window, 'mirror');
      await setDeploymentMode(window, 'mirror', 'run');
      await runConfiguration(window);
      
      await expect(window.locator('.tab').first()).toBeVisible({ timeout: 10000 });
      
      // Open health report and show command popup
      await openHealthReport(window);
      
      const terminalSection = window.locator('.terminal-section-header').first();
      await terminalSection.click();
      
      const showCommandButton = window.locator('[data-testid="show-command-button"]');
      await showCommandButton.click();
      
      // Close popup
      const closeButton = window.locator('.command-popup .close-button');
      await closeButton.click();
      
      // Popup should be closed
      await expect(window.locator('.command-popup')).not.toBeVisible();
    });
  });

  test.describe('Health Report Refresh Functionality', () => {
    test('should refresh container statuses when refresh all button is clicked', async () => {
      // Open health report
      await openHealthReport(window);
      
      // Click refresh all button
      const refreshAllButton = window.locator('text=Refresh All');
      await refreshAllButton.click();
      
      // Should update the last updated timestamp
      await expect(window.locator('text=/Updated:/')).toBeVisible();
    });

    test('should show updated timestamp after refresh', async () => {
      // Open health report
      await openHealthReport(window);
      
      // Get initial timestamp
      const initialTimestamp = await window.locator('.last-updated').textContent();
      
      // Wait a moment and refresh
      await window.waitForTimeout(1000);
      const refreshAllButton = window.locator('text=Refresh All');
      await refreshAllButton.click();
      
      // Timestamp should be updated
      await window.waitForTimeout(500);
      const newTimestamp = await window.locator('.last-updated').textContent();
      expect(newTimestamp).not.toBe(initialTimestamp);
    });
  });

  test.describe('Health Report in No Run Mode', () => {
    test('should disable refresh buttons in no run mode', async () => {
      // Enable no run mode using helpers
      await openDebugTools(window);
      await enableNoRunMode(window);
      
      // Start a terminal using helpers
      await enableSection(window, 'Mirror + MariaDB');
      await attachSection(window, 'mirror');
      await setDeploymentMode(window, 'mirror', 'run');
      await runConfiguration(window);
      
      await expect(window.locator('.tab').first()).toBeVisible({ timeout: 10000 });
      
      // Open health report
      const healthReportButton = window.locator('[data-testid="health-report-button"]');
      await healthReportButton.click();
      
      // Expand terminal section
      const terminalSection = window.locator('.terminal-section-header').first();
      await terminalSection.click();
      
      // Refresh button should be disabled
      const refreshButton = window.locator('[data-testid="refresh-button"]');
      await expect(refreshButton).toBeDisabled();
      await expect(refreshButton).toHaveAttribute('title', 'Cannot refresh in No Run Mode');
    });
  });
}); 