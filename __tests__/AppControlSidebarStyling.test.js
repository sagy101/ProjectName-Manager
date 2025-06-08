/**
 * @jest-environment jsdom
 */
const React = require('react');
const { render } = require('@testing-library/react');
const AppControlSidebar = require('../src/components/AppControlSidebar').default;

describe('AppControlSidebar styling', () => {
  test('applies expanded and collapsed classes', () => {
    const props = {
      floatingTerminals: [],
      onShowTerminal: jest.fn(),
      onCloseTerminal: jest.fn(),
      onToggleMinimize: jest.fn(),
      onOpenAbout: jest.fn(),
      activeFloatingTerminalId: null,
      onToggleExpand: jest.fn(),
      showTestSections: false,
      noRunMode: false,
      isIsoRunning: false,
      onToggleTestSections: jest.fn(),
      onToggleNoRunMode: jest.fn(),
      showAppNotification: jest.fn(),
      isMainTerminalWritable: false,
      onToggleMainTerminalWritable: jest.fn()
    };

    const { container, rerender } = render(
      React.createElement(AppControlSidebar, { ...props, isExpanded: true })
    );
    expect(container.firstChild.className).toContain('expanded');

    rerender(React.createElement(AppControlSidebar, { ...props, isExpanded: false }));
    expect(container.firstChild.className).toContain('collapsed');
  });
});
