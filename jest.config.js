module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/jest.console-error.js'],
  
  // Modern test discovery instead of exclusions
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/e2e/',
    '/coverage/',
    '/dist/',
    '/test-results/',
    '/playwright-report/'
  ],
  
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  
  // Enhanced module name mapping
  moduleNameMapper: {
    '\\.(css|scss|sass|less)$': 'identity-obj-proxy',
    '\\.(woff|woff2|eot|ttf|otf|svg|png|jpg|jpeg|gif)$': '<rootDir>/__mocks__/styleMock.js'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Quality improvements
  clearMocks: true,
  restoreMocks: true,
  
  // Performance and reliability
  testTimeout: 10000,
  maxConcurrency: 5,
  
  // Better error reporting
  verbose: false,
  silent: false,
  
  // Handle timers properly
  fakeTimers: { enableGlobally: false }
};
