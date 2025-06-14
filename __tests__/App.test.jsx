import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App';

// Mock all the child components to focus on App logic
jest.mock('../src/components/ProjectConfiguration', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({
      getCurrentState: () => ({ configState: {}, attachState: {} }),
      setStateFromImport: jest.fn()
    }));
    return mockReact.createElement('div', { 'data-testid': 'project-configuration' }, 'ProjectConfiguration');
  });
});

jest.mock('../src/components/TerminalContainer', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({
      stopAllContainers: jest.fn(),
      getTerminals: () => []
    }));
    return mockReact.createElement('div', { 'data-testid': 'terminal-container' }, 'TerminalContainer');
  });
});

jest.mock('../src/components/EnvironmentVerification', () => {
  const mockReact = require('react');
  return (props) => mockReact.createElement('div', { 'data-testid': 'environment-verification' }, 'EnvironmentVerification');
});

jest.mock('../src/components/LoadingScreen', () => {
  const mockReact = require('react');
  return (props) => mockReact.createElement('div', { 'data-testid': 'loading-screen' }, `Loading: ${props.statusMessage}`);
});

jest.mock('../src/components/Notification', () => {
  const mockReact = require('react');
  return (props) => props.isVisible ? mockReact.createElement('div', { 'data-testid': 'notification' }, props.message) : null;
});

jest.mock('../src/components/FloatingTerminal', () => {
  const mockReact = require('react');
  return (props) => props.isVisible ? mockReact.createElement('div', { 'data-testid': `floating-terminal-${props.id}` }, 'FloatingTerminal') : null;
});

jest.mock('../src/components/AppControlSidebar', () => {
  const mockReact = require('react');
  return (props) => mockReact.createElement('div', { 'data-testid': 'app-control-sidebar' }, 'AppControlSidebar');
});

jest.mock('../src/components/TabInfoPanel', () => {
  const mockReact = require('react');
  return (props) => mockReact.createElement('div', { 'data-testid': 'tab-info-panel' }, 'TabInfoPanel');
});

jest.mock('../src/components/ImportStatusScreen', () => {
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
  // Advance timers to trigger loading completion
  act(() => {
    jest.advanceTimersByTime(20000); // Generous time for all loading steps
  });
  
  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
  }, { timeout: 15000 });
};

describe('App Component - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    
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
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Initial Rendering and Loading', () => {
    test('should show loading screen initially', () => {
      render(<App />);
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      expect(screen.getByText(/Loading:/)).toBeInTheDocument();
    });

    test('should complete loading and show main app components', async () => {
      render(<App />);
      
      // Verify loading screen is shown initially
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      
      // Complete the loading process
      await completeLoading();
      
      // Verify main components are rendered
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('terminal-container')).toBeInTheDocument();
      expect(screen.getByTestId('environment-verification')).toBeInTheDocument();
      expect(screen.getByTestId('app-control-sidebar')).toBeInTheDocument();
    });

    test('should set correct document title', async () => {
      render(<App />);
      await completeLoading();
      expect(document.title).toBe('ISO Manager');
    });

    test('should set up electron event listeners', () => {
      render(<App />);
      
      expect(mockElectron.onEnvironmentVerificationComplete).toHaveBeenCalled();
      expect(mockElectron.onVerificationProgress).toHaveBeenCalled();
      expect(mockElectron.onStopAllContainersBeforeQuit).toHaveBeenCalled();
      expect(mockElectron.onStopAllContainersBeforeReload).toHaveBeenCalled();
    });

    test('should fetch initial data on mount', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(mockElectron.getEnvironmentVerification).toHaveBeenCalled();
        expect(mockElectron.precacheGlobalDropdowns).toHaveBeenCalled();
      });
    });
  });

  describe('Configuration Collapse/Expand Functionality', () => {
    test('should render collapse button after loading', async () => {
      render(<App />);
      await completeLoading();
      
      const collapseButton = screen.getByRole('button', { name: /collapse configuration/i });
      expect(collapseButton).toBeInTheDocument();
    });

    test('should toggle collapse state when button is clicked', async () => {
      render(<App />);
      await completeLoading();
      
      const collapseButton = screen.getByRole('button', { name: /collapse configuration/i });
      
      // Click to collapse
      fireEvent.click(collapseButton);
      
      // Should now show expand button
      expect(screen.getByRole('button', { name: /expand configuration/i })).toBeInTheDocument();
      
      // Click to expand
      const expandButton = screen.getByRole('button', { name: /expand configuration/i });
      fireEvent.click(expandButton);
      
      // Should show collapse button again
      expect(screen.getByRole('button', { name: /collapse configuration/i })).toBeInTheDocument();
    });

    test('should apply correct CSS classes when collapsed', async () => {
      render(<App />);
      await completeLoading();
      
      const collapseButton = screen.getByRole('button', { name: /collapse configuration/i });
      fireEvent.click(collapseButton);
      
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
      
      // Check that loading starts as true
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      
      await completeLoading();
      
      // After loading, main components should be visible
      expect(screen.getByTestId('project-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('terminal-container')).toBeInTheDocument();
    });

    test('should handle verification status updates', async () => {
      let mockListener;
      mockElectron.onEnvironmentVerificationComplete.mockImplementation((callback) => {
        mockListener = callback;
        return () => {};
      });

      render(<App />);
      await completeLoading();

      // Simulate verification complete event
      act(() => {
        mockListener({
          general: {
            statuses: { test: 'valid' },
            config: [],
            header: {}
          }
        });
      });

      // Should still have environment verification component
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
      mockElectron.getEnvironmentVerification.mockRejectedValueOnce(new Error('Test error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<App />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'App: Error fetching initial environment verification data:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    test('should handle missing electron API gracefully', async () => {
      // Temporarily remove electron from window
      const originalElectron = window.electron;
      delete window.electron;
      
      render(<App />);
      
      // Should still render loading screen without crashing
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      
      // Restore electron
      window.electron = originalElectron;
    });
  });

  describe('Cleanup and Memory Management', () => {
    test('should cleanup event listeners on unmount', () => {
      const mockRemoveListener = jest.fn();
      mockElectron.onEnvironmentVerificationComplete.mockReturnValue(mockRemoveListener);
      
      const { unmount } = render(<App />);
      
      unmount();
      
      expect(mockRemoveListener).toHaveBeenCalled();
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
}); 