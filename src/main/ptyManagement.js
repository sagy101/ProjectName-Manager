const os = require('os');
const path = require('path');
const { exec } = require('child_process');

// Try to require node-pty, but handle gracefully if it fails
let pty = null;
try {
  pty = require('node-pty');
} catch (error) {
  console.warn('node-pty module failed to load:', error.message);
  if (process.env.NODE_ENV === 'test') {
    console.log('Continuing in test mode without node-pty...');
    // Create a mock pty object for tests
    pty = {
      spawn: () => {
        throw new Error('node-pty not available in test mode');
      }
    };
  } else {
    throw error; // Re-throw in non-test mode
  }
}

// Store active processes by terminalId
const activeProcesses = {}; // This will now store pty processes
const commandStates = {}; // Track command execution state

// Function to get child processes of a PID with detailed state information
function getChildProcesses(parentPid) {
  return new Promise((resolve, reject) => {
    // Use a broad `ps` command on Unix to get all processes, then build the tree.
    // This is more reliable than relying on simple PPID if processes get reparented.
    const command = os.platform() === 'win32'
      ? `wmic process where (ParentProcessId=${parentPid}) get ProcessId,CommandLine,PageFileUsage /format:csv`
      : `ps -ax -o pid,ppid,state,command,rss,pcpu`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`[PTY MONITOR] Error executing process list command: ${stderr}`);
        return reject(error);
      }

      if (os.platform() === 'win32') {
        const lines = stdout.split('\n').slice(1);
        const children = lines
          .filter(line => line.trim())
          .map(line => {
            const parts = line.split(',');
            return {
              pid: parseInt(parts[2]),
              command: parts[1] || '',
              state: 'running',
              memory: parts[3] || '0',
              cpu: 0
            };
          })
          .filter(child => !isNaN(child.pid));
        return resolve(children);
      } else {
        // Parse all processes from the `ps -ax` output
        const allProcs = stdout.split('\n').map(line => {
          const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.+?)\s+(\d+)\s+([\d.]+)$/);
          if (match) {
            const [, pid, ppid, state, command, rss, cpu] = match;
            return {
              pid: parseInt(pid),
              ppid: parseInt(ppid),
              state: state,
              command: command.trim(),
              memory: rss,
              cpu: parseFloat(cpu)
            };
          }
          return null;
        }).filter(Boolean);

        // Build a map of parent -> children for efficient tree walking
        const procMap = new Map();
        for (const proc of allProcs) {
          if (!procMap.has(proc.ppid)) {
            procMap.set(proc.ppid, []);
          }
          procMap.get(proc.ppid).push(proc);
        }

        // Recursively find all descendants of the parent PID
        const descendants = [];
        const findChildrenOf = (pid) => {
          const children = procMap.get(pid);
          if (children) {
            for (const child of children) {
              descendants.push(child);
              findChildrenOf(child.pid); // Recurse to find grandchildren
            }
          }
        };

        findChildrenOf(parentPid);
        resolve(descendants);
      }
    });
  });
}

// Function to interpret process state
function interpretProcessState(state) {
  const stateMap = {
    'R': { status: 'running', description: 'Running or runnable' },
    'S': { status: 'sleeping', description: 'Interruptible sleep (waiting)' },
    'D': { status: 'waiting', description: 'Uninterruptible sleep (I/O)' },
    'T': { status: 'stopped', description: 'Stopped by signal (Ctrl+Z)' },
    'Z': { status: 'zombie', description: 'Zombie (terminated, not reaped)' },
    'X': { status: 'dead', description: 'Dead' },
    'I': { status: 'idle', description: 'Idle kernel thread' },
    'W': { status: 'paging', description: 'Paging (swapped out)' }
  };

  // Handle compound states by checking the first character
  const baseState = state.charAt(0);
  const modifiers = state.slice(1);
  
  let result = stateMap[state] || stateMap[baseState] || { 
    status: 'unknown', 
    description: `Unknown state: ${state}` 
  };

  // Add modifier information
  if (modifiers) {
    const modifierDesc = [];
    if (modifiers.includes('+')) modifierDesc.push('foreground');
    if (modifiers.includes('<')) modifierDesc.push('high priority');
    if (modifiers.includes('N')) modifierDesc.push('low priority');
    if (modifiers.includes('L')) modifierDesc.push('locked in memory');
    if (modifiers.includes('s')) modifierDesc.push('session leader');
    
    if (modifierDesc.length > 0) {
      result = {
        ...result,
        description: `${result.description} (${modifierDesc.join(', ')})`
      };
    }
  }

  return result;
}

