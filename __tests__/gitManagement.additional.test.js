const fs = require('fs');
const child_process = require('child_process');

jest.mock('child_process', () => ({ exec: jest.fn() }));

const git = require('../src/main-process/gitManagement');
const {
  getGitBranch,
  clearGitBranchCache,
  getGitBranchCache,
  refreshGitBranches
} = git;

const originalReadFile = fs.promises.readFile;

beforeEach(() => {
  jest.clearAllMocks();
  clearGitBranchCache();
  fs.promises.readFile = jest.fn();
});

afterEach(() => {
  fs.promises.readFile = originalReadFile;
});

describe('gitManagement extras', () => {
  test('getGitBranchCache returns cached branches', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'main', ''));
    await getGitBranch('repo');
    const cache = getGitBranchCache();
    expect(cache).toEqual({ repo: 'main' });
  });

  test('refreshGitBranches handles read errors', async () => {
    fs.promises.readFile.mockRejectedValue(new Error('missing'));
    const res = await refreshGitBranches();
    expect(res).toEqual({});
  });
});
