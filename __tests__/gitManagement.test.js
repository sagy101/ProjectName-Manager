const child_process = require('child_process');

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

const git = require('../src/main/gitManagement');
const { checkoutGitBranch, listLocalGitBranches } = git;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('checkoutGitBranch', () => {
  test('returns success and branch name', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, '', ''));
    const result = await checkoutGitBranch('repo', 'main');
    expect(child_process.exec).toHaveBeenCalled();
    expect(result).toEqual({ success: true, branch: 'main', stdout: '', stderr: '' });
  });

  test('returns error when checkout fails', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(new Error('fail'), '', 'err'));
    const result = await checkoutGitBranch('repo', 'dev');
    expect(result.success).toBe(false);
    expect(result.error).toBe('err');
  });
});

describe('listLocalGitBranches', () => {
  test('parses branch list', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'main\ndev\n', ''));
    const result = await listLocalGitBranches('repo');
    expect(result).toEqual({ success: true, branches: ['main', 'dev'] });
  });

  test('handles failure', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(new Error('bad'), '', 'err'));
    const result = await listLocalGitBranches('repo');
    expect(result.success).toBe(false);
    expect(result.branches).toEqual([]);
  });
});
