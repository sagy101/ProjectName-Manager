/** @jest-environment jsdom */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import AppControlSidebar from '../src/components/AppControlSidebar.jsx';
import AttachToggle from '../src/components/AttachToggle.jsx';
import ConfigSection from '../src/components/ConfigSection.jsx';
import DebugPanel from '../src/components/DebugPanel.jsx';
import DeploymentOptions from '../src/components/DeploymentOptions.jsx';
import DropdownSelector from '../src/components/DropdownSelector.jsx';
import EnvironmentVerification from '../src/components/EnvironmentVerification.jsx';
import FloatingTerminal from '../src/components/FloatingTerminal.jsx';
import GitBranchSwitcher from '../src/components/GitBranchSwitcher.jsx';
import ImportStatusScreen from '../src/components/ImportStatusScreen.jsx';
import IsoConfiguration from '../src/components/IsoConfiguration.jsx';
import LoadingScreen from '../src/components/LoadingScreen.jsx';
import Notification from '../src/components/Notification.jsx';
import StoppingStatusScreen from '../src/components/StoppingStatusScreen.jsx';
import TabInfoPanel from '../src/components/TabInfoPanel.jsx';
import TerminalComponent from '../src/components/Terminal.jsx';
import TerminalContainer from '../src/components/TerminalContainer.jsx';
import TerminalTab from '../src/components/TerminalTab.jsx';
import Toggle from '../src/components/Toggle.jsx';
import VerificationIndicator from '../src/components/VerificationIndicator.jsx';
import sectionsData from '../src/configurationSidebarSections.json';

jest.mock('@xterm/xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    loadAddon: jest.fn(),
    open: jest.fn(),
    onData: jest.fn(() => ({ dispose: jest.fn() })),
    onResize: jest.fn(() => ({ dispose: jest.fn() })),
    write: jest.fn(),
    dispose: jest.fn(),
    clear: jest.fn()
  }))
}));

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => ({ fit: jest.fn() }))
}));

// Provide minimal global mocks
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  global.window = {};
  window.electron = new Proxy({}, {
    get: (target, prop) => {
      if (!target[prop]) {
        target[prop] = jest.fn(() => jest.fn());
      }
      return target[prop];
    }
  });
});

