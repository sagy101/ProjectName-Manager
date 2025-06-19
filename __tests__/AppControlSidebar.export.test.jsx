/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import AppControlSidebar from '../src/project-config/AppControlSidebar';

beforeEach(() => {
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  URL.createObjectURL = jest.fn(() => 'blob:url');
  URL.revokeObjectURL = jest.fn();
});

function getDefaultProps(showAppNotification) {
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
    showAppNotification,
    isMainTerminalWritable: false,
    onToggleMainTerminalWritable: jest.fn(),
    onExportConfig: jest.fn(),
    onImportConfig: jest.fn(),
    onToggleAllVerifications: jest.fn(),
    onOpenHealthReport: jest.fn(),
    healthStatus: 'green'
  };
}

test('exportEnvironment succeeds and notifies user', async () => {
  window.electron = { exportEnvironmentData: jest.fn().mockResolvedValue({ ok: true }) };
  const notify = jest.fn();
  const { getByText, getByTitle } = render(<AppControlSidebar {...getDefaultProps(notify)} />);
  fireEvent.click(getByText('Debug'));
  fireEvent.click(getByTitle('Export Environment Data'));
  await waitFor(() => expect(window.electron.exportEnvironmentData).toHaveBeenCalled());
  expect(notify).toHaveBeenCalledWith('Environment data exported successfully', 'info');
});

test('exportEnvironment handles errors', async () => {
  window.electron = { exportEnvironmentData: jest.fn().mockRejectedValue(new Error('fail')) };
  const notify = jest.fn();
  const { getByText, getByTitle } = render(<AppControlSidebar {...getDefaultProps(notify)} />);
  fireEvent.click(getByText('Debug'));
  fireEvent.click(getByTitle('Export Environment Data'));
  await waitFor(() => expect(window.electron.exportEnvironmentData).toHaveBeenCalled());
  expect(notify).toHaveBeenCalledWith('Failed to export environment data', 'error');
});
