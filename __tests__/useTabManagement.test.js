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
    const { result } = renderHook(() => useTabManagement(ref, terms, 2));
    act(() => { jest.runAllTimers(); });
    expect(result.current.visibleTabs.map(t => t.id)).toEqual([2]);
    expect(result.current.overflowTabs.map(t => t.id)).toEqual([1]);
    jest.useRealTimers();
  });
});
