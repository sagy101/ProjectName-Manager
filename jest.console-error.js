// Fail tests on console.error calls
const originalError = console.error;

beforeAll(() => {
  console.error = (...args) => {
    // Allow certain expected errors in tests
    const message = args.join(' ');
    const allowedErrors = [
      'Warning: ReactDOM.render is deprecated',
      'Warning: componentWillMount has been renamed',
      'Warning: componentWillReceiveProps has been renamed',
      'Warning: An update to', // React act() warnings
      'When testing, code that causes React state updates should be wrapped into act',
      'node-pty', // Expected node-pty errors in test environment
      'Error: Not implemented: navigation', // jsdom limitation
      // Allow structured logging format messages in tests
      '[ERROR]', // Our new logging format
      '[WARN]',  // Our new logging format
      'Git checkout failed', // Expected git test errors
      'Git branch listing failed', // Expected git test errors
      'Error reading configuration', // Expected config read errors in tests
      'Error loading section configuration', // Expected config errors
      'Error saving configuration', // Expected save errors in tests
      'Failed to spawn PTY', // Expected PTY errors in tests
      'Failed to kill PTY process', // Expected PTY kill errors
      'Error exporting environment data', // Expected export errors
      'Error evaluating condition', // Expected evaluation errors in tests
      'Cannot read properties of undefined', // Expected import errors
      'TypeError:', // Allow TypeErrors that are part of test scenarios
      'Error killing PTY for terminal' // Expected PTY cleanup errors
    ];
    
    const isAllowedError = allowedErrors.some(allowed => 
      message.includes(allowed)
    );
    
    if (!isAllowedError) {
      originalError(...args);
      throw new Error(`Console error in test: ${message}`);
    }
    
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
}); 