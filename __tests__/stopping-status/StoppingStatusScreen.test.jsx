import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoppingStatusScreen from '../../src/stopping-status/StoppingStatusScreen';

// Mock the electron API
const mockElectron = {
  onProcessTerminating: jest.fn(),
  onProcessTerminated: jest.fn(),
  onContainerTerminating: jest.fn(),
  onContainerTerminated: jest.fn(),
  removeProcessTerminatingListener: jest.fn(),
  removeProcessTerminatedListener: jest.fn(),
  removeContainerTerminatingListener: jest.fn(),
  removeContainerTerminatedListener: jest.fn(),
};

// Setup global window.electron mock
Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true,
});

// Mock timers
jest.useFakeTimers();

describe('StoppingStatusScreen', () => {
  const defaultProps = {
    terminals: [],
    isVisible: true,
    projectName: 'Test Project',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Close button visibility', () => {
    test('should not show close button when not visible', () => {
      render(<StoppingStatusScreen {...defaultProps} isVisible={false} />);
      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });

    test('should show close button immediately when no terminals to track', async () => {
      render(<StoppingStatusScreen {...defaultProps} terminals={[]} />);
      
      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      });
      
      expect(screen.getByText('All processes have been terminated successfully.')).toBeInTheDocument();
    });

    test('should show close button when all processes are terminated', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          associatedContainers: ['container1'],
        },
        {
          id: 'term2',
          title: 'Terminal 2',
          associatedContainers: [],
        },
      ];

      render(<StoppingStatusScreen {...defaultProps} terminals={terminals} />);

      // Initially, close button should not be visible
      expect(screen.queryByText('Close')).not.toBeInTheDocument();

      // Simulate process termination events
      act(() => {
        const terminatingHandler = mockElectron.onProcessTerminating.mock.calls[0][0];
        const terminatedHandler = mockElectron.onProcessTerminated.mock.calls[0][0];
        const containerTerminatedHandler = mockElectron.onContainerTerminated.mock.calls[0][0];

        // Terminate processes
        terminatingHandler({ terminalId: 'term1' });
        terminatedHandler({ terminalId: 'term1' });
        terminatingHandler({ terminalId: 'term2' });
        terminatedHandler({ terminalId: 'term2' });

        // Terminate container
        containerTerminatedHandler({ containerName: 'container1', success: true });
      });

      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      });

      expect(screen.getByText('All processes have been terminated successfully.')).toBeInTheDocument();
    });

    test('should show close button after 20 seconds timeout', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          associatedContainers: [],
        },
      ];

      render(<StoppingStatusScreen {...defaultProps} terminals={terminals} />);

      // Initially, close button should not be visible
      expect(screen.queryByText('Close')).not.toBeInTheDocument();

      // Fast-forward 20 seconds
      act(() => {
        jest.advanceTimersByTime(20000);
      });

      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      });

      expect(screen.getByText('Stopping timed out. Some processes may still be running.')).toBeInTheDocument();
    });

    test('should show close button when processes terminate before timeout', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          associatedContainers: [],
        },
      ];

      render(<StoppingStatusScreen {...defaultProps} terminals={terminals} />);

      // Fast-forward 10 seconds (before timeout)
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Process should still be running, no close button
      expect(screen.queryByText('Close')).not.toBeInTheDocument();

      // Simulate process termination
      act(() => {
        const terminatedHandler = mockElectron.onProcessTerminated.mock.calls[0][0];
        terminatedHandler({ terminalId: 'term1' });
      });

      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      });

      expect(screen.getByText('All processes have been terminated successfully.')).toBeInTheDocument();
    });
  });

  describe('Status tracking', () => {
    test('should track process status changes', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          associatedContainers: [],
        },
      ];

      render(<StoppingStatusScreen {...defaultProps} terminals={terminals} />);

      // Check initial status
      expect(screen.getByText('Terminal 1')).toBeInTheDocument();
      expect(screen.getByText('Waiting')).toBeInTheDocument();

      // Simulate terminating status
      act(() => {
        const terminatingHandler = mockElectron.onProcessTerminating.mock.calls[0][0];
        terminatingHandler({ terminalId: 'term1' });
      });

      await waitFor(() => {
        expect(screen.getByText('Terminating...')).toBeInTheDocument();
      });

      // Simulate terminated status
      act(() => {
        const terminatedHandler = mockElectron.onProcessTerminated.mock.calls[0][0];
        terminatedHandler({ terminalId: 'term1' });
      });

      await waitFor(() => {
        expect(screen.getByText('Terminated')).toBeInTheDocument();
      });
    });

    test('should track container status changes', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          associatedContainers: ['test-container'],
        },
      ];

      render(<StoppingStatusScreen {...defaultProps} terminals={terminals} />);

      // Check initial container status
      expect(screen.getByText('test-container')).toBeInTheDocument();
      
      // Check that we have both Terminal Processes and Docker Containers sections
      expect(screen.getByText('Terminal Processes')).toBeInTheDocument();
      expect(screen.getByText('Docker Containers')).toBeInTheDocument();

      // Simulate container terminating
      act(() => {
        const containerTerminatingHandler = mockElectron.onContainerTerminating.mock.calls[0][0];
        containerTerminatingHandler({ containerName: 'test-container' });
      });

      await waitFor(() => {
        expect(screen.getByText('Stopping...')).toBeInTheDocument();
      });

      // Simulate container terminated
      act(() => {
        const containerTerminatedHandler = mockElectron.onContainerTerminated.mock.calls[0][0];
        containerTerminatedHandler({ containerName: 'test-container', success: true });
      });

      await waitFor(() => {
        expect(screen.getByText('Stopped')).toBeInTheDocument();
      });
    });

    test('should handle container termination failure', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          associatedContainers: ['test-container'],
        },
      ];

      render(<StoppingStatusScreen {...defaultProps} terminals={terminals} />);

      // Simulate failed container termination
      act(() => {
        const terminatedHandler = mockElectron.onProcessTerminated.mock.calls[0][0];
        const containerTerminatedHandler = mockElectron.onContainerTerminated.mock.calls[0][0];
        
        terminatedHandler({ terminalId: 'term1' });
        containerTerminatedHandler({ containerName: 'test-container', success: false });
      });

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });

      // Should still show close button since container is in final state (error)
      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      });
    });
  });

  describe('Progress display', () => {
    test('should display correct progress counts', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          associatedContainers: ['container1'],
        },
        {
          id: 'term2',
          title: 'Terminal 2',
          associatedContainers: ['container2'],
        },
      ];

      render(<StoppingStatusScreen {...defaultProps} terminals={terminals} />);

      // Check initial progress - look for the progress section specifically
      expect(screen.getByText('Processes:')).toBeInTheDocument();
      expect(screen.getByText('Containers:')).toBeInTheDocument();
      
      // Check that we have the right counts
      const progressItems = screen.getAllByText(/\d+ \/ \d+/);
      expect(progressItems).toHaveLength(2); // One for processes, one for containers

      // Terminate one process
      act(() => {
        const terminatedHandler = mockElectron.onProcessTerminated.mock.calls[0][0];
        terminatedHandler({ terminalId: 'term1' });
      });

      await waitFor(() => {
        expect(screen.getByText('1 / 2')).toBeInTheDocument(); // Processes
      });
    });
  });

  describe('Event listener cleanup', () => {
    test('should remove event listeners when component unmounts', () => {
      const { unmount } = render(<StoppingStatusScreen {...defaultProps} />);

      unmount();

      expect(mockElectron.removeProcessTerminatingListener).toHaveBeenCalled();
      expect(mockElectron.removeProcessTerminatedListener).toHaveBeenCalled();
      expect(mockElectron.removeContainerTerminatingListener).toHaveBeenCalled();
      expect(mockElectron.removeContainerTerminatedListener).toHaveBeenCalled();
    });

    test('should remove event listeners when visibility changes', () => {
      const { rerender } = render(<StoppingStatusScreen {...defaultProps} isVisible={true} />);

      // Change visibility to false
      rerender(<StoppingStatusScreen {...defaultProps} isVisible={false} />);

      expect(mockElectron.removeProcessTerminatingListener).toHaveBeenCalled();
      expect(mockElectron.removeProcessTerminatedListener).toHaveBeenCalled();
      expect(mockElectron.removeContainerTerminatingListener).toHaveBeenCalled();
      expect(mockElectron.removeContainerTerminatedListener).toHaveBeenCalled();
    });
  });

  describe('State reset between runs', () => {
    test('should not show close button immediately when reopened', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          associatedContainers: [],
        },
      ];

      const { rerender } = render(
        <StoppingStatusScreen {...defaultProps} terminals={terminals} />
      );

      // Trigger timeout to show close button
      act(() => {
        jest.advanceTimersByTime(20000);
      });

      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      });

      // Hide the component
      rerender(
        <StoppingStatusScreen
          {...defaultProps}
          terminals={terminals}
          isVisible={false}
        />
      );

      // Show again
      rerender(
        <StoppingStatusScreen {...defaultProps} terminals={terminals} />
      );

      // Close button should not be visible immediately
      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    test('should handle invalid container names gracefully', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          associatedContainers: [null, '', undefined, 'valid-container'],
        },
      ];

      render(<StoppingStatusScreen {...defaultProps} terminals={terminals} />);

      // Should only show the valid container
      expect(screen.getByText('valid-container')).toBeInTheDocument();
      
      // Check progress counts - should show 0 terminated out of 1 total for both processes and containers
      const progressElements = screen.getAllByText('0 / 1');
      expect(progressElements).toHaveLength(2); // One for processes, one for containers
    });

    test('should handle terminals without associated containers', async () => {
      const terminals = [
        {
          id: 'term1',
          title: 'Terminal 1',
          // No associatedContainers property
        },
        {
          id: 'term2',
          title: 'Terminal 2',
          associatedContainers: null,
        },
      ];

      render(<StoppingStatusScreen {...defaultProps} terminals={terminals} />);

      // Should show processes but no containers section
      expect(screen.getByText('Terminal Processes')).toBeInTheDocument();
      expect(screen.queryByText('Docker Containers')).not.toBeInTheDocument();
    });
  });
}); 