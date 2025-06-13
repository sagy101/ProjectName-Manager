jest.mock('node-pty', () => {
  const data = { last: null };
  return {
    spawn: jest.fn(() => {
      data.last = {
        pid: 123,
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
const {
  spawnPTY,
  writeToPTY,
  resizePTY,
  killProcess,
  getPTYInfo,
  killAllPTYProcesses,
  isPTYAvailable
} = require('../src/main/ptyManagement');

beforeEach(() => {
  pty.__data.last = null;
  jest.clearAllMocks();
});

describe('PTY management', () => {
  test('spawns and tracks a PTY process', () => {
    spawnPTY('echo hi', 'term1');
    expect(pty.spawn).toHaveBeenCalled();
    const info = getPTYInfo('term1');
    expect(info.pid).toBe(123);
  });

  test('writes and resizes the PTY', () => {
    spawnPTY('echo hi', 'term2');
    writeToPTY('term2', 'data');
    resizePTY('term2', 100, 40);
    const proc = pty.__data.last;
    expect(proc.write).toHaveBeenCalledWith('echo hi\r');
    expect(proc.write).toHaveBeenCalledWith('data');
    expect(proc.resize).toHaveBeenCalledWith(100, 40);
  });

  test('kills processes and cleanup', () => {
    spawnPTY('echo', 'term3');
    killProcess('term3');
    const proc = pty.__data.last;
    expect(proc.kill).toHaveBeenCalled();
    const res = killAllPTYProcesses();
    expect(res.killedCount).toBeGreaterThan(0);
  });

  test('isPTYAvailable reflects availability', () => {
    expect(isPTYAvailable()).toBe(true);
  });
});
