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
  isPTYAvailable,
  interpretProcessState
} = require('../src/main/ptyManagement');

beforeEach(() => {
  pty.__data.last = null;
  jest.clearAllMocks();
});

describe('PTY management', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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

    jest.advanceTimersByTime(1000); // Ensure setTimeout in spawnPTY fires

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

describe('ptyManagement', () => {

  describe('interpretProcessState', () => {
    // Test cases for different process states from the 'ps' command
    const testCases = [
      { input: 'R', expected: { status: 'running', description: 'Running or runnable' } },
      { input: 'S', expected: { status: 'sleeping', description: 'Interruptible sleep (waiting)' } },
      { input: 'D', expected: { status: 'waiting', description: 'Uninterruptible sleep (I/O)' } },
      { input: 'T', expected: { status: 'stopped', description: 'Stopped by signal (Ctrl+Z)' } },
      { input: 'Z', expected: { status: 'zombie', description: 'Zombie (terminated, not reaped)' } },
      { input: 'X', expected: { status: 'dead', description: 'Dead' } },
      { input: 'I', expected: { status: 'idle', description: 'Idle kernel thread' } },
      { input: 'W', expected: { status: 'paging', description: 'Paging (swapped out)' } },
      // Test cases for compound states with modifiers
      { input: 'S+', expected: { status: 'sleeping', description: 'Interruptible sleep (waiting) (foreground)' } },
      { input: 'R+', expected: { status: 'running', description: 'Running or runnable (foreground)' } },
      { input: 'S<', expected: { status: 'sleeping', description: 'Interruptible sleep (waiting) (high priority)' } },
      { input: 'Ss', expected: { status: 'sleeping', description: 'Interruptible sleep (waiting) (session leader)' } },
      { input: 'SN', expected: { status: 'sleeping', description: 'Interruptible sleep (waiting) (low priority)' } },
      { input: 'RL', expected: { status: 'running', description: 'Running or runnable (locked in memory)' } }, // Example of a state that falls back to the base 'R'
      // Test case for an unknown state
      { input: '?', expected: { status: 'unknown', description: 'Unknown state: ?' } },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should correctly interpret state '${input}'`, () => {
        const result = interpretProcessState(input);
        // For compound states, the test checks if the core description matches,
        // as the full description may include multiple modifiers.
        expect(result.status).toBe(expected.status);
        expect(result.description).toContain(expected.description);
      });
    });

    it('should correctly parse multiple modifiers', () => {
      const result = interpretProcessState('S+L');
      expect(result.status).toBe('sleeping');
      expect(result.description).toContain('Interruptible sleep (waiting) (foreground, locked in memory)');
    });
  });

  // Note: Testing startProcessMonitoring would require more extensive mocking of setInterval,
  // child_process, and IPC communications, which is beyond the scope of this example.
  // The tests for interpretProcessState cover the core logic of status detection.
});
