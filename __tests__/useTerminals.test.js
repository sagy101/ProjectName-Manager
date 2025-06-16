/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
jest.mock('../src/utils/evalUtils', () => ({
  evaluateCommandCondition: jest.fn(() => true)
}));
import { useTerminals } from '../src/hooks/useTerminals';
import { evaluateCommandCondition } from '../src/utils/evalUtils';

describe('useTerminals hook', () => {
  beforeEach(() => {
    window.electron = {
      killProcess: jest.fn(),
      stopContainers: jest.fn().mockResolvedValue(),
    };
  });

  afterEach(() => {
    delete window.electron;
    jest.restoreAllMocks();
  });

  test('openTabs creates terminals and sets active id', () => {
    const { result } = renderHook(() => useTerminals({}, [], false));
    const tabs = [
      { command: 'echo 1', sectionId: 'one', title: 'One' },
      { type: 'error', message: 'oops', sectionId: 'two' }
    ];
    act(() => result.current.openTabs(tabs));
    expect(result.current.terminals).toHaveLength(2);
    expect(result.current.terminals[0]).toMatchObject({ command: 'echo 1', status: 'pending_spawn' });
    expect(result.current.terminals[1]).toHaveProperty('errorType', 'config');
    expect(result.current.activeTerminalId).toBe(result.current.terminals[0].id);
  });

  test('handleRefreshTab builds command with refreshConfig', async () => {
    evaluateCommandCondition.mockReturnValue(true);
    const configSidebarCommands = [
      {
        command: {
          refreshConfig: {
            prependCommands: [{ command: 'pre-', condition: 'c' }],
            appendCommands: [{ command: '-post', condition: 'c' }]
          }
        }
      }
    ];
    const { result } = renderHook(() => useTerminals({}, configSidebarCommands, false));
    act(() => {
      result.current.openTabs([{ command: 'base', sectionId: 'one', commandDefinitionId: 0 }]);
    });
    const id = result.current.terminals[0].id;
    await act(async () => {
      await result.current.handleRefreshTab(id);
    });
    expect(window.electron.killProcess).toHaveBeenCalledWith(id);
    expect(result.current.terminals[0].command).toBe('pre-base-post');
    expect(result.current.terminals[0].refreshCount).toBe(1);
  });

  test('handleCloseTab removes terminal and updates active id', async () => {
    const { result } = renderHook(() => useTerminals({}, [], false));
    act(() => {
      result.current.openTabs([
        { command: 'a', sectionId: 'one' },
        { command: 'b', sectionId: 'two' }
      ]);
    });
    const first = result.current.terminals[0].id;
    const second = result.current.terminals[1].id;
    await act(async () => {
      await result.current.handleCloseTab(first);
    });
    expect(window.electron.killProcess).toHaveBeenCalledWith(first);
    expect(result.current.terminals).toHaveLength(1);
    expect(result.current.activeTerminalId).toBe(second);
  });

  test('killAllTerminals aggregates containers and kills processes', async () => {
    const { result } = renderHook(() => useTerminals({}, [], false));
    act(() => {
      result.current.openTabs([
        { command: 'a', sectionId: 'one', associatedContainers: ['c1', 'c2'] },
        { command: 'b', sectionId: 'two', associatedContainers: ['c2'] }
      ]);
    });
    await act(async () => {
      await result.current.killAllTerminals();
    });
    expect(window.electron.killProcess).toHaveBeenCalledTimes(2);
    expect(window.electron.stopContainers).toHaveBeenCalledWith(['c1', 'c2']);
  });
});
