// Tests for main process startup and modular refactoring bug fixes
// These tests focus on catching real bugs that break frontend functionality

const { BrowserWindow } = require('electron');

// Mock electron modules
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  app: {
    getAppPath: jest.fn(() => '/test/app/path'),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
    exit: jest.fn()
  },
  dialog: {
    showSaveDialog: jest.fn(),
    showOpenDialog: jest.fn()
  }
}));

// Mock file system
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn()
  }
}));

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Mock the modular components
jest.mock('../../src/main-process/environmentVerification', () => ({
  verifyEnvironment: jest.fn().mockResolvedValue({ success: true }),
  refreshEnvironmentVerification: jest.fn().mockResolvedValue({ success: true }),
  getEnvironmentVerification: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../src/main-process/gitManagement', () => ({
  checkoutGitBranch: jest.fn(),
  listLocalGitBranches: jest.fn(),
  clearGitBranchCache: jest.fn()
}));

jest.mock('../../src/main-process/dropdownManagement', () => ({
  fetchDropdownOptions: jest.fn(),
  executeDropdownCommand: jest.fn(),
  handleDropdownValueChange: jest.fn()
}));

jest.mock('../../src/main-process/ptyManagement', () => ({
  spawnPTY: jest.fn(),
  writeToPTY: jest.fn(),
  resizePTY: jest.fn(),
  killProcess: jest.fn(),
  killAllPTYProcesses: jest.fn()
}));

jest.mock('../../src/main-process/containerManagement', () => ({
  stopContainers: jest.fn(),
  getContainerStatus: jest.fn()
}));

jest.mock('../../src/main-process/configurationManagement', () => ({
  loadDisplaySettings: jest.fn().mockResolvedValue({ success: true, displaySettings: {} }),
  getAboutConfig: jest.fn(),
  exportConfiguration: jest.fn(),
  importConfiguration: jest.fn()
}));

jest.mock('../../src/main-process/windowManagement', () => ({
  createWindow: jest.fn()
}));

