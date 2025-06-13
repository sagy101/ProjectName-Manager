const fs = require('fs');
const child_process = require('child_process');

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    promises: { ...original.promises, readFile: jest.fn() }
  };
});

const dropdown = require('../src/main/dropdownManagement');
const { getDropdownOptions, precacheGlobalDropdowns, handleDropdownValueChange } = dropdown;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDropdownOptions', () => {
  test('caches results for same command', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'a\nb\n', ''));
    const config = { id: 'd1', command: 'echo', parseResponse: 'lines', args: {} };

    const first = await getDropdownOptions(config);
    const second = await getDropdownOptions(config);
    expect(first.options).toEqual(['a', 'b']);
    expect(child_process.exec).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });
});

describe('handleDropdownValueChange', () => {
  test('clears cache entries for dropdown', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'x', ''));
    const config = { id: 'd2', command: 'echo x', parseResponse: 'lines', args: {} };
    await getDropdownOptions(config);
    handleDropdownValueChange('d2', 'x');
    const result = await getDropdownOptions(config);
    expect(child_process.exec).toHaveBeenCalledTimes(2);
    expect(result.options).toEqual(['x']);
  });
});

describe('precacheGlobalDropdowns', () => {
  test('preloads dropdowns from config file', async () => {
    const fileJson = JSON.stringify({ header: { dropdownSelectors: [{ id: 'g', command: 'echo g', parseResponse: 'lines' }] } });
    fs.promises.readFile.mockResolvedValue(fileJson);
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'g', ''));

    const res = await precacheGlobalDropdowns();
    expect(res).toEqual({ success: true, precached: 1 });
    expect(child_process.exec).toHaveBeenCalledTimes(1);
  });
});
