/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../../src/common/components/ErrorBoundary';
import { logger } from '../../../src/common/utils/debugUtils';

// Mock the logger
jest.mock('../../../src/common/utils/debugUtils', () => ({
  logger: {
    error: jest.fn()
  }
}));

// Component that throws an error when render prop is true
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="working-component">Working component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests since we're intentionally throwing errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child-component">Hello World</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  test('catches errors and displays default error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(logger.error).toHaveBeenCalledWith(
      'React Error Boundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  test('renders custom fallback component when provided', () => {
    const CustomFallback = ({ error, resetError }) => (
      <div data-testid="custom-fallback">
        <h3>Custom Error: {error?.message || 'Unknown error'}</h3>
        <button onClick={resetError} data-testid="custom-reset">Reset</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Custom Error:/)).toBeInTheDocument();
    expect(screen.getByTestId('custom-reset')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  test('Try Again button calls handleReset method', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // The button should exist and be clickable (testing that handleReset is wired up)
    const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
    expect(tryAgainButton).toBeInTheDocument();
    
    // Click should not throw an error
    expect(() => fireEvent.click(tryAgainButton)).not.toThrow();
  });
}); 