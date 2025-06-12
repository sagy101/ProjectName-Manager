import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeploymentOptions from '../src/components/DeploymentOptions.jsx';

describe('DeploymentOptions', () => {
  const defaultProps = {
    sectionId: 'testSection',
    options: [
      { value: 'container', label: 'Container' },
      { value: 'process', label: 'Process' }
    ],
    currentType: 'container',
    onChange: jest.fn(),
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders both Container and Process buttons', () => {
      render(<DeploymentOptions {...defaultProps} />);
      
      expect(screen.getByText('Container')).toBeInTheDocument();
      expect(screen.getByText('Process')).toBeInTheDocument();
    });

    it('applies correct CSS classes', () => {
      const { container } = render(<DeploymentOptions {...defaultProps} />);
      
      const modeSelectorDiv = container.querySelector('.mode-selector-container');
      expect(modeSelectorDiv).toBeInTheDocument();
      
      const toggleContainer = container.querySelector('.deployment-toggle-container');
      expect(toggleContainer).toBeInTheDocument();
    });

    it('renders buttons with deployment-toggle-btn class', () => {
      render(<DeploymentOptions {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('deployment-toggle-btn');
      });
    });
  });

  describe('Active State Management', () => {
    it('marks Container button as active when currentType is container', () => {
      render(<DeploymentOptions {...defaultProps} currentType="container" />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).toHaveClass('active');
      expect(processButton).not.toHaveClass('active');
    });

    it('marks Process button as active when currentType is process', () => {
      render(<DeploymentOptions {...defaultProps} currentType="process" />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(processButton).toHaveClass('active');
      expect(containerButton).not.toHaveClass('active');
    });

    it('handles undefined currentType gracefully', () => {
      render(<DeploymentOptions {...defaultProps} currentType={undefined} />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).toHaveClass('active');
      expect(processButton).not.toHaveClass('active');
    });

    it('handles null currentType gracefully', () => {
      render(<DeploymentOptions {...defaultProps} currentType={null} />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).toHaveClass('active');
      expect(processButton).not.toHaveClass('active');
    });
  });

  describe('Aria Attributes', () => {
    it('sets aria-pressed to true for active button', () => {
      render(<DeploymentOptions {...defaultProps} currentType="container" />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).toHaveAttribute('aria-pressed', 'true');
      expect(processButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('sets aria-pressed to false for inactive button', () => {
      render(<DeploymentOptions {...defaultProps} currentType="process" />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).toHaveAttribute('aria-pressed', 'false');
      expect(processButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('User Interaction', () => {
    it('calls onChange with "container" when Container button is clicked', () => {
      const onChange = jest.fn();
      render(<DeploymentOptions {...defaultProps} onChange={onChange} />);
      
      const containerButton = screen.getByText('Container');
      fireEvent.click(containerButton);
      
      expect(onChange).toHaveBeenCalledWith('testSection', 'container');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('calls onChange with "process" when Process button is clicked', () => {
      const onChange = jest.fn();
      render(<DeploymentOptions {...defaultProps} onChange={onChange} />);
      
      const processButton = screen.getByText('Process');
      fireEvent.click(processButton);
      
      expect(onChange).toHaveBeenCalledWith('testSection', 'process');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('allows clicking the same button multiple times', () => {
      const onChange = jest.fn();
      render(<DeploymentOptions {...defaultProps} onChange={onChange} currentType="container" />);
      
      const containerButton = screen.getByText('Container');
      fireEvent.click(containerButton);
      fireEvent.click(containerButton);
      
      expect(onChange).toHaveBeenCalledWith('testSection', 'container');
      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styling when disabled prop is true', () => {
      const { container } = render(<DeploymentOptions {...defaultProps} disabled={true} />);
      
      const modeSelectorDiv = container.querySelector('.mode-selector-container');
      expect(modeSelectorDiv).toHaveStyle('opacity: 0.6');
    });

    it('applies normal styling when disabled prop is false', () => {
      const { container } = render(<DeploymentOptions {...defaultProps} disabled={false} />);
      
      const modeSelectorDiv = container.querySelector('.mode-selector-container');
      expect(modeSelectorDiv).toHaveStyle('opacity: 1');
    });

    it('disables buttons when disabled prop is true', () => {
      render(<DeploymentOptions {...defaultProps} disabled={true} />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).toBeDisabled();
      expect(processButton).toBeDisabled();
    });

    it('enables buttons when disabled prop is false', () => {
      render(<DeploymentOptions {...defaultProps} disabled={false} />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).not.toBeDisabled();
      expect(processButton).not.toBeDisabled();
    });

    it('does not call onChange when disabled and button is clicked', () => {
      const onChange = jest.fn();
      render(<DeploymentOptions {...defaultProps} onChange={onChange} disabled={true} />);
      
      const containerButton = screen.getByText('Container');
      fireEvent.click(containerButton);
      
      expect(onChange).not.toHaveBeenCalled();
    });

    it('still calls onChange when not disabled and button is clicked', () => {
      const onChange = jest.fn();
      render(<DeploymentOptions {...defaultProps} onChange={onChange} disabled={false} />);
      
      const containerButton = screen.getByText('Container');
      fireEvent.click(containerButton);
      
      expect(onChange).toHaveBeenCalledWith('testSection', 'container');
    });
  });

  describe('Default Props', () => {
    it('uses disabled=false as default when disabled prop is not provided', () => {
      const { onChange, disabled, ...propsWithoutDisabled } = defaultProps;
      render(<DeploymentOptions {...propsWithoutDisabled} onChange={onChange} />);
      
      const containerButton = screen.getByText('Container');
      expect(containerButton).not.toBeDisabled();
    });
  });

  describe('Props Validation', () => {
    it('handles missing sectionId prop gracefully', () => {
      const { sectionId, ...propsWithoutSectionId } = defaultProps;
      
      expect(() => {
        render(<DeploymentOptions {...propsWithoutSectionId} />);
      }).not.toThrow();
    });

    it('handles missing onChange prop gracefully', () => {
      const { onChange, ...propsWithoutOnChange } = defaultProps;
      
      expect(() => {
        render(<DeploymentOptions {...propsWithoutOnChange} />);
      }).not.toThrow();
    });

    it('handles missing options prop gracefully', () => {
      const { options, ...propsWithoutOptions } = defaultProps;
      expect(() => {
        render(<DeploymentOptions {...propsWithoutOptions} />);
      }).not.toThrow();
    });

    it('does not crash when onChange is undefined and button is clicked', () => {
      const { onChange, ...propsWithoutOnChange } = defaultProps;
      
      expect(() => {
        render(<DeploymentOptions {...propsWithoutOnChange} />);
        const containerButton = screen.getByText('Container');
        fireEvent.click(containerButton);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string currentType', () => {
      render(<DeploymentOptions {...defaultProps} currentType="" />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).toHaveClass('active');
      expect(processButton).not.toHaveClass('active');
    });

    it('handles invalid currentType value', () => {
      render(<DeploymentOptions {...defaultProps} currentType="invalid" />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).toHaveClass('active');
      expect(processButton).not.toHaveClass('active');
    });

    it('handles numeric value for currentType without crashing', () => {
      render(<DeploymentOptions {...defaultProps} currentType={123} />);
      
      const containerButton = screen.getByText('Container');
      const processButton = screen.getByText('Process');
      
      expect(containerButton).not.toHaveClass('active');
      expect(processButton).not.toHaveClass('active');
    });

    it('maintains correct state when currentType changes', () => {
      const { rerender } = render(<DeploymentOptions {...defaultProps} currentType="container" />);
      
      let containerButton = screen.getByText('Container');
      let processButton = screen.getByText('Process');
      
      expect(containerButton).toHaveClass('active');
      expect(processButton).not.toHaveClass('active');
      
      rerender(<DeploymentOptions {...defaultProps} currentType="process" />);
      
      containerButton = screen.getByText('Container');
      processButton = screen.getByText('Process');
      
      expect(containerButton).not.toHaveClass('active');
      expect(processButton).toHaveClass('active');
    });
  });
}); 