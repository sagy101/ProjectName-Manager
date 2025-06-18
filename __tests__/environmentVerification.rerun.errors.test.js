const fs = require('fs');
const child_process = require('child_process');

jest.mock('child_process', () => ({ exec: jest.fn() }));
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: { ...actual.promises, readFile: jest.fn(), stat: jest.fn() },
    existsSync: jest.fn(() => false)
  };
});

describe('rerunSingleVerification error scenarios', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function setupConfig(config) {
    const mockedFs = require('fs');
    mockedFs.promises.readFile.mockImplementation((p) => {
      if (p.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify(config));
      if (p.includes('configurationSidebarAbout.json')) return Promise.resolve('[]');
      return Promise.reject(new Error('unknown path'));
    });
    mockedFs.promises.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false });
  }

  test('returns invalid when command execution fails', async () => {
    const config = {
      header: {},
      categories: [{ category: { title: 'Test', verifications: [{ id: 'cmd1', command: 'bad', checkType: 'commandSuccess' }] } }]
    };
    setupConfig(config);
    const { exec } = require('child_process');
    exec.mockImplementation((cmd, opts, cb) => cb(new Error('boom'), '', 'err'));
    const envVerify = require('../src/main/environmentVerification');
    await envVerify.verifyEnvironment();
    const res = await envVerify.rerunSingleVerification('cmd1');
    expect(res).toEqual({ success: true, verificationId: 'cmd1', result: 'invalid', source: 'general' });
  });

  test('handles env var checks in rerun', async () => {
    process.env.TEST_VAR = 'a';
    process.env.MY_VAR = 'b';
    const config = {
      header: {},
      categories: [{
        category: {
          title: 'Env',
          verifications: [
            { id: 'e1', checkType: 'envVarExists', variableName: 'TEST_VAR' },
            { id: 'e2', checkType: 'envVarEquals', variableName: 'MY_VAR', expectedValue: 'b' }
          ]
        }
      }]
    };
    setupConfig(config);
    const envVerify = require('../src/main/environmentVerification');
    await envVerify.verifyEnvironment();

    const res1 = await envVerify.rerunSingleVerification('e1');
    const res2 = await envVerify.rerunSingleVerification('e2');
    expect(res1.result).toBe('valid');
    expect(res2.result).toBe('valid');
  });

  test('returns error when configuration read fails', async () => {
    const config = { header: {}, categories: [] };
    setupConfig(config);
    const envVerify = require('../src/main/environmentVerification');
    await envVerify.verifyEnvironment();
    const mockedFs = require('fs');
    mockedFs.promises.readFile.mockRejectedValue(new Error('fail'));
    const res = await envVerify.rerunSingleVerification('whatever');
    expect(res.success).toBe(false);
    expect(res.error).toBe('fail');
  });
});