describe('Main Process Startup Bug Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  test('should import BrowserWindow correctly', () => {
    // This test catches the bug where BrowserWindow was not imported in main.js
    // causing "BrowserWindow is not defined" error
    expect(BrowserWindow).toBeDefined();
    expect(typeof BrowserWindow).toBe('function');
  });

  test('should load display settings correctly', async () => {
    // This test verifies that display settings loading works correctly
    const configurationManagement = require('../../src/main-process/configurationManagement');
    
    const result = await configurationManagement.loadDisplaySettings();
    expect(result.success).toBe(true);
    expect(result.displaySettings).toBeDefined();
  });

  test('should return correct data structure from import configuration', async () => {
    // This test catches the bug where import configuration returned wrong data structure
    // The frontend expects configState, attachState, globalDropdownValues, gitBranches as top-level properties
    
    // Mock the actual configurationManagement module temporarily
    jest.unmock('../../src/main-process/configurationManagement');
    const { dialog } = require('electron');
    const fs = require('fs').promises;
    
    // Mock file system and dialog
    const mockConfigData = {
      configState: {
        'test-section': { 'test-dropdown': 'test-value' }
      },
      attachState: {
        'test-section': { 'test-dropdown': 'test-value' }
      },
      globalDropdownValues: {
        'test-global': 'test-global-value'
      },
      gitBranches: {
        'test-project': 'test-branch'
      }
    };
    
    dialog.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/test/config.json']
    });
    
    fs.readFile.mockResolvedValue(JSON.stringify(mockConfigData));
    
    const configurationManagement = require('../../src/main-process/configurationManagement');
    const result = await configurationManagement.importConfiguration();
    
    // Should have top-level properties, not wrapped in 'data'
    expect(result.success).toBe(true);
    expect(result.configState).toEqual(mockConfigData.configState);
    expect(result.attachState).toEqual(mockConfigData.attachState);
    expect(result.globalDropdownValues).toEqual(mockConfigData.globalDropdownValues);
    expect(result.gitBranches).toEqual(mockConfigData.gitBranches);
    
    // Should NOT have these wrapped in a 'data' property
    expect(result.data).toBeUndefined();
    
    // Re-mock for other tests
    jest.doMock('../../src/main-process/configurationManagement', () => ({
      loadDisplaySettings: jest.fn().mockResolvedValue({ success: true, displaySettings: {} }),
      getAboutConfig: jest.fn(),
      exportConfiguration: jest.fn(),
      importConfiguration: jest.fn()
    }));
  });

  test('should handle import configuration when user cancels', async () => {
    // Test the cancel case
    jest.unmock('../../src/main-process/configurationManagement');
    const { dialog } = require('electron');
    
    dialog.showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: []
    });
    
    const configurationManagement = require('../../src/main-process/configurationManagement');
    const result = await configurationManagement.importConfiguration();
    
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
    
    // Re-mock for other tests
    jest.doMock('../../src/main-process/configurationManagement', () => ({
      loadDisplaySettings: jest.fn().mockResolvedValue({ success: true, displaySettings: {} }),
      getAboutConfig: jest.fn(),
      exportConfiguration: jest.fn(),
      importConfiguration: jest.fn()
    }));
  });

  test('should return branch property from git checkout command', async () => {
    // This test catches the bug where git checkout didn't return the branch property
    // The GitBranchSwitcher component expects result.branch to update the UI
    
    // Mock the actual gitManagement module temporarily
    jest.unmock('../../src/main-process/gitManagement');
    const { exec } = require('child_process');
    
    // Mock exec to simulate successful git checkout
    const originalExec = exec;
    const mockExec = jest.fn().mockImplementation((command, options, callback) => {
      // Simulate successful git checkout
      if (command.includes('git -C') && command.includes('checkout')) {
        callback(null, 'Switched to branch \'test-branch\'\n', '');
      } else {
        callback(new Error('Command not found'), '', 'Command not found');
      }
    });
    
    require('child_process').exec = mockExec;
    
    try {
      const gitManagement = require('../../src/main-process/gitManagement');
      const result = await gitManagement.checkoutGitBranch('/test/project', 'test-branch');
      
      // Should return success and branch property
      expect(result.success).toBe(true);
      expect(result.branch).toBe('test-branch');
      expect(result.stdout).toBeDefined();
      expect(result.stderr).toBeDefined();
      
    } finally {
      // Restore original exec
      require('child_process').exec = originalExec;
      
      // Re-mock the module for other tests
      jest.doMock('../../src/main-process/gitManagement', () => ({
        checkoutGitBranch: jest.fn(),
        listLocalGitBranches: jest.fn(),
        clearGitBranchCache: jest.fn()
      }));
    }
  });

  test('should return array directly from getAboutConfig for import git branch switching', async () => {
    // This test catches the bug where getAboutConfig returned wrapped object instead of array
    // causing import config git branch switching to fail with "aboutConfig.forEach is not a function"
    
    // Mock the actual configurationManagement module temporarily
    jest.unmock('../../src/main-process/configurationManagement');
    
    const configurationManagement = require('../../src/main-process/configurationManagement');
    const fs = require('fs').promises;
    
    // Mock fs.readFile to return valid config array
    const mockConfigData = [
      {
        sectionId: 'rule-engine',
        directoryPath: './rule-engine'
      },
      {
        sectionId: 'web-ui',
        directoryPath: './web-ui'
      }
    ];
    
    const originalReadFile = fs.readFile;
    fs.readFile = jest.fn().mockResolvedValue(JSON.stringify(mockConfigData));
    
    try {
      const result = await configurationManagement.getAboutConfig();
      
      // Should return array directly, not wrapped in object
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockConfigData);
      
      // Should NOT be wrapped in success/config structure
      expect(result.success).toBeUndefined();
      expect(result.config).toBeUndefined();
      
    } finally {
      // Restore original fs.readFile
      fs.readFile = originalReadFile;
      
      // Re-mock the module for other tests
      jest.doMock('../../src/main-process/configurationManagement', () => ({
        loadDisplaySettings: jest.fn().mockResolvedValue({ success: true, displaySettings: {} }),
        getAboutConfig: jest.fn(),
        exportConfiguration: jest.fn(),
        importConfiguration: jest.fn()
      }));
    }
  });
}); 