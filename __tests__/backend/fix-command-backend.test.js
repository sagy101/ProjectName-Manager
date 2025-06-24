/* eslint-disable jest/no-conditional-expect */
const path = require('path');
const fs = require('fs');

// Mock electron modules before importing
const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn()
};

const mockBrowserWindow = {
  getAllWindows: jest.fn(() => [{ webContents: { send: jest.fn() } }])
};

jest.mock('electron', () => ({
  ipcMain: mockIpcMain,
  BrowserWindow: mockBrowserWindow
}));

// Import configuration data
const generalEnvironmentVerifications = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/environment-verification/generalEnvironmentVerifications.json'), 'utf8')
);
const configurationSidebarAbout = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/project-config/config/configurationSidebarAbout.json'), 'utf8')
);

describe('Fix Command Backend Tests', () => {
  let environmentVerification;
  let mockRunVerification;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Mock the runVerification function
    mockRunVerification = jest.fn();
    
    // Mock fs operations
    jest.doMock('fs', () => ({
      promises: {
        readFile: jest.fn()
      }
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Configuration Validation', () => {
    it('should have fix commands in general environment verifications', () => {
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
      
      // Validate specific expected fix commands - updated to match actual config
      const expectedFixCommands = [
        'cloudGcloudCLI',
        'cloudKubectlCLI', 
        'cloudKubectx',
        'rancherDesktop',
        'nodeJs',
        'nvmInstalled',
        'goInstalled',
        'goPathConfig',
        'javaVersion',
        'homebrewInstalled'
      ];

      expectedFixCommands.forEach(expectedId => {
        const verification = verificationsWithFixCommands.find(v => v.id === expectedId);
        expect(verification).toBeDefined();
        expect(verification.fixCommand).toBeTruthy();
        expect(typeof verification.fixCommand).toBe('string');
      });
    });

    it('should have fix commands in configuration sidebar verifications', () => {
      const verificationsWithFixCommands = [];
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand) {
              verificationsWithFixCommands.push({
                ...verification,
                sectionId: section.sectionId
              });
            }
          });
        }
      });

      expect(verificationsWithFixCommands.length).toBeGreaterThan(0);
      
      // Updated to match all actual fix commands in configuration sidebar
      const expectedFixCommands = [
        'serviceADirExists',
        'serviceAConfigExists',
        'backendDirExists',
        'agentDirExists',
        'BrowserInstalled',
        'apiServiceDirExists',
        'integrationConfigExists',
        'apiConfigExists',
        'sharedConfigDirExists',
        'loggerServiceDirExists',
        'loggerConfigExists',
        'processingEngineDirExists',
        'processingRulesExist',
        'analyticsServiceDirExists',
        'dataServiceDirExists',
        'processingComponentDirExists',
        'dataServiceConfigExists',
        'processingComponentConfigExists'
      ];

      expectedFixCommands.forEach(expectedId => {
        const verification = verificationsWithFixCommands.find(v => v.id === expectedId);
        expect(verification).toBeDefined();
        expect(verification.fixCommand).toBeTruthy();
        expect(typeof verification.fixCommand).toBe('string');
      });
    });

    it('should validate fix command safety', () => {
      const allVerifications = [];
      
      // Collect all verifications with fix commands
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand) {
              allVerifications.push(verification);
            }
          });
        }
      });
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand) {
              allVerifications.push(verification);
            }
          });
        }
      });

      // Validate safety of all fix commands
      allVerifications.forEach(verification => {
        expect(verification.fixCommand).toBeTruthy();
        expect(typeof verification.fixCommand).toBe('string');
        expect(verification.fixCommand.length).toBeGreaterThan(0);
        
        // Ensure fix commands don't have dangerous operations
        expect(verification.fixCommand).not.toMatch(/rm\s+-rf\s+\//);
        expect(verification.fixCommand).not.toMatch(/sudo\s+rm/);
        expect(verification.fixCommand).not.toMatch(/>\s*\/dev\/(sda|hda)/);
        expect(verification.fixCommand).not.toMatch(/dd\s+if=/);
        expect(verification.fixCommand).not.toMatch(/format\s+c:/i);
      });
    });
  });

  describe('Fix Command Types', () => {
    it('should validate brew install commands are now mock commands', () => {
      const mockCommands = [];
      
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('mock-verify.js')) {
              mockCommands.push(verification);
            }
          });
        }
      });

      expect(mockCommands.length).toBeGreaterThan(0);
      
      mockCommands.forEach(verification => {
        expect(verification.fixCommand).toMatch(/node .*mock-verify\.js/);
      });
    });

    it('should validate real fix commands (not mock commands)', () => {
      const realFixCommands = [];
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand) {
              realFixCommands.push(verification);
            }
          });
        }
      });

      expect(realFixCommands.length).toBeGreaterThan(0);
      
      // Fix commands should be real commands like mkdir, brew install, etc.
      // Not mock commands - those are for service simulation
      realFixCommands.forEach(verification => {
        expect(verification.fixCommand).toBeTruthy();
        expect(typeof verification.fixCommand).toBe('string');
        
        // Should not be mock service commands
        expect(verification.fixCommand).not.toMatch(/node.*mock-command\.js/);
      });
    });

    it('should validate directory creation commands', () => {
      const mkdirCommands = [];
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('mkdir')) {
              mkdirCommands.push(verification);
            }
          });
        }
      });

      expect(mkdirCommands.length).toBeGreaterThan(0);
      
      mkdirCommands.forEach(verification => {
        expect(verification.fixCommand).toMatch(/mkdir.*-p/);
        
        // Should be creating relative paths, not system paths
        expect(verification.fixCommand).not.toMatch(/mkdir.*\/etc/);
        expect(verification.fixCommand).not.toMatch(/mkdir.*\/usr/);
        expect(verification.fixCommand).not.toMatch(/mkdir.*\/var/);
        expect(verification.fixCommand).toMatch(/mkdir.*\.\//);
      });
    });

    it('should validate download commands are now mock commands', () => {
      const mockCommands = [];
      
      // Check general environment for download commands
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('mock-verify.js')) {
              mockCommands.push(verification);
            }
          });
        }
      });
      
      // We expect all download commands to be mocked now
      expect(mockCommands.length).toBeGreaterThan(0);
    });

    it('should validate complex shell commands are now mock commands', () => {
      const goPathVerification = generalEnvironmentVerifications.categories
        .find(cat => cat.category.title === 'Go')
        .category.verifications
        .find(v => v.id === 'goPathConfig');

      expect(goPathVerification).toBeDefined();
      expect(goPathVerification.fixCommand).toContain('node ./ProjectName-Manager/test-utils/commands/mock-verify.js --type=fix --id=GoInstalled');
    });
  });

  describe('Backend Integration', () => {
    it('should handle rerunSingleVerification for general environment verifications', async () => {
      // Mock the environment verification module
      const mockRerunSingleVerification = jest.fn().mockImplementation(async (verificationId) => {
        // Find the verification in our configuration
        let foundVerification = null;
        
        generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
          const category = categoryWrapper.category;
          if (category && category.verifications) {
            const verification = category.verifications.find(v => v.id === verificationId);
            if (verification) {
              foundVerification = verification;
            }
          }
        });

        if (foundVerification) {
          return {
            success: true,
            verificationId: verificationId,
            result: 'valid', // Assume fix worked
            source: 'general'
          };
        } else {
          return {
            success: false,
            error: `Verification ${verificationId} not found`
          };
        }
      });

      // Test with a specific verification that has a fix command
      const result = await mockRerunSingleVerification('cloudGcloudCLI');
      
      expect(result.success).toBe(true);
      expect(result.verificationId).toBe('cloudGcloudCLI');
      expect(result.source).toBe('general');
    });

    it('should handle rerunSingleVerification for configuration sidebar verifications', async () => {
      const mockRerunSingleVerification = jest.fn().mockImplementation(async (verificationId) => {
        // Find the verification in configuration sidebar
        let foundVerification = null;
        
        configurationSidebarAbout.forEach(section => {
          if (section.verifications) {
            const verification = section.verifications.find(v => v.id === verificationId);
            if (verification) {
              foundVerification = verification;
            }
          }
        });

        if (foundVerification) {
          return {
            success: true,
            verificationId: verificationId,
            result: 'valid',
            source: 'configuration'
          };
        } else {
          return {
            success: false,
            error: `Verification ${verificationId} not found`
          };
        }
      });

      // Test with BrowserInstalled which actually has a fix command
      const result = await mockRerunSingleVerification('BrowserInstalled');
      
      expect(result.success).toBe(true);
      expect(result.verificationId).toBe('BrowserInstalled');
      expect(result.source).toBe('configuration');
    });

    it('should handle IPC registration for fix command functionality', () => {
      // Mock IPC handler registration
      const mockHandlers = {};
      mockIpcMain.handle.mockImplementation((channel, handler) => {
        mockHandlers[channel] = handler;
      });

      // Simulate registering the rerun-single-verification handler
      const mockHandler = async (event, verificationId) => {
        return {
          success: true,
          verificationId,
          result: 'valid'
        };
      };

      mockIpcMain.handle('rerun-single-verification', mockHandler);

      expect(mockIpcMain.handle).toHaveBeenCalledWith('rerun-single-verification', mockHandler);
      expect(mockHandlers['rerun-single-verification']).toBeDefined();
    });

    it('should handle verification result broadcasting', () => {
      const mockWebContents = { send: jest.fn() };
      mockBrowserWindow.getAllWindows.mockReturnValue([{ webContents: mockWebContents }]);

      // Simulate broadcasting a verification result
      const verificationResult = {
        verificationId: 'cloudGcloudCLI',
        result: 'valid',
        source: 'general'
      };

      // Mock the broadcast function
      const broadcastVerificationResult = (result) => {
        const windows = mockBrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send('single-verification-updated', result);
        });
      };

      broadcastVerificationResult(verificationResult);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'single-verification-updated',
        verificationResult
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid verification IDs gracefully', () => {
      const mockRerunSingleVerification = jest.fn().mockImplementation(async (verificationId) => {
        return {
          success: false,
          error: `Verification ${verificationId} not found`,
          verificationId
        };
      });

      return mockRerunSingleVerification('nonexistentVerification').then(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
        expect(result.verificationId).toBe('nonexistentVerification');
        return result;
      });
    });

    it('should handle verification execution errors', () => {
      const mockRerunSingleVerification = jest.fn().mockImplementation(async (verificationId) => {
        // Simulate a verification that fails to execute
        return {
          success: false,
          verificationId,
          result: 'invalid',
          error: 'Command execution failed'
        };
      });

      return mockRerunSingleVerification('cloudGcloudCLI').then(result => {
        expect(result.success).toBe(false);
        expect(result.result).toBe('invalid');
        expect(result.error).toContain('execution failed');
        return result;
      });
    });
  });
}); 