// Function to monitor child processes
function startProcessMonitoring(terminalId, shellPid, mainWindow) {
  const state = commandStates[terminalId];
  if (!state) return;

  const monitorInterval = setInterval(async () => {
    if (!activeProcesses[terminalId] || state.commandFinished) {
      clearInterval(monitorInterval);
      return;
    }

    try {
      const children = await getChildProcesses(shellPid);
      
      // Filter out the shell itself and common shell utilities
      const commandProcesses = children.filter(child => {
        const cmd = child.command.toLowerCase();
        return !cmd.includes('ps ') && 
               !cmd.includes('wmic ') && 
               !cmd.includes('/bin/sh') && 
               !cmd.includes('/bin/bash') && 
               !cmd.includes('/bin/zsh') &&
               !cmd.includes('echo "exit_code:');
      });

      if (commandProcesses.length > 0) {
        if (!state.commandProcessDetected) {
          state.commandProcessDetected = true;
          state.commandPids = commandProcesses.map(p => p.pid);
          
          // Send command-started event
          if (mainWindow) {
            mainWindow.webContents.send('command-started', { terminalId });
          }
        }

        // Analyze current process states
        const processStates = commandProcesses.map(proc => {
          const interpreted = interpretProcessState(proc.state);
          return {
            pid: proc.pid,
            command: proc.command,
            osState: proc.state,
            status: interpreted.status,
            description: interpreted.description,
            memory: proc.memory,
            cpu: proc.cpu
          };
        });

        // Determine overall command status based on process states
        const hasRunning = processStates.some(p => p.status === 'running');
        const hasStopped = processStates.some(p => p.status === 'stopped');
        const hasZombie = processStates.some(p => p.status === 'zombie');
        const allSleeping = processStates.every(p => p.status === 'sleeping');
        const hasWaiting = processStates.some(p => p.status === 'waiting');

        let overallStatus = 'running';
        let statusDescription = 'Command is running';

        if (hasStopped) {
          overallStatus = 'paused';
          statusDescription = 'Command is paused (Ctrl+Z)';
        } else if (hasZombie) {
          overallStatus = 'finishing';
          statusDescription = 'Command is finishing (zombie processes)';
        } else if (hasWaiting) {
          overallStatus = 'waiting';
          statusDescription = 'Command is waiting for I/O';
        } else if (allSleeping && !hasRunning) {
          overallStatus = 'sleeping';
          statusDescription = 'Command is sleeping/waiting';
        }

        // Send detailed status update
        if (mainWindow && state.lastOverallStatus !== overallStatus) {
          state.lastOverallStatus = overallStatus;
          
          mainWindow.webContents.send('command-status-update', { 
            terminalId,
            overallStatus,
            statusDescription,
            processStates,
            processCount: commandProcesses.length
          });
        }

      } else if (state.commandProcessDetected && !state.commandFinished) {
        // All command processes have finished
        state.commandFinished = true;
        
        // Check which control character was pressed
        if (state.ctrlCPressed) {
          // Process was killed by Ctrl+C
          if (mainWindow) {
            mainWindow.webContents.send('command-finished', { 
              terminalId, 
              status: 'stopped',
              exitStatus: 'Command was terminated (Ctrl+C)',
              wasKilled: true
            });
          }
          clearInterval(monitorInterval);
        } else if (state.ctrlDPressed) {
          // Process received EOF signal
          if (mainWindow) {
            mainWindow.webContents.send('command-finished', { 
              terminalId, 
              status: 'stopped',
              exitStatus: 'Command terminated by EOF (Ctrl+D)',
              wasEOF: true
            });
          }
          clearInterval(monitorInterval);
        } else {
          // Process exited naturally - try to get the exit code
          setTimeout(() => {
            if (activeProcesses[terminalId]) {
              activeProcesses[terminalId].write('echo "EXIT_CODE:$?"\r');
            }
          }, 100);
        }
        
        clearInterval(monitorInterval);
      }
    } catch (error) {
      console.error(`[PTY MONITOR] Error monitoring processes for terminal ${terminalId}:`, error);
    }
  }, 1000); // Check every second

  // Store the interval for cleanup
  state.monitorInterval = monitorInterval;
}

