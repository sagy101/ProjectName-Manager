const events = {};

class MockBrowserWindow {
  constructor(options) {
    this.options = options;
    this.webContents = {
      send: jest.fn(),
      openDevTools: jest.fn(),
      isLoading: jest.fn(() => false),
      getURL: jest.fn(() => 'file:///index.html'),
      on: jest.fn((ev, fn) => { events[ev] = fn; }),
      setWindowOpenHandler: jest.fn(),
      setMaxListeners: jest.fn()
    };
    this.isDestroyed = jest.fn(() => false);
    this.loadFile = jest.fn();
    this.once = jest.fn((ev, fn) => { events[ev] = fn; });
    this.on = jest.fn((ev, fn) => { events[ev] = fn; });
    this.show = jest.fn();
    this.focus = jest.fn();
    this.reload = jest.fn();
    this.close = jest.fn();
    this.minimize = jest.fn();
    this.maximize = jest.fn();
    this.unmaximize = jest.fn();
    this.hide = jest.fn();
    this.setSize = jest.fn();
    this.setPosition = jest.fn();
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

const wm = require('../../src/main-process/windowManagement');
const {
  createWindow,
  openDevTools,
  reloadApp,
  minimizeMainWindow,
  maximizeMainWindow,
  showMainWindow,
  hideMainWindow,
  getWindowState,
  setWindowState,
  sendToRenderer,
  isWindowReady,
  closeMainWindow
} = wm;

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

  test('maximizeMainWindow maximizes when not maximized', () => {
    const win = createWindow();
    win.isMaximized
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const result = maximizeMainWindow();
    expect(win.maximize).toHaveBeenCalled();
    expect(result).toEqual({ success: true, isMaximized: true });
  });

  test('maximizeMainWindow unmaximizes when already maximized', () => {
    const win = createWindow();
    win.isMaximized
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    const result = maximizeMainWindow();
    expect(win.unmaximize).toHaveBeenCalled();
    expect(result).toEqual({ success: true, isMaximized: false });
  });

  test('showMainWindow shows and focuses the window', () => {
    const win = createWindow();
    const res = showMainWindow();
    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  test('hideMainWindow hides the window', () => {
    const win = createWindow();
    const res = hideMainWindow();
    expect(win.hide).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  test('getWindowState returns window info', () => {
    const win = createWindow();
    const state = getWindowState();
    expect(state.success).toBe(true);
    expect(state.state.width).toBe(win.options.width);
    expect(state.state.height).toBe(win.options.height);
  });

  test('setWindowState applies state', () => {
    const win = createWindow();
    const res = setWindowState({ width: 800, height: 600, x: 10, y: 20, isMaximized: true });
    expect(win.setSize).toHaveBeenCalledWith(800, 600);
    expect(win.setPosition).toHaveBeenCalledWith(10, 20);
    expect(win.maximize).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  test('sendToRenderer forwards messages', () => {
    const win = createWindow();
    const res = sendToRenderer('chan', { a: 1 });
    expect(win.webContents.send).toHaveBeenCalledWith('chan', { a: 1 });
    expect(res.success).toBe(true);
  });

  test('isWindowReady returns true when ready', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(false);
    win.webContents.isLoading.mockReturnValue(false);
    expect(isWindowReady()).toBe(true);
  });

  test('closeMainWindow calls close', () => {
    const win = createWindow();
    const res = closeMainWindow();
    expect(win.close).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  test('sendToRenderer fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const res = sendToRenderer('chan', {});
    expect(res.success).toBe(false);
  });

  test('isWindowReady false when loading', () => {
    const win = createWindow();
    win.webContents.isLoading.mockReturnValue(true);
    expect(isWindowReady()).toBe(false);
  });

  test('getWindowState fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const state = getWindowState();
    expect(state.success).toBe(false);
  });

  test('setWindowState fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const res = setWindowState({});
    expect(res.success).toBe(false);
  });

  test('setWindowState minimizes window', () => {
    const win = createWindow();
    const res = setWindowState({ isMinimized: true });
    expect(win.minimize).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  test('setWindowState returns error on exception', () => {
    const error = new Error('fail');
    const win = createWindow();
    win.setSize.mockImplementation(() => { throw error; });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = setWindowState({ width: 1, height: 1 });
    expect(spy).toHaveBeenCalled();
    expect(res.success).toBe(false);
    spy.mockRestore();
  });

  test('getMainWindow returns created instance', () => {
    const win = createWindow();
    expect(wm.getMainWindow()).toBe(win);
  });

  test('openDevTools fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const res = openDevTools();
    expect(win.webContents.openDevTools).not.toHaveBeenCalled();
    expect(res.success).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('reloadApp fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const res = reloadApp();
    expect(res.success).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('closeMainWindow fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const res = closeMainWindow();
    expect(res.success).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('minimizeMainWindow fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const res = minimizeMainWindow();
    expect(res.success).toBe(false);
  });

  test('maximizeMainWindow fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const res = maximizeMainWindow();
    expect(res.success).toBe(false);
  });

  test('showMainWindow fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const res = showMainWindow();
    expect(res.success).toBe(false);
  });

  test('hideMainWindow fails when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    const res = hideMainWindow();
    expect(res.success).toBe(false);
  });

  test('isWindowReady false when window destroyed', () => {
    const win = createWindow();
    win.isDestroyed.mockReturnValue(true);
    expect(isWindowReady()).toBe(false);
  });

  test('ready-to-show shows window when not headless', () => {
    process.env.HEADLESS = 'false';
    const win = createWindow();
    events['ready-to-show']();
    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
  });

  test('ready-to-show does not show in headless mode', () => {
    process.env.HEADLESS = 'true';
    const win = createWindow();
    events['ready-to-show']();
    expect(win.show).not.toHaveBeenCalled();
  });

  test('closed event nulls window', () => {
    const win = createWindow();
    events['closed']();
    expect(wm.getMainWindow()).toBeNull();
  });

  test('will-navigate blocks cross origin', () => {
    const win = createWindow();
    const prevent = jest.fn();
    events['will-navigate']({ preventDefault: prevent }, 'https://example.com');
    expect(prevent).toHaveBeenCalled();
  });

  test('will-navigate allows same origin', () => {
    const win = createWindow();
    const prevent = jest.fn();
    events['will-navigate']({ preventDefault: prevent }, 'file:///path');
    expect(prevent).not.toHaveBeenCalled();
  });

  test('setWindowOpenHandler denies new window', () => {
    const win = createWindow();
    const handler = win.webContents.setWindowOpenHandler.mock.calls[0][0];
    expect(handler({ url: 'https://foo.com' })).toEqual({ action: 'deny' });
  });

  test('various window events execute without error', () => {
    const win = createWindow();
    events.focus();
    events.blur();
    events.resize();
    events.maximize();
    events.unmaximize();
    events.minimize();
    events.restore();
    expect(win.getSize).toHaveBeenCalled();
  });
});
