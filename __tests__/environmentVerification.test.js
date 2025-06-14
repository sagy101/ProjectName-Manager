const fs = require('fs');
const child_process = require('child_process');
const os = require('os');

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

beforeEach(() => {
  jest.clearAllMocks();
  os.homedir.mockReturnValue('/fake/home');
});

describe('execCommand', () => {
  test('prefixes nvm commands when nvm.sh exists', async () => {
    process.env.NVM_DIR = '/nvm';
    fs.existsSync.mockImplementation((p) => p === '/nvm/nvm.sh');
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
    jest.resetModules();
  });

  test('loads config and caches results', async () => {
    const configJson = JSON.stringify({
      header: {},
      categories: [
        { category: { title: 'Test', verifications: [{ id: 'v1', title: 'v1', command: 'echo hi', checkType: 'outputContains', expectedValue: 'hi', outputStream: 'stdout' }] } }
      ]
    });

    const mockedFs = require('fs');
    mockedFs.promises.readFile.mockImplementation((p) => {
      if (p.includes('generalEnvironmentVerifications.json')) return Promise.resolve(configJson);
      if (p.includes('configurationSidebarAbout.json')) return Promise.resolve('[]');
      return Promise.reject(new Error('unknown'));
    });
    
    const { exec: mockedExec } = require('child_process');
    mockedExec.mockImplementation((cmd, opts, cb) => cb(null, 'hi\n', ''));
    
    const { verifyEnvironment } = require('../src/main/environmentVerification');
    const results = await verifyEnvironment();
    expect(results.general.statuses.v1).toBe('valid');
  });

  test('should extract full version from command output for array expectedValue', async () => {
    const { exec: mockedExec } = require('child_process');
    const { promises: mockedFsPromises } = require('fs');
    const mockedFs = require('fs');
    const mockedOs = require('os');
    
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
    
    mockedFs.existsSync.mockReturnValue(false); 
    mockedOs.homedir.mockReturnValue('/fake/home');

    const nvmLsOutput = `
      v15.5.1
      v16.20.2
      v20.19.1
    `.trim();

    mockedExec.mockImplementation((command, options, callback) => {
      if (command.includes('nvm ls')) {
        callback(null, nvmLsOutput, '');
      } else {
        callback(null, 'mock stdout', '');
      }
    });

    const { verifyEnvironment } = require('../src/main/environmentVerification');
    
    const result = await verifyEnvironment();
    
    expect(result.discoveredVersions.nodeVersion).toBe('v15.5.1');
    
    const execCall = mockedExec.mock.calls.find(call => call[0].includes('nvm ls'));
    expect(execCall).toBeDefined();
  });
});