// Function to spawn a PTY process (matching original main.js signature)
function spawnPTY(command, terminalId, cols = 80, rows = 24, projectRoot, mainWindow) {
  if (activeProcesses[terminalId]) {
    console.warn(`Terminal ${terminalId} already has an active process.`);
    return;
  }

  // Initialize command state tracking
  commandStates[terminalId] = {
    command: command,
    commandSent: false,
    commandFinished: false,
    commandProcessDetected: false,
    commandPids: [],
    exitCode: null,
    ctrlCPressed: false,  // Track if Ctrl+C was pressed
    ctrlDPressed: false,  // Track if Ctrl+D (EOF) was pressed
    ctrlZPressed: false   // Track if Ctrl+Z was pressed
  };

  // Check if pty is available
  if (!pty || typeof pty.spawn !== 'function') {
    console.error(`node-pty not available for terminal ${terminalId}. Cannot spawn PTY process.`);
    if (mainWindow) {
      mainWindow.webContents.send('pty-output', { 
        terminalId, 
        output: '\r\nError: Terminal functionality not available (node-pty module issue)\r\n'
      });
    }
    return;
  }

  let shell;
  let shellArgs = [];

  if (os.platform() === 'win32') {
    shell = process.env.COMSPEC || 'cmd.exe';
  } else {
    shell = process.env.SHELL || '/bin/bash';
  }
  console.log(`Using shell: ${shell} with args: [${shellArgs.join(', ')}] for PTY on platform: ${os.platform()}`);

  let ptyProcess;
  try {
    ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: projectRoot || path.resolve(__dirname, '../../..'),
      env: { ...process.env, LANG: 'en_US.UTF-8' }
    });
  } catch (error) {
    console.error(`Failed to spawn PTY for terminal ${terminalId}:`, error.message);
    if (mainWindow) {
      mainWindow.webContents.send('pty-output', { 
        terminalId, 
        output: `\r\nError spawning terminal: ${error.message}\r\n`
      });
    }
    return;
  }

  activeProcesses[terminalId] = ptyProcess;
  console.log(`PTY spawned for terminal ${terminalId} with PID ${ptyProcess.pid}, executing: ${command}`);

  // Execute the command after a short delay to let the shell initialize
  setTimeout(() => {
    // Check if the process is still active before proceeding
    if (activeProcesses[terminalId] && commandStates[terminalId]) {
      ptyProcess.write(`${command}\r`);
      commandStates[terminalId].commandSent = true;
      
      // Start monitoring child processes
      startProcessMonitoring(terminalId, ptyProcess.pid, mainWindow);
    }
  }, 1000);

  ptyProcess.onData(data => {
    try {
      if (mainWindow) {
        mainWindow.webContents.send('pty-output', { terminalId, output: data });
        
        const dataStr = data.toString();
        const state = commandStates[terminalId];
        
        // Check for exit code output
        const exitCodeMatch = dataStr.match(/EXIT_CODE:(\d+)/);
        if (exitCodeMatch && state && state.commandFinished && state.exitCode === null) {
          const exitCode = parseInt(exitCodeMatch[1]);
          state.exitCode = exitCode;
          
          // Send command-finished event with exit code
          let status = 'done';
          let exitStatus = 'Command completed successfully';
          
          if (exitCode !== 0) {
            status = 'error';
            exitStatus = `Command failed with exit code ${exitCode}`;
          }
          
          if (mainWindow) {
            mainWindow.webContents.send('command-finished', { 
              terminalId, 
              exitCode, 
              status, 
              exitStatus 
            });
          }
        }
      }
    } catch (e) {
      console.error(`Error sending pty-output for terminal ${terminalId}: ${e.message}`);
    }
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    // Clean up
    delete activeProcesses[terminalId];
    const state = commandStates[terminalId];
    if (state && state.monitorInterval) {
      clearInterval(state.monitorInterval);
    }
    delete commandStates[terminalId];
    
    // Emit process terminated event
    if (mainWindow) {
      mainWindow.webContents.send('process-terminated', { terminalId });
    }
    
    // Send exit notification to the renderer
    try {
      if (mainWindow) {
        const payload = { terminalId, code: exitCode, signal };
        mainWindow.webContents.send('pty-output', { 
          terminalId, 
          output: `\r\nProcess exited with code ${exitCode}${signal ? `, signal ${signal}` : ''}\r\n` 
        });
        mainWindow.webContents.send('process-ended', payload);
      }
    } catch (e) {
      console.error(`[PTY EXIT] Error sending pty exit info for terminal ${terminalId}: ${e.message}`);
    }
  });
}

