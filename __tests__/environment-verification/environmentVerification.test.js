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

jest.mock('os', () => {
  const actual = jest.requireActual('os');
  return {
    ...actual,
    homedir: jest.fn(),
  };
});

const { exec } = require('child_process');
const envVerify = require('../../src/main-process/environmentVerification');
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
    
    const { verifyEnvironment } = require('../../src/main-process/environmentVerification');
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

    const { verifyEnvironment } = require('../../src/main-process/environmentVerification');
    
    const result = await verifyEnvironment();
    
    expect(result.discoveredVersions.nodeVersion).toBe('v15.5.1');
    
    const execCall = mockedExec.mock.calls.find(call => call[0].includes('nvm ls'));
    expect(execCall).toBeDefined();
  });
});

describe('additional environmentVerification functions', () => {
  beforeEach(() => {
    jest.resetModules();
    os.homedir.mockReturnValue('/fake/home');
  });

  function setupMocks() {
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
  }

  test('refreshEnvironmentVerification re-runs verification and sends result', async () => {
    setupMocks();
    const envVerify = require('../../src/main-process/environmentVerification');
    const mainWindow = { webContents: { send: jest.fn() } };

    const result = await envVerify.refreshEnvironmentVerification(mainWindow);
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('environment-verification-complete', expect.any(Object));
    expect(result.general.statuses.v1).toBe('valid');
  });

  test('getEnvironmentExportData returns caches and platform info', async () => {
    setupMocks();
    const envVerify = require('../../src/main-process/environmentVerification');
    await envVerify.verifyEnvironment();

    const data = envVerify.getEnvironmentExportData();
    expect(data.environmentCaches.general.statuses.v1).toBe('valid');
    expect(data.platform).toHaveProperty('platform');
    expect(data).toHaveProperty('timestamp');
  });

  test('rerunSingleVerification updates single result', async () => {
    setupMocks();
    const envVerify = require('../../src/main-process/environmentVerification');
    await envVerify.verifyEnvironment();
    const mainWindow = { webContents: { send: jest.fn() } };

    const res = await envVerify.rerunSingleVerification('v1', mainWindow);
    expect(res.success).toBe(true);
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('single-verification-updated', expect.objectContaining({ verificationId: 'v1' }));
    const caches = envVerify.getEnvironmentVerification();
    expect(caches.general.statuses.v1).toBe('valid');
  });
});


  test('execCommand runs when nvm not found', async () => {
    delete process.env.NVM_DIR;
    const fsMock = require('fs');
    fsMock.existsSync.mockReturnValue(false);
    exec.mockImplementation((cmd, opts, cb) => cb(null, 'ok', ''));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await execCommand('nvm use 18');
    expect(result).toEqual({ success: true, stdout: 'ok', stderr: '' });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[VERIFICATION][WARN]'), expect.stringContaining('nvm.sh not found'));
    warnSpy.mockRestore();
  });

test('execCommand times out when process hangs', async () => {
  exec.mockImplementation(() => {});
  jest.useFakeTimers();
  const promise = execCommand('sleep');
  jest.advanceTimersByTime(16000);
  const result = await promise;
  expect(result).toEqual({ success: false, stdout: '', stderr: 'Command timed out' });
  jest.useRealTimers();
});
