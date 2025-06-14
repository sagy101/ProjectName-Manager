const path = require('path');
const fs = require('fs').promises;
const { loadGlobalVariables } = require('../src/main/configurationManagement');

// Mock fs.promises and path
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));
// path.join is used to construct the path to globalVariable.json.
// We need to ensure it resolves to a consistent path for testing.
const mockGlobalVariablePath = '/mock/path/to/globalVariable.json';
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    join: jest.fn((...args) => {
      // Specifically mock the join for globalVariable.json
      if (args.length > 1 && args[args.length -1] === '../globalVariable.json') {
        return mockGlobalVariablePath;
      }
      // For other calls, use the original path.join
      return originalPath.join(...args);
    }),
    resolve: (...args) => originalPath.resolve(...args), // ensure resolve is also available
  };
});

describe('configurationManagement', () => {
  describe('loadGlobalVariables', () => {
    let consoleWarnSpy;
    let consoleErrorSpy;

    beforeEach(() => {
      // Reset mocks for each test
      fs.readFile.mockReset();
      path.join.mockClear(); // Clear call history for path.join if needed for specific assertions
      // Spy on console methods
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore console spies
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('should load global variables successfully from a valid JSON file', async () => {
      const mockGlobals = { myVar: 'myValue', anotherVar: 123 };
      fs.readFile.mockResolvedValue(JSON.stringify(mockGlobals));

      const result = await loadGlobalVariables();

      expect(fs.readFile).toHaveBeenCalledWith(mockGlobalVariablePath, 'utf-8');
      expect(result).toEqual({ success: true, globals: mockGlobals });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return empty globals and log a warning if the file is not found (ENOENT)', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);

      const result = await loadGlobalVariables();

      expect(fs.readFile).toHaveBeenCalledWith(mockGlobalVariablePath, 'utf-8');
      expect(result).toEqual({ success: true, globals: {} });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Global variables file not found at ${mockGlobalVariablePath}. Returning empty object.`)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return success false and log an error for invalid JSON', async () => {
      fs.readFile.mockResolvedValue('{"myVar": "myValue"'); // Invalid JSON string

      const result = await loadGlobalVariables();

      expect(fs.readFile).toHaveBeenCalledWith(mockGlobalVariablePath, 'utf-8');
      expect(result).toEqual({ success: false, error: expect.any(String), globals: {} });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading global variables:',
        expect.any(SyntaxError) // Expect a SyntaxError for JSON parsing
      );
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('should handle an empty JSON object correctly (success with empty globals)', async () => {
      fs.readFile.mockResolvedValue('{}');

      const result = await loadGlobalVariables();

      expect(fs.readFile).toHaveBeenCalledWith(mockGlobalVariablePath, 'utf-8');
      expect(result).toEqual({ success: true, globals: {} });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should handle an empty file string by treating it as invalid JSON', async () => {
      fs.readFile.mockResolvedValue(''); // Empty string is not valid JSON

      const result = await loadGlobalVariables();

      expect(fs.readFile).toHaveBeenCalledWith(mockGlobalVariablePath, 'utf-8');
      expect(result).toEqual({ success: false, error: expect.any(String), globals: {} });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading global variables:',
        expect.any(SyntaxError)
      );
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('should handle other readFile errors and return success false', async () => {
      const otherError = new Error('Some other read error');
      fs.readFile.mockRejectedValue(otherError);

      const result = await loadGlobalVariables();

      expect(fs.readFile).toHaveBeenCalledWith(mockGlobalVariablePath, 'utf-8');
      expect(result).toEqual({ success: false, error: 'Some other read error', globals: {} });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading global variables:', otherError);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
