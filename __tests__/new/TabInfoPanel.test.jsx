import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TabInfoPanel from '../../src/components/TabInfoPanel.jsx';

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
});
