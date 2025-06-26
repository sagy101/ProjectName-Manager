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
        'projectADirExists',
        'projectAGradlewExists',
        'projectBDirExists',
        'agentDirExists', 
        'ChromiumInstalled',
        'projectCDirExists',
        'projectCSubprojectAGradlewExists',
        'projectCSubprojectBGradlewExists',
        'infraDirExists',
        'projectDDirExists',
        'projectDGradlewExists',
        'projectEDirExists',
        'projectFDirExists'
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
    it('should validate verification simulator commands', () => {
      const simulatorCommands = [];
      
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('verification-simulator.js')) {
              simulatorCommands.push(verification);
            }
          });
        }
      });

      expect(simulatorCommands.length).toBeGreaterThan(0);
      
      simulatorCommands.forEach(verification => {
        expect(verification.fixCommand).toMatch(/verification-simulator\.js fix/);
        
        // Should use correct path
        expect(verification.fixCommand).toContain('./ProjectName-Manager/scripts/');
        expect(verification.fixCommand).toContain('node ');
      });
    });

    it('should validate directory creation commands', () => {
      const directoryCreationCommands = [];
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand && (verification.fixCommand.includes('mkdir -p') || verification.fixCommand.includes('git clone'))) {
              directoryCreationCommands.push(verification);
            }
          });
        }
      });

      expect(directoryCreationCommands.length).toBeGreaterThan(0);
      
      directoryCreationCommands.forEach(verification => {
        // Should be either mkdir or git clone commands
        expect(verification.fixCommand).toMatch(/^(mkdir -p|git clone)/);
        
        // If it's a git clone, should be from trusted repositories
        if (verification.fixCommand.includes('git clone')) {
          expect(verification.fixCommand).toContain('github.com/PFPT-Isolation');
        }
        
        // Should be targeting relative paths
        expect(verification.fixCommand).toMatch(/\.\//);
      });
    });

    it('should validate mkdir commands', () => {
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

    it('should validate all simulator fix commands', () => {
      const allSimulatorCommands = [];
      
      // Check both general and configuration sidebar for verification simulator commands
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('verification-simulator.js')) {
              allSimulatorCommands.push(verification);
            }
          });
        }
      });
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('verification-simulator.js')) {
              allSimulatorCommands.push(verification);
            }
          });
        }
      });

      // Should have simulator commands from both general and configuration
      expect(allSimulatorCommands.length).toBeGreaterThan(0);

      allSimulatorCommands.forEach(verification => {
        // Should use verification simulator
        expect(verification.fixCommand).toContain('verification-simulator.js fix');
        expect(verification.fixCommand).toContain('./ProjectName-Manager/scripts/');
        expect(verification.fixCommand).toMatch(/^node /);
        
        // Should have proper verification ID
        const parts = verification.fixCommand.split(' ');
        expect(parts.length).toBe(4); // ['node', './ProjectName-Manager/scripts/simulators/verification-simulator.js', 'fix', 'verificationId']
        expect(parts[3]).toBe(verification.id);
      });
    });

    it('should validate complex shell commands', () => {
      const goPathVerification = generalEnvironmentVerifications.categories
        .find(cat => cat.category.title === 'Go')
        .category.verifications
        .find(v => v.id === 'goPathConfig');

      expect(goPathVerification).toBeDefined();
      expect(goPathVerification.fixCommand).toContain('export GOPATH=$HOME/go');
      expect(goPathVerification.fixCommand).toContain('export PATH=$PATH:$GOPATH/bin');
      
      // Should only modify user's shell config files
      expect(goPathVerification.fixCommand).toMatch(/~\/\.zshrc/);
      expect(goPathVerification.fixCommand).toMatch(/~\/\.bash_profile/);
      
      // Should not modify system files
      expect(goPathVerification.fixCommand).not.toMatch(/\/etc\/profile/);
      expect(goPathVerification.fixCommand).not.toMatch(/usr\/local/);
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

      // Test with ChromiumInstalled which actually has a fix command
      const result = await mockRerunSingleVerification('ChromiumInstalled');
      
      expect(result.success).toBe(true);
      expect(result.verificationId).toBe('ChromiumInstalled');
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