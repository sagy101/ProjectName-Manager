const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const { exportConfigToFile, importConfigFromFile } = require('../configIO');

describe('Config import/export', () => {
  const tmpDir = os.tmpdir();
  const testFile = path.join(tmpDir, 'config_test.json');
  const roundTripFile = path.join(tmpDir, 'config_roundtrip.json');

  afterEach(async () => {
    await fs.unlink(testFile).catch(() => {});
    await fs.unlink(roundTripFile).catch(() => {});
  });

  test('exportConfigToFile writes JSON to file', async () => {
    const data = { configState: { a: 1 }, attachState: { b: 2 } };
    const result = await exportConfigToFile(data, testFile);
    expect(result.success).toBe(true);

    const content = await fs.readFile(testFile, 'utf-8');
    expect(JSON.parse(content)).toEqual(data);
  });

  test('importConfigFromFile reads JSON from file', async () => {
    const data = { configState: { x: 1 }, attachState: { y: 2 } };
    await fs.writeFile(testFile, JSON.stringify(data), 'utf-8');

    const result = await importConfigFromFile(testFile);
    expect(result.success).toBe(true);
    expect(result.configState).toEqual(data.configState);
    expect(result.attachState).toEqual(data.attachState);
  });

  test('export and import round trip', async () => {
    const data = {
      configState: { foo: 'bar' },
      attachState: { baz: true },
      globalDropdownValues: { project: 'demo' }
    };
    await exportConfigToFile(data, roundTripFile);
    const result = await importConfigFromFile(roundTripFile);
    expect(result).toMatchObject({ success: true, ...data });
  });
});
