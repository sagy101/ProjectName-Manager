import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InputField from '../../src/project-config/InputField';

describe('InputField', () => {
  const defaultProps = {
    sectionId: 'test-section',
    inputId: 'test-input',
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders input field with correct attributes', () => {
    render(<InputField {...defaultProps} />);
    
    const input = screen.getByTestId('input-test-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-section-test-input');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('');
  });

  test('renders with provided value', () => {
    const props = { ...defaultProps, value: 'test value' };
    render(<InputField {...props} />);
    
    const input = screen.getByTestId('input-test-input');
    expect(input).toHaveValue('test value');
  });

  test('renders with placeholder text', () => {
    const props = { ...defaultProps, placeholder: 'Enter value here' };
    render(<InputField {...props} />);
    
    const input = screen.getByTestId('input-test-input');
    expect(input).toHaveAttribute('placeholder', 'Enter value here');
  });

  test('renders as disabled when disabled prop is true', () => {
    const props = { ...defaultProps, disabled: true };
    render(<InputField {...props} />);
    
    const input = screen.getByTestId('input-test-input');
    expect(input).toBeDisabled();
  });

  test('renders as enabled when disabled prop is false', () => {
    const props = { ...defaultProps, disabled: false };
    render(<InputField {...props} />);
    
    const input = screen.getByTestId('input-test-input');
    expect(input).not.toBeDisabled();
  });

  test('calls onChange with correct parameters when input value changes', () => {
    const mockOnChange = jest.fn();
    const props = { ...defaultProps, onChange: mockOnChange };
    render(<InputField {...props} />);
    
    const input = screen.getByTestId('input-test-input');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('test-section', 'test-input', 'new value');
  });

  test('does not call onChange when it is not provided', () => {
    const props = { ...defaultProps, onChange: undefined };
    render(<InputField {...props} />);
    
    const input = screen.getByTestId('input-test-input');
    // This should not throw an error
    expect(() => {
      fireEvent.change(input, { target: { value: 'new value' } });
    }).not.toThrow();
  });

  test('creates correct CSS classes', () => {
    render(<InputField {...defaultProps} />);
    
    const container = screen.getByTestId('input-test-input').parentElement;
    expect(container).toHaveClass('input-field-container');
    
    const input = screen.getByTestId('input-test-input');
    expect(input).toHaveClass('input-field');
  });
}); 