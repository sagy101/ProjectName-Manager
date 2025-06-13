/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import FloatingTerminal from '../src/components/FloatingTerminal.jsx';

jest.mock('../src/components/Terminal.jsx', () => () => <div data-testid="terminal"/>);

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
});
