module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@xterm\\/xterm\\/css\\/xterm\\.css$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(css|woff|woff2|eot|ttf|otf)$': '<rootDir>/__mocks__/styleMock.js'
  }
};
