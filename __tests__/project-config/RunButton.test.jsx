import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RunButton from '../../src/project-config/RunButton';

/** @jest-environment jsdom */

describe('RunButton component', () => {
  test('shows RUN state with icon and triggers click handler', () => {
    const onClick = jest.fn();
    render(<RunButton projectName="demo" onClick={onClick} />);
    const btn = screen.getByRole('button', { name: /run demo/i });
    expect(btn).toHaveClass('run-configuration-button');
    expect(btn).not.toBeDisabled();
    expect(btn.querySelector('.run-icon')).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });

  test('renders STOP state with proper class and icon', () => {
    render(<RunButton projectName="x" isRunning />);
    const btn = screen.getByRole('button', { name: /stop x/i });
    expect(btn).toHaveClass('stop');
    expect(btn.querySelector('.stop-icon')).toBeInTheDocument();
  });

  test('renders STOPPING state with proper class and icon', () => {
    render(<RunButton projectName="y" isStopping />);
    const btn = screen.getByRole('button', { name: /stopping y/i });
    expect(btn).toHaveClass('stopping');
    expect(btn.querySelector('.stopping-icon')).toBeInTheDocument();
  });

  test('disables the button when disabled prop is true', () => {
    const onClick = jest.fn();
    render(<RunButton projectName="z" disabled onClick={onClick} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
