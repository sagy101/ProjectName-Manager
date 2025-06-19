/** @jest-environment jsdom */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useIpcListeners } from '../src/common/hooks/useIpcListeners';

describe('useIpcListeners', () => {
  let callbacks;

  beforeEach(() => {
    callbacks = {};
    window.terminals = { 1: { write: jest.fn() } };
    window.electron = {
      onCommandOutput: jest.fn(cb => { callbacks.output = cb; return jest.fn(); }),
      setDirectOutputHandler: jest.fn(cb => { callbacks.direct = cb; return jest.fn(); }),
      onProcessEnded: jest.fn(cb => { callbacks.ended = cb; return jest.fn(); }),
      onCommandFinished: jest.fn(cb => { callbacks.finished = cb; return jest.fn(); }),
      onCommandStarted: jest.fn(cb => { callbacks.started = cb; return jest.fn(); }),
      onCommandStatusUpdate: jest.fn(cb => { callbacks.statusUpdate = cb; return jest.fn(); })
    };
  });

  afterEach(() => {
    delete window.terminals;
    delete window.electron;
  });

  test('bridges command output to terminal writes', () => {
    renderHook(() => useIpcListeners(jest.fn()));
    act(() => {
      callbacks.output({ terminalId: 1, stdout: 'out', stderr: 'err' });
    });
    expect(window.terminals[1].write).toHaveBeenCalledWith('out');
    expect(window.terminals[1].write).toHaveBeenCalledWith('err', true);
  });

  test('updates terminal states from IPC events', () => {
    const { result } = renderHook(() => {
      const [terminals, setTerminals] = React.useState([{ id: 1, status: 'pending_spawn' }]);
      useIpcListeners(setTerminals);
      return { terminals };
    });

    act(() => callbacks.started({ terminalId: 1 }));
    expect(result.current.terminals[0].status).toBe('running');

    act(() => callbacks.finished({ terminalId: 1, exitCode: 2, status: 'error', exitStatus: 'fail' }));
    expect(result.current.terminals[0]).toMatchObject({ status: 'error', exitStatus: 'fail', exitCode: 2 });

    act(() => callbacks.statusUpdate({ terminalId: 1, overallStatus: 'processing', statusDescription: 'desc', processStates: [1], processCount: 1 }));
    expect(result.current.terminals[0]).toMatchObject({ status: 'processing', exitStatus: 'desc', processCount: 1 });

    act(() => callbacks.ended({ terminalId: 1, code: 0 }));
    expect(result.current.terminals[0]).toMatchObject({ status: 'done', exitStatus: 'Exited successfully' });

    act(() => callbacks.ended({ terminalId: 1, signal: 'SIGTERM' }));
    expect(result.current.terminals[0]).toMatchObject({ status: 'stopped', exitStatus: 'Terminated by signal SIGTERM' });
  });

  test('cleans up ipc listeners on unmount', () => {
    const removeFns = {
      output: jest.fn(),
      direct: jest.fn(),
      ended: jest.fn(),
      finished: jest.fn(),
      started: jest.fn(),
      statusUpdate: jest.fn()
    };
    window.electron.onCommandOutput.mockReturnValue(removeFns.output);
    window.electron.setDirectOutputHandler.mockReturnValue(removeFns.direct);
    window.electron.onProcessEnded.mockReturnValue(removeFns.ended);
    window.electron.onCommandFinished.mockReturnValue(removeFns.finished);
    window.electron.onCommandStarted.mockReturnValue(removeFns.started);
    window.electron.onCommandStatusUpdate.mockReturnValue(removeFns.statusUpdate);

    const { unmount } = renderHook(() => useIpcListeners(jest.fn()));
    unmount();

    expect(removeFns.output).toHaveBeenCalled();
    expect(removeFns.direct).toHaveBeenCalled();
    expect(removeFns.ended).toHaveBeenCalled();
    expect(removeFns.finished).toHaveBeenCalled();
    expect(removeFns.started).toHaveBeenCalled();
    expect(removeFns.statusUpdate).toHaveBeenCalled();
  });
});
