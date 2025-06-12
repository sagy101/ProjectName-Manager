import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModeSelector from '../src/components/ModeSelector.jsx';

describe('ModeSelector', () => {
  const defaultProps = {
    sectionId: 'testSection',
    options: ['development', 'staging', 'production'],
    labels: ['Development', 'Staging', 'Production'],
    currentMode: 'development',
    onModeChange: jest.fn(),
    disabled: false,
    showAppNotification: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all mode options as buttons', () => {
    render(<ModeSelector {...defaultProps} />);
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('Staging')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('marks the current mode as active', () => {
    render(<ModeSelector {...defaultProps} currentMode="staging" />);
    expect(screen.getByText('Staging')).toHaveClass('active');
    expect(screen.getByText('Development')).not.toHaveClass('active');
  });

  it('calls onModeChange when a mode button is clicked', () => {
    render(<ModeSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('Staging'));
    expect(defaultProps.onModeChange).toHaveBeenCalledWith('testSection', 'staging');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<ModeSelector {...defaultProps} disabled={true} />);
    expect(screen.getByText('Development')).toBeDisabled();
    expect(screen.getByText('Staging')).toBeDisabled();
    expect(screen.getByText('Production')).toBeDisabled();
  });

  it('handles TBD options correctly', () => {
    const tbdProps = {
      ...defaultProps,
      options: [
        { value: 'development' },
        { value: 'staging', status: 'TBD' }
      ],
      labels: ['Development', 'Staging']
    };
    render(<ModeSelector {...tbdProps} />);
    fireEvent.click(screen.getByText('Staging'));
    expect(tbdProps.onModeChange).not.toHaveBeenCalled();
    expect(tbdProps.showAppNotification).toHaveBeenCalledWith('This feature is not yet implemented.', 'info');
  });

  it('falls back to capitalized option values when labels are not provided', () => {
    const propsWithoutLabels = {
      ...defaultProps,
      options: ['container', 'process'],
      labels: []
    };
    render(<ModeSelector {...propsWithoutLabels} />);
    expect(screen.getByText('Container')).toBeInTheDocument();
    expect(screen.getByText('Process')).toBeInTheDocument();
  });
}); 