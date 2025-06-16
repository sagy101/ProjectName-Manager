/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useTabManagement } from '../src/hooks/useTabManagement';

describe('useTabManagement hook', () => {
  test('toggleOverflowTabs toggles state', () => {
    const ref = { current: document.createElement('div') };
    const emptyTerms = [];
    const { result } = renderHook(() => useTabManagement(ref, emptyTerms, null));
    act(() => { result.current.toggleOverflowTabs(); });
    expect(result.current.overflowTabsOpen).toBe(true);
  });

  test('recalculateVisibleTabs moves overflowing tabs', () => {
    jest.useFakeTimers();
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 90 });
    const t1 = document.createElement('div');
    t1.className = 'tab';
    Object.defineProperty(t1, 'offsetWidth', { value: 50 });
    const t2 = document.createElement('div');
    t2.className = 'tab';
    Object.defineProperty(t2, 'offsetWidth', { value: 50 });
    container.appendChild(t1);
    container.appendChild(t2);
    document.body.appendChild(container);
    const ref = { current: container };
    const terms = [{ id: 1 }, { id: 2 }];
    const { result, unmount } = renderHook(() => useTabManagement(ref, terms, 2));
    act(() => { jest.runAllTimers(); });
    expect(result.current.visibleTabs.map(t => t.id)).toEqual([2]);
    expect(result.current.overflowTabs.map(t => t.id)).toEqual([1]);
    unmount();
    document.body.removeChild(container);
    jest.useRealTimers();
  });

  test('recalculateVisibleTabs when active tab already visible', () => {
    jest.useFakeTimers();
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 90 });
    const t1 = document.createElement('div');
    t1.className = 'tab';
    Object.defineProperty(t1, 'offsetWidth', { value: 50 });
    const t2 = document.createElement('div');
    t2.className = 'tab';
    Object.defineProperty(t2, 'offsetWidth', { value: 50 });
    container.appendChild(t1);
    container.appendChild(t2);
    const ref = { current: container };
    const terms = [{ id: 1 }, { id: 2 }];
    const { result, unmount } = renderHook(() => useTabManagement(ref, terms, 1));
    act(() => { jest.runAllTimers(); });
    expect(result.current.visibleTabs.map(t => t.id)).toEqual([1]);
    expect(result.current.overflowTabs.map(t => t.id)).toEqual([2]);
    unmount();
    jest.useRealTimers();
  });

  test('toggleOverflowTabs stops event propagation', () => {
    const ref = { current: document.createElement('div') };
    const emptyTerms = [];
    const { result, unmount } = renderHook(() => useTabManagement(ref, emptyTerms, null));
    const e = { stopPropagation: jest.fn(), preventDefault: jest.fn() };
    act(() => { result.current.toggleOverflowTabs(e); });
    expect(e.stopPropagation).toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled();
    unmount();
  });

  test('click outside closes overflow dropdown', () => {
    jest.useFakeTimers();
    const container = document.createElement('div');
    const button = document.createElement('div');
    button.className = 'overflow-indicator';
    container.appendChild(button);
    const ref = { current: container };
    document.body.appendChild(container);
    const emptyTerms = [];
    const { result, unmount } = renderHook(() => useTabManagement(ref, emptyTerms, null));
    act(() => { result.current.toggleOverflowTabs(); });
    act(() => { jest.runAllTimers(); });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(result.current.overflowTabsOpen).toBe(false);
    unmount();
    jest.useRealTimers();
  });
});
