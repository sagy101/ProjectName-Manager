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
      readFile: jest.fn()
    },
  };
});

const { exec } = require('child_process');
const envVerify = require('../src/main/environmentVerification');
const { execCommand, verifyEnvironment } = envVerify;

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
});
