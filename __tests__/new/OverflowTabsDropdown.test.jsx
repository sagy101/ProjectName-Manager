import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OverflowTabsDropdown from '../../src/tab-info/components/OverflowTabsDropdown';

/** @jest-environment jsdom */

describe('OverflowTabsDropdown', () => {
  function setup(isOpen = true) {
    const container = document.createElement('div');
    const indicator = document.createElement('div');
    indicator.className = 'overflow-indicator';
    container.appendChild(indicator);
    document.body.appendChild(container);
    const ref = { current: container };
    const onSelectTab = jest.fn();
    const onShowTabInfo = jest.fn();
    const tabs = [
      { id: 'a', title: 'A', status: 'running' },
      { id: 'b', title: 'B', status: 'waiting' }
    ];
    render(
      <OverflowTabsDropdown
        isOpen={isOpen}
        tabs={tabs}
        activeTerminalId="a"
        onSelectTab={onSelectTab}
        onShowTabInfo={onShowTabInfo}
        containerRef={ref}
      />
    );
    return { onSelectTab, onShowTabInfo };
  }

  test('renders list of tabs when open', () => {
    setup();
    const dropdown = screen.getByTestId('overflow-dropdown');
    expect(dropdown).toBeInTheDocument();
    const items = dropdown.querySelectorAll('.overflow-tab');
    expect(items).toHaveLength(2);
  });

  test('triggers handlers on click', () => {
    const { onSelectTab, onShowTabInfo } = setup();
    const first = screen.getAllByText('A')[0].closest('.overflow-tab');
    fireEvent.click(first);
    expect(onSelectTab).toHaveBeenCalledWith('a');
    const infoButton = first.querySelector('.tab-info-button');
    fireEvent.click(infoButton);
    expect(onShowTabInfo).toHaveBeenCalledWith('a', expect.any(Object));
  });

  test('returns null when closed or no indicator', () => {
    const { container } = render(
      <OverflowTabsDropdown
        isOpen={false}
        tabs={[]}
        activeTerminalId="a"
        onSelectTab={() => {}}
        onShowTabInfo={() => {}}
        containerRef={{ current: null }}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
