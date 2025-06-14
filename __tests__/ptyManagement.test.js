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

describe('Global Variable Substitution in spawnPTY', () => {
  let consoleWarnSpy;
  let consoleLogSpy; // To potentially spy on the "executing command" log

  beforeEach(() => {
    jest.useFakeTimers(); // Ensure timers are mocked for each test
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log
    // Reset pty mocks if necessary, though the top-level beforeEach should handle it.
    if (pty.__data.last) {
      Object.values(pty.__data.last).forEach(mockFn => {
        if (typeof mockFn === 'function' && mockFn.mockClear) {
          mockFn.mockClear();
        }
      });
    }
    pty.spawn.mockClear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    jest.useRealTimers(); // Restore real timers
  });

  const mockProjectRoot = '/mock/project';
  const mockMainWindow = null; // Assuming mainWindow is not critical for command processing logic

  test('should substitute a single global variable', () => {
    const command = "${global.myKey} some args";
    const globals = { myKey: "myValue" };
    const expectedCommand = "myValue some args\r";

    spawnPTY(command, 'term-g1', 80, 24, mockProjectRoot, mockMainWindow, globals);
    jest.advanceTimersByTime(1000); // For the setTimeout in spawnPTY

    expect(pty.__data.last.write).toHaveBeenCalledWith(expectedCommand);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`executing: myValue some args`));
  });

  test('should substitute multiple global variables', () => {
    const command = "echo ${global.var1} ${global.var2}";
    const globals = { var1: "val1", var2: "val2" };
    const expectedCommand = "echo val1 val2\r";

    spawnPTY(command, 'term-g2', 80, 24, mockProjectRoot, mockMainWindow, globals);
    jest.advanceTimersByTime(1000);

    expect(pty.__data.last.write).toHaveBeenCalledWith(expectedCommand);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`executing: echo val1 val2`));
  });

  test('should leave placeholder and warn if a global variable is missing', () => {
    const command = "echo ${global.missingKey}";
    const globals = { myKey: "myValue" }; // missingKey is not in globals
    const expectedCommand = "echo ${global.missingKey}\r";

    spawnPTY(command, 'term-g3', 80, 24, mockProjectRoot, mockMainWindow, globals);
    jest.advanceTimersByTime(1000);

    expect(pty.__data.last.write).toHaveBeenCalledWith(expectedCommand);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PTY Spawner] Global variable placeholder ${global.missingKey} found in command for terminal term-g3, but not defined in globalVariables.")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`executing: echo \${global.missingKey}`));
  });

  test('should not change command if no global placeholders are present', () => {
    const command = "echo no_globals";
    const globals = { myKey: "myValue" };
    const expectedCommand = "echo no_globals\r";

    spawnPTY(command, 'term-g4', 80, 24, mockProjectRoot, mockMainWindow, globals);
    jest.advanceTimersByTime(1000);

    expect(pty.__data.last.write).toHaveBeenCalledWith(expectedCommand);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`executing: echo no_globals`));
  });

  test('should not substitute non-global placeholders like ${nodeVersion}', () => {
    const command = "nvm use ${nodeVersion} && ${global.myKey}";
    const globals = { myKey: "myValue" };
    const expectedCommand = "nvm use ${nodeVersion} && myValue\r";

    spawnPTY(command, 'term-g5', 80, 24, mockProjectRoot, mockMainWindow, globals);
    jest.advanceTimersByTime(1000);

    expect(pty.__data.last.write).toHaveBeenCalledWith(expectedCommand);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`executing: nvm use \${nodeVersion} && myValue`));
  });

  test('should correctly substitute nested-like placeholders (e.g., global.nodeVer containing ${nodeVersion})', () => {
    const command = "${global.nodeVer} echo test";
    const globals = { nodeVer: "nvm use ${nodeVersion} &&" }; // note the trailing space is part of the value in globalVariable.json
    // The ptyManagement currently adds a space if the global var is used as a prefix, but here it's the whole command.
    // The current implementation in ptyManagement for substitution is direct string replacement.
    // globalVariable.json has "nvm use ${nodeVersion} &&"
    // So the processed command should become "nvm use ${nodeVersion} && echo test"
    const expectedCommand = "nvm use ${nodeVersion} && echo test\r";

    spawnPTY(command, 'term-g6', 80, 24, mockProjectRoot, mockMainWindow, globals);
    jest.advanceTimersByTime(1000);

    expect(pty.__data.last.write).toHaveBeenCalledWith(expectedCommand);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`executing: nvm use \${nodeVersion} && echo test`));
  });

  test('should handle empty globalVariables object gracefully', () => {
    const command = "echo ${global.myKey}";
    const globals = {};
    const expectedCommand = "echo ${global.myKey}\r"; // Stays the same

    spawnPTY(command, 'term-g7', 80, 24, mockProjectRoot, mockMainWindow, globals);
    jest.advanceTimersByTime(1000);

    expect(pty.__data.last.write).toHaveBeenCalledWith(expectedCommand);
    // No warning because the substitution loop is skipped if globalVariables is empty.
    // The specific check for `${global.missingKey}` happens *after* the loop.
    // So, if globals is empty, loop is skipped, then it checks for ${global.myKey} and warns.
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PTY Spawner] Global variable placeholder ${global.myKey} found in command for terminal term-g7, but not defined in globalVariables.")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`executing: echo \${global.myKey}`));
  });

  test('should handle globalVariables being null or undefined gracefully', () => {
    const command = "echo ${global.myKey}";
    const expectedCommand = "echo ${global.myKey}\r"; // Stays the same

    spawnPTY(command, 'term-g8', 80, 24, mockProjectRoot, mockMainWindow, null); // Test with null
    jest.advanceTimersByTime(1000);

    expect(pty.__data.last.write).toHaveBeenCalledWith(expectedCommand);
    // Similar to empty object, the substitution loop is skipped.
    // The warning for the specific placeholder happens after the loop.
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PTY Spawner] Global variable placeholder ${global.myKey} found in command for terminal term-g8, but not defined in globalVariables.")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`executing: echo \${global.myKey}`));

    consoleWarnSpy.mockClear(); // Clear for next call
    consoleLogSpy.mockClear();
    pty.__data.last.write.mockClear();
    pty.spawn.mockClear();


    spawnPTY(command, 'term-g9', 80, 24, mockProjectRoot, mockMainWindow, undefined); // Test with undefined
    jest.advanceTimersByTime(1000);

    expect(pty.__data.last.write).toHaveBeenCalledWith(expectedCommand);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PTY Spawner] Global variable placeholder ${global.myKey} found in command for terminal term-g9, but not defined in globalVariables.")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`executing: echo \${global.myKey}`));
  });
});
