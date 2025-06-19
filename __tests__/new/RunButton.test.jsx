import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RunButton from '../../src/project-config/RunButton';

/** @jest-environment jsdom */

describe('RunButton component', () => {
  test('renders RUN state and handles click', () => {
    const onClick = jest.fn();
    render(<RunButton projectName="demo" onClick={onClick} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('RUN DEMO');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });

  test('renders STOP state', () => {
    render(<RunButton projectName="x" isRunning />);
    expect(screen.getByRole('button')).toHaveTextContent('STOP X');
  });

  test('renders STOPPING state', () => {
    render(<RunButton projectName="y" isStopping />);
    expect(screen.getByRole('button')).toHaveTextContent('STOPPING Y');
  });
});