describe('runFixCommand', () => {
  let runFixCommand;
  let mockExec;
  let mockFsReadFile;
  let mockFsExistsSync; // To control nvm script path finding if necessary

  const mockGeneralConfig = {
    header: {},
    categories: [{
      category: {
        title: 'General Fixable',
        verifications: [
          { id: 'fixableGen1', title: 'Fixable General 1', command: 'originalCommandGen1', checkType: 'commandSuccess', fixCommand: 'fixCommandGen1' },
          { id: 'nonFixableGen1', title: 'Non-Fixable General 1', command: 'originalCommandNonFixableGen1', checkType: 'commandSuccess' },
          { id: 'fixableGen2ReverifyFails', title: 'Fixable General 2 - Re-verify Fails', command: 'originalCommandGen2ReverifyFails', checkType: 'commandSuccess', fixCommand: 'fixCommandGen2' },
          { id: 'pathCheckFixable', title: 'Path Check Fixable', checkType: 'pathExists', pathValue: '/tmp/fixablepath', pathType: 'file', fixCommand: 'touch /tmp/fixablepath' },
        ],
      },
    }],
  };

  const mockSidebarConfig = [{
    sectionId: 'serviceChecks',
    verifications: [{
      id: 'service1Fixable', title: 'Fixable Service 1', command: 'pgrep my-service', checkType: 'commandSuccess', fixCommand: 'systemctl start my-service',
    }],
  }];

  beforeEach(() => {
    jest.resetModules(); // Resets module cache, including environmentCaches in the module

    // Re-require child_process to get the mocked exec for this scope
    mockExec = require('child_process').exec;

    // Re-require fs to get the mocked readFile for this scope
    const mockFs = require('fs');
    mockFsReadFile = mockFs.promises.readFile;
    mockFsExistsSync = mockFs.existsSync;

    // Mock os.homedir again as it's reset
    const mockOs = require('os');
    mockOs.homedir.mockReturnValue('/fake/home');

    // Import runFixCommand after resetting modules
    runFixCommand = require('../src/main/environmentVerification').runFixCommand;

    // Default mock for existsSync (e.g., for nvm path checks in execCommand)
    mockFsExistsSync.mockReturnValue(false);
  });

  test('General Verification Fix Success: commandSuccess', async () => {
    mockFsReadFile.mockImplementation(filePath => {
      if (filePath.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify(mockGeneralConfig));
      return Promise.reject(new Error('File not found in mock'));
    });

    // Mock exec: 1st call (fixCommandGen1) success, 2nd call (originalCommandGen1) success
    mockExec.mockImplementationOnce((command, options, callback) => callback(null, 'fix success', ''))
              .mockImplementationOnce((command, options, callback) => callback(null, 'original success', ''));

    const result = await runFixCommand('fixableGen1', 'general');

    expect(result.success).toBe(true);
    expect(result.newStatus).toBe('valid');
    expect(result.verificationId).toBe('fixableGen1');
    expect(result.sectionId).toBe('general');
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('fixCommandGen1'), expect.any(Object), expect.any(Function));
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('originalCommandGen1'), expect.any(Object), expect.any(Function));

    // Verify cache update (requires access to the cache or a getter)
    // For now, we trust the implementation detail based on returned newStatus.
    // If direct cache verification is needed, `environmentVerification.js` would need to export it or a getter.
  });

  test('General Verification Fix Command Fails', async () => {
    mockFsReadFile.mockImplementation(filePath => {
      if (filePath.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify(mockGeneralConfig));
      return Promise.reject(new Error('File not found in mock'));
    });

    // Mock exec: 1st call (fixCommandGen1) fails
    mockExec.mockImplementationOnce((command, options, callback) => callback(new Error('fix failed'), '', 'fix error output'));

    const result = await runFixCommand('fixableGen1', 'general');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Fix command failed');
    expect(result.fixOutput).toBe('fix error output');
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('fixCommandGen1'), expect.any(Object), expect.any(Function));
    expect(mockExec).toHaveBeenCalledTimes(1); // Original command should not run
  });

  test('General Verification Re-Verification Fails After Successful Fix', async () => {
    mockFsReadFile.mockImplementation(filePath => {
      if (filePath.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify(mockGeneralConfig));
      return Promise.reject(new Error('File not found in mock'));
    });

    // Mock exec: 1st call (fixCommandGen2) success, 2nd call (originalCommandGen2ReverifyFails) fails
    mockExec.mockImplementationOnce((command, options, callback) => callback(null, 'fix success', ''))
              .mockImplementationOnce((command, options, callback) => callback(new Error('original failed'), '', 'original error output'));

    const result = await runFixCommand('fixableGen2ReverifyFails', 'general');

    expect(result.success).toBe(true); // Fix command itself succeeded
    expect(result.newStatus).toBe('invalid'); // But re-verification failed
    expect(result.verificationId).toBe('fixableGen2ReverifyFails');
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('fixCommandGen2'), expect.any(Object), expect.any(Function));
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('originalCommandGen2ReverifyFails'), expect.any(Object), expect.any(Function));
  });

  test('Section-Specific Verification Fix Success (serviceChecks)', async () => {
    mockFsReadFile.mockImplementation(filePath => {
      if (filePath.includes('configurationSidebarAbout.json')) return Promise.resolve(JSON.stringify(mockSidebarConfig));
      return Promise.reject(new Error('File not found in mock for sidebar'));
    });

    mockExec.mockImplementationOnce((command, options, callback) => callback(null, 'service started', ''))
              .mockImplementationOnce((command, options, callback) => callback(null, 'pgrep output', '')); // Simulating pgrep success

    const result = await runFixCommand('service1Fixable', 'serviceChecks');

    expect(result.success).toBe(true);
    expect(result.newStatus).toBe('valid');
    expect(result.verificationId).toBe('service1Fixable');
    expect(result.sectionId).toBe('serviceChecks');
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('systemctl start my-service'), expect.any(Object), expect.any(Function));
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pgrep my-service'), expect.any(Object), expect.any(Function));
  });

  test('Verification ID Not Found', async () => {
    mockFsReadFile.mockImplementation(filePath => {
      if (filePath.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify(mockGeneralConfig));
      return Promise.reject(new Error('File not found'));
    });

    const result = await runFixCommand('nonExistentId', 'general');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Verification configuration not found.');
  });

  test('No fixCommand Defined for Verification', async () => {
    mockFsReadFile.mockImplementation(filePath => {
      if (filePath.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify(mockGeneralConfig));
      return Promise.reject(new Error('File not found'));
    });

    const result = await runFixCommand('nonFixableGen1', 'general');
    expect(result.success).toBe(false);
    expect(result.error).toBe('No fix command defined for this verification.');
  });

  test('General Verification Fix Success: pathExists', async () => {
    mockFsReadFile.mockImplementation(filePath => {
      if (filePath.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify(mockGeneralConfig));
      return Promise.reject(new Error('File not found in mock'));
    });

    // Mock exec for the fix command (touch /tmp/fixablepath)
    mockExec.mockImplementationOnce((command, options, callback) => {
      if (command.includes('touch /tmp/fixablepath')) {
        // Simulate path creation by making the next fs.stat call succeed for the path
        require('fs').promises.stat.mockResolvedValueOnce({ isFile: () => true, isDirectory: () => false });
        callback(null, '', ''); // touch command success
      } else {
        callback(new Error('unexpected command in pathExists fix'), '', '');
      }
    });

    // Initial stat check (before fix) - path does not exist
    require('fs').promises.stat.mockRejectedValueOnce(new Error('Path does not exist'));

    const result = await runFixCommand('pathCheckFixable', 'general');

    expect(result.success).toBe(true);
    expect(result.newStatus).toBe('valid');
    expect(result.verificationId).toBe('pathCheckFixable');
    expect(result.sectionId).toBe('general');
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('touch /tmp/fixablepath'), expect.any(Object), expect.any(Function));

    // fs.stat would have been called twice: once before fix (failed), once after (succeeded) by runFixCommand's re-verification logic
    expect(require('fs').promises.stat).toHaveBeenCalledTimes(1); // Original check is done by re-evaluation logic in runFixCommand not by calling verifyEnvironment
  });
});
