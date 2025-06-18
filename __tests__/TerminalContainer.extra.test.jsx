/** @jest-environment jsdom */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Globals used by jest.mock factories
global.capturedTabProps = {};
global.capturedOnProcessStarted = undefined;
global.capturedTabInfoProps = undefined;

jest.mock('../src/components/TerminalTab', () => (props) => {
  global.capturedTabProps[props.id] = props;
  return <div data-testid={`terminal-tab-${props.id}`} data-active={props.active}>{props.title}</div>;
});

jest.mock('../src/components/Terminal', () => (props) => {
  global.capturedOnProcessStarted = props.onProcessStarted;
  return <div data-testid={`terminal-component-${props.id}`} data-active={props.active}>{props.initialCommand}</div>;
});

jest.mock('../src/components/TabInfoPanel', () => (props) => {
  global.capturedTabInfoProps = props;
  return <div data-testid="tab-info-panel" />;
});

jest.mock('../src/components/TerminalPlaceholder', () => ({ projectName }) => <div data-testid="terminal-placeholder">Waiting to Run {projectName}</div>);

jest.mock('../src/components/OverflowTabsDropdown', () => () => <div data-testid="overflow-dropdown"></div>);

let mockVisibleTabs = [];
let mockOverflowTabs = [];
const mockSetOverflowTabsOpen = jest.fn();

jest.mock('../src/hooks/useTabManagement', () => ({
  useTabManagement: jest.fn(() => ({
    visibleTabs: mockVisibleTabs,
    overflowTabs: mockOverflowTabs,
    overflowTabsOpen: false,
    setOverflowTabsOpen: mockSetOverflowTabsOpen,
    toggleOverflowTabs: jest.fn()
  }))
}));

import TerminalContainer from '../src/components/TerminalContainer';

beforeEach(() => {
  global.capturedTabProps = {};
  global.capturedOnProcessStarted = undefined;
  global.capturedTabInfoProps = undefined;
  mockVisibleTabs = [];
  mockOverflowTabs = [];
});

test('updates terminal status when process starts', () => {
  const ref = React.createRef();
  render(<TerminalContainer ref={ref} />);
  act(() => {
    ref.current.openTabs([{ title: 'A', command: 'a' }]);
  });
  const id = ref.current.getTerminals()[0].id;
  act(() => {
    global.capturedOnProcessStarted(id);
  });
  expect(ref.current.getTerminals()[0].status).toBe('running');
});

