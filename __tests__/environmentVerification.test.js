const fs = require('fs');
const child_process = require('child_process');

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    promises: {
      ...original.promises,
      readFile: jest.fn(),
      stat: jest.fn(),
    },
    existsSync: jest.fn(),
  };
});

jest.mock('os', () => ({
  homedir: jest.fn(),
}));

const { exec } = require('child_process');
const envVerify = require('../src/main/environmentVerification');
const { execCommand, verifyEnvironment } = envVerify;
const os = require('os');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('execCommand', () => {
  test('prefixes nvm commands when nvm.sh exists', async () => {
    process.env.NVM_DIR = '/nvm';
    jest.spyOn(fs, 'existsSync').mockImplementation((p) => p === '/nvm/nvm.sh');
    exec.mockImplementation((cmd, opts, cb) => cb(null, 'v18', ''));

    const result = await execCommand('nvm use 18');

    expect(exec).toHaveBeenCalled();
    const calledCmd = exec.mock.calls[0][0];
    expect(calledCmd).toContain('. "/nvm/nvm.sh" && nvm use 18');
    expect(result).toEqual({ success: true, stdout: 'v18', stderr: '' });
  });

  test('returns failure when command errors', async () => {
    exec.mockImplementation((cmd, opts, cb) => cb(new Error('fail'), '', 'bad'));

    const result = await execCommand('bad');
    expect(result).toEqual({ success: false, stdout: '', stderr: 'bad' });
  });
});

describe('verifyEnvironment', () => {
  beforeEach(() => {
    // Resetting modules is the cleanest way to handle module-level cache
    // between tests, preventing state leakage.
    jest.resetModules();
  });

  test('loads config and caches results', async () => {
    const configJson = JSON.stringify({
      header: {},
      categories: [
        { category: { title: 'Test', verifications: [{ id: 'v1', title: 'v1', command: 'echo hi', checkType: 'outputContains', expectedValue: 'hi', outputStream: 'stdout' }] } }
      ]
    });

    fs.promises.readFile.mockImplementation((p) => {
      if (p.includes('generalEnvironmentVerifications.json')) return Promise.resolve(configJson);
      if (p.includes('configurationSidebarAbout.json')) return Promise.resolve('[]');
      return Promise.reject(new Error('unknown'));
    });
    exec.mockImplementation((cmd, opts, cb) => cb(null, 'hi\n', ''));

    const results = await verifyEnvironment();
    expect(results.general.statuses.v1).toBe('valid');
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
