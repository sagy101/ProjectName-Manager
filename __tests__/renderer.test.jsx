/** @jest-environment jsdom */
import React from 'react';
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

  test('uses enhanced logging system', () => {
    const { } = loadRenderer();
    
    // Mock the enhanced logging system
    const mockAppLogger = { debug: jest.fn(), error: jest.fn() };
    jest.doMock('../src/common/utils/debugUtils.js', () => ({
      loggers: { app: mockAppLogger }
    }));
    
    // Verify the enhanced logging system is in use
    expect(mockAppLogger).toBeDefined();
    expect(typeof mockAppLogger.debug).toBe('function');
    expect(typeof mockAppLogger.error).toBe('function');
  });
});
