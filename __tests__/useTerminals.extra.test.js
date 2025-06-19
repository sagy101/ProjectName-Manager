/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
jest.mock('../src/common/utils/evalUtils', () => ({
  evaluateCommandCondition: jest.fn(() => true)
}));
import { useTerminals } from '../src/terminal/useTerminals';
import { evaluateCommandCondition } from '../src/common/utils/evalUtils';

describe('useTerminals extra scenarios', () => {
  beforeEach(() => {
    window.electron = {
      killProcess: jest.fn(),
      stopContainers: jest.fn().mockResolvedValue()
    };
  });
  afterEach(() => {
    delete window.electron;
    jest.restoreAllMocks();
  });

  test('handleRefreshTab stops associated containers', async () => {
    const { result } = renderHook(() => useTerminals({}, [], false));
    act(() => {
      result.current.openTabs([{ command: 'c', sectionId: 's', associatedContainers: ['a','b'] }]);
    });
    const id = result.current.terminals[0].id;
    await act(async () => {
      await result.current.handleRefreshTab(id);
    });
    expect(window.electron.stopContainers).toHaveBeenCalledWith(['a','b']);
    expect(window.electron.killProcess).toHaveBeenCalledWith(id);
  });

  test('handleCloseTab stops containers and clears active id', async () => {
    const { result } = renderHook(() => useTerminals({}, [], false));
    act(() => {
      result.current.openTabs([{ command:'x', sectionId:'sec', associatedContainers:['c'] }]);
    });
    const id = result.current.terminals[0].id;
    await act(async () => {
      await result.current.handleCloseTab(id);
    });
    expect(window.electron.stopContainers).toHaveBeenCalledWith(['c']);
    expect(result.current.activeTerminalId).toBe(null);
  });
});
