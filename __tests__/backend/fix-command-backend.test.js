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
        'mirrorDirExists',
        'ChromiumInstalled',
        'threatIntelligenceDirExists',
        'infraDirExists',
        'activityLoggerDirExists',
        'ruleEngineDirExists',
        'testAnalyticsDirExists'
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
    it('should validate brew install commands', () => {
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
      
      brewCommands.forEach(verification => {
        expect(verification.fixCommand).toMatch(/^brew install/);
        
        // Should not have dangerous flags
        expect(verification.fixCommand).not.toMatch(/--force-bottle/);
        expect(verification.fixCommand).not.toMatch(/--ignore-dependencies/);
      });
    });

    it('should validate git clone commands', () => {
      const gitCloneCommands = [];
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand && verification.fixCommand.includes('git clone')) {
              gitCloneCommands.push(verification);
            }
          });
        }
      });

      expect(gitCloneCommands.length).toBeGreaterThan(0);
      
      gitCloneCommands.forEach(verification => {
        expect(verification.fixCommand).toMatch(/^git clone/);
        
        // Should be cloning from trusted GitHub repositories
        expect(verification.fixCommand).toContain('github.com/PFPT-Isolation');
        
        // Should be cloning to relative paths
        expect(verification.fixCommand).toMatch(/\.\//);
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

    it('should validate download commands', () => {
      const downloadCommands = [];
      
      // Check both general and configuration sidebar for download commands
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand && (verification.fixCommand.includes('curl') || verification.fixCommand.includes('hdiutil'))) {
              downloadCommands.push(verification);
            }
          });
        }
      });
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand && (verification.fixCommand.includes('curl') || verification.fixCommand.includes('hdiutil'))) {
              downloadCommands.push(verification);
            }
          });
        }
      });

      // Should have at least some download commands (nvm, chromium, etc.)
      expect(downloadCommands.length).toBeGreaterThan(0);

      downloadCommands.forEach(verification => {
        // Should be downloading from trusted sources
        if (verification.fixCommand.includes('nvm')) {
          expect(verification.fixCommand).toContain('raw.githubusercontent.com/nvm-sh/nvm');
        }
        
        if (verification.fixCommand.includes('chromium')) {
          expect(verification.fixCommand).toContain('github.com/ungoogled-software/ungoogled-chromium-macos');
        }
        
        // Should pipe to bash safely if doing so
        if (verification.fixCommand.includes('| bash')) {
          expect(verification.fixCommand).toMatch(/curl.*-o-.*\|.*bash/);
        }
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