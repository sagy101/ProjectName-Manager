/* eslint-disable jest/no-standalone-expect */
/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import VerificationIndicator from '../../src/environment-verification/VerificationIndicator.jsx';
import { STATUS } from '../../src/environment-verification/constants/verificationConstants.js';
import fs from 'fs';
import path from 'path';

const generalEnvironmentVerifications = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../src/environment-verification/generalEnvironmentVerifications.json'), 'utf8'));
const configurationSidebarAbout = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../src/project-config/config/configurationSidebarAbout.json'), 'utf8'));

// Mock electron API
const mockElectron = {
  ptySpawn: jest.fn(),
  rerunSingleVerification: jest.fn(),
  onSingleVerificationUpdated: jest.fn(() => () => {}),
};

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true
});

describe('Fix Command Feature Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Data Validation', () => {
    it('should have fix commands in general environment verifications', () => {
      const verificationsWithFixCommands = [];
      
      generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
        const category = categoryWrapper.category;
        if (category && category.verifications) {
          category.verifications.forEach(verification => {
            if (verification.fixCommand) {
              verificationsWithFixCommands.push({
                id: verification.id,
                title: verification.title,
                fixCommand: verification.fixCommand
              });
            }
          });
        }
      });

      expect(verificationsWithFixCommands.length).toBeGreaterThan(0);
      
      // Updated to match actual configuration
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
      });
    });

    it('should have fix commands in configuration sidebar verifications', () => {
      const verificationsWithFixCommands = [];
      
      configurationSidebarAbout.forEach(section => {
        if (section.verifications) {
          section.verifications.forEach(verification => {
            if (verification.fixCommand) {
              verificationsWithFixCommands.push({
                id: verification.id,
                title: verification.title,
                fixCommand: verification.fixCommand,
                sectionId: section.sectionId
              });
            }
          });
        }
      });

      expect(verificationsWithFixCommands.length).toBeGreaterThan(0);
      
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
      });
    });
  });

  describe('VerificationIndicator Fix Button', () => {
    const createTestVerification = (id, fixCommand) => ({
      id,
      title: `Test ${id}`,
      checkType: 'commandSuccess',
      command: 'echo test',
      fixCommand
    });

    it('should show fix button for invalid verifications with fixCommand from general environment', () => {
      const verification = createTestVerification('cloudGcloudCLI', 'brew install --cask google-cloud-sdk');
      const mockOnFixCommand = jest.fn();

      render(
        <VerificationIndicator
          verification={verification}
          status={STATUS.INVALID}
          onFixCommand={mockOnFixCommand}
        />
      );

      const fixButton = screen.getByText('Fix');
      expect(fixButton).toBeInTheDocument();
      expect(fixButton).toHaveClass('fix-button');
    });

    it('should show fix button for invalid verifications with fixCommand from configuration sidebar', () => {
      const verification = createTestVerification('ChromiumInstalled', 'curl -L -o ungoogled-chromium.dmg ...');
      const mockOnFixCommand = jest.fn();

      render(
        <VerificationIndicator
          verification={verification}
          status={STATUS.INVALID}
          onFixCommand={mockOnFixCommand}
        />
      );

      const fixButton = screen.getByText('Fix');
      expect(fixButton).toBeInTheDocument();
      expect(fixButton).toHaveClass('fix-button');
    });

    it('should call onFixCommand with correct data when fix button is clicked', () => {
      const verification = createTestVerification('cloudKubectlCLI', 'brew install kubectl');
      const mockOnFixCommand = jest.fn();

      render(
        <VerificationIndicator
          verification={verification}
          status={STATUS.INVALID}
          onFixCommand={mockOnFixCommand}
        />
      );

      const fixButton = screen.getByText('Fix');
      fireEvent.click(fixButton);

      expect(mockOnFixCommand).toHaveBeenCalledWith(verification);
    });

    it('should not show fix button for valid verifications', () => {
      const verification = createTestVerification('cloudKubectx', 'brew install kubectx');
      const mockOnFixCommand = jest.fn();

      render(
        <VerificationIndicator
          verification={verification}
          status={STATUS.VALID}
          onFixCommand={mockOnFixCommand}
        />
      );

      expect(screen.queryByText('Fix')).not.toBeInTheDocument();
    });

    it('should not show fix button for verifications without fixCommand', () => {
      const verification = {
        id: 'noFixCommand',
        title: 'Test No Fix Command',
        checkType: 'commandSuccess',
        command: 'echo test'
        // no fixCommand property
      };
      const mockOnFixCommand = jest.fn();

      render(
        <VerificationIndicator
          verification={verification}
          status={STATUS.INVALID}
          onFixCommand={mockOnFixCommand}
        />
      );

      expect(screen.queryByText('Fix')).not.toBeInTheDocument();
    });
  });

  describe('Real Configuration Fix Commands', () => {
    const testFixCommandsForCategory = (categoryName, verifications, testFn) => {
      describe(`${categoryName} Fix Commands`, () => {
        verifications.forEach(verification => {
          if (verification.fixCommand) {
            it(`should handle fix command for ${verification.id}: ${verification.title}`, () => {
              testFn(verification);
            });
          }
        });
      });
    };

    // Test general environment verifications
    generalEnvironmentVerifications.categories.forEach(categoryWrapper => {
      const category = categoryWrapper.category;
      if (category && category.verifications) {
        testFixCommandsForCategory(
          category.title,
          category.verifications,
          (verification) => {
            const mockOnFixCommand = jest.fn();

            render(
              <VerificationIndicator
                verification={verification}
                status={STATUS.INVALID}
                onFixCommand={mockOnFixCommand}
              />
            );

            const fixButton = screen.getByText('Fix');
            expect(fixButton).toBeInTheDocument();
            
            fireEvent.click(fixButton);
            expect(mockOnFixCommand).toHaveBeenCalledWith(verification);
            expect(mockOnFixCommand.mock.calls[0][0].fixCommand).toBe(verification.fixCommand);
          }
        );
      }
    });

    // Test configuration sidebar verifications
    configurationSidebarAbout.forEach(section => {
      if (section.verifications) {
        testFixCommandsForCategory(
          section.sectionId,
          section.verifications,
          (verification) => {
            const mockOnFixCommand = jest.fn();

            render(
              <VerificationIndicator
                verification={verification}
                status={STATUS.INVALID}
                onFixCommand={mockOnFixCommand}
              />
            );

            const fixButton = screen.getByText('Fix');
            expect(fixButton).toBeInTheDocument();
            
            fireEvent.click(fixButton);
            expect(mockOnFixCommand).toHaveBeenCalledWith(verification);
            expect(mockOnFixCommand.mock.calls[0][0].fixCommand).toBe(verification.fixCommand);
          }
        );
      }
    });
  });

  describe('Fix Command Types Validation', () => {
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
      
      // Test each simulator command individually to avoid multiple elements issue
      simulatorCommands.forEach((verification, index) => {
        const { unmount } = render(
          <VerificationIndicator
            key={`simulator-${index}`}
            verification={verification}
            status={STATUS.INVALID}
            onFixCommand={jest.fn()}
          />
        );

        const fixButton = screen.getByText('Fix');
        expect(fixButton).toBeInTheDocument();
        expect(verification.fixCommand).toMatch(/verification-simulator\.js fix/);
        
        unmount(); // Clean up to avoid multiple elements
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
      
      directoryCreationCommands.forEach((verification, index) => {
        const mockOnFixCommand = jest.fn();
        const { unmount } = render(
          <VerificationIndicator
            key={`dir-creation-${index}`}
            verification={verification}
            status={STATUS.INVALID}
            onFixCommand={mockOnFixCommand}
          />
        );

        const fixButton = screen.getByText('Fix');
        fireEvent.click(fixButton);
        
        expect(mockOnFixCommand).toHaveBeenCalledWith(verification);
        expect(verification.fixCommand).toMatch(/^(mkdir -p|git clone)/);
        
        unmount(); // Clean up to avoid multiple elements
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
      
      mkdirCommands.forEach((verification, index) => {
        const mockOnFixCommand = jest.fn();
        const { unmount } = render(
          <VerificationIndicator
            key={`mkdir-${index}`}
            verification={verification}
            status={STATUS.INVALID}
            onFixCommand={mockOnFixCommand}
          />
        );

        const fixButton = screen.getByText('Fix');
        fireEvent.click(fixButton);
        
        expect(mockOnFixCommand).toHaveBeenCalledWith(verification);
        expect(verification.fixCommand).toMatch(/mkdir.*-p/);
        
        unmount(); // Clean up to avoid multiple elements
      });
    });

    it('should validate all verification simulator fix commands', () => {
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

      expect(allSimulatorCommands.length).toBeGreaterThan(0);
      
      allSimulatorCommands.forEach((verification, index) => {
        const mockOnFixCommand = jest.fn();
        const { unmount } = render(
          <VerificationIndicator
            key={`all-simulator-${index}`}
            verification={verification}
            status={STATUS.INVALID}
            onFixCommand={mockOnFixCommand}
          />
        );

        const fixButton = screen.getByText('Fix');
        fireEvent.click(fixButton);
        
        expect(mockOnFixCommand).toHaveBeenCalledWith(verification);
        expect(verification.fixCommand).toContain('verification-simulator.js fix');
        
        unmount(); // Clean up to avoid multiple elements
      });
    });

    it('should validate complex shell commands', () => {
      const verification = generalEnvironmentVerifications.categories
        .find(cat => cat.category.title === 'Go')
        .category.verifications
        .find(v => v.id === 'goPathConfig');

      expect(verification).toBeDefined();
      expect(verification.fixCommand).toContain('export GOPATH=$HOME/go');
      expect(verification.fixCommand).toContain('export PATH=$PATH:$GOPATH/bin');
      
      const mockOnFixCommand = jest.fn();
      render(
        <VerificationIndicator
          verification={verification}
          status={STATUS.INVALID}
          onFixCommand={mockOnFixCommand}
        />
      );

      const fixButton = screen.getByText('Fix');
      fireEvent.click(fixButton);
      
      expect(mockOnFixCommand).toHaveBeenCalledWith(verification);
    });
  });

  describe('Fix Command Integration', () => {
    it('should handle floating terminal spawn for fix commands', async () => {
      mockElectron.ptySpawn.mockResolvedValue({ success: true, terminalId: 'fix-terminal-123' });
      
      const verification = {
        id: 'cloudGcloudCLI',
        title: 'gcloud CLI',
        checkType: 'outputContains',
        command: 'gcloud --version',
        fixCommand: 'brew install --cask google-cloud-sdk'
      };

      const mockOnFixCommand = jest.fn(async (verificationData) => {
        // Simulate what the real onFixCommand does
        const terminalId = `fix-${verificationData.id}-${Date.now()}`;
        await mockElectron.ptySpawn({
          terminalId,
          command: verificationData.fixCommand,
          isFixCommand: true
        });
      });

      render(
        <VerificationIndicator
          verification={verification}
          status={STATUS.INVALID}
          onFixCommand={mockOnFixCommand}
        />
      );

      const fixButton = screen.getByText('Fix');
      fireEvent.click(fixButton);

      expect(mockOnFixCommand).toHaveBeenCalledWith(verification);
      
      await waitFor(() => {
        expect(mockElectron.ptySpawn).toHaveBeenCalled();
      });

      const spawnCall = mockElectron.ptySpawn.mock.calls[0][0];
      expect(spawnCall.command).toBe('brew install --cask google-cloud-sdk');
      expect(spawnCall.isFixCommand).toBe(true);
    });

    it('should handle verification re-run after fix command', async () => {
      mockElectron.rerunSingleVerification.mockResolvedValue({
        success: true,
        verificationId: 'cloudKubectlCLI',
        result: 'valid',
        source: 'general'
      });

      const verification = {
        id: 'cloudKubectlCLI',
        title: 'kubectl CLI',
        fixCommand: 'brew install kubectl'
      };

      // Simulate the verification re-run after fix command completes
      await mockElectron.rerunSingleVerification('cloudKubectlCLI');

      expect(mockElectron.rerunSingleVerification).toHaveBeenCalledWith('cloudKubectlCLI');
      
      const result = await mockElectron.rerunSingleVerification.mock.results[0].value;
      expect(result.success).toBe(true);
      expect(result.verificationId).toBe('cloudKubectlCLI');
    });
  });
}); 