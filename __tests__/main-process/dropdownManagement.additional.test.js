const fs = require('fs');
const child_process = require('child_process');

jest.mock('child_process', () => ({ exec: jest.fn() }));

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    promises: { ...original.promises, readFile: jest.fn() }
  };
});

const dropdown = require('../../src/main-process/dropdownManagement');
const {
  getDropdownOptions,
  precacheGlobalDropdowns,
  executeDropdownChangeCommand
} = dropdown;

beforeEach(() => {
  jest.clearAllMocks();
  dropdown.clearDropdownCache();
});

describe('getDropdownOptions additional cases', () => {
  test('performs variable substitution and single output', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'sub', ''));
    const config = { id: 'v', command: 'echo ${foo}_${bar}', parseResponse: 'text', args: { foo: 'A', bar: 'B' } };
    const res = await getDropdownOptions(config);
    expect(child_process.exec.mock.calls[0][0]).toBe('echo A_B');
    expect(res.options).toEqual(['sub']);
  });

  test('returns error when command fails', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(new Error('fail'), '', 'bad'));
    const res = await getDropdownOptions({ id: 'e', command: 'bad', parseResponse: 'lines', args: {} });
    expect(res).toEqual({ options: [], error: 'bad' });
  });
});

describe('precacheGlobalDropdowns edge cases', () => {
  test('returns success when no dropdowns found', async () => {
    fs.promises.readFile.mockResolvedValue(JSON.stringify({ header: {} }));
    const res = await precacheGlobalDropdowns();
    expect(res).toEqual({ success: true, precached: 0 });
  });

  test('handles read errors', async () => {
    fs.promises.readFile.mockRejectedValue(new Error('boom'));
    const res = await precacheGlobalDropdowns();
    expect(res).toEqual({ success: false, error: 'boom' });
  });
});

describe('executeDropdownChangeCommand error handling', () => {
  test('catches thrown errors', async () => {
    fs.promises.readFile.mockResolvedValue(JSON.stringify({ header: { dropdownSelectors: [{ id: 'd', commandOnChange: 'x' }] } }));
    child_process.exec.mockImplementation(() => { throw new Error('explode'); });
    const res = await executeDropdownChangeCommand('d', 'v', {});
    expect(res).toEqual({ success: false, error: 'explode', message: 'Failed to execute command for d' });
  });
});


describe('executeDropdownChangeCommand sidebar lookup', () => {
  test('executes command from sidebar config', async () => {
    const sidebar = [{ sectionId: 's', dropdownSelectors: [{ id: 'sb', commandOnChange: 'echo ${sb}' }] }];
    fs.promises.readFile.mockImplementation((p) => {
      if (p.includes('generalEnvironmentVerifications.json')) return Promise.resolve(JSON.stringify({ header: {} }));
      if (p.includes('configurationSidebarAbout.json')) return Promise.resolve(JSON.stringify(sidebar));
      return Promise.reject(new Error('bad'));
    });
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'ok', ''));
    const res = await executeDropdownChangeCommand('sb', 'v', { sb: 'v' });
    expect(res.success).toBe(true);
    expect(child_process.exec).toHaveBeenCalledWith('echo v', { timeout: 30000, maxBuffer: 1024 * 1024 }, expect.any(Function));
  });
});
