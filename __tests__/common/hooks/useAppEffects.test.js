/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useAppEffects } from '../../../src/common/hooks/useAppEffects';

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

describe('useAppEffects', () => {
  let mockElectron;
  
  const defaultProps = {
    projectName: 'Test Project',
    isLoading: false,
    verificationStatuses: {},
    setVerificationStatuses: jest.fn(),
    setGeneralVerificationConfig: jest.fn(),
    setGeneralHeaderConfig: jest.fn(),
    setDiscoveredVersions: jest.fn(),
    setLoadingStatus: jest.fn(),
    setLoadingProgress: jest.fn(),
    setLoadingTimeoutRemaining: jest.fn(),
    setIsLoading: jest.fn(),
    setAppNotification: jest.fn(),
    terminalRef: { current: null },
    showAppNotification: jest.fn(),
    settings: { loadingScreenTimeoutSeconds: 5 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock window.electron
    mockElectron = {
      onEnvironmentVerificationComplete: jest.fn(() => jest.fn()),
      onVerificationProgress: jest.fn(() => jest.fn()),
      onStopAllContainersBeforeQuit: jest.fn(() => jest.fn()),
      onStopAllContainersBeforeReload: jest.fn(() => jest.fn()),
      onDropdownCommandExecuted: jest.fn(() => jest.fn()),
      onDropdownCached: jest.fn(() => jest.fn()),
      refreshGitStatuses: jest.fn(),
      getEnvironmentVerification: jest.fn(),
      precacheGlobalDropdowns: jest.fn()
    };
    
    Object.defineProperty(window, 'electron', {
      writable: true,
      value: mockElectron
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.electron;
  });

  test('updates document title with project name', () => {
    renderHook(() => useAppEffects(defaultProps));
    
    expect(document.title).toBe('Test Project Manager');
  });

  test('updates document title when project name changes', () => {
    const { rerender } = renderHook(
      (props) => useAppEffects(props),
      { initialProps: defaultProps }
    );
    
    expect(document.title).toBe('Test Project Manager');
    
    rerender({ ...defaultProps, projectName: 'Updated Project' });
    expect(document.title).toBe('Updated Project Manager');
  });

  test('returns triggerGitRefresh function', () => {
    const { result } = renderHook(() => useAppEffects(defaultProps));
    
    expect(result.current).toHaveProperty('triggerGitRefresh');
    expect(typeof result.current.triggerGitRefresh).toBe('function');
  });

  test('sets up electron event listeners when window.electron exists', () => {
    renderHook(() => useAppEffects(defaultProps));
    
    expect(mockElectron.onEnvironmentVerificationComplete).toHaveBeenCalled();
    expect(mockElectron.onVerificationProgress).toHaveBeenCalled();
    expect(mockElectron.onStopAllContainersBeforeQuit).toHaveBeenCalled();
    expect(mockElectron.onStopAllContainersBeforeReload).toHaveBeenCalled();
    expect(mockElectron.onDropdownCommandExecuted).toHaveBeenCalled();
  });

  test('does not set up listeners when window.electron is undefined', () => {
    delete window.electron;
    
    renderHook(() => useAppEffects(defaultProps));
    
    // Should not throw any errors
    expect(true).toBe(true);
  });

  test('triggerGitRefresh calls electron API when available', async () => {
    mockElectron.refreshGitStatuses.mockResolvedValue({
      'test-section': { gitBranch: 'main' }
    });
    
    const { result } = renderHook(() => useAppEffects(defaultProps));
    
    await act(async () => {
      await result.current.triggerGitRefresh();
    });
    
    expect(mockElectron.refreshGitStatuses).toHaveBeenCalled();
    expect(defaultProps.setVerificationStatuses).toHaveBeenCalled();
  });

  test('triggerGitRefresh handles electron API errors gracefully', async () => {
    mockElectron.refreshGitStatuses.mockRejectedValue(new Error('Git error'));
    
    const { result } = renderHook(() => useAppEffects(defaultProps));
    
    await act(async () => {
      await result.current.triggerGitRefresh();
    });
    
    expect(defaultProps.showAppNotification).toHaveBeenCalledWith(
      'Failed to refresh Git statuses',
      'error'
    );
  });

  test('handles loading state initialization', () => {
    mockElectron.getEnvironmentVerification.mockResolvedValue({
      general: { config: [], header: {}, statuses: {} }
    });
    mockElectron.precacheGlobalDropdowns.mockResolvedValue();
    
    renderHook(() => useAppEffects({
      ...defaultProps,
      isLoading: true
    }));
    
    expect(defaultProps.setLoadingProgress).toHaveBeenCalledWith(5);
    expect(defaultProps.setLoadingStatus).toHaveBeenCalledWith('Starting application...');
    expect(defaultProps.setLoadingTimeoutRemaining).toHaveBeenCalledWith(5);
  });

  test('handles environment verification complete event', () => {
    let eventCallback;
    mockElectron.onEnvironmentVerificationComplete.mockImplementation((callback) => {
      eventCallback = callback;
      return jest.fn();
    });
    
    renderHook(() => useAppEffects(defaultProps));
    
    const testResults = {
      general: {
        config: [{ id: 'test' }],
        header: { title: 'Test' },
        statuses: { test: 'VALID' }
      },
      'test-section': { status: 'VALID' },
      discoveredVersions: { node: '18.0.0' }
    };
    
    act(() => {
      eventCallback(testResults);
    });
    
    expect(defaultProps.setGeneralVerificationConfig).toHaveBeenCalledWith([{ id: 'test' }]);
    expect(defaultProps.setGeneralHeaderConfig).toHaveBeenCalledWith({ title: 'Test' });
    expect(defaultProps.setDiscoveredVersions).toHaveBeenCalledWith({ node: '18.0.0' });
    expect(defaultProps.setVerificationStatuses).toHaveBeenCalled();
  });

  test('handles verification progress events', () => {
    let progressCallback;
    mockElectron.onVerificationProgress.mockImplementation((callback) => {
      progressCallback = callback;
      return jest.fn();
    });
    
    renderHook(() => useAppEffects({
      ...defaultProps,
      isLoading: true
    }));
    
    act(() => {
      progressCallback({ completed: 5, total: 10, percentage: 50 });
    });
    
    expect(defaultProps.setLoadingStatus).toHaveBeenCalledWith('Verifying environment... 35%');
  });

  test('handles dropdown command execution events with success', () => {
    let dropdownCallback;
    mockElectron.onDropdownCommandExecuted.mockImplementation((callback) => {
      dropdownCallback = callback;
      return jest.fn();
    });
    
    renderHook(() => useAppEffects(defaultProps));
    
    const successData = {
      dropdownId: 'test-dropdown',
      value: 'test-value',
      result: { success: true, stdout: 'Success!' }
    };
    
    act(() => {
      dropdownCallback(successData);
    });
    
    expect(defaultProps.showAppNotification).toHaveBeenCalledWith(
      'test-dropdown updated to "test-value": Success!',
      'success',
      4000
    );
  });

  test('handles dropdown command execution events with failure', () => {
    let dropdownCallback;
    mockElectron.onDropdownCommandExecuted.mockImplementation((callback) => {
      dropdownCallback = callback;
      return jest.fn();
    });
    
    renderHook(() => useAppEffects(defaultProps));
    
    const failureData = {
      dropdownId: 'test-dropdown',
      value: 'test-value',
      result: { success: false, error: 'Command failed' }
    };
    
    act(() => {
      dropdownCallback(failureData);
    });
    
    expect(defaultProps.showAppNotification).toHaveBeenCalledWith(
      'Failed to update test-dropdown: Command failed',
      'error',
      6000
    );
  });

  test('handles container stop events for quit', () => {
    let quitCallback;
    mockElectron.onStopAllContainersBeforeQuit.mockImplementation((callback) => {
      quitCallback = callback;
      return jest.fn();
    });
    
    const mockTerminal = { stopAllContainers: jest.fn() };
    const terminalRef = { current: mockTerminal };
    
    renderHook(() => useAppEffects({
      ...defaultProps,
      terminalRef
    }));
    
    act(() => {
      quitCallback();
    });
    
    expect(mockTerminal.stopAllContainers).toHaveBeenCalled();
  });

  test('handles container stop events for reload', () => {
    let reloadCallback;
    mockElectron.onStopAllContainersBeforeReload.mockImplementation((callback) => {
      reloadCallback = callback;
      return jest.fn();
    });
    
    const mockTerminal = { stopAllContainers: jest.fn() };
    const terminalRef = { current: mockTerminal };
    
    renderHook(() => useAppEffects({
      ...defaultProps,
      terminalRef
    }));
    
    act(() => {
      reloadCallback();
    });
    
    expect(mockTerminal.stopAllContainers).toHaveBeenCalled();
  });

  test('handles loading timeout', async () => {
    mockElectron.getEnvironmentVerification.mockResolvedValue({});
    mockElectron.precacheGlobalDropdowns.mockResolvedValue();
    
    renderHook(() => useAppEffects({
      ...defaultProps,
      isLoading: true,
      settings: { loadingScreenTimeoutSeconds: 1 }
    }));
    
    act(() => {
      jest.advanceTimersByTime(1100); // Advance past timeout
    });
    
    expect(defaultProps.setIsLoading).toHaveBeenCalledWith(false);
    expect(defaultProps.showAppNotification).toHaveBeenCalledWith(
      'Initialization timed out',
      'error',
      6000
    );
  });

  test('triggerGitRefresh does nothing when electron API is not available', async () => {
    delete window.electron;
    
    const { result } = renderHook(() => useAppEffects(defaultProps));
    
    await act(async () => {
      await result.current.triggerGitRefresh();
    });
    
    // Should not call showAppNotification (error handling not triggered)
    expect(defaultProps.showAppNotification).not.toHaveBeenCalled();
  });
}); 