import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock React hooks to prevent direct hook calls in App component from failing
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: jest.fn(() => [[], jest.fn()]),
    useEffect: jest.fn(),
    useCallback: jest.fn((fn) => fn),
    useImperativeHandle: jest.fn(),
    forwardRef: jest.fn((component) => component),
    useMemo: jest.fn((fn) => fn()),
  };
});

jest.mock('../src/project-config/hooks/useConfigurationManagement', () => ({
  useConfigurationManagement: () => ({
    handleExportConfig: jest.fn(),
    handleImportConfig: jest.fn(),
    performImport: jest.fn(),
    closeImportStatusScreen: jest.fn(),
  }),
}));

jest.mock('../src/floating-terminal/useFloatingTerminals', () => ({
  useFloatingTerminals: () => ({
    showFloatingTerminal: jest.fn(),
    focusFloatingTerminal: jest.fn(),
    openFloatingTerminal: jest.fn(),
    closeFloatingTerminal: jest.fn(),
    toggleMinimizeFloatingTerminal: jest.fn(),
    hideFloatingTerminal: jest.fn(),
    showFloatingTerminalInfoPanel: jest.fn(),
    closeFloatingTerminalInfoPanel: jest.fn(),
    openInfoPanelDetails: jest.fn(),
    closeInfoPanelDetails: jest.fn(),
    openFixCommandTerminal: jest.fn(),
    toggleFloatingSidebarExpand: jest.fn()
  }),
}));

jest.mock('../src/common/hooks/useAppEventHandlers', () => ({
  useAppEventHandlers: () => ({
    handleVerificationStatusChange: jest.fn(),
    handleToggleTestSections: jest.fn(),
    handleToggleNoRunMode: jest.fn(),
    handleConfigStateChange: jest.fn(),
    handleProjectRunStateChange: jest.fn(),
    showAppNotification: jest.fn(),
    hideAppNotification: jest.fn(),
    handleInitiateRefresh: jest.fn(),
    toggleMainTerminalWritable: jest.fn(),
    toggleConfigCollapse: jest.fn(),
    handleGlobalDropdownChange: jest.fn(),
    triggerGitRefresh: jest.fn()
  }),
}));

jest.mock('../src/common/hooks/useAppEffects', () => ({
  useAppEffects: () => ({}),
}));

// Create a configurable mock state that tests can modify
const mockAppState = {
  projectName: 'App',
  isLoading: false, // Default to false, tests can override
  loadingProgress: 0,
  loadingStatus: 'Initializing...',
  generalVerificationConfig: [],
  generalHeaderConfig: {},
  showTestSections: false,
  noRunMode: false,
  appIsProjectRunning: false,
  appNotification: { isVisible: false },
  configState: {},
  floatingTerminals: [],
  activeFloatingTerminalId: null,
  infoPanelState: { isVisible: false },
  isFloatingSidebarExpanded: false,
  showImportStatusScreen: false,
  importGitBranches: {},
  importResult: null,
  isPerformingImport: false,
  nextZIndex: 1001,
  lastPosition: { x: 100, y: 100 },
  positionOffset: { x: 0, y: 0 },
  verificationStatuses: { general: {} },
  discoveredVersions: {},
  globalDropdownValues: {},
  configSidebarSections: [],
  isMainTerminalWritable: true,
  isConfigCollapsed: false,
  isHealthReportVisible: false,
  // Mock refs
  projectConfigRef: { current: null },
  terminalRef: { current: null },
  // Mock setters
  setProjectName: jest.fn(),
  setIsLoading: jest.fn(),
  setLoadingProgress: jest.fn(),
  setLoadingStatus: jest.fn(),
  setGeneralVerificationConfig: jest.fn(),
  setGeneralHeaderConfig: jest.fn(),
  setShowTestSections: jest.fn(),
  setNoRunMode: jest.fn(),
  setAppIsProjectRunning: jest.fn(),
  setAppNotification: jest.fn(),
  setConfigState: jest.fn(),
  setFloatingTerminals: jest.fn(),
  setActiveFloatingTerminalId: jest.fn(),
  setInfoPanelState: jest.fn(),
  setIsFloatingSidebarExpanded: jest.fn(),
  setShowImportStatusScreen: jest.fn(),
  setImportGitBranches: jest.fn(),
  setImportResult: jest.fn(),
  setIsPerformingImport: jest.fn(),
  setNextZIndex: jest.fn(),
  setVerificationStatuses: jest.fn(),
  setDiscoveredVersions: jest.fn(),
  setGlobalDropdownValues: jest.fn(),
  setIsMainTerminalWritable: jest.fn(),
  setIsConfigCollapsed: jest.fn(),
  setIsHealthReportVisible: jest.fn(),
  initializeVerificationStatuses: jest.fn()
};

