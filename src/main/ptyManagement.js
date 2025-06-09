const os = require('os');
const path = require('path');

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

// Function to spawn a PTY process (matching original main.js signature)
function spawnPTY(command, terminalId, cols = 80, rows = 24, projectRoot, mainWindow) {
  if (activeProcesses[terminalId]) {
    console.warn(`Terminal ${terminalId} already has an active process.`);
    return;
  }

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

  // Execute the command
  ptyProcess.write(`${command}\r`); 

  ptyProcess.onData(data => {
    try {
      if (mainWindow) {
        mainWindow.webContents.send('pty-output', { terminalId, output: data });
      }
    } catch (e) {
      console.error(`Error sending pty-output for terminal ${terminalId}: ${e.message}`);
    }
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`PTY for terminal ${terminalId} exited with code ${exitCode}, signal ${signal}`);
    delete activeProcesses[terminalId];
    
    // Emit process terminated event
    if (mainWindow) {
      mainWindow.webContents.send('process-terminated', { terminalId });
    }
    
    // Send exit notification to the renderer
    try {
      if (mainWindow) {
        mainWindow.webContents.send('pty-output', { 
          terminalId, 
          output: `\r\nProcess exited with code ${exitCode}${signal ? `, signal ${signal}` : ''}\r\n` 
        });
        mainWindow.webContents.send('process-ended', { terminalId, code: exitCode, signal });
      }
    } catch (e) {
      console.error(`Error sending pty exit info for terminal ${terminalId}: ${e.message}`);
    }
  });
}

// Function to write input to PTY (matching original signature)
function writeToPTY(terminalId, data) {
  const ptyProcess = activeProcesses[terminalId];
  if (ptyProcess) {
    ptyProcess.write(data);
  } else {
    console.warn(`No active PTY found for input on terminal ${terminalId}`);
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
  isPTYAvailable
}; 