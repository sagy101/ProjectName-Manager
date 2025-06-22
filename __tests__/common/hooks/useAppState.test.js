/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useAppState } from '../../../src/common/hooks/useAppState';
import { STATUS } from '../../../src/environment-verification/constants/verificationConstants';

// Mock the config file
jest.mock('../../../src/project-config/config/configurationSidebarSections.json', () => ({
  settings: {
    projectName: 'Test Project',
    loadingScreenTimeoutSeconds: 10,
    sidebarDefaultExpanded: true,
    configurationDefaultExpanded: false
  },
  sections: [
    { id: 'test-section', name: 'Test Section' },
    { id: 'another-section', name: 'Another Section' },
    { id: 'camel-case-section', name: 'Camel Case Section' }
  ]
}));

describe('useAppState', () => {
  test('initializes with default state values', () => {
    const { result } = renderHook(() => useAppState());
    
    // Check initial state values
    expect(result.current.projectName).toBe('Test Project');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.loadingProgress).toBe(0);
    expect(result.current.loadingStatus).toBe('');
    expect(result.current.loadingTimeoutRemaining).toBe(10);
    expect(result.current.generalVerificationConfig).toEqual([]);
    expect(result.current.generalHeaderConfig).toEqual({});
    expect(result.current.showTestSections).toBe(false);
    expect(result.current.noRunMode).toBe(false);
    expect(result.current.appIsProjectRunning).toBe(false);
    expect(result.current.isMainTerminalWritable).toBe(false);
    expect(result.current.discoveredVersions).toEqual({});
    expect(result.current.isConfigCollapsed).toBe(true); // !configurationDefaultExpanded
    expect(result.current.isHealthReportVisible).toBe(false);
    expect(result.current.pendingFixVerification).toBe(null);
    expect(result.current.globalDropdownValues).toEqual({});
    expect(result.current.floatingTerminals).toEqual([]);
    expect(result.current.activeFloatingTerminalId).toBe(null);
    expect(result.current.isFloatingSidebarExpanded).toBe(true);
    expect(result.current.showImportStatusScreen).toBe(false);
    expect(result.current.importGitBranches).toEqual({});
    expect(result.current.importResult).toBe(null);
    expect(result.current.isPerformingImport).toBe(false);
    expect(result.current.nextZIndex).toBe(1001);
    expect(result.current.positionOffset).toBe(30);
  });

  test('initializes appNotification with default values', () => {
    const { result } = renderHook(() => useAppState());
    
    expect(result.current.appNotification).toEqual({
      isVisible: false,
      message: '',
      type: 'info',
      autoCloseTime: 3000
    });
  });

  test('initializes infoPanelState with default values', () => {
    const { result } = renderHook(() => useAppState());
    
    expect(result.current.infoPanelState).toEqual({
      isVisible: false,
      terminalData: null,
      position: { x: 0, y: 0 },
      detailsOpen: false
    });
  });

  test('initializes verification statuses from config sections', () => {
    const { result } = renderHook(() => useAppState());
    
    expect(result.current.verificationStatuses).toEqual({
      general: {},
      testSection: { testSection: STATUS.WAITING, gitBranch: STATUS.WAITING },
      anotherSection: { anotherSection: STATUS.WAITING, gitBranch: STATUS.WAITING },
      camelCaseSection: { camelCaseSection: STATUS.WAITING, gitBranch: STATUS.WAITING }
    });
  });

  test('provides all state setters', () => {
    const { result } = renderHook(() => useAppState());
    
    expect(typeof result.current.setProjectName).toBe('function');
    expect(typeof result.current.setIsLoading).toBe('function');
    expect(typeof result.current.setLoadingProgress).toBe('function');
    expect(typeof result.current.setLoadingStatus).toBe('function');
    expect(typeof result.current.setLoadingTimeoutRemaining).toBe('function');
    expect(typeof result.current.setGeneralVerificationConfig).toBe('function');
    expect(typeof result.current.setGeneralHeaderConfig).toBe('function');
    expect(typeof result.current.setShowTestSections).toBe('function');
    expect(typeof result.current.setNoRunMode).toBe('function');
    expect(typeof result.current.setAppIsProjectRunning).toBe('function');
    expect(typeof result.current.setAppNotification).toBe('function');
    expect(typeof result.current.setConfigState).toBe('function');
    expect(typeof result.current.setFloatingTerminals).toBe('function');
    expect(typeof result.current.setActiveFloatingTerminalId).toBe('function');
    expect(typeof result.current.setInfoPanelState).toBe('function');
    expect(typeof result.current.setIsFloatingSidebarExpanded).toBe('function');
    expect(typeof result.current.setShowImportStatusScreen).toBe('function');
    expect(typeof result.current.setImportGitBranches).toBe('function');
    expect(typeof result.current.setImportResult).toBe('function');
    expect(typeof result.current.setIsPerformingImport).toBe('function');
    expect(typeof result.current.setNextZIndex).toBe('function');
    expect(typeof result.current.setIsMainTerminalWritable).toBe('function');
    expect(typeof result.current.setDiscoveredVersions).toBe('function');
    expect(typeof result.current.setIsConfigCollapsed).toBe('function');
    expect(typeof result.current.setIsHealthReportVisible).toBe('function');
    expect(typeof result.current.setPendingFixVerification).toBe('function');
    expect(typeof result.current.setVerificationStatuses).toBe('function');
    expect(typeof result.current.setGlobalDropdownValues).toBe('function');
  });

  test('provides utility functions', () => {
    const { result } = renderHook(() => useAppState());
    
    expect(typeof result.current.initializeVerificationStatuses).toBe('function');
    expect(Array.isArray(result.current.configSidebarSections)).toBe(true);
    expect(result.current.settings).toBeDefined();
  });

  test('provides refs', () => {
    const { result } = renderHook(() => useAppState());
    
    expect(result.current.terminalRef).toBeDefined();
    expect(result.current.projectConfigRef).toBeDefined();
    expect(result.current.lastPosition).toBeDefined();
    expect(result.current.lastPosition.current).toEqual({ x: 50, y: 50 });
  });

  test('state setters work correctly', () => {
    const { result } = renderHook(() => useAppState());
    
    // Test a few key setters
    act(() => {
      result.current.setProjectName('Updated Project');
    });
    expect(result.current.projectName).toBe('Updated Project');
    
    act(() => {
      result.current.setIsLoading(false);
    });
    expect(result.current.isLoading).toBe(false);
    
    act(() => {
      result.current.setLoadingProgress(50);
    });
    expect(result.current.loadingProgress).toBe(50);
    
    act(() => {
      result.current.setShowTestSections(true);
    });
    expect(result.current.showTestSections).toBe(true);
    
    act(() => {
      result.current.setNoRunMode(true);
    });
    expect(result.current.noRunMode).toBe(true);
  });

  test('initializeVerificationStatuses function creates fresh statuses', () => {
    const { result } = renderHook(() => useAppState());
    
    const initializedStatuses = result.current.initializeVerificationStatuses();
    
    expect(initializedStatuses).toEqual({
      general: {},
      testSection: { testSection: STATUS.WAITING, gitBranch: STATUS.WAITING },
      anotherSection: { anotherSection: STATUS.WAITING, gitBranch: STATUS.WAITING },
      camelCaseSection: { camelCaseSection: STATUS.WAITING, gitBranch: STATUS.WAITING }
    });
    
    // Should be a new object each time
    const secondCall = result.current.initializeVerificationStatuses();
    expect(secondCall).not.toBe(initializedStatuses);
    expect(secondCall).toEqual(initializedStatuses);
  });

  test('complex state updates work correctly', () => {
    const { result } = renderHook(() => useAppState());
    
    const newAppNotification = {
      isVisible: true,
      message: 'Test notification',
      type: 'success',
      autoCloseTime: 5000
    };
    
    act(() => {
      result.current.setAppNotification(newAppNotification);
    });
    
    expect(result.current.appNotification).toEqual(newAppNotification);
    
    const newInfoPanelState = {
      isVisible: true,
      terminalData: { id: 'test', name: 'Test Terminal' },
      position: { x: 100, y: 200 },
      detailsOpen: true
    };
    
    act(() => {
      result.current.setInfoPanelState(newInfoPanelState);
    });
    
    expect(result.current.infoPanelState).toEqual(newInfoPanelState);
  });

  test('verification statuses can be updated', () => {
    const { result } = renderHook(() => useAppState());
    
    const newVerificationStatuses = {
      general: { someTest: STATUS.VALID },
      testSection: { testSection: STATUS.VALID, gitBranch: STATUS.VALID }
    };
    
    act(() => {
      result.current.setVerificationStatuses(newVerificationStatuses);
    });
    
    expect(result.current.verificationStatuses).toEqual(newVerificationStatuses);
  });
}); 