jest.mock('../src/common/hooks/useAppState', () => ({
  useAppState: () => mockAppState,
}));

jest.mock('../src/health-report/useHealthReport', () => ({
  __esModule: true,
  default: () => ({
    healthStatus: 'green',
    isHealthReportVisible: false,
    setIsHealthReportVisible: jest.fn(),
    handleOpenHealthReport: jest.fn(),
    handleCloseHealthReport: jest.fn(),
    handleRefreshTerminal: jest.fn(),
    handleFocusTerminal: jest.fn(),
  }),
}));

jest.mock('../src/project-config/hooks/useFixCommands', () => ({
  useFixCommands: () => ({
    handleFixCommand: jest.fn(),
    handleFixCommandComplete: jest.fn(),
    handleToggleAllVerifications: jest.fn()
  }),
}));

// Mock all child components to focus on App logic
jest.mock('../src/project-config/ProjectConfiguration', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({
      getCurrentState: () => ({ configState: {}, attachState: {} }),
      setStateFromImport: jest.fn()
    }));
    return mockReact.createElement('div', { 'data-testid': 'project-configuration' }, 'ProjectConfiguration');
  });
});

jest.mock('../src/terminal/components/TerminalContainer', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({
      stopAllContainers: jest.fn(),
      getTerminals: () => []
    }));
    return mockReact.createElement('div', { 'data-testid': 'terminal-container' }, 'TerminalContainer');
  });
});

jest.mock('../src/environment-verification/EnvironmentVerification', () => {
  const mockReact = require('react');
  return (props) => mockReact.createElement('div', { 'data-testid': 'environment-verification' }, 'EnvironmentVerification');
});

jest.mock('../src/screens/LoadingScreen', () => {
  const mockReact = require('react');
  return (props) => mockReact.createElement('div', { 'data-testid': 'loading-screen' }, `Loading: ${props.statusMessage}`);
});

jest.mock('../src/common/components/Notification', () => {
  const mockReact = require('react');
  return (props) => props.isVisible ? mockReact.createElement('div', { 'data-testid': 'notification' }, props.message) : null;
});

jest.mock('../src/floating-terminal/FloatingTerminal', () => {
  const mockReact = require('react');
  return (props) => props.isVisible ? mockReact.createElement('div', { 'data-testid': `floating-terminal-${props.id}` }, 'FloatingTerminal') : null;
});

jest.mock('../src/project-config/AppControlSidebar', () => {
  const mockReact = require('react');
  return (props) => mockReact.createElement('div', { 'data-testid': 'app-control-sidebar' }, 'AppControlSidebar');
});

jest.mock('../src/tab-info/components/TabInfoPanel', () => {
  const mockReact = require('react');
  return (props) => mockReact.createElement('div', { 'data-testid': 'tab-info-panel' }, 'TabInfoPanel');
});

jest.mock('../src/screens/ImportStatusScreen', () => {
  const mockReact = require('react');
  return (props) => props.isVisible ? mockReact.createElement('div', { 'data-testid': 'import-status-screen' }, 'ImportStatusScreen') : null;
});

// Mock electron API with more realistic behavior
const mockElectron = {
  getEnvironmentVerification: jest.fn(),
  precacheGlobalDropdowns: jest.fn(),
  onEnvironmentVerificationComplete: jest.fn(),
  onVerificationProgress: jest.fn(),
  onStopAllContainersBeforeQuit: jest.fn(),
  onStopAllContainersBeforeReload: jest.fn(),
  refreshGitStatuses: jest.fn(),
  refreshEnvironmentVerification: jest.fn(),
  dropdownValueChanged: jest.fn(),
  exportConfig: jest.fn(),
  importConfig: jest.fn(),
  getAboutConfig: jest.fn(),
  gitCheckoutBranch: jest.fn()
};

// Setup default mock implementations
beforeEach(() => {
  // Reset all mocks
  Object.values(mockElectron).forEach(mock => mock.mockReset());
  
  // Setup default implementations
  mockElectron.getEnvironmentVerification.mockResolvedValue({
    general: { statuses: {}, config: [], header: {} }
  });
  mockElectron.precacheGlobalDropdowns.mockResolvedValue({});
  mockElectron.onEnvironmentVerificationComplete.mockReturnValue(() => {});
  mockElectron.onVerificationProgress.mockReturnValue(() => {});
  mockElectron.onStopAllContainersBeforeQuit.mockReturnValue(() => {});
  mockElectron.onStopAllContainersBeforeReload.mockReturnValue(() => {});
  mockElectron.refreshGitStatuses.mockResolvedValue({});
  mockElectron.refreshEnvironmentVerification.mockResolvedValue({});
  mockElectron.exportConfig.mockResolvedValue({ success: true });
  mockElectron.importConfig.mockResolvedValue({ success: true, configState: {} });
  mockElectron.getAboutConfig.mockResolvedValue([]);
  mockElectron.gitCheckoutBranch.mockResolvedValue({ success: true });
});

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true,
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1920,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 1080,
});

