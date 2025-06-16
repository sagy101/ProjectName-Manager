/** @jest-environment jsdom */
import { jest } from '@jest/globals';

describe('renderer initialization', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
    delete process.env.DEBUG_LOGS;
  });

  function loadRenderer() {
    const rootMock = { render: jest.fn() };
    const createRoot = jest.fn(() => rootMock);
    jest.doMock('react-dom/client', () => ({ createRoot }));
    jest.doMock('../src/App', () => () => <div data-testid="app" />);
    require('../src/renderer.jsx');
    return { createRoot, rootMock };
  }

  test('initializes React into existing root', () => {
    document.body.innerHTML = '<div id="root"></div>';
    const { createRoot, rootMock } = loadRenderer();
    jest.useFakeTimers();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    jest.advanceTimersByTime(150);
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(rootMock.render).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('creates root element when missing', () => {
    const { createRoot, rootMock } = loadRenderer();
    jest.useFakeTimers();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    jest.advanceTimersByTime(150);
    const rootElem = document.getElementById('root');
    expect(rootElem).not.toBeNull();
    expect(createRoot).toHaveBeenCalledWith(rootElem);
    expect(rootMock.render).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('debugLog respects DEBUG_LOGS env var', () => {
    const { } = loadRenderer();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.DEBUG_LOGS = 'true';
    window.debugLog('hi');
    expect(logSpy).toHaveBeenCalledWith('hi');
    logSpy.mockRestore();
  });

  test('debugLog does not log when disabled', () => {
    const { } = loadRenderer();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.DEBUG_LOGS = 'false';
    window.debugLog('hi');
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
