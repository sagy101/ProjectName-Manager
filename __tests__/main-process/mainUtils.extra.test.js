/** @jest-environment node */
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { resolveEnvVars, checkPathExists } = require('../../src/main-process/mainUtils');

describe('mainUtils additional', () => {
  test('resolveEnvVars returns input when not a string', () => {
    expect(resolveEnvVars(123)).toBe(123);
  });

  test('checkPathExists with file and mismatched type', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'file-'));
    const file = path.join(tmp, 'f.txt');
    await fs.writeFile(file, 'hi');
    expect(await checkPathExists(tmp, 'f.txt', 'file')).toBe('valid');
    expect(await checkPathExists(tmp, 'f.txt', 'directory')).toBe('invalid');
  });

  test('checkPathExists without type', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dir-'));
    expect(await checkPathExists(dir, '.', null)).toBe('valid');
  });

  test('checkPathExists without type returns invalid for missing path', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dir-'));
    expect(await checkPathExists(dir, 'nope.txt')).toBe('invalid');
  });

  test('resolveEnvVars returns empty string for empty input', () => {
    expect(resolveEnvVars('')).toBe('');
  });
});
