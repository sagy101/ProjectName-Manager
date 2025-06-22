/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { STATUS } from '../../src/environment-verification/constants/verificationConstants';
import ProjectConfiguration from '../../src/project-config/ProjectConfiguration.jsx';
import { generateCommandList } from '../../src/common/utils/evalUtils';

global.__capturedProps = null;
global.__configSectionCalls = [];

jest.mock('../../src/project-config/ConfigSection', () => (props) => {
  global.__capturedProps = props;
  global.__configSectionCalls.push(props);
  return <div data-testid={`config-section-${props.section.id}`} />;
});

jest.mock('../../src/common/components/Notification', () => props =>
  props.isVisible ? <div data-testid="notification">{props.message}</div> : null
);

jest.mock('../../src/stopping-status/StoppingStatusScreen', () => props =>
  props.isVisible ? <div data-testid="stopping">Stopping</div> : null
);

jest.mock('../../src/project-config/RunButton', () => props =>
  <button data-testid="run-btn" disabled={props.disabled} onClick={props.onClick}>Run</button>
);

jest.mock('../../src/common/utils/evalUtils', () => ({
  generateCommandList: jest.fn(() => [{ command: 'echo 1', sectionId: 'mirror', tabTitle: 'T1' }])
}));

jest.mock('../../src/project-config/hooks/useProjectConfig', () => ({
  useProjectConfig: () => ({
    configState: { mirror: { enabled: true } },
    attachState: {},
    warningState: {},
    initialized: true,
    setConfigState: jest.fn(),
    setAttachState: jest.fn(),
    toggleSectionEnabled: jest.fn(),
    toggleSubSectionEnabled: jest.fn(),
    setMode: jest.fn(),
    handleAttachToggle: jest.fn(),
    setSectionDropdownValue: jest.fn(),
    setInputFieldValue: jest.fn()
  })
}));


describe('ProjectConfiguration notifications and statuses', () => {
  const baseProps = {
    projectName: 'proj',
    globalDropdownValues: {},
    terminalRef: {
      current: {
        openTabs: jest.fn(),
        killAllTerminals: jest.fn(() => Promise.resolve()),
        clearTabs: jest.fn(),
      },
    },
    verificationStatuses: { mirror: { status: 'no_specific_checks', gitBranch: 'main' } },
    onTriggerRefresh: jest.fn(),
    showTestSections: false,
    onConfigStateChange: jest.fn(),
    onIsRunningChange: jest.fn(),
    openFloatingTerminal: jest.fn(),
    discoveredVersions: {},
    onBranchChangeError: jest.fn(),
    showAppNotification: jest.fn(),
    onFixCommand: jest.fn(),
    isCollapsed: false,
  };

  beforeEach(() => {
    global.__capturedProps = null;
    global.__configSectionCalls = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('shows error notification when toggling while running and hides after timeout', async () => {
    const { getByTestId, queryByTestId } = render(<ProjectConfiguration {...baseProps} />);
    const runButton = getByTestId('run-btn');

    fireEvent.click(runButton); // start
    await waitFor(() => expect(baseProps.terminalRef.current.openTabs).toHaveBeenCalled());
    expect(generateCommandList).toHaveBeenCalled();
    await waitFor(() => {
      const mirrorProps = [...global.__configSectionCalls].reverse().find(p => p.section.id === 'mirror');
      return mirrorProps && mirrorProps.isLocked;
    });
    const mirrorProps = [...global.__configSectionCalls].reverse().find(p => p.section.id === 'mirror');
    act(() => {
      mirrorProps.toggleEnabled('mirror', false);
    });

    expect(getByTestId('notification').textContent).toBe('Cannot change settings while the project is running.');
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    await waitFor(() => expect(queryByTestId('notification')).toBeNull());
  });

  test('shows error notification when changing mode while running', async () => {
    const { getByTestId } = render(<ProjectConfiguration {...baseProps} />);
    const runButton = getByTestId('run-btn');

    fireEvent.click(runButton); // start
    await waitFor(() => expect(baseProps.terminalRef.current.openTabs).toHaveBeenCalled());
    
    const mirrorProps = [...global.__configSectionCalls].reverse().find(p => p.section.id === 'mirror');
    act(() => {
      mirrorProps.setMode('mirror', 'dev', 'sub1');
    });

    expect(getByTestId('notification').textContent).toBe('Cannot change deployment type while the project is running.');
  });

  test('shows error notification when changing input field while running', async () => {
    const { getByTestId } = render(<ProjectConfiguration {...baseProps} />);
    const runButton = getByTestId('run-btn');

    fireEvent.click(runButton); // start
    await waitFor(() => expect(baseProps.terminalRef.current.openTabs).toHaveBeenCalled());
    
    const mirrorProps = [...global.__configSectionCalls].reverse().find(p => p.section.id === 'mirror');
    act(() => {
      mirrorProps.setInputFieldValue('mirror', 'inputId', 'value');
    });

    expect(getByTestId('notification').textContent).toBe('Cannot change settings while the project is running.');
  });

  test('shows error notification when toggling subsection while running', async () => {
    const { getByTestId } = render(<ProjectConfiguration {...baseProps} />);
    const runButton = getByTestId('run-btn');

    fireEvent.click(runButton); // start
    await waitFor(() => expect(baseProps.terminalRef.current.openTabs).toHaveBeenCalled());
    
    const mirrorProps = [...global.__configSectionCalls].reverse().find(p => p.section.id === 'mirror');
    act(() => {
      mirrorProps.toggleSubSectionEnabled('mirror', 'sub1', false);
    });

    expect(getByTestId('notification').textContent).toBe('Cannot change settings while the project is running.');
  });

  test('passes verification statuses to ConfigSection', () => {
    render(<ProjectConfiguration {...baseProps} />);
    const mirrorProps = [...global.__configSectionCalls].reverse().find(p => p.section.id === 'mirror');
    expect(mirrorProps.sectionPathStatus).toBe(STATUS.VALID);
    expect(mirrorProps.sectionGitBranch).toBe('main');
  });
});
