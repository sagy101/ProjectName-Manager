const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { resolveEnvVars, checkPathExists } = require('../src/mainUtils');

describe('resolveEnvVars', () => {
  test('replaces $HOME with user home directory', () => {
    const input = '$HOME/some/path';
    const expected = path.join(os.homedir(), 'some/path');
    expect(resolveEnvVars(input)).toBe(expected);
  });

  test('replaces $GOPATH when set', () => {
    process.env.GOPATH = '/tmp/go';
    expect(resolveEnvVars('$GOPATH/bin')).toBe('/tmp/go/bin');
  });

  test('does not replace $GOPATH when used as part of a larger variable', () => {
    process.env.GOPATH = '/tmp/go';
    const input = '$GOPATH_EXTRA/bin';
    expect(resolveEnvVars(input)).toBe('$GOPATH_EXTRA/bin');
  });
  test('does not replace $HOME when used as part of a larger variable', () => {
    const input = '$HOME_DIR/some/path';
    expect(resolveEnvVars(input)).toBe('$HOME_DIR/some/path');
  });
});

describe('checkPathExists', () => {
  test('validates existing directory', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'testdir-'));
    const result = await checkPathExists(dir, '.', 'directory');
    expect(result).toBe('valid');
  });

  test('returns invalid for missing file', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'testdir-'));
    const result = await checkPathExists(tmpRoot, 'missing.txt', 'file');
    expect(result).toBe('invalid');
  });
});
