jest.mock('child_process', () => ({
  exec: jest.fn()
}));

const child_process = require('child_process');
const containerManagement = require('../src/main/containerManagement');
const {
  getContainerStatus,
  listContainers,
  isDockerAvailable,
  removeContainers,
  stopContainers
} = containerManagement;

describe('containerManagement module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getContainerStatus returns running status on success', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'running\n', ''));
    const status = await getContainerStatus('my-container');
    expect(status).toBe('running');
    expect(child_process.exec).toHaveBeenCalled();
  });

  test('getContainerStatus returns unknown on error', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(new Error('fail'), '', 'err'));
    const status = await getContainerStatus('my-container');
    expect(status).toBe('unknown');
  });

  test('isDockerAvailable true when docker responds', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'Docker version 25', ''));
    const result = await isDockerAvailable();
    expect(result).toBe(true);
  });

  test('isDockerAvailable false on error', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(new Error('no docker'), '', ''));
    const result = await isDockerAvailable();
    expect(result).toBe(false);
  });

  test('listContainers returns names list', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, 'one\ntwo\n', ''));
    const result = await listContainers({ format: 'names' });
    expect(result).toEqual({ success: true, containers: ['one', 'two'] });
  });

  test('listContainers returns parsed JSON objects', async () => {
    const output = '{"Names":"one"}\n{"Names":"two"}\n';
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, output, ''));
    const result = await listContainers({ format: 'json' });
    expect(result.success).toBe(true);
    expect(result.containers).toEqual([{ Names: 'one' }, { Names: 'two' }]);
  });

  test('removeContainers aggregates results', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, '', ''));
    const result = await removeContainers(['a', 'b']);
    expect(child_process.exec).toHaveBeenCalledTimes(2);
    expect(result.summary).toEqual({ total: 2, successful: 2, failed: 0 });
  });

  test('stopContainers aggregates results', async () => {
    child_process.exec.mockImplementation((cmd, opts, cb) => cb(null, '', ''));
    const result = await stopContainers(['a', 'b']);
    expect(child_process.exec).toHaveBeenCalledTimes(2);
    expect(result.summary).toEqual({ total: 2, successful: 2, failed: 0 });
  });
});
