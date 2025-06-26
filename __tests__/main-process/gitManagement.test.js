const child_process = require('child_process');
const fs = require('fs');

const originalReadFile = fs.promises.readFile;

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

const git = require('../../src/main-process/gitManagement');
const {
  checkoutGitBranch,
  listLocalGitBranches,
  getGitBranch,
  clearGitBranchCache,
  getGitBranchCache,
  refreshGitBranches
} = git;

beforeEach(() => {
  jest.clearAllMocks();
  fs.promises.readFile = jest.fn();
  clearGitBranchCache();
});

afterEach(() => {
  fs.promises.readFile = originalReadFile;
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

describe('getGitBranch and cache management', () => {
  test('caches branch results', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'main', ''));
    const first = await getGitBranch('repo');
    const second = await getGitBranch('repo');
    expect(first).toBe('main');
    expect(second).toBe('main');
    expect(child_process.exec).toHaveBeenCalledTimes(1);
  });

  test('returns cached unknown on error', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(new Error('fail'), '', ''));
    const res1 = await getGitBranch('repo');
    expect(res1).toBe('unknown');
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'dev', ''));
    const res2 = await getGitBranch('repo');
    expect(res2).toBe('unknown'); // still cached
  });

  test('clearGitBranchCache removes cache', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'main', ''));
    await getGitBranch('repo');
    clearGitBranchCache('repo');
    await getGitBranch('repo');
    expect(child_process.exec).toHaveBeenCalledTimes(2);
  });
});

describe('refreshGitBranches', () => {
  test('reads config and refreshes branches', async () => {
    const config = JSON.stringify([
      { sectionId: 'a', directoryPath: 'pathA' },
      { sectionId: 'b' }
    ]);
    const sectionsConfig = JSON.stringify({ sections: [{ id: 'a', testSection: false }] });
    fs.promises.readFile.mockImplementation((path) => {
      if (path.includes('configurationSidebarAbout.json')) {
        return Promise.resolve(config);
      } else if (path.includes('configurationSidebarSections.json')) {
        return Promise.resolve(sectionsConfig);
      }
      return Promise.reject(new Error('File not found'));
    });
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'main', ''));
    const result = await refreshGitBranches();
    expect(result).toEqual({ a: { gitBranch: 'main' } });
  });

  test('skips test sections to avoid Git errors', async () => {
    const config = JSON.stringify([
      { sectionId: 'regular-section', directoryPath: 'pathA' },
      { sectionId: 'test-analytics', directoryPath: 'test-analytics' }
    ]);
    const sectionsConfig = JSON.stringify({ 
      sections: [
        { id: 'regular-section', testSection: false },
        { id: 'test-analytics', testSection: true }
      ] 
    });
    fs.promises.readFile.mockImplementation((path) => {
      if (path.includes('configurationSidebarAbout.json')) {
        return Promise.resolve(config);
      } else if (path.includes('configurationSidebarSections.json')) {
        return Promise.resolve(sectionsConfig);
      }
      return Promise.reject(new Error('File not found'));
    });
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'main', ''));
    const result = await refreshGitBranches();
    // Should only have the regular section, test-analytics should be skipped
    expect(result).toEqual({ regularSection: { gitBranch: 'main' } });
    expect(child_process.exec).toHaveBeenCalledTimes(1); // Only called for regular section
  });
});