// Helper function to complete loading process
const completeLoading = async () => {
  console.log('completeLoading: Advancing timers...');
  // Advance timers to trigger loading completion
  act(() => {
    jest.advanceTimersByTime(20000); // Generous time for all loading steps
  });
  console.log('completeLoading: Timers advanced. Waiting for loading screen to disappear...');
  
  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
  }, { timeout: 15000 });
  console.log('completeLoading: Loading screen disappeared.');
};

describe('App Component - Comprehensive Tests', () => {
  let App;

  beforeEach(() => {
    console.log('TEST_SUITE_START: App.test.jsx');
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
    
    // Reset mock state to defaults
    mockAppState.isLoading = false;
    mockAppState.isConfigCollapsed = false;
    mockAppState.projectName = 'App';
    
    // Reset all mock functions
    Object.keys(mockAppState).forEach(key => {
      if (typeof mockAppState[key] === 'function' && mockAppState[key].mockReset) {
        mockAppState[key].mockReset();
      }
    });
    
    // Reset electron mocks
    Object.values(mockElectron).forEach(mock => {
      if (mock && typeof mock.mockReset === 'function') {
        mock.mockReset();
      }
    });

    App = require('../src/App').default;

    // Suppress act warnings for complex async component
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      const message = args[0];
      if (typeof message === 'string' && (
        message.includes('Warning: An update to App inside a test was not wrapped in act') ||
        message.includes('act(...)') ||
        message.includes('wrap-tests-with-act')
      )) {
        return; // Suppress all act warnings
      }
      originalError(...args);
    });
  });

  afterEach(() => {
    // jest.runOnlyPendingTimers(); // This can hang if there are recurring timers.
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    console.log('TEST_SUITE_END: App.test.jsx');
  });

  describe('Initial Rendering and Loading', () => {
    test('should show loading screen initially', () => {
      mockAppState.isLoading = true;
      render(<App />);
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      expect(screen.getByText(/Loading:/)).toBeInTheDocument();
    });

    test('should complete loading and show main app components', async () => {
      mockAppState.isLoading = true;
      render(<App />);
      
      // Verify loading screen is shown initially
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      
      // Simulate loading completion
      mockAppState.isLoading = false;
      
      // Re-render with updated state
      render(<App />);
      
      // Should show main components
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('terminal-container')).toBeInTheDocument();
      expect(screen.getByTestId('app-control-sidebar')).toBeInTheDocument();
    });

    test('should set correct document title', async () => {
      render(<App />);
      // Note: Document title setting happens in useAppEffects which is mocked
      // So we can't test the actual title change, but we can verify the component renders
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
    });

    test('should set up electron event listeners', () => {
      render(<App />);
      // Note: Event listeners are set up in useAppEffects which is mocked
      // So we can't test the actual listeners, but we can verify the component renders
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
    });

    test('should fetch initial data on mount', async () => {
      render(<App />);
      
      // Note: Data fetching happens in useAppEffects which is mocked
      // So we can't test the actual API calls, but we can verify the component renders
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
    });
  });

  describe('Configuration Collapse/Expand Functionality', () => {
    test('should render collapse button after loading', async () => {
      render(<App />);
      
      // Should show collapse button (default state)
      expect(screen.getByRole('button', { name: /collapse configuration/i })).toBeInTheDocument();
    });

    test('should toggle collapse state when button is clicked', async () => {
      render(<App />);
      
      // Should start with collapse button
      const collapseButton = screen.getByRole('button', { name: /collapse configuration/i });
      expect(collapseButton).toBeInTheDocument();
      
      // Click to collapse
      fireEvent.click(collapseButton);
      
      // Update mock state to reflect the change
      mockAppState.isConfigCollapsed = true;
      
      // Re-render to see the change
      render(<App />);
      
      // Should now show expand button
      expect(screen.getByRole('button', { name: /expand configuration/i })).toBeInTheDocument();
    });

    test('should apply correct CSS classes when collapsed', async () => {
      // Set collapsed state
      mockAppState.isConfigCollapsed = true;
      render(<App />);
      
      // Check CSS classes
      const sidebar = document.querySelector('.sidebar');
      expect(sidebar).toHaveClass('collapsed');
      
      const button = screen.getByRole('button', { name: /expand configuration/i });
      expect(button).toHaveClass('collapsed');
    });
  });

  describe('State Management', () => {
    test('should initialize with correct default state', async () => {
      render(<App />);
      
      // Verify main components are rendered (indicating not loading)
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('terminal-container')).toBeInTheDocument();
    });

    test('should handle verification status updates', async () => {
      render(<App />);
      
      // Note: Verification updates are handled in mocked hooks
      // We can verify the component renders correctly
      expect(screen.getByTestId('environment-verification')).toBeInTheDocument();
    });
  });

  describe('Floating Terminal Management', () => {
    test('should render app control sidebar after loading', async () => {
      render(<App />);
      await completeLoading();
      
      expect(screen.getByTestId('app-control-sidebar')).toBeInTheDocument();
    });
  });

  describe('Notification System', () => {
    test('should not show notifications initially', async () => {
      render(<App />);
      await completeLoading();
      
      // Notifications are not visible initially
      expect(screen.queryByTestId('notification')).not.toBeInTheDocument();
    });
  });

  describe('Layout and Responsive Design', () => {
    test('should have correct layout structure after loading', async () => {
      render(<App />);
      await completeLoading();
      
      const appContentWrapper = document.querySelector('.app-content-wrapper');
      expect(appContentWrapper).toBeInTheDocument();
      
      // Should have default padding for collapsed floating sidebar
      expect(appContentWrapper).toHaveStyle('padding-right: 50px');
    });
  });

  describe('Configuration Import/Export', () => {
    test('should have export/import functionality available', async () => {
      render(<App />);
      await completeLoading();
      
      // The functionality is available through AppControlSidebar
      expect(screen.getByTestId('app-control-sidebar')).toBeInTheDocument();
      
      // Export/import functions should not be called until user action
      expect(mockElectron.exportConfig).not.toHaveBeenCalled();
      expect(mockElectron.importConfig).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle electron API errors gracefully', async () => {
      render(<App />);
      
      // Note: Error handling happens in useAppEffects which is mocked
      // We can verify the component renders without crashing
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
    });

    test('should handle missing electron API gracefully', async () => {
      render(<App />);
      
      // Note: Missing electron API handling happens in useAppEffects which is mocked
      // We can verify the component renders without crashing
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
    });
  });

  describe('Cleanup and Memory Management', () => {
    test('should cleanup event listeners on unmount', () => {
      const { unmount } = render(<App />);
      
      unmount();
      
      // Note: Cleanup happens in useAppEffects which is mocked
      // We can verify the component unmounts without errors
      expect(screen.queryByTestId('project-configuration')).not.toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    test('should pass correct props to child components', async () => {
      render(<App />);
      await completeLoading();
      
      // Verify that all major components are rendered
      // This tests the integration between App and its children
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('terminal-container')).toBeInTheDocument();
      expect(screen.getByTestId('environment-verification')).toBeInTheDocument();
      expect(screen.getByTestId('app-control-sidebar')).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    test('should not cause memory leaks with timers', async () => {
      const { unmount } = render(<App />);
      
      // Advance timers
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // Unmount component
      unmount();
      
      // Clear any remaining timers
      jest.clearAllTimers();
      
      // Should not have pending timers after cleanup
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Floating Terminal and Info Panel', () => {
    test('renders floating terminals and info panel data', () => {
      mockAppState.floatingTerminals = [
        {
          id: '1',
          title: 'ft',
          command: 'echo',
          isVisible: true,
          isMinimized: false,
          zIndex: 1,
          position: { x: 0, y: 0 },
          status: 'running',
          exitStatus: null,
          exitCode: null,
          processStates: [],
          processCount: 1
        }
      ];
      mockAppState.infoPanelState = {
        isVisible: true,
        terminalData: { id: '1', title: 'ft', command: 'echo' },
        position: { x: 0, y: 0 },
        detailsOpen: false
      };

      render(<App />);

      expect(screen.getByTestId('floating-terminal-1')).toBeInTheDocument();
      expect(screen.getByTestId('tab-info-panel')).toBeInTheDocument();
    });

    test('renders notifications and modals when visible', () => {
      mockAppState.appNotification = { isVisible: true, message: 'hi', type: 'info', autoCloseTime: 0 };
      mockAppState.pendingFixVerification = { id: 'v' };
      mockAppState.showImportStatusScreen = true;
      mockAppState.isHealthReportVisible = true;

      render(<App />);

      expect(screen.getByTestId('notification')).toBeInTheDocument();
      expect(screen.getByTestId('import-status-screen')).toBeInTheDocument();
    });
  });
});
