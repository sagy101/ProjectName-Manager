import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HealthReportButton from '../../src/health-report/HealthReportButton';

describe('HealthReportButton', () => {
  const mockOnOpenHealthReport = jest.fn();

  beforeEach(() => {
    mockOnOpenHealthReport.mockClear();
  });

  // Rendering tests
  test('renders button with correct icon and text', () => {
    render(
      <HealthReportButton 
        onOpenHealthReport={mockOnOpenHealthReport}
        healthStatus="green"
      />
    );
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Health Report')).toBeInTheDocument();
    expect(screen.getByTestId('health-report-button')).toBeInTheDocument();
  });

  // Color state logic tests
  test('applies correct color class based on health status - green', () => {
    render(
      <HealthReportButton 
        onOpenHealthReport={mockOnOpenHealthReport}
        healthStatus="green"
      />
    );
    
    const button = screen.getByTestId('health-report-button');
    expect(button).toHaveClass('health-report-button--green');
  });

  test('applies correct color class based on health status - blue', () => {
    render(
      <HealthReportButton 
        onOpenHealthReport={mockOnOpenHealthReport}
        healthStatus="blue"
      />
    );
    
    const button = screen.getByTestId('health-report-button');
    expect(button).toHaveClass('health-report-button--blue');
  });

  test('applies correct color class based on health status - red', () => {
    render(
      <HealthReportButton 
        onOpenHealthReport={mockOnOpenHealthReport}
        healthStatus="red"
      />
    );
    
    const button = screen.getByTestId('health-report-button');
    expect(button).toHaveClass('health-report-button--red');
  });

  test('defaults to green when no health status provided', () => {
    render(
      <HealthReportButton 
        onOpenHealthReport={mockOnOpenHealthReport}
      />
    );
    
    const button = screen.getByTestId('health-report-button');
    expect(button).toHaveClass('health-report-button--green');
  });

  // Click behavior tests
  test('calls onOpenHealthReport when clicked', () => {
    render(
      <HealthReportButton 
        onOpenHealthReport={mockOnOpenHealthReport}
        healthStatus="green"
      />
    );
    
    const button = screen.getByTestId('health-report-button');
    fireEvent.click(button);
    
    expect(mockOnOpenHealthReport).toHaveBeenCalledTimes(1);
  });

  test('has correct title attribute', () => {
    render(
      <HealthReportButton 
        onOpenHealthReport={mockOnOpenHealthReport}
        healthStatus="green"
      />
    );
    
    const button = screen.getByTestId('health-report-button');
    expect(button).toHaveAttribute('title', 'Open Health Report - System Status Overview');
  });
}); 