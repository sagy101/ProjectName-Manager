const fs = require('fs');
const child_process = require('child_process');

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    promises: { ...original.promises, readFile: jest.fn() }
  };
});

// Mock electron module
jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn(() => [{
      isDestroyed: () => false,
      webContents: {
        send: jest.fn()
      }
    }])
  }
}));

const dropdown = require('../src/main/dropdownManagement');
const { getDropdownOptions, precacheGlobalDropdowns, handleDropdownValueChange, executeDropdownChangeCommand, setupDropdownIpcHandlers } = dropdown;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDropdownOptions', () => {
  test('caches results for same command', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'a\nb\n', ''));
    const config = { id: 'd1', command: 'echo', parseResponse: 'lines', args: {} };

    const first = await getDropdownOptions(config);
    const second = await getDropdownOptions(config);
    expect(first.options).toEqual(['a', 'b']);
    expect(child_process.exec).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });
});

describe('handleDropdownValueChange', () => {
  test('clears cache entries for dropdown', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'x', ''));
    const config = { id: 'd2', command: 'echo x', parseResponse: 'lines', args: {} };
    await getDropdownOptions(config);
    handleDropdownValueChange('d2', 'x');
    const result = await getDropdownOptions(config);
    expect(child_process.exec).toHaveBeenCalledTimes(2);
    expect(result.options).toEqual(['x']);
  });
});

describe('precacheGlobalDropdowns', () => {
  test('preloads dropdowns from config file', async () => {
    const fileJson = JSON.stringify({ header: { dropdownSelectors: [{ id: 'g', command: 'echo g', parseResponse: 'lines' }] } });
    fs.promises.readFile.mockResolvedValue(fileJson);
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'g', ''));

    const res = await precacheGlobalDropdowns();
    expect(res).toEqual({ success: true, precached: 1 });
    expect(child_process.exec).toHaveBeenCalledTimes(1);
  });
});

describe('executeDropdownChangeCommand', () => {
  test('returns success message when no commandOnChange is configured', async () => {
    const fileJson = JSON.stringify({ header: { dropdownSelectors: [{ id: 'test', command: 'echo test' }] } });
    fs.promises.readFile.mockResolvedValue(fileJson);

    const result = await executeDropdownChangeCommand('test', 'value1', {});
    expect(result).toEqual({ success: true, message: 'No command configured' });
  });

  test('executes commandOnChange with variable substitution', async () => {
    const fileJson = JSON.stringify({ 
      header: { 
        dropdownSelectors: [{ 
          id: 'gcloudProject', 
          command: 'gcloud projects list',
          commandOnChange: 'gcloud config set project ${gcloudProject}'
        }] 
      } 
    });
    fs.promises.readFile.mockResolvedValue(fileJson);
    child_process.exec.mockImplementation((cmd, opts, cb) => {
      expect(cmd).toBe('gcloud config set project my-project');
      cb(null, 'Updated property [core/project].', '');
    });

    const result = await executeDropdownChangeCommand('gcloudProject', 'my-project', { gcloudProject: 'my-project' });
    expect(result).toEqual({
      success: true,
      stdout: 'Updated property [core/project].',
      stderr: '',
      message: 'Command executed successfully for gcloudProject'
    });
    expect(child_process.exec).toHaveBeenCalledWith(
      'gcloud config set project my-project',
      { timeout: 30000, maxBuffer: 1024 * 1024 },
      expect.any(Function)
    );
  });

  test('handles command execution errors gracefully', async () => {
    const fileJson = JSON.stringify({ 
      header: { 
        dropdownSelectors: [{ 
          id: 'gcloudProject', 
          command: 'gcloud projects list',
          commandOnChange: 'gcloud config set project ${gcloudProject}'
        }] 
      } 
    });
    fs.promises.readFile.mockResolvedValue(fileJson);
    child_process.exec.mockImplementation((cmd, opts, cb) => {
      cb(new Error('Command failed'), '', 'Permission denied');
    });

    const result = await executeDropdownChangeCommand('gcloudProject', 'invalid-project', { gcloudProject: 'invalid-project' });
    expect(result).toEqual({
      success: false,
      error: 'Permission denied',
      stdout: '',
      stderr: 'Permission denied'
    });
  });

  test('substitutes multiple variables in command template', async () => {
    const fileJson = JSON.stringify({ 
      header: { 
        dropdownSelectors: [{ 
          id: 'environment', 
          command: 'echo environments',
          commandOnChange: 'setup-env.sh --project=${gcloudProject} --env=${environment}'
        }] 
      } 
    });
    fs.promises.readFile.mockResolvedValue(fileJson);
    child_process.exec.mockImplementation((cmd, opts, cb) => {
      expect(cmd).toBe('setup-env.sh --project=my-project --env=dev');
      cb(null, 'Environment setup complete', '');
    });

    const result = await executeDropdownChangeCommand('environment', 'dev', { 
      gcloudProject: 'my-project', 
      environment: 'dev' 
    });
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('Environment setup complete');
  });

  test('handles missing dropdown configuration', async () => {
    // Mock the config files to return empty dropdown selectors
    const emptyConfigJson = JSON.stringify({ header: { dropdownSelectors: [] } });
    fs.promises.readFile.mockResolvedValue(emptyConfigJson);

    const result = await executeDropdownChangeCommand('nonexistent', 'value', {});
    expect(result).toEqual({
      success: true,
      message: 'No command configured'
    });
  });

  test('handles file read errors gracefully', async () => {
    fs.promises.readFile.mockRejectedValue(new Error('File not found'));

    const result = await executeDropdownChangeCommand('gcloudProject', 'value', {});
    expect(result).toEqual({
      success: true,
      message: 'No command configured'
    });
  });
});

describe('setupDropdownIpcHandlers', () => {
  test('registers IPC handlers correctly', () => {
    const mockIpcMain = {
      on: jest.fn(),
      handle: jest.fn()
    };

    setupDropdownIpcHandlers(mockIpcMain);

    // Check that the correct IPC handlers were registered
    expect(mockIpcMain.on).toHaveBeenCalledWith('dropdown-value-changed', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('get-dropdown-options', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('precache-global-dropdowns', expect.any(Function));
    expect(mockIpcMain.on).toHaveBeenCalledTimes(1);
    expect(mockIpcMain.handle).toHaveBeenCalledTimes(2);
  });
});
