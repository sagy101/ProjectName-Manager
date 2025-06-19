/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import AutoSetupScreen from '../../src/auto-setup/AutoSetupScreen.jsx';
import { AUTO_SETUP_STATUS, COMMAND_EXECUTION_STATUS } from '../../src/auto-setup/constants/autoSetupConstants';

// helper command
const baseCommand = { id: 'c1', title: 'Cmd1', category: 'Cat', source: 'general' };

describe('AutoSetupScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns null when not visible', () => {
    const { container } = render(
      <AutoSetupScreen isVisible={false} projectName="Test" />
    );
    expect(container.firstChild).toBeNull();
  });

  test('start button triggers callback', () => {
    const onStart = jest.fn();
    const commandGroups = [
      { priority: 1, commands: [baseCommand] }
    ];
    const { getByText } = render(
      <AutoSetupScreen
        isVisible={true}
        projectName="Test"
        autoSetupStatus={AUTO_SETUP_STATUS.IDLE}
        commandGroups={commandGroups}
        commandStatuses={{}}
        progress={{ completed: 0, total: 1, percentage: 0 }}
        onStartAutoSetup={onStart}
      />
    );
    fireEvent.click(getByText('Start Auto Setup'));
    expect(onStart).toHaveBeenCalled();
  });

  test('view terminal and retry buttons call handlers', () => {
    const onView = jest.fn();
    const onRetry = jest.fn();
    const commandGroups = [{ priority: 1, commands: [baseCommand] }];
    const commandStatuses = { c1: COMMAND_EXECUTION_STATUS.FAILED };
    const floatingTerminals = [{ id: 't1', commandId: 'c1' }];
    const { getByText } = render(
      <AutoSetupScreen
        isVisible={true}
        projectName="Test"
        autoSetupStatus={AUTO_SETUP_STATUS.FAILED}
        commandGroups={commandGroups}
        commandStatuses={commandStatuses}
        floatingTerminals={floatingTerminals}
        progress={{ completed: 0, total: 1, percentage: 0 }}
        onRetryCommand={onRetry}
        onViewTerminal={onView}
      />
    );
    act(() => { jest.runOnlyPendingTimers(); });
    fireEvent.click(getByText('View Terminal'));
    expect(onView).toHaveBeenCalledWith('t1');
    fireEvent.click(getByText('Retry'));
    expect(onRetry).toHaveBeenCalledWith(baseCommand);
  });

  test('shows timeout countdown for running command', () => {
    const commandGroups = [{ priority: 1, commands: [baseCommand] }];
    const commandStatuses = { c1: COMMAND_EXECUTION_STATUS.RUNNING };
    const commandTimeouts = new Map([
      ['c1', { startTime: 0, duration: 10000 }]
    ]);
    const { getByText } = render(
      <AutoSetupScreen
        isVisible={true}
        projectName="Test"
        autoSetupStatus={AUTO_SETUP_STATUS.RUNNING}
        commandGroups={commandGroups}
        commandStatuses={commandStatuses}
        progress={{ completed: 0, total: 1, percentage: 0 }}
        commandTimeouts={commandTimeouts}
      />
    );
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(getByText(/⏱ 5s/)).toBeInTheDocument();
  });
});
