import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImportStatusScreen from '../../src/import-status-screen/ImportStatusScreen.jsx';

/** @jest-environment jsdom */

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

  test('does not render when not visible', () => {
    const onImportComplete = jest.fn();
    const { container } = render(
      <ImportStatusScreen
        isVisible={false}
        projectName="demo"
        onClose={() => {}}
        onImportComplete={onImportComplete}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(onImportComplete).not.toHaveBeenCalled();
  });

  test('shows success message without git branches', async () => {
    const onImportComplete = jest.fn(async (updateBranch, updateConfig) => {
      updateConfig('success', 'done');
    });
    render(
      <ImportStatusScreen
        isVisible
        projectName="demo"
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

    expect(screen.getByText('Configuration imported successfully')).toBeInTheDocument();
  });

  test('handles branch skipped result', async () => {
    const onImportComplete = jest.fn(async (updateBranch, updateConfig) => {
      updateConfig('success', 'done');
      updateBranch('sec1', 'skipped', 'done');
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

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText('Already current')).toBeInTheDocument();
    expect(screen.getByText('Configuration imported with 0/1 git branches switched')).toBeInTheDocument();
  });

  test('handles import errors gracefully', async () => {
    const onImportComplete = jest.fn(async () => {
      throw new Error('fail');
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

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(onImportComplete).toHaveBeenCalled();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
