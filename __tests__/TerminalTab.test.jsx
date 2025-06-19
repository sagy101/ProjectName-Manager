/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import TerminalTab from '../src/terminal/components/TerminalTab';

jest.mock('../src/tab-info/hooks/useTitleOverflow', () => ({
  useTitleOverflow: jest.fn(() => false)
}));

describe('TerminalTab', () => {
  test('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TerminalTab id={1} title="Tab" status="running" active={false} onSelect={onSelect} onInfo={jest.fn()} />
    );
    fireEvent.click(getByTestId('terminal-tab-1'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  test('calls onInfo when info button clicked', () => {
    const onInfo = jest.fn();
    const { container } = render(
      <TerminalTab id={2} title="Info" status="done" active={false} onSelect={jest.fn()} onInfo={onInfo} />
    );
    fireEvent.click(container.querySelector('.tab-info-button'));
    expect(onInfo).toHaveBeenCalledWith(2, expect.any(Object));
  });

  test('shows title attribute when overflowing', () => {
    const useTitleOverflow = require('../src/tab-info/hooks/useTitleOverflow').useTitleOverflow;
    useTitleOverflow.mockReturnValueOnce(true);
    const { getByTestId } = render(
      <TerminalTab id={3} title="LongTitle" status="idle" active={false} onSelect={() => {}} onInfo={() => {}} />
    );
    expect(getByTestId('terminal-tab-3').getAttribute('title')).toBe('LongTitle');
  });
});
