import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TabInfoPanel from '../../src/tab-info/components/TabInfoPanel.jsx';

/** @jest-environment jsdom */

describe('TabInfoPanel', () => {
  const terminal = {
    id: 't1',
    title: 'Test',
    status: 'running',
    command: 'echo hi',
    associatedContainers: []
  };

  const position = { x: 10, y: 20 };

  afterEach(() => {
    jest.clearAllTimers();
    if (window.electron) delete window.electron;
  });

  test('renders info and triggers handlers', () => {
    const onClose = jest.fn();
    const onRefresh = jest.fn();
    const onOpenDetailsPopup = jest.fn();
    render(
      <TabInfoPanel
        terminal={terminal}
        position={position}
        onClose={onClose}
        onRefresh={onRefresh}
        configState={{}}
        noRunMode={false}
        detailsPopupOpen={false}
        onOpenDetailsPopup={onOpenDetailsPopup}
        onCloseDetailsPopup={() => {}}
      />
    );

    expect(screen.getByText('Tab Information')).toBeInTheDocument();
    fireEvent.click(screen.getByText('More Details'));
    expect(onOpenDetailsPopup).toHaveBeenCalled();
    fireEvent.click(screen.getByText('🔄 Refresh'));
    expect(onRefresh).toHaveBeenCalledWith('t1');
  });

  test('shows warning when noRunMode', () => {
    render(
      <TabInfoPanel
        terminal={terminal}
        position={position}
        onClose={() => {}}
        onRefresh={() => {}}
        configState={{}}
        noRunMode={true}
        detailsPopupOpen={false}
        onOpenDetailsPopup={() => {}}
        onCloseDetailsPopup={() => {}}
      />
    );
    expect(screen.getByText('No Run Mode is active - refresh disabled')).toBeInTheDocument();
    expect(screen.getByText('🔄 Refresh')).toBeDisabled();
  });

  test('fetches container statuses when popup open', async () => {
    jest.useFakeTimers();
    const getStatus = jest.fn()
      .mockResolvedValueOnce('running')
      .mockResolvedValueOnce('stopped');
    window.electron = { getContainerStatus: getStatus };
    render(
      <TabInfoPanel
        terminal={{ ...terminal, associatedContainers: ['a', 'b'] }}
        position={position}
        onClose={() => {}}
        onRefresh={() => {}}
        configState={{}}
        noRunMode={false}
        detailsPopupOpen={true}
        onOpenDetailsPopup={() => {}}
        onCloseDetailsPopup={() => {}}
      />
    );
    await Promise.resolve();
    await Promise.resolve();
    jest.runOnlyPendingTimers();
    await screen.findByText('running');
    await screen.findByText('stopped');
    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  test('closes when clicking outside but not on popup', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(
      <TabInfoPanel
        terminal={{ ...terminal, associatedContainers: ['c'] }}
        position={position}
        onClose={onClose}
        onRefresh={() => {}}
        configState={{}}
        noRunMode={false}
        detailsPopupOpen={true}
        onOpenDetailsPopup={() => {}}
        onCloseDetailsPopup={() => {}}
      />
    );
    const overlay = document.querySelector('.command-popup-overlay');
    fireEvent.mouseDown(overlay);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  test('copy command button copies text and resets label', () => {
    jest.useFakeTimers();
    navigator.clipboard = { writeText: jest.fn() };
    render(
      <TabInfoPanel
        terminal={terminal}
        position={position}
        onClose={() => {}}
        onRefresh={() => {}}
        configState={{}}
        noRunMode={false}
        detailsPopupOpen={true}
        onOpenDetailsPopup={() => {}}
        onCloseDetailsPopup={() => {}}
      />
    );
    const button = screen.getByText('Copy Command');
    fireEvent.click(button);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('echo hi');
    expect(button.textContent).toBe('Copied!');
    jest.advanceTimersByTime(1500);
    expect(button.textContent).toBe('Copy Command');
  });
});
