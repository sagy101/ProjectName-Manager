/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import AppControlSidebar from '../src/components/AppControlSidebar';

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
    isExpanded: false,
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

test('toggleDebugSection expands when collapsed', () => {
  const props = getProps();
  const { getByTitle } = render(<AppControlSidebar {...props} />);
  fireEvent.click(getByTitle('Show Debug Tools'));
  expect(props.onToggleExpand).toHaveBeenCalledWith(true);
});

test('openDevTools warns when electron missing', () => {
  console.warn = jest.fn();
  const props = getProps({ isExpanded: true });
  const { getByText } = render(<AppControlSidebar {...props} />);
  fireEvent.click(getByText('Debug'));
  fireEvent.click(getByText('DevTools'));
  expect(console.warn).toHaveBeenCalledWith('Electron API not available for openDevTools');
});

test('reloadApp falls back when electron missing', () => {
  const reloadMock = jest.fn();
  Object.defineProperty(window, 'location', { value: { ...window.location, reload: reloadMock }, writable: true });
  const props = getProps({ isExpanded: true });
  const { getByText } = render(<AppControlSidebar {...props} />);
  fireEvent.click(getByText('Debug'));
  fireEvent.click(getByText('⚠️ Reload (Risky)'));
  expect(reloadMock).toHaveBeenCalled();
});
