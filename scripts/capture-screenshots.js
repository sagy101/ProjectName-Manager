const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const electron = require('electron');
const renderScript = require.resolve('capture-electron/script/render.js');

async function captureScreen(name, screenParam) {
  const url = `file://${path.resolve(__dirname, '..', 'index.html')}?screen=${screenParam}`;
  const result = spawnSync(
    electron,
    ['--no-sandbox', renderScript, url, '1200', '900', '1000', 'png'],
    { encoding: 'buffer' }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.toString());
  }
  const img = result.stdout;
  const screenshotDir = path.resolve(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }
  fs.writeFileSync(path.join(screenshotDir, `${name}.png`), img);
  const base64 = img.toString('base64');
  fs.writeFileSync(path.join(screenshotDir, `${name}.b64`), base64);
  return base64;
}

(async () => {
  const shots = [
    ['main-app', 'main'],
    ['health-report', 'health-report'],
    ['floating-terminal', 'floating-terminal'],
    ['stopping-status', 'stopping-status']
  ];

  const results = {};
  for (const [name, param] of shots) {
    try {
      results[name] = await captureScreen(name, param);
      console.log(`Captured ${name}`);
    } catch (err) {
      console.error(`Failed to capture ${name}:`, err.message);
    }
  }

  // Output markdown for PR comment
  const lines = ['## \uD83D\uDCF7 UI Screenshots'];
  for (const [name] of shots) {
    const data = results[name];
    if (data) {
      lines.push(`![${name}](data:image/png;base64,${data})`);
    }
  }
  console.log(lines.join('\n'));
})();
