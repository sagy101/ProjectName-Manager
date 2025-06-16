/** @jest-environment jsdom */
import React, { createRef } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';

// Mock child components to isolate ProjectConfiguration logic
jest.mock('../src/components/ConfigSection', () => () => <div data-testid="config-section" />);
jest.mock('../src/components/Notification', () => props => props.isVisible ? <div data-testid="notification">{props.message}</div> : null);
jest.mock('../src/components/StoppingStatusScreen', () => props => props.isVisible ? <div data-testid="stopping">Stopping</div> : null);
jest.mock('../src/components/RunButton', () => props => <button data-testid="run-btn" disabled={props.disabled} onClick={props.onClick}>Run</button>);

// Mock generateCommandList to return a deterministic command list
jest.mock('../src/utils/evalUtils', () => ({
  generateCommandList: jest.fn(() => [{ command: 'echo 1', sectionId: 'sec1', tabTitle: 'T1' }])
}));

// Mock useProjectConfig hook
jest.mock('../src/hooks/useProjectConfig', () => ({
  useProjectConfig: () => ({
    configState: { sec1: { enabled: true } },
    attachState: {},
    warningState: {},
    initialized: true,
    setConfigState: jest.fn(),
    setAttachState: jest.fn(),
    toggleSectionEnabled: jest.fn(),
    toggleSubSectionEnabled: jest.fn(),
    setMode: jest.fn(),
    handleAttachToggle: jest.fn(),
    setSectionDropdownValue: jest.fn()
  })
}));

import ProjectConfiguration from '../src/components/ProjectConfiguration.jsx';
import { generateCommandList } from '../src/utils/evalUtils';

describe('ProjectConfiguration run logic', () => {
  const setup = () => {
    const terminalRef = {
      current: {
        openTabs: jest.fn(),
        killAllTerminals: jest.fn(() => Promise.resolve()),
        clearTabs: jest.fn()
      }
    };
    const onIsRunningChange = jest.fn();
    const ref = createRef();
    const utils = render(
      <ProjectConfiguration
        ref={ref}
        projectName="proj"
        globalDropdownValues={{}}
        terminalRef={terminalRef}
        verificationStatuses={{}}
        onTriggerRefresh={jest.fn()}
        showTestSections={false}
        onConfigStateChange={jest.fn()}
        onIsRunningChange={onIsRunningChange}
        openFloatingTerminal={jest.fn()}
        discoveredVersions={{}}
        onBranchChangeError={jest.fn()}
        showAppNotification={jest.fn()}
        onFixCommand={jest.fn()}
        isCollapsed={false}
      />
    );
    return { utils, terminalRef, onIsRunningChange, ref };
  };

  test('starts and stops project execution', async () => {
    const { utils, terminalRef, onIsRunningChange } = setup();
    const runButton = utils.getByTestId('run-btn');

    // Start execution
    fireEvent.click(runButton);
    expect(generateCommandList).toHaveBeenCalled();
    expect(terminalRef.current.openTabs).toHaveBeenCalledWith([{ command: 'echo 1', sectionId: 'sec1', tabTitle: 'T1' }]);
    expect(onIsRunningChange).toHaveBeenCalledWith(true);

    // Stop execution
    fireEvent.click(runButton);
    await waitFor(() => expect(terminalRef.current.killAllTerminals).toHaveBeenCalled());
    expect(terminalRef.current.clearTabs).toHaveBeenCalled();
    await waitFor(() => expect(onIsRunningChange).toHaveBeenLastCalledWith(false));
  });

  test('imperative handle exposes state functions', () => {
    const { ref } = setup();
    const newConfig = { sec2: { enabled: true } };
    const newAttach = { sec2: true };
    ref.current.setStateFromImport({ configState: newConfig, attachState: newAttach });
    expect(ref.current.getCurrentState()).toEqual({ configState: { sec1: { enabled: true } }, attachState: {} });
  });
});

