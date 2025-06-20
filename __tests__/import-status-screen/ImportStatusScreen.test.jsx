/** @jest-environment jsdom */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImportStatusScreen from '../../src/import-status-screen/ImportStatusScreen.jsx';

describe('ImportStatusScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('runs import flow and shows completion message', async () => {
    const onImportComplete = jest.fn(async (updateBranch, updateConfig) => {
      updateConfig('success', 'done');
      updateBranch('sec1', 'success', 'done');
    });
    render(
      <ImportStatusScreen
        isVisible
        projectName="demo"
        gitBranches={{ sec1: 'main' }}
        onClose={() => {}}
        onImportComplete={onImportComplete}
      />
    );

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(onImportComplete).toHaveBeenCalled();
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText('Configuration imported with 1/1 git branches switched')).toBeInTheDocument();
  });

  test('shows progress indicators while import is running', async () => {
    let resolveImport;
    let branchUpdater;
    let configUpdater;
    const onImportComplete = jest.fn((uBranch, uConfig) => {
      branchUpdater = uBranch;
      configUpdater = uConfig;
      return new Promise(resolve => {
        resolveImport = resolve;
      });
    });
    render(
      <ImportStatusScreen
        isVisible
        projectName="demo"
        gitBranches={{ sec1: 'main' }}
        onClose={() => {}}
        onImportComplete={onImportComplete}
      />
    );

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(onImportComplete).toHaveBeenCalled();
    expect(screen.getByText('Importing...')).toBeInTheDocument();
    expect(screen.getByText('Switching...')).toBeInTheDocument();

    act(() => {
      configUpdater('success', 'done');
      branchUpdater('sec1', 'success', 'done');
      resolveImport();
    });

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText('Configuration imported with 1/1 git branches switched')).toBeInTheDocument();
  });

  test('returns null when not visible', () => {
    const { container, rerender } = render(
      <ImportStatusScreen isVisible={false} projectName="demo" />
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <ImportStatusScreen
        isVisible
        projectName="demo"
        onClose={() => {}}
        gitBranches={{ sec1: 'main' }}
      />
    );
    expect(container.firstChild).not.toBeNull();
  });

  test('displays progress then error status when import fails', async () => {
    const onImportComplete = jest.fn(() => Promise.reject(new Error('boom')));
    render(
      <ImportStatusScreen
        isVisible
        projectName="demo"
        gitBranches={{ sec1: 'main' }}
        onClose={() => {}}
        onImportComplete={onImportComplete}
      />
    );

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(onImportComplete).toHaveBeenCalled();

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });
});
