const { logger, loggers, createLogger, LOG_LEVELS } = require('../../../src/common/utils/debugUtils.js');

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Enhanced Logging System', () => {
  test('logger.debug logs with formatted message in development', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDebugLogs = process.env.DEBUG_LOGS;
    
    process.env.NODE_ENV = 'development';
    delete process.env.DEBUG_LOGS; // Use environment default
    
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('test message', 123);
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\[DEBUG\]/),
      'test message',
      123
    );
    
    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
    if (originalDebugLogs !== undefined) {
      process.env.DEBUG_LOGS = originalDebugLogs;
    }
  });

  test('logger.error always logs regardless of environment', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDebugLogs = process.env.DEBUG_LOGS;
    
    process.env.NODE_ENV = 'production';
    delete process.env.DEBUG_LOGS; // Use environment default
    
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('error message');
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\[ERROR\]/),
      'error message'
    );
    
    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
    if (originalDebugLogs !== undefined) {
      process.env.DEBUG_LOGS = originalDebugLogs;
    }
  });

  test('logger.debug does not log in production', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDebugLogs = process.env.DEBUG_LOGS;
    
    process.env.NODE_ENV = 'production';
    delete process.env.DEBUG_LOGS; // Use environment default (no DEBUG_LOGS override)
    
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('debug message');
    
    expect(spy).not.toHaveBeenCalled();
    
    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
    if (originalDebugLogs !== undefined) {
      process.env.DEBUG_LOGS = originalDebugLogs;
    }
  });

  test('DEBUG_LOGS=true overrides production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDebugLogs = process.env.DEBUG_LOGS;
    
    process.env.NODE_ENV = 'production';
    process.env.DEBUG_LOGS = 'true'; // Force debug logs
    
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('debug message with override');
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\[DEBUG\]/),
      'debug message with override'
    );
    
    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
    if (originalDebugLogs !== undefined) {
      process.env.DEBUG_LOGS = originalDebugLogs;
    } else {
      delete process.env.DEBUG_LOGS;
    }
  });

  test('createLogger adds custom prefix', () => {
    const customLogger = createLogger('CUSTOM');
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    customLogger.info('test message');
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\[CUSTOM\]\[INFO\]/),
      'test message'
    );
    
    spy.mockRestore();
  });

  test('loggers object provides pre-configured loggers', () => {
    expect(loggers.app).toBeDefined();
    expect(loggers.terminal).toBeDefined();
    expect(loggers.git).toBeDefined();
    expect(typeof loggers.app.debug).toBe('function');
    expect(typeof loggers.app.info).toBe('function');
    expect(typeof loggers.app.warn).toBe('function');
    expect(typeof loggers.app.error).toBe('function');
  });

  test('LOG_LEVELS are properly defined', () => {
    expect(LOG_LEVELS.ERROR).toBe(0);
    expect(LOG_LEVELS.WARN).toBe(1);
    expect(LOG_LEVELS.INFO).toBe(2);
    expect(LOG_LEVELS.DEBUG).toBe(3);
  });

  test('DEBUG_LOGS=false overrides development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDebugLogs = process.env.DEBUG_LOGS;
    
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_LOGS = 'false'; // Force INFO level
    
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('debug message');
    
    expect(spy).not.toHaveBeenCalled();
    
    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
    if (originalDebugLogs !== undefined) {
      process.env.DEBUG_LOGS = originalDebugLogs;
    } else {
      delete process.env.DEBUG_LOGS;
    }
  });

  test('browser environment simulation with __PRODUCTION__ flag', () => {
    // Simulate browser environment by temporarily removing process
    const originalProcess = global.process;
    
    // Create a mock browser environment
    delete global.process;
    global.__PRODUCTION__ = true;
    
    // Re-require the module to trigger browser environment logic
    jest.resetModules();
    const { createLogger: browserCreateLogger } = require('../../../src/common/utils/debugUtils.js');
    
    const browserLogger = browserCreateLogger('BROWSER');
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // In production browser environment, debug should not log
    browserLogger.debug('debug message');
    expect(spy).not.toHaveBeenCalled();
    
    spy.mockRestore();
    
    // Restore original environment
    global.process = originalProcess;
    delete global.__PRODUCTION__;
    jest.resetModules();
  });

  test('browser environment simulation without __PRODUCTION__ flag', () => {
    // Simulate browser environment by temporarily removing process
    const originalProcess = global.process;
    
    // Create a mock browser environment (development)
    delete global.process;
    delete global.__PRODUCTION__;
    
    // Re-require the module to trigger browser environment logic
    jest.resetModules();
    const { createLogger: browserCreateLogger } = require('../../../src/common/utils/debugUtils.js');
    
    const browserLogger = browserCreateLogger('BROWSER');
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // In development browser environment, debug should log
    browserLogger.debug('debug message');
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\[BROWSER\]\[DEBUG\]/),
      'debug message'
    );
    
    spy.mockRestore();
    
    // Restore original environment
    global.process = originalProcess;
    jest.resetModules();
  });

  test('browser environment with process.env.DEBUG_LOGS=true', () => {
    // Simulate browser environment with partial process object
    const originalProcess = global.process;
    
    // Create a mock browser environment with process.env
    global.process = { env: { DEBUG_LOGS: 'true' } };
    global.__PRODUCTION__ = true;
    
    // Re-require the module to trigger browser environment logic
    jest.resetModules();
    const { createLogger: browserCreateLogger } = require('../../../src/common/utils/debugUtils.js');
    
    const browserLogger = browserCreateLogger('BROWSER');
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // DEBUG_LOGS=true should override production
    browserLogger.debug('debug message');
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\[BROWSER\]\[DEBUG\]/),
      'debug message'
    );
    
    spy.mockRestore();
    
    // Restore original environment
    global.process = originalProcess;
    delete global.__PRODUCTION__;
    jest.resetModules();
  });

  test('createLogger without prefix creates logger with empty prefix', () => {
    const noPrefix = createLogger();
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    noPrefix.info('test message');
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\[INFO\]/),
      'test message'
    );
    
    spy.mockRestore();
  });
});
