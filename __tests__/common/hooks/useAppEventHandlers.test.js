/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useAppEventHandlers } from '../../../src/common/hooks/useAppEventHandlers';

// Mock the logger
jest.mock('../../../src/common/utils/debugUtils.js', () => ({
  loggers: {
    app: {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn()
    }
  }
}));

describe('useAppEventHandlers', () => {
  let mockElectron;
  
  const defaultProps = {
    setVerificationStatuses: jest.fn(),
    initializeVerificationStatuses: jest.fn(() => ({ initialized: true })),
    setGeneralVerificationConfig: jest.fn(),
    setConfigState: jest.fn(),
    setAppIsProjectRunning: jest.fn(),
    setAppNotification: jest.fn(),
    setIsMainTerminalWritable: jest.fn(),
    setIsConfigCollapsed: jest.fn(),
    setShowTestSections: jest.fn(),
    setNoRunMode: jest.fn(),
    triggerGitRefresh: jest.fn(),
    setGlobalDropdownValues: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.electron
    mockElectron = {
      dropdownValueChanged: jest.fn()
    };
    
    Object.defineProperty(window, 'electron', {
      writable: true,
      value: mockElectron
    });
  });

  afterEach(() => {
    delete window.electron;
  });

  test('returns all expected handler functions', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    expect(result.current).toHaveProperty('handleVerificationStatusChange');
    expect(result.current).toHaveProperty('handleToggleTestSections');
    expect(result.current).toHaveProperty('handleToggleNoRunMode');
    expect(result.current).toHaveProperty('handleConfigStateChange');
    expect(result.current).toHaveProperty('handleProjectRunStateChange');
    expect(result.current).toHaveProperty('showAppNotification');
    expect(result.current).toHaveProperty('hideAppNotification');
    expect(result.current).toHaveProperty('handleRefresh');
    expect(result.current).toHaveProperty('toggleMainTerminalWritable');
    expect(result.current).toHaveProperty('toggleConfigCollapse');
    expect(result.current).toHaveProperty('handleGlobalDropdownChange');
    expect(result.current).toHaveProperty('triggerGitRefresh');
  });

  test('handleVerificationStatusChange updates verification statuses', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.handleVerificationStatusChange('testSection', 'VALID');
    });
    
    expect(defaultProps.setVerificationStatuses).toHaveBeenCalledWith(expect.any(Function));
  });

  test('handleToggleTestSections toggles test sections visibility', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.handleToggleTestSections();
    });
    
    expect(defaultProps.setShowTestSections).toHaveBeenCalledWith(expect.any(Function));
  });

  test('handleToggleNoRunMode toggles no-run mode', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.handleToggleNoRunMode();
    });
    
    expect(defaultProps.setNoRunMode).toHaveBeenCalledWith(expect.any(Function));
  });

  test('handleConfigStateChange updates config state', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    const newConfigState = { test: 'config' };
    
    act(() => {
      result.current.handleConfigStateChange(newConfigState);
    });
    
    expect(defaultProps.setConfigState).toHaveBeenCalledWith(newConfigState);
  });

  test('handleProjectRunStateChange updates project running state', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.handleProjectRunStateChange(true);
    });
    
    expect(defaultProps.setAppIsProjectRunning).toHaveBeenCalledWith(true);
  });

  test('showAppNotification shows notification with default values', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.showAppNotification('Test message');
    });
    
    expect(defaultProps.setAppNotification).toHaveBeenCalledWith({
      isVisible: true,
      message: 'Test message',
      type: 'info',
      autoCloseTime: null
    });
  });

  test('showAppNotification shows notification with custom values', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.showAppNotification('Error message', 'error', 5000);
    });
    
    expect(defaultProps.setAppNotification).toHaveBeenCalledWith({
      isVisible: true,
      message: 'Error message',
      type: 'error',
      autoCloseTime: 5000
    });
  });

  test('hideAppNotification hides notification', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.hideAppNotification();
    });
    
    expect(defaultProps.setAppNotification).toHaveBeenCalledWith(expect.any(Function));
  });

  test('handleRefresh resets verification statuses and config', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.handleRefresh();
    });
    
    expect(defaultProps.initializeVerificationStatuses).toHaveBeenCalled();
    expect(defaultProps.setVerificationStatuses).toHaveBeenCalledWith({ initialized: true });
    expect(defaultProps.setGeneralVerificationConfig).toHaveBeenCalledWith([]);
  });

  test('toggleMainTerminalWritable toggles terminal writability', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.toggleMainTerminalWritable();
    });
    
    expect(defaultProps.setIsMainTerminalWritable).toHaveBeenCalledWith(expect.any(Function));
  });

  test('toggleConfigCollapse toggles config collapse state', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.toggleConfigCollapse();
    });
    
    expect(defaultProps.setIsConfigCollapsed).toHaveBeenCalledWith(expect.any(Function));
  });

  test('handleGlobalDropdownChange updates dropdown values and notifies electron', () => {
    // Mock setGlobalDropdownValues to actually call the function passed to it
    defaultProps.setGlobalDropdownValues.mockImplementation((callback) => {
      const currentValues = { existing: 'value' };
      callback(currentValues);
    });
    
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.handleGlobalDropdownChange('test-dropdown', 'test-value');
    });
    
    expect(defaultProps.setGlobalDropdownValues).toHaveBeenCalledWith(expect.any(Function));
    expect(mockElectron.dropdownValueChanged).toHaveBeenCalledWith(
      'test-dropdown',
      'test-value',
      { existing: 'value', 'test-dropdown': 'test-value' }
    );
  });

  test('handleGlobalDropdownChange works without electron API', () => {
    delete window.electron;
    
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    act(() => {
      result.current.handleGlobalDropdownChange('test-dropdown', 'test-value');
    });
    
    expect(defaultProps.setGlobalDropdownValues).toHaveBeenCalledWith(expect.any(Function));
    // Should not throw error when electron API is not available
  });

  test('triggerGitRefresh is passed through from props', () => {
    const { result } = renderHook(() => useAppEventHandlers(defaultProps));
    
    expect(result.current.triggerGitRefresh).toBe(defaultProps.triggerGitRefresh);
  });
}); 