// Function to write input to PTY (matching original signature)
function writeToPTY(terminalId, data) {
  const ptyProcess = activeProcesses[terminalId];
  if (ptyProcess) {
    // Track control characters
    if (data.includes('\x03')) {
      if (commandStates[terminalId]) {
        commandStates[terminalId].ctrlCPressed = true;
      }
    }
    if (data.includes('\x04')) {
      if (commandStates[terminalId]) {
        commandStates[terminalId].ctrlDPressed = true;
      }
    }
    if (data.includes('\x1a')) {
      if (commandStates[terminalId]) {
        commandStates[terminalId].ctrlZPressed = true;
      }
    }
    
    ptyProcess.write(data);
  } else {
    console.warn(`[PTY INPUT] No active PTY found for input on terminal ${terminalId}`);
  }
}

// Function to resize PTY (matching original signature)
function resizePTY(terminalId, cols, rows) {
  const ptyProcess = activeProcesses[terminalId];
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows);
    } catch (e) {
      console.error(`Error resizing PTY for terminal ${terminalId}: ${e.message}`);
    }
  }
}

// Function to kill process (matching original kill-process handler)
function killProcess(terminalId, mainWindow) {
  const ptyProcess = activeProcesses[terminalId];

  if (ptyProcess) {
    console.log(`Attempting to kill PTY process with PID ${ptyProcess.pid} for terminal ${terminalId}`);
    
    // Emit terminating event
    if (mainWindow) {
      mainWindow.webContents.send('process-terminating', { terminalId });
    }
    
    try {
      if (os.platform() === 'win32') {
        ptyProcess.kill(); // Default behavior for Windows
        console.log(`ptyProcess.kill() called for Windows PID ${ptyProcess.pid} for terminal ${terminalId}`);
      } else {
        ptyProcess.kill('SIGKILL'); // Use SIGKILL for macOS/Linux
        console.log(`ptyProcess.kill('SIGKILL') called for PID ${ptyProcess.pid} for terminal ${terminalId}`);
      }
      // The onExit handler will handle cleanup and notification
    } catch (e) {
      console.error(`Failed to kill PTY process ${ptyProcess.pid}: ${e.message}`);
      try {
        if (mainWindow) {
          mainWindow.webContents.send('pty-output', { terminalId, output: `\r\nError killing process: ${e.message}\r\n` });
        }
      } catch (sendError) {
        console.error(`Error sending kill failure message: ${sendError.message}`);
      }
    }
  } else {
    console.log(`No active PTY process found for terminal ${terminalId} to kill.`);
    // Still emit terminated event even if process not found
    if (mainWindow) {
      mainWindow.webContents.send('process-terminated', { terminalId });
    }
  }
}

// Function to get PTY process info
function getPTYInfo(terminalId) {
  const ptyProcess = activeProcesses[terminalId];
  if (!ptyProcess) {
    return null;
  }

  return {
    pid: ptyProcess.pid,
    killed: ptyProcess.killed,
    exitCode: ptyProcess.exitCode,
    signalCode: ptyProcess.signalCode
  };
}

// Function to get all active PTY processes
function getActivePTYProcesses() {
  return Object.keys(activeProcesses).map(terminalId => ({
    terminalId,
    ...getPTYInfo(terminalId)
  }));
}

// Function to kill all PTY processes (cleanup)
function killAllPTYProcesses() {
  const terminalIds = Object.keys(activeProcesses);
  let killedCount = 0;

  for (const terminalId of terminalIds) {
    const ptyProcess = activeProcesses[terminalId];
    if (ptyProcess) {
      try {
        console.log(`Killing PTY for terminal ${terminalId} with PID ${ptyProcess.pid}`);
        ptyProcess.kill();
        delete activeProcesses[terminalId];
        killedCount++;
      } catch (e) {
        console.error(`Error killing PTY for terminal ${terminalId} on app quit: ${e.message}`);
      }
    }
  }

  console.log(`Killed ${killedCount} PTY processes during cleanup`);
  return { killedCount, totalCount: terminalIds.length };
}

// Function to check if PTY is available
function isPTYAvailable() {
  return pty && typeof pty.spawn === 'function';
}

module.exports = {
  spawnPTY,
  writeToPTY,
  resizePTY,
  killProcess,
  getPTYInfo,
  getActivePTYProcesses,
  killAllPTYProcesses,
  isPTYAvailable,
  interpretProcessState
}; 