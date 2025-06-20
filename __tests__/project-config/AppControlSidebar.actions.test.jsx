/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import AppControlSidebar from '../../src/project-config/AppControlSidebar';

beforeEach(() => {
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
});

function getProps(overrides = {}) {
  return {
    floatingTerminals: [],
    onShowTerminal: jest.fn(),
    onCloseTerminal: jest.fn(),
    onToggleMinimize: jest.fn(),
    onOpenAbout: jest.fn(),
    activeFloatingTerminalId: null,
    isExpanded: true,
    onToggleExpand: jest.fn(),
    showTestSections: false,
    noRunMode: false,
    isProjectRunning: false,
    onToggleTestSections: jest.fn(),
    onToggleNoRunMode: jest.fn(),
    showAppNotification: jest.fn(),
    isMainTerminalWritable: false,
    onToggleMainTerminalWritable: jest.fn(),
    onExportConfig: jest.fn(),
    onImportConfig: jest.fn(),
    onToggleAllVerifications: jest.fn(),
    onOpenHealthReport: jest.fn(),
    healthStatus: 'green',
    ...overrides
  };
}

test('dev tools and reload use electron API when available', () => {
  window.electron = { openDevTools: jest.fn(), reloadApp: jest.fn() };
  const props = getProps();
  const { getByText, getByTitle } = render(<AppControlSidebar {...props} />);
  fireEvent.click(getByTitle(/Debug Tools/));
  fireEvent.click(getByText('DevTools'));
  expect(window.electron.openDevTools).toHaveBeenCalled();
  fireEvent.click(getByText('⚠️ Reload (Risky)'));
  expect(window.electron.reloadApp).toHaveBeenCalled();
});


test('main terminal writable button triggers callback', () => {
  const toggle = jest.fn();
  const { getByText, getByTitle } = render(
    <AppControlSidebar {...getProps({ onToggleMainTerminalWritable: toggle })} />
  );
  fireEvent.click(getByTitle(/Debug Tools/));
  fireEvent.click(getByTitle('Enable Terminal Input'));
  expect(toggle).toHaveBeenCalled();
});

test('terminal action buttons call appropriate callbacks', () => {
  const onToggleMinimize = jest.fn();
  const onShowTerminal = jest.fn();
  const onOpenAbout = jest.fn();
  const onCloseTerminal = jest.fn();
  const term = { id: 't1', title: 'Term1', isVisible: true, isMinimized: false, hideFromSidebar: false };
  const { getByTitle, rerender } = render(
    <AppControlSidebar {...getProps({ floatingTerminals: [term], onToggleMinimize, onShowTerminal, onOpenAbout, onCloseTerminal })} />
  );
  fireEvent.click(getByTitle('Minimize'));
  fireEvent.click(getByTitle('About'));
  fireEvent.click(getByTitle('Close'));
  expect(onToggleMinimize).toHaveBeenCalledWith('t1');
  expect(onOpenAbout).toHaveBeenCalledWith('t1');
  expect(onCloseTerminal).toHaveBeenCalledWith('t1');

  rerender(
    <AppControlSidebar {...getProps({ floatingTerminals: [{ ...term, isMinimized: true }], onToggleMinimize, onShowTerminal })} />
  );
  fireEvent.click(getByTitle('Show'));
  expect(onShowTerminal).toHaveBeenCalledWith('t1');
});