describe('AppControlSidebar', () => {
  it('should call onToggleExpand when the expand button is clicked', () => {
    const onToggleExpand = jest.fn();
    const { getByTitle } = render(
      <AppControlSidebar
        isExpanded={false}
        onToggleExpand={onToggleExpand}
        floatingTerminals={[]}
        onShowTerminal={() => {}}
        onCloseTerminal={() => {}}
        onToggleMinimize={() => {}}
        onOpenAbout={() => {}}
        activeFloatingTerminalId={null}
        showTestSections={false}
        noRunMode={false}
        isIsoRunning={false}
        onToggleTestSections={() => {}}
        onToggleNoRunMode={() => {}}
        showAppNotification={() => {}}
        isMainTerminalWritable={true}
        onToggleMainTerminalWritable={() => {}}
        onExportConfig={() => {}}
        onImportConfig={() => {}}
      />
    );
    fireEvent.click(getByTitle('Expand Sidebar'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  describe('Debug button highlighting', () => {
    const defaultProps = {
      floatingTerminals: [],
      onShowTerminal: () => {},
      onCloseTerminal: () => {},
      onToggleMinimize: () => {},
      onOpenAbout: () => {},
      activeFloatingTerminalId: null,
      isExpanded: false,
      onToggleExpand: () => {},
      onToggleTestSections: () => {},
      onToggleNoRunMode: () => {},
      showAppNotification: () => {},
      isMainTerminalWritable: true,
      onToggleMainTerminalWritable: () => {},
      onExportConfig: () => {},
      onImportConfig: () => {}
    };

    it('should show orange highlight when showTestSections is enabled', () => {
      const { container } = render(
        <AppControlSidebar
          {...defaultProps}
          showTestSections={true}
          noRunMode={false}
          isIsoRunning={false}
        />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).toHaveClass('has-active-options');
    });

    it('should show orange highlight when noRunMode is enabled', () => {
      const { container } = render(
        <AppControlSidebar
          {...defaultProps}
          showTestSections={false}
          noRunMode={true}
          isIsoRunning={false}
        />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).toHaveClass('has-active-options');
    });

    it('should show orange highlight when both showTestSections and noRunMode are enabled', () => {
      const { container } = render(
        <AppControlSidebar
          {...defaultProps}
          showTestSections={true}
          noRunMode={true}
          isIsoRunning={false}
        />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).toHaveClass('has-active-options');
    });

    it('should NOT show orange highlight when neither debug option is enabled', () => {
      const { container } = render(
        <AppControlSidebar
          {...defaultProps}
          showTestSections={false}
          noRunMode={false}
          isIsoRunning={false}
        />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).not.toHaveClass('has-active-options');
    });

    it('should KEEP orange highlight when showTestSections is enabled and ISO is running', () => {
      const { container } = render(
        <AppControlSidebar
          {...defaultProps}
          showTestSections={true}
          noRunMode={false}
          isIsoRunning={true}
        />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).toHaveClass('has-active-options');
    });

    it('should KEEP orange highlight when noRunMode is enabled and ISO is running', () => {
      const { container } = render(
        <AppControlSidebar
          {...defaultProps}
          showTestSections={false}
          noRunMode={true}
          isIsoRunning={true}
        />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton).toHaveClass('has-active-options');
    });

    it('should update tooltip to show "Active Options" when debug options are enabled', () => {
      const { container } = render(
        <AppControlSidebar
          {...defaultProps}
          showTestSections={true}
          noRunMode={false}
          isIsoRunning={false}
        />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton.getAttribute('title')).toContain('(Active Options)');
    });

    it('should NOT show "Active Options" in tooltip when no debug options are enabled', () => {
      const { container } = render(
        <AppControlSidebar
          {...defaultProps}
          showTestSections={false}
          noRunMode={false}
          isIsoRunning={false}
        />
      );
      
      const debugButton = container.querySelector('.debug-section-toggle-button');
      expect(debugButton.getAttribute('title')).not.toContain('(Active Options)');
    });
  });
});

describe('ConfigSection', () => {
  const section = sectionsData.sections.find(s => s.id === 'generic-section-1');
  const config = {
    enabled: true,
    'generic-subsection-1Config': { enabled: true }
  };
  const commonProps = {
    setDeploymentType: jest.fn(),
    setMode: jest.fn(),
    setSectionDropdownValue: jest.fn(),
    globalDropdownValues: {},
    isAttached: false,
    onAttachToggle: jest.fn(),
    isAttachWarning: false,
    isLocked: false,
    sectionPathStatus: 'valid',
    sectionGitBranch: 'main',
    onTriggerRefresh: jest.fn(),
    attachState: {},
    configState: {},
    toggleSubSectionEnabled: jest.fn(),
    setSubSectionDeploymentType: jest.fn(),
    onDropdownChange: jest.fn(),
    openFloatingTerminal: jest.fn()
  };

  it('should call toggleEnabled when the section is toggled', () => {
    const toggleEnabled = jest.fn();
    const { getAllByRole } = render(
      <ConfigSection
        section={section}
        config={config}
        toggleEnabled={toggleEnabled}
        {...commonProps}
      />
    );
    // The main section toggle is the first checkbox
    fireEvent.click(getAllByRole('checkbox')[0]);
    // The section is initially enabled (true), so clicking it toggles to false
    expect(toggleEnabled).toHaveBeenCalledWith(section.id, false);
  });
});

describe('DropdownSelector', () => {
  it('should render with placeholder text', async () => {
    window.electron.executeDropdownCommand = jest.fn().mockResolvedValue({ options: [] });
    const { findByText } = render(
      <DropdownSelector
        id="test-dropdown"
        command="test-command"
        onChange={() => {}}
        value={null}
      />
    );
    await findByText('No options available');
  });
});

describe('GitBranchSwitcher', () => {
  it('should call onBranchChangeSuccess when a different branch is selected', async () => {
    const onBranchChangeSuccess = jest.fn();
    const mockBranches = ['main', 'dev'];
    window.electron.gitListLocalBranches = jest.fn().mockResolvedValue({ success: true, branches: mockBranches });
    window.electron.gitCheckoutBranch = jest.fn().mockResolvedValue({ success: true });

    const { getByText, findByText } = render(
      <GitBranchSwitcher
        projectPath="/test/path"
        currentBranch="main"
        onBranchChangeSuccess={onBranchChangeSuccess}
      />
    );

    // Open the dropdown by clicking the button showing the current branch
    fireEvent.click(getByText('main'));

    // Wait for the other branch to be visible
    const devBranch = await findByText('dev');

    // Click the 'dev' branch
    fireEvent.click(devBranch);

    // Wait for the checkout to complete and the callback to be called
    await waitFor(() => {
      expect(onBranchChangeSuccess).toHaveBeenCalled();
    });
  });
});

describe('Component render tests', () => {
  test('AttachToggle renders and toggles', () => {
    const onToggle = jest.fn();
    const { getByRole } = render(<AttachToggle id="a" isAttached={false} onToggle={onToggle} />);
    fireEvent.click(getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  test('DeploymentOptions calls onChange', () => {
    const handle = jest.fn();
    const { getAllByRole } = render(<DeploymentOptions sectionId="s" currentType="container" onChange={handle} />);
    fireEvent.click(getAllByRole('button')[1]);
    expect(handle).toHaveBeenCalledWith('process');
  });

  test('Toggle checkbox works', () => {
    const handle = jest.fn();
    const { getByRole } = render(<Toggle id="t" label="Test" checked={false} onChange={handle} />);
    fireEvent.click(getByRole('checkbox'));
    expect(handle).toHaveBeenCalledWith(true);
  });

  test('Notification visible', () => {
    const handle = jest.fn();
    const { getByText } = render(<Notification message="Hello" isVisible={true} onClose={handle} />);
    expect(getByText('Hello')).toBeInTheDocument();
  });

  test('LoadingScreen shows progress', () => {
    const { getByText } = render(<LoadingScreen progress={50} />);
    expect(getByText('50%')).toBeInTheDocument();
  });

  test('VerificationIndicator renders', () => {
    const { getByText } = render(<VerificationIndicator label="L" status="valid" />);
    expect(getByText('L')).toBeInTheDocument();
  });

  test('TerminalTab click calls onSelect', () => {
    const handle = jest.fn();
    const { getByText } = render(<TerminalTab id="1" title="Tab" status="idle" active={false} onSelect={handle} onClose={() => {}} onInfo={() => {}} />);
    fireEvent.click(getByText('Tab'));
    expect(handle).toHaveBeenCalledWith('1');
  });

  test('AppControlSidebar renders', () => {
    render(
      <AppControlSidebar
        floatingTerminals={[]}
        onShowTerminal={() => {}}
        onCloseTerminal={() => {}}
        onToggleMinimize={() => {}}
        onOpenAbout={() => {}}
        activeFloatingTerminalId={null}
        isExpanded={false}
        onToggleExpand={() => {}}
        showTestSections={false}
        noRunMode={false}
        isIsoRunning={false}
        onToggleTestSections={() => {}}
        onToggleNoRunMode={() => {}}
        showAppNotification={() => {}}
        isMainTerminalWritable={true}
        onToggleMainTerminalWritable={() => {}}
        onExportConfig={() => {}}
        onImportConfig={() => {}}
      />
    );
  });

  test('ConfigSection renders', () => {
    const section = { id: 'sec', title: 'Sec', components: {} };
    const config = { enabled: true };
    render(
      <ConfigSection
        section={section}
        config={config}
        toggleEnabled={() => {}}
        setDeploymentType={() => {}}
        setMode={() => {}}
        setSectionDropdownValue={() => {}}
        globalDropdownValues={{}}
        isAttached={false}
        onAttachToggle={() => {}}
        isAttachWarning={false}
        isLocked={false}
        sectionPathStatus={''}
        sectionGitBranch={'main'}
        onTriggerRefresh={() => {}}
        attachState={{}}
        configState={{}}
        toggleSubSectionEnabled={() => {}}
        setSubSectionDeploymentType={() => {}}
        onDropdownChange={() => {}}
        openFloatingTerminal={() => {}}
      />
    );
  });

  test('DebugPanel renders', () => {
    render(
      <DebugPanel
        onToggleVerificationStatus={() => {}}
        onToggleTestSections={() => {}}
        showTestSections={false}
        onToggleNoRunMode={() => {}}
        noRunMode={false}
        isIsoRunning={false}
        showAppNotification={() => {}}
        isOpen={false}
        onClose={() => {}}
      />
    );
  });

  test('EnvironmentVerification renders', () => {
    render(
      <EnvironmentVerification
        statusMap={{}}
        verificationConfig={[]}
        headerConfig={{}}
        globalDropdownValues={{}}
        onGlobalDropdownChange={() => {}}
        onInitiateRefresh={() => {}}
      />
    );
  });

  test('FloatingTerminal renders', () => {
    render(
      <FloatingTerminal id="ft" title="Term" command="echo" isVisible={true} isMinimized={false} onClose={() => {}} onFocus={() => {}} onMinimize={() => {}} />
    );
  });

  test('GitBranchSwitcher renders', () => {
    render(
      <GitBranchSwitcher projectPath="/tmp" currentBranch="main" onBranchChangeSuccess={() => {}} />
    );
  });

  test('ImportStatusScreen renders', () => {
    render(
      <ImportStatusScreen
        isVisible={false}
        projectName="Proj"
        onClose={() => {}}
        gitBranches={{}}
        onImportComplete={() => {}}
      />
    );
  });

  test('IsoConfiguration renders', () => {
    render(
      <IsoConfiguration
        projectName="Proj"
        globalDropdownValues={{}}
        terminalRef={{ current: null }}
        verificationStatuses={{}}
        onTriggerRefresh={() => {}}
        onConfigStateChange={() => {}}
        onIsRunningChange={() => {}}
        openFloatingTerminal={() => {}}
      />
    );
  });

  test('StoppingStatusScreen renders', () => {
    render(
      <StoppingStatusScreen terminals={[]} isVisible={true} projectName="Proj" onClose={() => {}} />
    );
  });

  test('TabInfoPanel renders', () => {
    const term = { associatedContainers: [], status: 'idle' };
    render(
      <TabInfoPanel
        terminal={term}
        position={{ x: 0, y: 0 }}
        onClose={() => {}}
        onRefresh={() => {}}
        configState={{}}
        noRunMode={false}
        detailsPopupOpen={false}
        onOpenDetailsPopup={() => {}}
        onCloseDetailsPopup={() => {}}
      />
    );
  });

  test('TerminalComponent renders', () => {
    render(
      <TerminalComponent id="t" active={false} initialCommand="echo" noRunMode={true} isReadOnly={true} />
    );
  });

  test('TerminalContainer renders', () => {
    render(
      <TerminalContainer noRunMode={false} configState={{}} projectName="Proj" isReadOnly={false} />
    );
  });

  test('DropdownSelector renders', () => {
    render(
      <DropdownSelector id="d1" command="cmd" onChange={() => {}} />
    );
  });
});
