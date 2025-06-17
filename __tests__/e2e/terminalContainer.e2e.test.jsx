/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
jest.mock("../../src/components/Terminal", () => () => <div data-testid="mock-term"></div>);
import TerminalContainer from "../../src/components/TerminalContainer";
const { test, expect } = require('@playwright/test');
const { launchElectron, getTimeout } = require('./test-helpers');

// Helper function to convert containers like evalUtils.js does
function processContainers(containers) {
  return containers.map(c => typeof c === 'string' ? c : c.name).filter(c => c);
}

describe('TerminalContainer container cleanup', () => {
  function setup() {
    const stopContainers = jest.fn().mockResolvedValue(undefined);
    const killProcess = jest.fn();
    window.electron = { stopContainers, killProcess, onCommandOutput: () => () => {}, setDirectOutputHandler: () => () => {} };
    const ref = React.createRef();
    const utils = render(
      <TerminalContainer ref={ref} noRunMode={false} configState={{}} projectName="test" isReadOnly={false} />
    );
    return { ref, stopContainers, killProcess, ...utils };
  }

  test('stops containers when tab is refreshed', async () => {
    const { ref, stopContainers, getByTitle, getByText } = setup();
    await React.act(async () => {
      ref.current.openTabs([
        { sectionId: 'sec', title: 'Tab1', command: 'echo hi', associatedContainers: processContainers([{ name: 'cont1' }]) }
      ]);
    });
    fireEvent.click(getByTitle('Tab Information'));
    fireEvent.click(getByText('🔄 Refresh'));
    await waitFor(() => expect(stopContainers).toHaveBeenCalledWith(['cont1']), { timeout: getTimeout(10000) });
  });

  test('stops containers when all tabs are killed', async () => {
    const { ref, stopContainers } = setup();
    await React.act(async () => {
      ref.current.openTabs([
        { sectionId: 'sec', title: 'Tab1', command: 'echo hi', associatedContainers: processContainers([{ name: 'cont2' }, { name: 'cont3' }]) }
      ]);
    });
    await React.act(async () => {
      await ref.current.killAllTerminals();
    });
    expect(stopContainers).toHaveBeenCalledWith(['cont2', 'cont3']);
  });
});
