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

describe('rerunSingleVerification with sidebar config', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('re-runs verification found in configurationSidebarAbout', async () => {
    const sidebar = [
      {
        sectionId: 'sec1',
        directoryPath: '/tmp',
        verifications: [
          { id: 'sid1', checkType: 'commandSuccess', command: 'echo hi' }
        ]
      }
    ];
    const fsMock = require('fs');
    fsMock.promises.readFile.mockImplementation((p) => {
      if (p.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify({ header:{}, categories:[] }));
      if (p.includes('configurationSidebarAbout.json')) return Promise.resolve(JSON.stringify(sidebar));
      return Promise.reject(new Error('unknown'));
    });
    const { exec } = require('child_process');
    exec.mockImplementation((cmd, opts, cb) => cb(null, 'ok', ''));
    const envVerify = require('../src/main-process/environmentVerification');
    await envVerify.verifyEnvironment();
    const res = await envVerify.rerunSingleVerification('sid1');
    expect(res.success).toBe(true);
    expect(res.result).toBe('valid');
  });
});
