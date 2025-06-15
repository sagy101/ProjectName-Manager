/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import DebugPanel from '../src/components/DebugPanel';
import AppControlSidebar from '../src/components/AppControlSidebar';

// Mock ResizeObserver for JSDOM
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock electron API
global.window = {};
window.electron = {
  openDevTools: jest.fn(),
  reloadApp: jest.fn(),
  exportConfig: jest.fn(),
  importConfig: jest.fn(),
  onCommandOutput: jest.fn(() => jest.fn()),
  setDirectOutputHandler: jest.fn(() => jest.fn()),
};

describe('Debug Functionality Unit Tests', () => {
  
  describe('DebugPanel Component', () => {
    const defaultProps = {
      onToggleVerificationStatus: jest.fn(),
      onToggleTestSections: jest.fn(),
      showTestSections: false,
      onToggleNoRunMode: jest.fn(),
      noRunMode: false,
      isProjectRunning: false,
      showAppNotification: jest.fn(),
      isOpen: true,
      onClose: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should render debug panel when open', () => {
      const { getByText } = render(<DebugPanel {...defaultProps} />);
      
      expect(getByText('Debug Tools')).toBeInTheDocument();
      expect(getByText('Open Dev Tools')).toBeInTheDocument();
      expect(getByText('Reload App')).toBeInTheDocument();
      expect(getByText('No Run Mode')).toBeInTheDocument();
    });

    test('should not render debug panel when closed', () => {
      const { queryByText } = render(<DebugPanel {...defaultProps} isOpen={false} />);
      
      expect(queryByText('Debug Tools')).not.toBeInTheDocument();
    });

    test('should toggle no run mode when button is clicked', () => {
      const { getByText } = render(<DebugPanel {...defaultProps} />);
      
      const noRunModeButton = getByText('No Run Mode');
      fireEvent.click(noRunModeButton);
      
      expect(defaultProps.onToggleNoRunMode).toHaveBeenCalledTimes(1);
    });

    test('should toggle test sections when button is clicked', () => {
      const { getByText } = render(<DebugPanel {...defaultProps} />);
      
      const testSectionsButton = getByText(/Show.*Test Sections/);
      fireEvent.click(testSectionsButton);
      
      expect(defaultProps.onToggleTestSections).toHaveBeenCalledTimes(1);
    });

    test('should show active state for enabled options', () => {
      const { getByText } = render(
        <DebugPanel {...defaultProps} noRunMode={true} showTestSections={true} />
      );
      
      const noRunModeButton = getByText('No Run Mode');
      const testSectionsButton = getByText(/Hide.*Test Sections/);
      
      expect(noRunModeButton).toHaveClass('active');
      expect(testSectionsButton).toHaveClass('active');
    });

    test('should disable buttons when project is running', () => {
      const { getByText } = render(<DebugPanel {...defaultProps} isProjectRunning={true} />);
      
      const noRunModeButton = getByText('No Run Mode');
      const testSectionsButton = getByText(/Show.*Test Sections/);
      
      expect(noRunModeButton).toBeDisabled();
      expect(testSectionsButton).toBeDisabled();
      expect(noRunModeButton).toHaveClass('disabled');
      expect(testSectionsButton).toHaveClass('disabled');
    });

    test('should call openDevTools when dev tools button is clicked', () => {
      const { getByText } = render(<DebugPanel {...defaultProps} />);
      
      const devToolsButton = getByText('Open Dev Tools');
      fireEvent.click(devToolsButton);
      
      expect(window.electron.openDevTools).toHaveBeenCalledTimes(1);
    });

    test('should call reloadApp when reload button is clicked', () => {
      const { getByText } = render(<DebugPanel {...defaultProps} />);
      
      const reloadButton = getByText('Reload App');
      fireEvent.click(reloadButton);
      
      expect(window.electron.reloadApp).toHaveBeenCalledTimes(1);
    });

    test('should close panel when close button is clicked', () => {
      const { getByText } = render(<DebugPanel {...defaultProps} />);
      
      const closeButton = getByText('×');
      fireEvent.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('AppControlSidebar Debug Integration', () => {
    const defaultSidebarProps = {
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
      showAppNotification: jest.fn(),
      isMainTerminalWritable: false,
      onToggleMainTerminalWritable: jest.fn(),
      onExportConfig: jest.fn(),
      onImportConfig: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should show debug toggle button', () => {
      const { container } = render(<AppControlSidebar {...defaultSidebarProps} />);
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).toBeInTheDocument();
    });

    test('should show active options indicator when debug modes are enabled', () => {
      const { container } = render(
        <AppControlSidebar {...defaultSidebarProps} noRunMode={true} />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).toHaveClass('has-active-options');
    });

    test('should show active options indicator when test sections are shown', () => {
      const { container } = render(
        <AppControlSidebar {...defaultSidebarProps} showTestSections={true} />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).toHaveClass('has-active-options');
    });

    test('should not show active options indicator when no debug modes are enabled', () => {
      const { container } = render(<AppControlSidebar {...defaultSidebarProps} />);
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).not.toHaveClass('has-active-options');
    });

    test('should call toggle functions when debug options are clicked', () => {
      const { getByText } = render(<AppControlSidebar {...defaultSidebarProps} />);
      
      // First click debug button to expand debug section
      const debugButton = getByText('Debug');
      fireEvent.click(debugButton);
      
      // Now click the debug options
      const noRunModeButton = getByText('No Run Mode');
      const testSectionsButton = getByText(/Show Tests/);
      
      fireEvent.click(noRunModeButton);
      fireEvent.click(testSectionsButton);
      
      expect(defaultSidebarProps.onToggleNoRunMode).toHaveBeenCalledTimes(1);
      expect(defaultSidebarProps.onToggleTestSections).toHaveBeenCalledTimes(1);
    });

    test('should call import/export functions when buttons are clicked', () => {
      const { getByTitle } = render(<AppControlSidebar {...defaultSidebarProps} />);
      
      // First click debug button to expand debug section
      const debugToggle = getByTitle(/Debug Tools/);
      fireEvent.click(debugToggle);
      
      // Click export and import buttons
      const exportButton = getByTitle('Export Configuration');
      const importButton = getByTitle('Import Configuration');
      
      fireEvent.click(exportButton);
      fireEvent.click(importButton);
      
      expect(defaultSidebarProps.onExportConfig).toHaveBeenCalledTimes(1);
      expect(defaultSidebarProps.onImportConfig).toHaveBeenCalledTimes(1);
    });

    test('should toggle main terminal writable mode', () => {
      const { getByTitle } = render(<AppControlSidebar {...defaultSidebarProps} />);
      
      // First click debug button to expand debug section
      const debugToggle = getByTitle(/Debug Tools/);
      fireEvent.click(debugToggle);
      
      // Click terminal mode button
      const terminalModeButton = getByTitle('Enable Terminal Input');
      fireEvent.click(terminalModeButton);
      
      expect(defaultSidebarProps.onToggleMainTerminalWritable).toHaveBeenCalledTimes(1);
    });
  });

  // Note: Terminal component tests are handled in e2e tests due to xterm.js DOM requirements

  describe('Debug State Management', () => {
    const debugTestSidebarProps = {
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
      showAppNotification: jest.fn(),
      isMainTerminalWritable: false,
      onToggleMainTerminalWritable: jest.fn(),
      onExportConfig: jest.fn(),
      onImportConfig: jest.fn(),
      onToggleAllVerifications: jest.fn()
    };

    test('should prevent debug mode changes when project is running', () => {
      const onToggleNoRunMode = jest.fn();
      const onToggleTestSections = jest.fn();
      const showAppNotification = jest.fn();
      
      const { getByText } = render(
        <AppControlSidebar 
          {...debugTestSidebarProps}
          isProjectRunning={true}
          onToggleNoRunMode={onToggleNoRunMode}
          onToggleTestSections={onToggleTestSections}
          showAppNotification={showAppNotification}
        />
      );
      
      // Expand debug section
      const debugButton = getByText('Debug');
      fireEvent.click(debugButton);
      
      // Try to click disabled buttons
      const noRunModeButton = getByText('No Run Mode');
      const testSectionsButton = getByText(/Show Tests/);
      
      fireEvent.click(noRunModeButton);
      fireEvent.click(testSectionsButton);
      
      // Functions should not be called when project is running
      expect(onToggleNoRunMode).not.toHaveBeenCalled();
      expect(onToggleTestSections).not.toHaveBeenCalled();
    });

    test('should call toggle all verifications function when button is clicked', () => {
      const onToggleAllVerifications = jest.fn();
      
      const { getByText, container } = render(
        <AppControlSidebar 
          {...debugTestSidebarProps}
          onToggleAllVerifications={onToggleAllVerifications}
        />
      );
      
      // Expand debug section
      const debugButton = getByText('Debug');
      fireEvent.click(debugButton);
      
      // Click the toggle verifications button
      const buttons = container.querySelectorAll('button');
      let toggleVerificationsButton = null;
      for (const button of buttons) {
        if (button.textContent.includes('Toggle Verifications')) {
          toggleVerificationsButton = button;
          break;
        }
      }
      
      expect(toggleVerificationsButton).not.toBeNull();
      fireEvent.click(toggleVerificationsButton);
      
      expect(onToggleAllVerifications).toHaveBeenCalledTimes(1);
    });

    test('should disable toggle verifications button when project is running', () => {
      const onToggleAllVerifications = jest.fn();
      
      const { getByText, container } = render(
        <AppControlSidebar 
          {...debugTestSidebarProps}
          isProjectRunning={true}
          onToggleAllVerifications={onToggleAllVerifications}
        />
      );
      
      // Expand debug section
      const debugButton = getByText('Debug');
      fireEvent.click(debugButton);
      
      // Check that the toggle verifications button is disabled
      // Use container.querySelector to find the button that contains the "Toggle Verifications" span
      const toggleVerificationsButton = container.querySelector('button:has([text="Toggle Verifications"])') || 
                                       container.querySelector('button').parentNode.querySelector('span').textContent === 'Toggle Verifications' ? 
                                       container.querySelector('button') : null;
      
      // Alternative approach: find button by looking for the button that has the onClick handler
      const buttons = container.querySelectorAll('button');
      let targetButton = null;
      for (const button of buttons) {
        if (button.textContent.includes('Toggle Verifications')) {
          targetButton = button;
          break;
        }
      }
      
      expect(targetButton).not.toBeNull();
      expect(targetButton).toBeDisabled();
      expect(targetButton).toHaveClass('disabled');
      
      // Clicking should not trigger the function
      fireEvent.click(targetButton);
      expect(onToggleAllVerifications).not.toHaveBeenCalled();
    });

    test('should maintain debug state visual indicators', () => {
      const { container, rerender } = render(
        <AppControlSidebar {...debugTestSidebarProps} noRunMode={false} />
      );
      
      let debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).not.toHaveClass('has-active-options');
      
      // Update props to enable no run mode
      rerender(
        <AppControlSidebar {...debugTestSidebarProps} noRunMode={true} />
      );
      
      debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).toHaveClass('has-active-options');
    });
  });
}); 