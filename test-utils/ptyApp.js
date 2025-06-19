const pty = require('node-pty');

// Spawn a long-running process using Node
const shell = process.platform === 'win32' ? 'cmd.exe' : process.execPath;
const args = process.platform === 'win32' ? ['/c', 'ping -t 127.0.0.1'] : ['-e', 'setInterval(() => {}, 1000);'];
const child = pty.spawn(shell, args, { name: 'xterm-color', cols: 80, rows: 30 });

console.log(`CHILD_PID:${child.pid}`);

function cleanup() {
  try {
    child.kill();
  } catch (e) {
    // ignore
  }
}

process.on('message', (msg) => {
  if (msg === 'closeTab') {
    cleanup();
    if (process.send) process.send('terminated');
  }
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0); // eslint-disable-line n/no-process-exit
});

process.on('SIGINT', () => {
  cleanup();
  process.exit(0); // eslint-disable-line n/no-process-exit
});

process.on('exit', cleanup);
