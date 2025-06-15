import { renderHook, act } from '@testing-library/react';
import useHealthReport from '../src/hooks/useHealthReport';

describe('useHealthReport', () => {
  const mockSetIsHealthReportVisible = jest.fn();
  const mockOnFocusTerminal = jest.fn();
  const mockOnRefreshTerminal = jest.fn();

  beforeEach(() => {
    mockSetIsHealthReportVisible.mockClear();
    mockOnFocusTerminal.mockClear();
    mockOnRefreshTerminal.mockClear();
  });

  const defaultProps = {
    terminals: [],
    isHealthReportVisible: false,
    setIsHealthReportVisible: mockSetIsHealthReportVisible,
    onFocusTerminal: mockOnFocusTerminal,
    onRefreshTerminal: mockOnRefreshTerminal
  };

  // Health status calculation tests
  test('returns green status when no terminals', () => {
    const { result } = renderHook(() => useHealthReport(defaultProps));
    
    expect(result.current.healthStatus).toBe('green');
  });

  test('returns green status when all terminals are healthy', () => {
    const healthyTerminals = [
      { id: 1, title: 'Terminal 1', status: 'running' },
      { id: 2, title: 'Terminal 2', status: 'done' },
    ];

    const { result } = renderHook(() => useHealthReport({
      ...defaultProps,
      terminals: healthyTerminals
    }));
    
    expect(result.current.healthStatus).toBe('green');
  });

  test('returns blue status when any terminal is sleeping/waiting', () => {
    const warningTerminals = [
      { id: 1, title: 'Terminal 1', status: 'running' },
      { id: 2, title: 'Terminal 2', status: 'sleeping' },
    ];

    const { result } = renderHook(() => useHealthReport({
      ...defaultProps,
      terminals: warningTerminals
    }));
    
    expect(result.current.healthStatus).toBe('blue');
  });

  test('returns red status when any terminal has error', () => {
    const errorTerminals = [
      { id: 1, title: 'Terminal 1', status: 'running' },
      { id: 2, title: 'Terminal 2', status: 'error' },
    ];

    const { result } = renderHook(() => useHealthReport({
      ...defaultProps,
      terminals: errorTerminals
    }));
    
    expect(result.current.healthStatus).toBe('red');
  });

  test('prioritizes red over blue status', () => {
    const mixedTerminals = [
      { id: 1, title: 'Terminal 1', status: 'sleeping' },
      { id: 2, title: 'Terminal 2', status: 'error' },
    ];

    const { result } = renderHook(() => useHealthReport({
      ...defaultProps,
      terminals: mixedTerminals
    }));
    
    expect(result.current.healthStatus).toBe('red');
  });

  // Action handler tests
  test('handleOpenHealthReport calls setIsHealthReportVisible with true', () => {
    const { result } = renderHook(() => useHealthReport(defaultProps));
    
    act(() => {
      result.current.handleOpenHealthReport();
    });
    
    expect(mockSetIsHealthReportVisible).toHaveBeenCalledWith(true);
  });

  test('handleCloseHealthReport calls setIsHealthReportVisible with false', () => {
    const { result } = renderHook(() => useHealthReport(defaultProps));
    
    act(() => {
      result.current.handleCloseHealthReport();
    });
    
    expect(mockSetIsHealthReportVisible).toHaveBeenCalledWith(false);
  });

  test('handleFocusTerminal calls onFocusTerminal with terminalId', () => {
    const { result } = renderHook(() => useHealthReport(defaultProps));
    
    act(() => {
      result.current.handleFocusTerminal('test-terminal-id');
    });
    
    expect(mockOnFocusTerminal).toHaveBeenCalledWith('test-terminal-id');
  });

  test('handleRefreshTerminal calls onRefreshTerminal with terminalId', () => {
    const { result } = renderHook(() => useHealthReport(defaultProps));
    
    act(() => {
      result.current.handleRefreshTerminal('test-terminal-id');
    });
    
    expect(mockOnRefreshTerminal).toHaveBeenCalledWith('test-terminal-id');
  });

  test('handles missing callback functions gracefully', () => {
    const propsWithoutCallbacks = {
      terminals: [],
      isHealthReportVisible: false,
      setIsHealthReportVisible: mockSetIsHealthReportVisible,
      onFocusTerminal: null,
      onRefreshTerminal: undefined
    };

    const { result } = renderHook(() => useHealthReport(propsWithoutCallbacks));
    
    // Should not throw errors
    expect(() => {
      act(() => {
        result.current.handleFocusTerminal('test-id');
        result.current.handleRefreshTerminal('test-id');
      });
    }).not.toThrow();
  });

  // Data tests
  test('returns correct mainTerminals data', () => {
    const terminals = [
      { id: 1, title: 'Terminal 1', status: 'running' },
      { id: 2, title: 'Terminal 2', status: 'sleeping' },
    ];

    const { result } = renderHook(() => useHealthReport({
      ...defaultProps,
      terminals
    }));
    
    expect(result.current.mainTerminals).toEqual(terminals);
  });

  test('returns correct isHealthReportVisible state', () => {
    const { result } = renderHook(() => useHealthReport({
      ...defaultProps,
      isHealthReportVisible: true
    }));
    
    expect(result.current.isHealthReportVisible).toBe(true);
  });
}); 