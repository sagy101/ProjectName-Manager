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
});
