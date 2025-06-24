/** @jest-environment node */

const path = require('path');
const { spawn } = require('child_process');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

describe('Process cleanup', () => {
  const script = path.join(__dirname, '..', '..', 'test-utils', 'ptyApp.js');
  test('process is killed when terminal tab is closed', async () => {
    const proc = spawn(process.execPath, [script], { stdio: ['pipe', 'pipe', 'inherit', 'ipc'] });
    let childPid;
    proc.stdout.on('data', (data) => {
      const match = data.toString().match(/CHILD_PID:(\d+)/);
      if (match) {
        childPid = parseInt(match[1], 10);
      }
    });

    // Wait for the child PID to be printed
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (childPid) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });

    proc.send('closeTab');

    await new Promise((resolve) => proc.once('message', resolve));
    await wait(500); // Increased wait time to allow for cleanup on slow systems

    expect(isProcessRunning(childPid)).toBe(false);
    proc.kill();
  });

  test('process is killed when app is terminated', async () => {
    const proc = spawn(process.execPath, [script], { stdio: ['pipe', 'pipe', 'inherit', 'ipc'] });
    let childPid;
    proc.stdout.on('data', (data) => {
      const match = data.toString().match(/CHILD_PID:(\d+)/);
      if (match) {
        childPid = parseInt(match[1], 10);
      }
    });

    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (childPid) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });

    proc.kill('SIGTERM');
    await new Promise((resolve) => proc.once('exit', resolve));
    await wait(500); // Increased wait time to allow for cleanup on slow systems

    expect(isProcessRunning(childPid)).toBe(false);
  });
});
