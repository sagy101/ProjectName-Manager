jest.mock('node-pty', () => {
  const data = { last: null };
  return {
    spawn: jest.fn(() => {
      data.last = {
        pid: 999,
        write: jest.fn(),
        resize: jest.fn(),
        kill: jest.fn(),
        onData: jest.fn(),
        onExit: jest.fn()
      };
      return data.last;
    }),
    __data: data
  };
});

const pty = require('node-pty');
const os = require('os');
const mod = require('../../src/main-process/ptyManagement');
const {
  spawnPTY,
  killProcess,
  isPTYAvailable,
  killAllPTYProcesses
} = mod;
const {
  startProcessMonitoring,
  _commandStates,
  _activeProcesses,
  getChildProcesses
} = mod.__test__;

beforeEach(() => {
  jest.clearAllMocks();
  pty.__data.last = null;
});

test('warns when spawning on existing terminal', () => {
  jest.useFakeTimers();
  console.warn = jest.fn();
  spawnPTY('echo a', 'dup');
  spawnPTY('echo b', 'dup');
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringMatching(/^\[.+\]\[PTY\]\[WARN\]$/),
    expect.stringContaining('already has an active process.')
  );
  killAllPTYProcesses();
  jest.useRealTimers();
});

test('quick check triggers when no processes detected', () => {
  jest.useFakeTimers();
  spawnPTY('echo c', 'qc');
  const proc = pty.__data.last;
  jest.advanceTimersByTime(2500); // 1000 for initial send + 1500 for quick check
  expect(proc.write).toHaveBeenCalledWith('echo "QUICK_CHECK:$?"\r');
  killAllPTYProcesses();
  jest.useRealTimers();
});

test('handles kill on windows platform', () => {
  jest.useFakeTimers();
  const spy = jest.spyOn(os, 'platform').mockReturnValue('win32');
  spawnPTY('echo d', 'win');
  const proc = pty.__data.last;
  const win = { webContents: { send: jest.fn() } };
  killProcess('win', win);
  expect(proc.kill).toHaveBeenCalledWith();
  spy.mockRestore();
  killAllPTYProcesses();
  jest.useRealTimers();
});


test('module loads without node-pty', () => {
  jest.resetModules();
  process.env.NODE_ENV = 'test';
  console.warn = jest.fn();
  jest.doMock('node-pty', () => { throw new Error('load fail'); });
  const modNoPty = require('../../src/main-process/ptyManagement');
  const win = { webContents: { send: jest.fn() } };
  modNoPty.spawnPTY('cmd', 'np', 80, 24, null, win);
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringMatching(/^\[.+\]\[PTY\]\[WARN\]$/),
    'node-pty module failed to load:', 
    'load fail'
  );
  expect(win.webContents.send).toHaveBeenCalledWith(
    'pty-output',
    expect.objectContaining({ output: expect.stringContaining('node-pty not available') })
  );
});
