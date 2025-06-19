jest.mock('child_process', () => ({ exec: jest.fn() }));
const child_process = require('child_process');
const os = require('os');
const mod = require('../../src/main-process/ptyManagement');
const { getChildProcesses } = mod.__test__;

describe('getChildProcesses', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('parses linux ps output', async () => {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    child_process.exec.mockImplementation((cmd, cb) => {
      const output = '123 1 R /bin/bash 10 0.0\n124 123 S python 20 0.1';
      cb(null, output, '');
    });
    const res = await getChildProcesses(1);
    expect(res.map(p => p.pid)).toEqual(expect.arrayContaining([124]));
  });

  test('parses windows wmic output', async () => {
    jest.spyOn(os, 'platform').mockReturnValue('win32');
    child_process.exec.mockImplementation((cmd, cb) => {
      const output = 'Header\nnode,cmd.exe /c x,123,50';
      cb(null, output, '');
    });
    const res = await getChildProcesses(1);
    expect(res[0]).toEqual(expect.objectContaining({ pid: 123 }));
  });
});
