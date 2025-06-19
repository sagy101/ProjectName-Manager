const { debugLog } = require('../../../src/common/utils/debugUtils');

beforeEach(() => {
  jest.restoreAllMocks();
});

test('debugLog logs when DEBUG_LOGS=true', () => {
  process.env.DEBUG_LOGS = 'true';
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  debugLog('a', 1);
  expect(spy).toHaveBeenCalledWith('[DEBUG]', 'a', 1);
  spy.mockRestore();
});

test('debugLog does not log when DEBUG_LOGS!=true', () => {
  process.env.DEBUG_LOGS = 'false';
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  debugLog('b');
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
