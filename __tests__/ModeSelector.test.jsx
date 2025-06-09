import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModeSelector from '../src/components/ModeSelector.jsx';

describe('ModeSelector', () => {
  const defaultProps = {
    sectionId: 'testSection',
    options: ['development', 'staging', 'production'],
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
      expect(modeContainer).toHaveStyle('padding: 8px 12px'); // Original style should be preserved
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
    it('capitalizes first letter of each option', () => {
      const propsWithLowercaseOptions = {
        ...defaultProps,
        options: ['run', 'suspend', 'debug'],
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
      
      expect(screen.getByText('DevMode')).toBeInTheDocument();
      expect(screen.getByText('TestMode')).toBeInTheDocument();
      expect(screen.getByText('ProdMode')).toBeInTheDocument();
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
      
      const button = screen.getByText('Only');
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
}); 