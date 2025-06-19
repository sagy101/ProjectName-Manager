/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { useTitleOverflow } from '../src/tab-info/hooks/useTitleOverflow';

global.ResizeObserver = class {
  constructor(cb){ this.cb=cb; }
  observe(){ this.cb(); }
  disconnect(){}
};

describe('useTitleOverflow', () => {
  test('detects overflow', () => {
    const tab = document.createElement('div');
    Object.defineProperty(tab, 'clientWidth', { value: 100 });
    const title = document.createElement('span');
    Object.defineProperty(title, 'scrollWidth', { value: 120 });
    const { result } = renderHook(() => useTitleOverflow({current:tab}, {current:title}, true));
    expect(result.current).toBe(true);
  });

  test('detects no overflow', () => {
    const tab = document.createElement('div');
    Object.defineProperty(tab, 'clientWidth', { value: 200 });
    const title = document.createElement('span');
    Object.defineProperty(title, 'scrollWidth', { value: 50 });
    const { result } = renderHook(() => useTitleOverflow({current:tab}, {current:title}, true));
    expect(result.current).toBe(false);
  });
});
