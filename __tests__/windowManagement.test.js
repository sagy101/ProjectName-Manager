const events = {};

class MockBrowserWindow {
  constructor(options) {
    this.options = options;
    this.webContents = {
      send: jest.fn(),
      openDevTools: jest.fn(),
      isLoading: jest.fn(() => false),
      getURL: jest.fn(() => 'file:///index.html'),
      on: jest.fn(),
      setWindowOpenHandler: jest.fn()
    };
    this.isDestroyed = jest.fn(() => false);
    this.loadFile = jest.fn();
    this.once = jest.fn((ev, fn) => { events[ev] = fn; });
    this.on = jest.fn();
    this.show = jest.fn();
    this.focus = jest.fn();
    this.reload = jest.fn();
    this.close = jest.fn();
    this.minimize = jest.fn();
    this.maximize = jest.fn();
    this.unmaximize = jest.fn();
    this.hide = jest.fn();
    this.getSize = jest.fn(() => [this.options.width, this.options.height]);
    this.getPosition = jest.fn(() => [0, 0]);
    this.isMaximized = jest.fn(() => false);
    this.isMinimized = jest.fn(() => false);
    this.isFocused = jest.fn(() => false);
    this.isVisible = jest.fn(() => true);
    this.isFullScreen = jest.fn(() => false);
  }
}

jest.mock('electron', () => ({
  BrowserWindow: jest.fn((options) => new MockBrowserWindow(options))
}));

const wm = require('../src/main/windowManagement');
const { createWindow, openDevTools, reloadApp, minimizeMainWindow } = wm;

describe('windowManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HEADLESS = 'true';
  });

  test('createWindow uses headless options', () => {
    const win = createWindow();
    expect(win.options.show).toBe(false);
  });

  test('openDevTools triggers electron API', () => {
    const win = createWindow();
    const result = openDevTools();
    expect(win.webContents.openDevTools).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  test('reloadApp calls reload', () => {
    const win = createWindow();
    const result = reloadApp();
    expect(win.reload).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  test('minimizeMainWindow calls minimize', () => {
    const win = createWindow();
    const result = minimizeMainWindow();
    expect(win.minimize).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
