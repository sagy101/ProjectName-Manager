import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeploymentOptions from '../src/project-config/DeploymentOptions.jsx';

describe('DeploymentOptions', () => {
  const defaultProps = {
    sectionId: 'testSection',
    options: [
      { value: 'container', label: 'Container' },
      { value: 'process', label: 'Process' }
    ],
    currentType: 'container',
    onChange: jest.fn(),
    disabled: false,
    showAppNotification: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both Container and Process buttons', () => {
    render(<DeploymentOptions {...defaultProps} />);
    expect(screen.getByText('Container')).toBeInTheDocument();
    expect(screen.getByText('Process')).toBeInTheDocument();
  });

  it('marks the correct button as active', () => {
    const { rerender } = render(<DeploymentOptions {...defaultProps} currentType="container" />);
    expect(screen.getByText('Container')).toHaveClass('active');
    expect(screen.getByText('Process')).not.toHaveClass('active');

    rerender(<DeploymentOptions {...defaultProps} currentType="process" />);
    expect(screen.getByText('Container')).not.toHaveClass('active');
    expect(screen.getByText('Process')).toHaveClass('active');
  });

  it('calls onChange with the correct value when a button is clicked', () => {
    render(<DeploymentOptions {...defaultProps} />);
    fireEvent.click(screen.getByText('Process'));
    expect(defaultProps.onChange).toHaveBeenCalledWith('testSection', 'process');
  });

  it('disables buttons when the disabled prop is true', () => {
    render(<DeploymentOptions {...defaultProps} disabled={true} />);
    expect(screen.getByText('Container')).toBeDisabled();
    expect(screen.getByText('Process')).toBeDisabled();
  });

  it('handles TBD options correctly', () => {
    const tbdProps = {
      ...defaultProps,
      options: [
        { value: 'container', status: 'TBD' },
        { value: 'process' }
      ],
      currentType: 'container'
    };
    render(<DeploymentOptions {...tbdProps} />);
    
    // Component should automatically switch away from TBD option during initialization
    expect(tbdProps.onChange).toHaveBeenCalledWith('testSection', 'process');
    
    // Clear the mock to test the click behavior
    tbdProps.onChange.mockClear();
    
    // Clicking on TBD option should show notification and not call onChange again
    fireEvent.click(screen.getByText('Container'));
    expect(tbdProps.showAppNotification).toHaveBeenCalledWith('This feature is not yet implemented.', 'info');
    expect(tbdProps.onChange).not.toHaveBeenCalled();
  });

  it('defaults to the first available option if currentType is TBD', () => {
    const tbdProps = {
      ...defaultProps,
      options: [
        { value: 'container', status: 'TBD' },
        { value: 'process' }
      ],
      currentType: 'container'
    };
    const { container } = render(<DeploymentOptions {...tbdProps} />);
    expect(container.querySelector('.active')).toHaveTextContent('Process');
  });
}); 