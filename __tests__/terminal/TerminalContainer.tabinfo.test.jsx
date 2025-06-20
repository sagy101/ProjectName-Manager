/** @jest-environment jsdom */
import React from 'react';
import { render, act, screen } from '@testing-library/react';

// capture props from mocked components
global.capturedTabProps = {};
global.capturedTabInfoProps = undefined;

jest.mock('../../src/terminal/components/TerminalTab', () => (props) => {
  global.capturedTabProps[props.id] = props;
  return <div data-testid={`terminal-tab-${props.id}`}>{props.title}</div>;
});

jest.mock('../../src/terminal/components/Terminal', () => () => <div />);

jest.mock('../../src/tab-info/components/TabInfoPanel', () => (props) => {
  global.capturedTabInfoProps = props;
  return <div data-testid="tab-info-panel" />;
});

jest.mock('../../src/terminal/components/TerminalPlaceholder', () => () => <div data-testid="terminal-placeholder" />);

let mockVisibleTabs = [];
let mockOverflowTabs = [];
const mockSetOverflowTabsOpen = jest.fn();

jest.mock('../../src/tab-info/hooks/useTabManagement', () => ({
  useTabManagement: jest.fn((ref, terminals) => ({
    get visibleTabs() {
      return mockVisibleTabs.length > 0 ? mockVisibleTabs : terminals;
    },
    get overflowTabs() {
      return mockOverflowTabs;
    },
    overflowTabsOpen: false,
    setOverflowTabsOpen: mockSetOverflowTabsOpen,
    toggleOverflowTabs: jest.fn(),
  }))
}));

import TerminalContainer from '../../src/terminal/components/TerminalContainer';

beforeEach(() => {
  global.capturedTabProps = {};
  global.capturedTabInfoProps = undefined;
  mockVisibleTabs = [];
  mockOverflowTabs = [];
  mockSetOverflowTabsOpen.mockClear();
});


test('focusTab selects overflow tab and moves it first', async () => {
  const ref = React.createRef();
  render(<TerminalContainer ref={ref} />);

  await act(async () => {
    ref.current.openTabs([
      { title: 'A', command: 'a' },
      { title: 'B', command: 'b' },
      { title: 'C', command: 'c' }
    ]);
  });
  const terms = ref.current.getTerminals();
  expect(Object.keys(capturedTabProps)).toContain(String(terms[0].id));
  mockVisibleTabs.push(terms[0], terms[1]);
  mockOverflowTabs.push(terms[2]);

  await act(async () => {
    ref.current.focusTab(terms[2].id);
  });

  const updated = ref.current.getTerminals();
  expect(updated[0].id).toBe(terms[2].id);
  expect(mockSetOverflowTabsOpen).toHaveBeenCalledWith(false);
});

