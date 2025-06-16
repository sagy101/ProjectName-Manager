const child_process = require('child_process');
jest.mock('child_process', () => ({ exec: jest.fn() }));

const {
  stopSingleContainer,
  removeSingleContainer,
  listContainers,
  stopContainers,
  removeContainers
} = require('../src/main/containerManagement');

describe('containerManagement additional', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('stopSingleContainer sends events on success', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'ok', ''));
    const win = { webContents: { send: jest.fn() }, isDestroyed: jest.fn(() => false) };
    const res = await stopSingleContainer('c1', win);
    expect(child_process.exec).toHaveBeenCalledWith('docker stop "c1"', expect.any(Object), expect.any(Function));
    expect(res).toEqual({ success: true, stdout: 'ok', stderr: '' });
    expect(win.webContents.send).toHaveBeenCalledWith('container-terminating', { containerName: 'c1' });
    expect(win.webContents.send).toHaveBeenCalledWith('container-terminated', { containerName: 'c1', success: true });
  });

  test('stopSingleContainer handles errors', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(new Error('fail'), '', 'bad'));
    const win = { webContents: { send: jest.fn() }, isDestroyed: jest.fn(() => false) };
    const res = await stopSingleContainer('c1', win);
    expect(res.success).toBe(false);
    expect(win.webContents.send).toHaveBeenCalledWith('container-terminated', { containerName: 'c1', success: false, error: 'bad' });
  });

  test('removeSingleContainer success and error', async () => {
    child_process.exec.mockImplementationOnce((cmd, opts, cb) => cb(null, 'x', ''));
    let res = await removeSingleContainer('c2');
    expect(res).toEqual({ success: true, stdout: 'x', stderr: '' });

    child_process.exec.mockImplementationOnce((cmd, opts, cb) => cb(new Error('fail'), '', 'err'));
    res = await removeSingleContainer('c2');
    expect(res).toEqual({ success: false, error: 'err', stdout: '', stderr: 'err' });
  });

  test('listContainers handles errors and parse failures', async () => {
    child_process.exec.mockImplementationOnce((cmd, opts, cb) => cb(new Error('no'), '', 'boom'));
    let res = await listContainers({ format: 'names' });
    expect(res).toEqual({ success: false, error: 'boom', containers: [] });

    const badJson = '{ bad';
    child_process.exec.mockImplementationOnce((cmd, opts, cb) => cb(null, badJson, ''));
    res = await listContainers({ format: 'json' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Failed to parse container information');
  });

  test('stopContainers and removeContainers invalid input', async () => {
    expect((await stopContainers([])).success).toBe(false);
    expect((await removeContainers(null)).success).toBe(false);
  });
});
