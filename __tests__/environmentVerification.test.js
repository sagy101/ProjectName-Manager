const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');

// Mock external dependencies
jest.mock('child_process');
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    promises: {
        readFile: jest.fn(),
        stat: jest.fn(),
    },
    existsSync: jest.fn(),
}));
jest.mock('os');


describe('verifyEnvironment', () => {

    beforeEach(() => {
        // Resetting modules is the cleanest way to handle module-level cache
        // between tests, preventing state leakage.
        jest.resetModules();
    });

    test('should extract full version from command output for array expectedValue', async () => {
        // --- Arrange ---

        // Re-import dependencies for this test case after reset
        const { exec: mockedExec } = require('child_process');
        const { promises: mockedFsPromises } = require('fs');
        const mockedFsSync = require('fs');
        const mockedOs = require('os');

        // Mock config files
        const mockVerificationsConfig = {
            header: {},
            categories: [{
                category: {
                    title: "Node.js",
                    verifications: [{
                        id: "nodeJs",
                        title: "Node.js 15.x or 16.x",
                        command: "nvm ls",
                        checkType: "outputContains",
                        expectedValue: ["v15.", "v16."],
                        versionId: "nodeVersion",
                        outputStream: "stdout"
                    }]
                }
            }]
        };
        const mockSidebarConfig = [];

        mockedFsPromises.readFile.mockImplementation((filePath) => {
            if (filePath.endsWith('generalEnvironmentVerifications.json')) {
                return Promise.resolve(JSON.stringify(mockVerificationsConfig));
            }
            if (filePath.endsWith('configurationSidebarAbout.json')) {
                return Promise.resolve(JSON.stringify(mockSidebarConfig));
            }
            return Promise.reject(new Error(`Unexpected readFile call: ${filePath}`));
        });
        
        // Mock path checks inside execCommand
        mockedFsSync.existsSync.mockReturnValue(false); 
        mockedOs.homedir.mockReturnValue('/fake/home');

        // Mock command execution
        const nvmLsOutput = `
            v15.5.1
            v16.20.2
            v20.19.1
        `.trim();

        mockedExec.mockImplementation((command, options, callback) => {
            // The command gets wrapped, so we check for inclusion
            if (command.includes('nvm ls')) {
                callback(null, nvmLsOutput, '');
            } else {
                callback(null, 'mock stdout', '');
            }
        });

        // Require the module under test AFTER mocks are set up
        const { verifyEnvironment } = require('../src/main/environmentVerification');
        
        // --- Act ---
        const result = await verifyEnvironment();
        
        // --- Assert ---
        expect(result.discoveredVersions.nodeVersion).toBe('v15.5.1');
        
        // Verify that exec was called with the correct command
        const execCall = mockedExec.mock.calls.find(call => call[0].includes('nvm ls'));
        expect(execCall).toBeDefined();
    });
}); 