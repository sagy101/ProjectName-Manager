/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useFloatingTerminals } from '../../src/floating-terminal/useFloatingTerminals';

// Mock the config file
jest.mock('../../src/project-config/config/configurationSidebarAbout.json', () => [
  {
    sectionId: 'test-command',
    description: 'Test command description'
  }
]);

// Mock the logger
jest.mock('../../src/common/utils/debugUtils.js', () => ({
  loggers: {
    terminal: {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn()
    }
  }
}));

describe('useFloatingTerminals', () => {
  let mockElectron;
  
  const defaultProps = {
    floatingTerminals: [],
    setFloatingTerminals: jest.fn(),
    activeFloatingTerminalId: null,
    setActiveFloatingTerminalId: jest.fn(),
    nextZIndex: 1001,
    setNextZIndex: jest.fn(),
    positionOffset: 30,
    isFloatingSidebarExpanded: false,
    setIsFloatingSidebarExpanded: jest.fn(),
    infoPanelState: { isVisible: false, terminalData: null, position: { x: 0, y: 0 }, detailsOpen: false },
    setInfoPanelState: jest.fn(),
    configState: {},
    noRunMode: false,
    settings: { maxFloatingTerminals: 5 },
    showAppNotification: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window dimensions
    global.innerWidth = 1200;
    global.innerHeight = 800;
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 800 });
    
    // Mock window.electron
    mockElectron = {
      onCommandStarted: jest.fn(() => jest.fn()),
      onCommandFinished: jest.fn(() => jest.fn()),
      onProcessEnded: jest.fn(() => jest.fn()),
      onCommandStatusUpdate: jest.fn(() => jest.fn()),
      showNotification: jest.fn()
    };
    
    Object.defineProperty(window, 'electron', {
      writable: true,
      value: mockElectron
    });
  });

  afterEach(() => {
    delete window.electron;
  });

  test('returns all expected functions', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    expect(result.current).toHaveProperty('showFloatingTerminal');
    expect(result.current).toHaveProperty('focusFloatingTerminal');
    expect(result.current).toHaveProperty('openFloatingTerminal');
    expect(result.current).toHaveProperty('closeFloatingTerminal');
    expect(result.current).toHaveProperty('toggleMinimizeFloatingTerminal');
    expect(result.current).toHaveProperty('hideFloatingTerminal');
    expect(result.current).toHaveProperty('showFloatingTerminalInfoPanel');
    expect(result.current).toHaveProperty('closeFloatingTerminalInfoPanel');
    expect(result.current).toHaveProperty('openInfoPanelDetails');
    expect(result.current).toHaveProperty('closeInfoPanelDetails');
    expect(result.current).toHaveProperty('openFixCommandTerminal');
    expect(result.current).toHaveProperty('toggleFloatingSidebarExpand');
  });

  test('showFloatingTerminal makes terminal visible', () => {
    const existingTerminals = [
      { id: 'test-1', isVisible: false, isMinimized: true, zIndex: 1000 }
    ];
    
    const { result } = renderHook(() => useFloatingTerminals({
      ...defaultProps,
      floatingTerminals: existingTerminals
    }));
    
    act(() => {
      result.current.showFloatingTerminal('test-1');
    });
    
    expect(defaultProps.setFloatingTerminals).toHaveBeenCalledWith(expect.any(Function));
    expect(defaultProps.setActiveFloatingTerminalId).toHaveBeenCalledWith('test-1');
    expect(defaultProps.setNextZIndex).toHaveBeenCalledWith(expect.any(Function));
  });

  test('focusFloatingTerminal updates active terminal and z-index', () => {
    const existingTerminals = [
      { id: 'test-1', zIndex: 1000 }
    ];
    
    const { result } = renderHook(() => useFloatingTerminals({
      ...defaultProps,
      floatingTerminals: existingTerminals
    }));
    
    act(() => {
      result.current.focusFloatingTerminal('test-1');
    });
    
    expect(defaultProps.setActiveFloatingTerminalId).toHaveBeenCalledWith('test-1');
    expect(defaultProps.setFloatingTerminals).toHaveBeenCalledWith(expect.any(Function));
    expect(defaultProps.setNextZIndex).toHaveBeenCalledWith(expect.any(Function));
  });

  test('openFloatingTerminal creates new terminal', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    let terminalId;
    act(() => {
      terminalId = result.current.openFloatingTerminal('test-cmd', 'Test Terminal', 'echo hello');
    });
    
    expect(terminalId).toBeDefined();
    expect(terminalId).toMatch(/^ft-\d+-test-cmd$/);
    expect(defaultProps.setFloatingTerminals).toHaveBeenCalledWith(expect.any(Function));
    expect(defaultProps.setActiveFloatingTerminalId).toHaveBeenCalledWith(terminalId);
    expect(defaultProps.setNextZIndex).toHaveBeenCalledWith(expect.any(Function));
  });

  test('openFloatingTerminal returns existing terminal if not fix command', () => {
    const existingTerminals = [
      { id: 'existing-1', commandId: 'test-cmd', title: 'Test Terminal', isVisible: false }
    ];
    
    const { result } = renderHook(() => useFloatingTerminals({
      ...defaultProps,
      floatingTerminals: existingTerminals
    }));
    
    let terminalId;
    act(() => {
      terminalId = result.current.openFloatingTerminal('test-cmd', 'Test Terminal', 'echo hello');
    });
    
    expect(terminalId).toBe('existing-1');
    expect(defaultProps.setFloatingTerminals).toHaveBeenCalledWith(expect.any(Function));
    expect(defaultProps.setActiveFloatingTerminalId).toHaveBeenCalledWith('existing-1');
  });

  test('openFloatingTerminal respects max terminals limit', () => {
    const maxTerminals = Array.from({length: 5}, (_, i) => ({
      id: `terminal-${i}`,
      commandId: `cmd-${i}`,
      title: `Terminal ${i}`
    }));
    
    const { result } = renderHook(() => useFloatingTerminals({
      ...defaultProps,
      floatingTerminals: maxTerminals
    }));
    
    let terminalId;
    act(() => {
      terminalId = result.current.openFloatingTerminal('new-cmd', 'New Terminal', 'echo hello');
    });
    
    expect(terminalId).toBe(null);
    expect(defaultProps.showAppNotification).toHaveBeenCalledWith(
      'Maximum number of floating terminals reached (5). Close some terminals to create new ones.',
      'warning'
    );
  });

  test('openFloatingTerminal handles options object', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    let terminalId;
    act(() => {
      terminalId = result.current.openFloatingTerminal('test-cmd', 'Test Terminal', 'echo hello', {
        isFixCommand: true,
        isAutoSetup: true,
        startMinimized: true,
        hideFromSidebar: true
      });
    });
    
    expect(terminalId).toBeDefined();
    expect(defaultProps.setFloatingTerminals).toHaveBeenCalledWith(expect.any(Function));
  });

  test('closeFloatingTerminal removes terminal', () => {
    const { result } = renderHook(() => useFloatingTerminals({
      ...defaultProps,
      activeFloatingTerminalId: 'test-1'
    }));
    
    act(() => {
      result.current.closeFloatingTerminal('test-1');
    });
    
    expect(defaultProps.setFloatingTerminals).toHaveBeenCalledWith(expect.any(Function));
    expect(defaultProps.setActiveFloatingTerminalId).toHaveBeenCalledWith(null);
  });

  test('toggleMinimizeFloatingTerminal toggles minimize state', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    act(() => {
      result.current.toggleMinimizeFloatingTerminal('test-1');
    });
    
    expect(defaultProps.setFloatingTerminals).toHaveBeenCalledWith(expect.any(Function));
  });

  test('hideFloatingTerminal hides terminal', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    act(() => {
      result.current.hideFloatingTerminal('test-1');
    });
    
    expect(defaultProps.setFloatingTerminals).toHaveBeenCalledWith(expect.any(Function));
  });

  test('showFloatingTerminalInfoPanel shows info panel for existing terminal', () => {
    const existingTerminals = [
      {
        id: 'test-1',
        commandId: 'test-command',
        title: 'Test Terminal',
        command: 'echo hello',
        status: 'idle',
        exitStatus: null,
        startTime: Date.now(),
        associatedContainers: []
      }
    ];
    
    const { result } = renderHook(() => useFloatingTerminals({
      ...defaultProps,
      floatingTerminals: existingTerminals
    }));
    
    act(() => {
      result.current.showFloatingTerminalInfoPanel('test-1');
    });
    
    expect(defaultProps.setInfoPanelState).toHaveBeenCalledWith(
      expect.objectContaining({
        isVisible: true,
        terminalData: expect.objectContaining({
          id: 'test-1',
          title: 'Test Terminal',
          sectionId: 'test-command'
        }),
        position: expect.objectContaining({ x: expect.any(Number), y: 100 }),
        detailsOpen: false
      })
    );
  });

  test('closeFloatingTerminalInfoPanel closes info panel', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    act(() => {
      result.current.closeFloatingTerminalInfoPanel();
    });
    
    expect(defaultProps.setInfoPanelState).toHaveBeenCalledWith(expect.any(Function));
  });

  test('openInfoPanelDetails opens details', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    act(() => {
      result.current.openInfoPanelDetails();
    });
    
    expect(defaultProps.setInfoPanelState).toHaveBeenCalledWith(expect.any(Function));
  });

  test('closeInfoPanelDetails closes details', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    act(() => {
      result.current.closeInfoPanelDetails();
    });
    
    expect(defaultProps.setInfoPanelState).toHaveBeenCalledWith(expect.any(Function));
  });

  test('openFixCommandTerminal creates fix command terminal', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    let terminalId;
    act(() => {
      terminalId = result.current.openFixCommandTerminal('verification-id', 'Verification Title', 'fix command');
    });
    
    expect(terminalId).toBeDefined();
    expect(defaultProps.setFloatingTerminals).toHaveBeenCalledWith(expect.any(Function));
  });

  test('toggleFloatingSidebarExpand toggles sidebar expansion', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    act(() => {
      result.current.toggleFloatingSidebarExpand();
    });
    
    expect(defaultProps.setIsFloatingSidebarExpanded).toHaveBeenCalledWith(expect.any(Function));
  });

  test('toggleFloatingSidebarExpand accepts explicit state', () => {
    const { result } = renderHook(() => useFloatingTerminals(defaultProps));
    
    act(() => {
      result.current.toggleFloatingSidebarExpand(true);
    });
    
    expect(defaultProps.setIsFloatingSidebarExpanded).toHaveBeenCalledWith(true);
  });

  test('sets up electron IPC listeners when electron is available', () => {
    renderHook(() => useFloatingTerminals(defaultProps));
    
    expect(mockElectron.onCommandStarted).toHaveBeenCalled();
    expect(mockElectron.onCommandFinished).toHaveBeenCalled();
    expect(mockElectron.onProcessEnded).toHaveBeenCalled();
    expect(mockElectron.onCommandStatusUpdate).toHaveBeenCalled();
  });

  test('does not set up listeners when electron is not available', () => {
    delete window.electron;
    
    renderHook(() => useFloatingTerminals(defaultProps));
    
    // Should not throw any errors
    expect(true).toBe(true);
  });
}); 