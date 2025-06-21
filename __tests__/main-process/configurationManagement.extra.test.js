const fs = require('fs').promises;
const { dialog } = require('electron');

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return { ...actual, promises: { ...actual.promises, readFile: jest.fn(), writeFile: jest.fn() } };
});

jest.mock('electron', () => ({ dialog: { showSaveDialog: jest.fn(), showOpenDialog: jest.fn() } }));

jest.mock('../../configIO', () => ({
  exportConfigToFile: jest.fn(),
  importConfigFromFile: jest.fn()
}));

const {
  loadAppSettings,
  getAboutConfig,
  exportConfiguration,
  importConfiguration,
  saveConfiguration
} = require('../../src/main-process/configurationManagement');

const { exportConfigToFile, importConfigFromFile } = require('../../configIO');

beforeEach(() => {
  jest.clearAllMocks();
});

test('loadAppSettings parses json', async () => {
  const data = { settings: { openDevToolsByDefault: true, projectName: 'X', autoSetupTimeoutSeconds: 45, configurationDefaultExpanded: false } };
  fs.readFile.mockResolvedValue(JSON.stringify(data));
  const res = await loadAppSettings();
  expect(res.success).toBe(true);
  expect(res.appSettings.projectName).toBe('X');
  expect(res.appSettings.autoSetupTimeoutSeconds).toBe(45);
  expect(res.appSettings.configurationDefaultExpanded).toBe(false);
});

test('getAboutConfig returns parsed file', async () => {
  fs.readFile.mockResolvedValue(JSON.stringify([{ id: 'a' }]));
  const res = await getAboutConfig();
  expect(res).toEqual([{ id: 'a' }]);
});

test('exportConfiguration uses dialog and file util', async () => {
  dialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/tmp/out.json' });
  exportConfigToFile.mockResolvedValue({ success: true });
  const res = await exportConfiguration({ a: 1 });
  expect(exportConfigToFile).toHaveBeenCalled();
  expect(res.filePath).toBe('/tmp/out.json');
});

test('importConfiguration uses dialog and file util', async () => {
  dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/tmp/in.json'] });
  importConfigFromFile.mockResolvedValue({ success: true, configState: { x: 1 } });
  const res = await importConfiguration();
  expect(importConfigFromFile).toHaveBeenCalledWith('/tmp/in.json');
  expect(res.success).toBe(true);
  expect(res.configState.x).toBe(1);
});

test('saveConfiguration writes file', async () => {
  fs.writeFile.mockResolvedValue();
  const res = await saveConfiguration('/tmp/a.json', { a: 2 });
  expect(fs.writeFile).toHaveBeenCalled();
  expect(res.success).toBe(true);
});

test('exportConfiguration handles cancel', async () => {
  dialog.showSaveDialog.mockResolvedValue({ canceled: true });
  const res = await exportConfiguration({});
  expect(res.success).toBe(false);
});

test('importConfiguration handles cancel', async () => {
  dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
  const res = await importConfiguration();
  expect(res.success).toBe(false);
});

test('saveConfiguration handles write error', async () => {
  fs.writeFile.mockRejectedValue(new Error('fail'));
  const res = await saveConfiguration('/tmp/b.json', { b: 3 });
  expect(res.success).toBe(false);
});

test('loadAppSettings handles read errors', async () => {
  fs.readFile.mockRejectedValue(new Error('oops'));
  const res = await loadAppSettings();
  expect(res.success).toBe(false);
  expect(res.error).toBe('oops');
});

test('getAboutConfig handles read errors', async () => {
  fs.readFile.mockRejectedValue(new Error('bad'));
  const res = await getAboutConfig();
  expect(res).toEqual([]);
});

test('exportConfiguration propagates export errors', async () => {
  dialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/tmp/out.json' });
  exportConfigToFile.mockResolvedValue({ success: false, error: 'boom' });
  const res = await exportConfiguration({});
  expect(res.success).toBe(false);
  expect(res.error).toBe('boom');
});

test('importConfiguration propagates import errors', async () => {
  dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/tmp/in.json'] });
  importConfigFromFile.mockResolvedValue({ success: false, error: 'fail' });
  const res = await importConfiguration();
  expect(res.success).toBe(false);
  expect(res.error).toBe('fail');
});

const { getConfigurationPaths, checkConfigurationFiles } = require('../../src/main-process/configurationManagement');

test('getConfigurationPaths returns expected filenames', () => {
  const paths = getConfigurationPaths();
  expect(paths.sidebarAbout).toMatch(/configurationSidebarAbout\.json$/);
  expect(paths.sidebarSections).toMatch(/configurationSidebarSections\.json$/);
});

test('checkConfigurationFiles handles missing files', async () => {
  const accessSpy = jest.spyOn(fs, 'access').mockImplementation(p => {
    if (p.endsWith('configurationSidebarAbout.json')) {
      return Promise.reject(new Error('missing'));
    }
    return Promise.resolve();
  });

  const res = await checkConfigurationFiles();
  expect(res.sidebarAbout.exists).toBe(false);
  expect(res.sidebarSections.exists).toBe(true);
  accessSpy.mockRestore();
});
