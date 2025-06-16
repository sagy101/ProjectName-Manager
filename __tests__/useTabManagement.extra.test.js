/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useTabManagement } from '../src/hooks/useTabManagement';

describe('useTabManagement outside click', () => {
  test('closes overflow when clicking outside', () => {
    jest.useFakeTimers();
    const container = document.createElement('div');
    const overflowButton = document.createElement('button');
    overflowButton.className = 'overflow-indicator';
    container.appendChild(overflowButton);
    document.body.appendChild(container);
    const dropdown = document.createElement('div');
    dropdown.dataset.testid = 'overflow-dropdown';
    document.body.appendChild(dropdown);

    const ref = { current: container };
    const { result } = renderHook(() => useTabManagement(ref, [], null));
    act(() => result.current.toggleOverflowTabs());
    act(() => jest.runAllTimers());
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(result.current.overflowTabsOpen).toBe(false);
    jest.useRealTimers();
  });
});
