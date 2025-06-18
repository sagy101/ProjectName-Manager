import { renderHook, act } from '@testing-library/react';
import { useAutoSetup } from '../src/hooks/useAutoSetup';
import { AUTO_SETUP_STATUS, COMMAND_EXECUTION_STATUS, SECTION_STATUS } from '../src/constants/autoSetupConstants';
import * as autoSetupUtils from '../src/utils/autoSetupUtils';

jest.mock('../src/utils/autoSetupUtils', () => ({
  ...jest.requireActual('../src/utils/autoSetupUtils'),
  collectFixCommands: jest.fn(() => []),
}));

describe('useAutoSetup Hook', () => {
  let mockOnOpenFloatingTerminal;
  let mockOnCommandComplete;
  let mockOnVerificationRerun;
  let mockShowAppNotification;

  beforeEach(() => {
    mockOnOpenFloatingTerminal = jest.fn();
    mockOnCommandComplete = jest.fn();
    mockOnVerificationRerun = jest.fn();
    mockShowAppNotification = jest.fn();
    autoSetupUtils.collectFixCommands.mockClear();
  });

  const getHook = (initialProps = {}) => {
    const defaultProps = {
      verificationStatuses: {},
      generalVerificationConfig: [],
      configSidebarAbout: [],
      showTestSections: false,
      onOpenFloatingTerminal: mockOnOpenFloatingTerminal,
      onCommandComplete: mockOnCommandComplete,
      onVerificationRerun: mockOnVerificationRerun,
      showAppNotification: mockShowAppNotification,
    };
    return renderHook((props) => useAutoSetup({ ...defaultProps, ...props }));
  };

  test('should initialize with default values', () => {
    const { result } = getHook();
    expect(result.current.isAutoSetupVisible).toBe(false);
    expect(result.current.autoSetupStatus).toBe(AUTO_SETUP_STATUS.IDLE);
    expect(result.current.commandGroups).toEqual([]);
    expect(result.current.commandStatuses).toEqual({});
  });

  test('should open auto setup and collect commands', () => {
    const mockGroups = [{ priority: 1, commands: [{ id: 'cmd1', title: 'Command 1' }] }];
    autoSetupUtils.collectFixCommands.mockReturnValue(mockGroups);

    const { result, rerender } = getHook();
    act(() => {
      result.current.openAutoSetup();
    });

    rerender();

    expect(result.current.isAutoSetupVisible).toBe(true);
    expect(autoSetupUtils.collectFixCommands).toHaveBeenCalled();
    expect(result.current.commandGroups).toEqual(mockGroups);
    expect(result.current.commandStatuses).toEqual({ cmd1: 'pending' });
  });

  test('should start auto setup and execute first group', () => {
    const mockGroups = [
      { priority: 1, commands: [{ id: 'cmd1', title: 'Command 1', fixCommand: 'fix cmd1' }] },
      { priority: 2, commands: [{ id: 'cmd2', title: 'Command 2', fixCommand: 'fix cmd2' }] }
    ];
    autoSetupUtils.collectFixCommands.mockReturnValue(mockGroups);
    
    const { result, rerender } = getHook();
    act(() => {
      result.current.openAutoSetup();
    });
    rerender();

    act(() => {
      result.current.startAutoSetup();
    });

    expect(result.current.autoSetupStatus).toBe(AUTO_SETUP_STATUS.RUNNING);
    expect(mockOnOpenFloatingTerminal).toHaveBeenCalledTimes(1);
    expect(mockOnOpenFloatingTerminal).toHaveBeenCalledWith('cmd1', 'Auto Setup: Command 1', 'fix cmd1', expect.any(Object));
    expect(result.current.commandStatuses.cmd1).toBe(COMMAND_EXECUTION_STATUS.RUNNING);
  });

  test('should stop auto setup and terminate running commands', () => {
    const mockGroups = [{ priority: 1, commands: [{ id: 'cmd1', title: 'Command 1', fixCommand: 'fix cmd1' }] }];
    autoSetupUtils.collectFixCommands.mockReturnValue(mockGroups);
    
    const { result, rerender } = getHook();
    act(() => {
      result.current.openAutoSetup();
    });
    rerender();

    act(() => {
      result.current.startAutoSetup();
    });

    act(() => {
      result.current.stopAutoSetup();
    });

    expect(result.current.autoSetupStatus).toBe(AUTO_SETUP_STATUS.STOPPED);
    expect(result.current.commandStatuses.cmd1).toBe(COMMAND_EXECUTION_STATUS.STOPPED);
  });

  test('should handle command timeout', () => {
    jest.useFakeTimers();
    const mockGroups = [{ priority: 1, commands: [{ id: 'cmd1', title: 'Command 1', fixCommand: 'fix cmd1' }] }];
    autoSetupUtils.collectFixCommands.mockReturnValue(mockGroups);
    
    const { result, rerender } = getHook();
    act(() => {
      result.current.openAutoSetup();
    });
    rerender();

    act(() => {
      result.current.startAutoSetup();
    });

    act(() => {
      jest.advanceTimersByTime(61000);
    });

    expect(result.current.commandStatuses.cmd1).toBe(COMMAND_EXECUTION_STATUS.TIMEOUT);
    expect(mockShowAppNotification).toHaveBeenCalledWith(
      'Command "Command 1" timed out after 60 seconds.',
      'warning'
    );
    jest.useRealTimers();
  });

  test('should start a specific priority group', () => {
    const mockGroups = [
      { priority: 1, commands: [{ id: 'cmd1', title: 'Command 1', fixCommand: 'fix cmd1' }] },
      { priority: 2, commands: [{ id: 'cmd2', title: 'Command 2', fixCommand: 'fix cmd2' }] }
    ];
    autoSetupUtils.collectFixCommands.mockReturnValue(mockGroups);

    const { result, rerender } = getHook();
    act(() => {
      result.current.openAutoSetup();
    });
    rerender();

    act(() => {
      result.current.startPriorityGroup(mockGroups[1]);
    });

    expect(result.current.autoSetupStatus).toBe(AUTO_SETUP_STATUS.RUNNING);
    expect(mockOnOpenFloatingTerminal).toHaveBeenCalledWith('cmd2', 'Auto Setup: Command 2', 'fix cmd2', expect.any(Object));
  });

  test('should terminate a specific command', () => {
    const mockGroups = [{ priority: 1, commands: [{ id: 'cmd1', title: 'Command 1', fixCommand: 'fix cmd1' }] }];
    autoSetupUtils.collectFixCommands.mockReturnValue(mockGroups);
    mockOnOpenFloatingTerminal.mockReturnValue('terminal-123');

    const { result, rerender } = getHook();
    act(() => {
      result.current.openAutoSetup();
    });
    rerender();

    act(() => {
      result.current.startAutoSetup();
    });

    act(() => {
      result.current.terminateCommand(mockGroups[0].commands[0]);
    });

    expect(result.current.commandStatuses.cmd1).toBe(COMMAND_EXECUTION_STATUS.STOPPED);
    expect(mockShowAppNotification).toHaveBeenCalledWith('Command "Command 1" terminated by user.', 'info');
  });
}); 