/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import FloatingTerminal from '../../src/floating-terminal/FloatingTerminal.jsx';

jest.mock('../../src/terminal/components/Terminal.jsx', () => () => <div data-testid="terminal"/>);

describe('FloatingTerminal component', () => {
  const baseProps = {
    id: 't1',
    title: 'Term',
    command: 'echo',
    isVisible: true,
    isMinimized: false,
    onClose: jest.fn(),
    onFocus: jest.fn(),
    onMinimize: jest.fn(),
    zIndex: 100
  };

  test('renders terminal when visible', () => {
    const { getByTestId } = render(<FloatingTerminal {...baseProps} />);
    expect(getByTestId('terminal')).toBeInTheDocument();
  });

  test('calls minimize and close handlers', () => {
    const { container } = render(<FloatingTerminal {...baseProps} />);
    fireEvent.click(container.querySelector('.floating-terminal-minimize-btn'));
    fireEvent.click(container.querySelector('.floating-terminal-close-btn'));
    expect(baseProps.onMinimize).toHaveBeenCalledWith('t1');
    expect(baseProps.onClose).toHaveBeenCalledWith('t1');
  });

  test('does not render when not visible', () => {
    const { container } = render(<FloatingTerminal {...baseProps} isVisible={false} />);
    const floatingTerminal = container.firstChild;
    expect(floatingTerminal).not.toBeNull();
    expect(floatingTerminal).toHaveStyle('display: none');
  });

  test('auto closes when command finishes', () => {
    jest.useFakeTimers();
    let finishCb;
    window.electron = {
      onCommandFinished: cb => { finishCb = cb; return jest.fn(); },
      onCommandStarted: jest.fn(() => jest.fn()),
    };
    const onClose = jest.fn();
    render(<FloatingTerminal {...baseProps} isFixCommand={true} onClose={onClose} />);
    act(() => {
      finishCb({ terminalId: 't1', status: 'done', exitCode: 0 });
      jest.advanceTimersByTime(10000);
    });
    expect(onClose).toHaveBeenCalledWith('t1');
    jest.useRealTimers();
  });
});
