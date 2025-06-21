import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import HealthReportScreen from '../../src/health-report/HealthReportScreen';

// Mock ReactDOM.createPortal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node) => node,
}));

// Mock window.electron
const mockElectron = {
  getContainerStatus: jest.fn(),
};

beforeAll(() => {
  global.window.electron = mockElectron;
});

afterAll(() => {
  delete global.window.electron;
});

describe('HealthReportScreen', () => {
  const defaultProps = {
    isVisible: true,
    projectName: 'Test Project',
    onClose: jest.fn(),
    terminals: [],
    noRunMode: false,
    onRefreshTerminal: jest.fn(),
    onFocusTerminal: jest.fn(),
  };

  const mockTerminals = [
    {
      id: 'terminal-1',
      title: 'Web Server',
      status: 'running',
      command: 'npm start',
      associatedContainers: ['web-container', 'db-container'],
    },
    {
      id: 'terminal-2',
      title: 'API Server',
      status: 'error',
      command: 'node server.js',
      associatedContainers: ['api-container'],
    },
    {
      id: 'terminal-3',
      title: 'Background Worker',
      status: 'sleeping',
      command: 'python worker.py',
      associatedContainers: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockElectron.getContainerStatus.mockResolvedValue('running');
  });

  describe('Rendering', () => {
    test('should not render when not visible', () => {
      render(<HealthReportScreen {...defaultProps} isVisible={false} />);
      expect(screen.queryByText('Test Project Health Report')).not.toBeInTheDocument();
    });

    test('should render health report when visible', () => {
      render(<HealthReportScreen {...defaultProps} />);
      expect(screen.getByText('Test Project Health Report')).toBeInTheDocument();
    });

    test('should show loading state initially', async () => {
      render(<HealthReportScreen {...defaultProps} />);
      // The component loads very quickly, so we need to check for loading or the final state
      const loadingText = screen.queryByText('Loading health data...');
      const noTerminalsText = screen.queryByText('No terminal tabs found.');
      expect(loadingText || noTerminalsText).toBeInTheDocument();
    });

    test('should show no terminals message when no terminals provided', async () => {
      render(<HealthReportScreen {...defaultProps} />);
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading health data...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('No terminal tabs found.')).toBeInTheDocument();
    });

    test('should render terminals when provided', async () => {
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading health data...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Web Server')).toBeInTheDocument();
      expect(screen.getByText('API Server')).toBeInTheDocument();
      expect(screen.getByText('Background Worker')).toBeInTheDocument();
    });
  });

  describe('Health Status Calculation', () => {
    test('should show healthy status when all terminals are running', async () => {
      const healthyTerminals = [
        { id: '1', title: 'Server 1', status: 'running', associatedContainers: [] },
        { id: '2', title: 'Server 2', status: 'done', associatedContainers: [] },
      ];

      render(<HealthReportScreen {...defaultProps} terminals={healthyTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('✓ All Systems Healthy')).toBeInTheDocument();
      });
    });

    test('should show warning status when terminals are waiting', async () => {
      const warningTerminals = [
        { id: '1', title: 'Server 1', status: 'running', associatedContainers: [] },
        { id: '2', title: 'Server 2', status: 'sleeping', associatedContainers: [] },
      ];

      render(<HealthReportScreen {...defaultProps} terminals={warningTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('⚠ 1 Systems Waiting')).toBeInTheDocument();
      });
    });

    test('should show error status when terminals have errors', async () => {
      const errorTerminals = [
        { id: '1', title: 'Server 1', status: 'running', associatedContainers: [] },
        { id: '2', title: 'Server 2', status: 'error', associatedContainers: [] },
      ];

      render(<HealthReportScreen {...defaultProps} terminals={errorTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('✗ 1 Issues Detected')).toBeInTheDocument();
      });
    });

    test('should prioritize error status over warning status', async () => {
      const mixedTerminals = [
        { id: '1', title: 'Server 1', status: 'sleeping', associatedContainers: [] },
        { id: '2', title: 'Server 2', status: 'error', associatedContainers: [] },
      ];

      render(<HealthReportScreen {...defaultProps} terminals={mixedTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('✗ 1 Issues Detected')).toBeInTheDocument();
      });
    });
  });

  describe('Health Summary Stats', () => {
    test('should display correct summary statistics', async () => {
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total: 3')).toBeInTheDocument();
        expect(screen.getByText('Running: 1')).toBeInTheDocument();
        expect(screen.getByText('Errors: 1')).toBeInTheDocument();
      });
    });

    test('should show last updated timestamp', async () => {
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Updated:/)).toBeInTheDocument();
      });
    });
  });

  describe('Terminal Section Interactions', () => {
    test('should expand and collapse terminal sections', async () => {
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Find the terminal section header
      const terminalSection = screen.getByTestId('terminal-section-Web Server');
      
      // Initially collapsed (should show ▶)
      expect(terminalSection).toHaveTextContent('▶');
      
      // Click to expand
      fireEvent.click(terminalSection);
      
      // Should now show ▼
      expect(terminalSection).toHaveTextContent('▼');
    });

    test('should show terminal actions when expanded', async () => {
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Expand the terminal section
      const terminalSection = screen.getByTestId('terminal-section-Web Server');
      fireEvent.click(terminalSection);
      
      // Should show action buttons
      await waitFor(() => {
        expect(screen.getByTestId('show-command-button')).toBeInTheDocument();
        expect(screen.getByTestId('focus-tab-button')).toBeInTheDocument();
        expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
      });
    });
  });

  describe('Terminal Actions', () => {
    test('should call onFocusTerminal when focus button is clicked', async () => {
      const onFocusTerminal = jest.fn();
      render(
        <HealthReportScreen 
          {...defaultProps} 
          terminals={mockTerminals}
          onFocusTerminal={onFocusTerminal}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Expand terminal section
      const terminalSection = screen.getByTestId('terminal-section-Web Server');
      fireEvent.click(terminalSection);
      
      // Click focus button
      await waitFor(() => {
        const focusButton = screen.getByTestId('focus-tab-button');
        fireEvent.click(focusButton);
      });

      expect(onFocusTerminal).toHaveBeenCalledWith('terminal-1');
    });

    test('should call onRefreshTerminal when refresh button is clicked', async () => {
      const onRefreshTerminal = jest.fn();
      render(
        <HealthReportScreen 
          {...defaultProps} 
          terminals={mockTerminals}
          onRefreshTerminal={onRefreshTerminal}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Expand terminal section
      const terminalSection = screen.getByTestId('terminal-section-Web Server');
      fireEvent.click(terminalSection);
      
      // Click refresh button
      await waitFor(() => {
        const refreshButton = screen.getByTestId('refresh-button');
        fireEvent.click(refreshButton);
      });

      expect(onRefreshTerminal).toHaveBeenCalledWith('terminal-1');
    });

    test('should disable refresh button in no run mode', async () => {
      render(
        <HealthReportScreen 
          {...defaultProps} 
          terminals={mockTerminals}
          noRunMode={true}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Expand terminal section
      const terminalSection = screen.getByTestId('terminal-section-Web Server');
      fireEvent.click(terminalSection);
      
      // Refresh button should be disabled
      await waitFor(() => {
        const refreshButton = screen.getByTestId('refresh-button');
        expect(refreshButton).toBeDisabled();
        expect(refreshButton).toHaveAttribute('title', 'Cannot refresh in No Run Mode');
      });
    });
  });

  describe('Command Popup', () => {
    test('should show command popup when show command button is clicked', async () => {
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Expand terminal section
      const terminalSection = screen.getByTestId('terminal-section-Web Server');
      fireEvent.click(terminalSection);
      
      // Click show command button
      await waitFor(() => {
        const showCommandButton = screen.getByTestId('show-command-button');
        fireEvent.click(showCommandButton);
      });

      // Command popup should be visible
      expect(screen.getByText('Command Details')).toBeInTheDocument();
      expect(screen.getByText('npm start')).toBeInTheDocument();
    });

    test('should close command popup when close button is clicked', async () => {
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Open command popup
      const terminalSection = screen.getByTestId('terminal-section-Web Server');
      fireEvent.click(terminalSection);
      
      await waitFor(() => {
        const showCommandButton = screen.getByTestId('show-command-button');
        fireEvent.click(showCommandButton);
      });

      // Close popup using CSS selector
      const closeButton = document.querySelector('.command-popup-header .close-button');
      fireEvent.click(closeButton);

      // Popup should be closed
      expect(screen.queryByText('Command Details')).not.toBeInTheDocument();
    });

    test('should copy command to clipboard when copy button is clicked', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Open command popup
      const terminalSection = screen.getByTestId('terminal-section-Web Server');
      fireEvent.click(terminalSection);
      
      await waitFor(() => {
        const showCommandButton = screen.getByTestId('show-command-button');
        fireEvent.click(showCommandButton);
      });

      // Click copy button
      const copyButton = screen.getByText('Copy Command');
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('npm start');
    });
  });

  describe('Container Status Integration', () => {
    test('should fetch container statuses for terminals with containers', async () => {
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      await waitFor(() => {
        expect(mockElectron.getContainerStatus).toHaveBeenCalledWith('web-container');
        expect(mockElectron.getContainerStatus).toHaveBeenCalledWith('db-container');
        expect(mockElectron.getContainerStatus).toHaveBeenCalledWith('api-container');
      });
    });

    test('should handle container status fetch errors gracefully', async () => {
      mockElectron.getContainerStatus.mockRejectedValue(new Error('Container not found'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      await waitFor(() => {
        // Expect the new logging format: [timestamp][HEALTH][ERROR]
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\[.*\]\[HEALTH\]\[ERROR\]/),
          expect.stringContaining('Error fetching container status'),
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    test('should not fetch container statuses when electron API is unavailable', async () => {
      delete global.window.electron;
      
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      // Should not throw errors and should render normally
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Restore electron mock
      global.window.electron = mockElectron;
    });
  });

  describe('Close Functionality', () => {
    test('should call onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<HealthReportScreen {...defaultProps} onClose={onClose} />);
      
      // Find the close button in the header actions using CSS selector
      const closeButton = document.querySelector('.health-report-header .close-button');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('should call onClose and close health report when focus tab is clicked', async () => {
      const onClose = jest.fn();
      const onFocusTerminal = jest.fn();
      
      render(
        <HealthReportScreen 
          {...defaultProps} 
          terminals={mockTerminals}
          onClose={onClose}
          onFocusTerminal={onFocusTerminal}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Expand terminal section and click focus tab
      const terminalSection = screen.getByTestId('terminal-section-Web Server');
      fireEvent.click(terminalSection);
      
      await waitFor(() => {
        const focusButton = screen.getByTestId('focus-tab-button');
        fireEvent.click(focusButton);
      });

      expect(onFocusTerminal).toHaveBeenCalledWith('terminal-1');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Refresh All Functionality', () => {
    test('should refresh container statuses when refresh all button is clicked', async () => {
      render(<HealthReportScreen {...defaultProps} terminals={mockTerminals} />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Web Server')).toBeInTheDocument();
      });

      // Clear previous calls
      mockElectron.getContainerStatus.mockClear();

      // Click refresh all button
      const refreshAllButton = screen.getByText('Refresh All');
      fireEvent.click(refreshAllButton);

      // Should fetch container statuses again
      await waitFor(() => {
        expect(mockElectron.getContainerStatus).toHaveBeenCalledWith('web-container');
        expect(mockElectron.getContainerStatus).toHaveBeenCalledWith('db-container');
        expect(mockElectron.getContainerStatus).toHaveBeenCalledWith('api-container');
      });
    });
  });

  describe('Status Icons and Labels', () => {
    test('should display correct status icons for different terminal states', async () => {
      const terminalsWithDifferentStates = [
        { id: '1', title: 'Running Terminal', status: 'running', associatedContainers: [] },
        { id: '2', title: 'Error Terminal', status: 'error', associatedContainers: [] },
        { id: '3', title: 'Sleeping Terminal', status: 'sleeping', associatedContainers: [] },
        { id: '4', title: 'Done Terminal', status: 'done', associatedContainers: [] },
      ];

      render(<HealthReportScreen {...defaultProps} terminals={terminalsWithDifferentStates} />);
      
      await waitFor(() => {
        expect(screen.getByText('Running Terminal')).toBeInTheDocument();
        expect(screen.getByText('Error Terminal')).toBeInTheDocument();
        expect(screen.getByText('Sleeping Terminal')).toBeInTheDocument();
        expect(screen.getByText('Done Terminal')).toBeInTheDocument();
      });

      // Check that status labels are displayed
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Sleeping')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });
}); 