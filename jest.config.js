module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/e2e/.*\\.spec\\.js$'],
  testEnvironmentOptions: {
    jsdom: {
      customExportConditions: ['node', 'node-addons'],
    },
  },
  moduleNameMapper: {
    '^@xterm\\/xterm\\/css\\/xterm\\.css$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(css|woff|woff2|eot|ttf|otf)$': '<rootDir>/__mocks__/styleMock.js'
  }
};
