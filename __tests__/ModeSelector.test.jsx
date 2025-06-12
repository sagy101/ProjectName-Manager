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
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all mode options as buttons', () => {
      render(<ModeSelector {...defaultProps} />);
      
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Staging')).toBeInTheDocument();
      expect(screen.getByText('Production')).toBeInTheDocument();
    });

    it('applies correct CSS classes', () => {
      const { container } = render(<ModeSelector {...defaultProps} />);
      
      const modeContainer = container.querySelector('.mode-selector-container');
      expect(modeContainer).toBeInTheDocument();
      
      const toggleContainer = container.querySelector('.deployment-toggle-container.compact');
      expect(toggleContainer).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      const { container } = render(<ModeSelector {...defaultProps} className="custom-class" />);
      
      const modeContainer = container.querySelector('.mode-selector-container.custom-class');
      expect(modeContainer).toBeInTheDocument();
    });

    it('applies custom style when provided', () => {
      const customStyle = { opacity: 0.5, marginTop: '10px' };
      const { container } = render(<ModeSelector {...defaultProps} style={customStyle} />);
      
      const modeContainer = container.querySelector('.mode-selector-container');
      expect(modeContainer).toHaveStyle('opacity: 0.5');
      expect(modeContainer).toHaveStyle('margin-top: 10px');
    });

    it('returns null when no options provided', () => {
      const { container } = render(<ModeSelector {...defaultProps} options={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when options is undefined', () => {
      const { container } = render(<ModeSelector {...defaultProps} options={undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Active State', () => {
    it('marks the current mode as active', () => {
      render(<ModeSelector {...defaultProps} currentMode="staging" />);
      
      const developmentButton = screen.getByText('Development');
      const stagingButton = screen.getByText('Staging');
      const productionButton = screen.getByText('Production');
      
      expect(developmentButton).not.toHaveClass('active');
      expect(stagingButton).toHaveClass('active');
      expect(productionButton).not.toHaveClass('active');
    });

    it('sets aria-pressed correctly for current mode', () => {
      render(<ModeSelector {...defaultProps} currentMode="production" />);
      
      const developmentButton = screen.getByText('Development');
      const stagingButton = screen.getByText('Staging');
      const productionButton = screen.getByText('Production');
      
      expect(developmentButton).toHaveAttribute('aria-pressed', 'false');
      expect(stagingButton).toHaveAttribute('aria-pressed', 'false');
      expect(productionButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('User Interaction', () => {
    it('calls onModeChange when a mode button is clicked', () => {
      render(<ModeSelector {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Staging'));
      
      expect(defaultProps.onModeChange).toHaveBeenCalledWith('testSection', 'staging');
    });

    it('calls onModeChange with correct parameters for different modes', () => {
      render(<ModeSelector {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Production'));
      expect(defaultProps.onModeChange).toHaveBeenCalledWith('testSection', 'production');
      
      fireEvent.click(screen.getByText('Development'));
      expect(defaultProps.onModeChange).toHaveBeenCalledWith('testSection', 'development');
    });

    it('does not call onModeChange when disabled', () => {
      render(<ModeSelector {...defaultProps} disabled={true} />);
      
      fireEvent.click(screen.getByText('Staging'));
      
      expect(defaultProps.onModeChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(<ModeSelector {...defaultProps} disabled={true} />);
      
      expect(screen.getByText('Development')).toBeDisabled();
      expect(screen.getByText('Staging')).toBeDisabled();
      expect(screen.getByText('Production')).toBeDisabled();
    });

    it('enables all buttons when disabled prop is false', () => {
      render(<ModeSelector {...defaultProps} disabled={false} />);
      
      expect(screen.getByText('Development')).not.toBeDisabled();
      expect(screen.getByText('Staging')).not.toBeDisabled();
      expect(screen.getByText('Production')).not.toBeDisabled();
    });
  });

  describe('Label Formatting', () => {
    it('capitalizes first letter of each option if no labels are provided', () => {
      const propsWithLowercaseOptions = {
        ...defaultProps,
        options: ['run', 'suspend', 'debug'],
        labels: [], // No labels
        currentMode: 'run'
      };
      
      render(<ModeSelector {...propsWithLowercaseOptions} />);
      
      expect(screen.getByText('Run')).toBeInTheDocument();
      expect(screen.getByText('Suspend')).toBeInTheDocument();
      expect(screen.getByText('Debug')).toBeInTheDocument();
    });

    it('handles mixed case options correctly', () => {
      const propsWithMixedCaseOptions = {
        ...defaultProps,
        options: ['devMode', 'testMode', 'prodMode'],
        currentMode: 'devMode'
      };
      
      render(<ModeSelector {...propsWithMixedCaseOptions} />);
      
      expect(screen.getByText('devMode')).toBeInTheDocument();
      expect(screen.getByText('testMode')).toBeInTheDocument();
      expect(screen.getByText('prodMode')).toBeInTheDocument();
    });

    it('handles partial labels array correctly', () => {
      const propsWithPartialLabels = {
        ...defaultProps,
        options: ['option1', 'option2', 'option3'],
        labels: ['Custom Label 1', 'Custom Label 2'] // Missing third label
      };
      
      render(<ModeSelector {...propsWithPartialLabels} />);
      
      expect(screen.getByText('Custom Label 1')).toBeInTheDocument();
      expect(screen.getByText('Custom Label 2')).toBeInTheDocument();
      expect(screen.getByText('option3')).toBeInTheDocument(); // Falls back to raw value
    });

    it('calls onModeChange with original option value, not label', () => {
      const mockOnModeChange = jest.fn();
      const propsWithLabels = {
        ...defaultProps,
        options: ['dev'],
        labels: ['Development Mode'],
        onModeChange: mockOnModeChange
      };
      
      render(<ModeSelector {...propsWithLabels} />);
      fireEvent.click(screen.getByText('Development Mode'));
      
      expect(mockOnModeChange).toHaveBeenCalledWith('testSection', 'dev');
    });

    it('shows active state with custom labels', () => {
      const propsWithLabels = {
        ...defaultProps,
        options: ['normal', 'dev'],
        labels: ['Normal Mode', 'Development Mode'],
        currentMode: 'dev'
      };
      
      render(<ModeSelector {...propsWithLabels} />);
      
      const normalButton = screen.getByText('Normal Mode');
      const devButton = screen.getByText('Development Mode');
      
      expect(normalButton).not.toHaveClass('active');
      expect(devButton).toHaveClass('active');
    });
  });

  describe('Edge Cases', () => {
    it('handles single option', () => {
      const propsWithSingleOption = {
        ...defaultProps,
        options: ['only'],
        currentMode: 'only'
      };
      
      render(<ModeSelector {...propsWithSingleOption} />);
      
      const button = screen.getByText('only');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('active');
    });

    it('handles currentMode that does not match any option', () => {
      const propsWithMismatchedMode = {
        ...defaultProps,
        currentMode: 'nonexistent'
      };
      
      render(<ModeSelector {...propsWithMismatchedMode} />);
      
      // No button should be active
      expect(screen.getByText('Development')).not.toHaveClass('active');
      expect(screen.getByText('Staging')).not.toHaveClass('active');
      expect(screen.getByText('Production')).not.toHaveClass('active');
    });

    it('handles empty string as currentMode', () => {
      const propsWithEmptyMode = {
        ...defaultProps,
        currentMode: ''
      };
      
      render(<ModeSelector {...propsWithEmptyMode} />);
      
      // No button should be active
      expect(screen.getByText('Development')).not.toHaveClass('active');
      expect(screen.getByText('Staging')).not.toHaveClass('active');
      expect(screen.getByText('Production')).not.toHaveClass('active');
    });
  });

  describe('Custom Labels', () => {
    it('uses custom labels when provided', () => {
      const propsWithLabels = {
        ...defaultProps,
        options: ['normal', 'dev'],
        labels: ['Normal Mode', 'Development Mode']
      };
      
      render(<ModeSelector {...propsWithLabels} />);
      
      expect(screen.getByText('Normal Mode')).toBeInTheDocument();
      expect(screen.getByText('Development Mode')).toBeInTheDocument();
      expect(screen.queryByText('Normal')).not.toBeInTheDocument();
      expect(screen.queryByText('Dev')).not.toBeInTheDocument();
    });

    it('falls back to capitalized option names when labels are not provided', () => {
      const propsWithoutLabels = {
        ...defaultProps,
        options: ['container', 'process']
      };
      
      render(<ModeSelector {...propsWithoutLabels} />);
      
      expect(screen.getByText('Container')).toBeInTheDocument();
      expect(screen.getByText('Process')).toBeInTheDocument();
    });

    it('handles partial labels array correctly', () => {
      const propsWithPartialLabels = {
        ...defaultProps,
        options: ['option1', 'option2', 'option3'],
        labels: ['Custom Label 1', 'Custom Label 2'] // Missing third label
      };
      
      render(<ModeSelector {...propsWithPartialLabels} />);
      
      expect(screen.getByText('Custom Label 1')).toBeInTheDocument();
      expect(screen.getByText('Custom Label 2')).toBeInTheDocument();
      expect(screen.getByText('option3')).toBeInTheDocument(); // Falls back to raw value
    });

    it('calls onModeChange with original option value, not label', () => {
      const mockOnModeChange = jest.fn();
      const propsWithLabels = {
        ...defaultProps,
        options: ['dev'],
        labels: ['Development Mode'],
        onModeChange: mockOnModeChange
      };
      
      render(<ModeSelector {...propsWithLabels} />);
      fireEvent.click(screen.getByText('Development Mode'));
      
      expect(mockOnModeChange).toHaveBeenCalledWith('testSection', 'dev');
    });

    it('shows active state with custom labels', () => {
      const propsWithLabels = {
        ...defaultProps,
        options: ['normal', 'dev'],
        labels: ['Normal Mode', 'Development Mode'],
        currentMode: 'dev'
      };
      
      render(<ModeSelector {...propsWithLabels} />);
      
      const normalButton = screen.getByText('Normal Mode');
      const devButton = screen.getByText('Development Mode');
      
      expect(normalButton).not.toHaveClass('active');
      expect(devButton).toHaveClass('active');
    });
  });
}); 