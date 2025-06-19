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

describe('environmentVerification additional checks', () => {
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
  }

  test('verifyEnvironment handles env vars and path checks', async () => {
    process.env.MY_VAR = '123';
    process.env.TEST_VAR = '1';
    const config = {
      header: {},
      categories: [{
        category: {
          title: 'Test',
          verifications: [
            { id: 'v1', checkType: 'envVarExists', variableName: 'TEST_VAR' },
            { id: 'v2', checkType: 'envVarEquals', variableName: 'MY_VAR', expectedValue: '123' },
            { id: 'v3', checkType: 'pathExists', pathValue: './package.json', pathType: 'file' }
          ]
        }
      }]
    };
    setupConfig(config);
    const mockedFs = require('fs');
    mockedFs.promises.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false });
    const envVerify = require('../../src/main-process/environmentVerification');
    const results = await envVerify.verifyEnvironment();
    expect(results.general.statuses.v1).toBe('valid');
    expect(results.general.statuses.v2).toBe('valid');
    expect(results.general.statuses.v3).toBe('valid');
  });

  test('verifyEnvironment marks invalid when env var missing and path fails', async () => {
    delete process.env.MY_VAR;
    delete process.env.TEST_VAR;
    const config = {
      header: {},
      categories: [{
        category: {
          title: 'Test',
          verifications: [
            { id: 'x1', checkType: 'envVarExists', variableName: 'TEST_VAR' },
            { id: 'x2', checkType: 'envVarEquals', variableName: 'MY_VAR', expectedValue: '456' },
            { id: 'x3', checkType: 'pathExists', pathValue: './nope', pathType: 'file' }
          ]
        }
      }]
    };
    setupConfig(config);
    const mockedFs = require('fs');
    mockedFs.promises.stat.mockRejectedValue(new Error('nope'));
    const envVerify = require('../../src/main-process/environmentVerification');
    const results = await envVerify.verifyEnvironment();
    expect(results.general.statuses.x1).toBe('invalid');
    expect(results.general.statuses.x2).toBe('invalid');
    expect(results.general.statuses.x3).toBe('invalid');
  });
});

test('rerunSingleVerification returns failure when not found', async () => {
  const config = {
    header: {},
    categories: [{ category: { title: 'Test', verifications: [{ id: 'v1', command: 'echo', checkType: 'commandSuccess' }] } }]
  };
  const mockedFs = require('fs');
  mockedFs.promises.readFile.mockImplementation((p) => {
    if (p.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify(config));
    if (p.includes('configurationSidebarAbout.json')) return Promise.resolve('[]');
    return Promise.reject(new Error('unknown path'));
  });
  const envVerify = require('../../src/main-process/environmentVerification');
  await envVerify.verifyEnvironment();
  const res = await envVerify.rerunSingleVerification('missing');
  expect(res.success).toBe(false);
});


test('verifyEnvironment processes sidebar section verifications', async () => {
  const config = { header: {}, categories: [] };
  const sidebar = [{
    sectionId: 'sec1',
    directoryPath: '/tmp',
    verifications: [
      { id: 'p1', checkType: 'pathExists', pathValue: './package.json', pathType: 'file' },
      { id: 'c1', checkType: 'commandSuccess', command: 'echo hi' }
    ]
  }];
  const mockedFs = require('fs');
  mockedFs.promises.readFile.mockImplementation((p) => {
    if (p.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify(config));
    if (p.includes('configurationSidebarAbout.json')) return Promise.resolve(JSON.stringify(sidebar));
    return Promise.reject(new Error('unknown')); });
  mockedFs.promises.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false });
  const { exec } = require('child_process');
  exec.mockImplementation((cmd, opts, cb) => cb(null, 'ok', ''));
  const envVerify = require('../../src/main-process/environmentVerification');
  await envVerify.refreshEnvironmentVerification();
  const res = await envVerify.verifyEnvironment();
  expect(res.sec1.p1).toBe('valid');
  expect(res.sec1.c1).toBe('valid');
});

