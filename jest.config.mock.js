module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/e2e/"
  ],
  moduleNameMapper: {
    '\\.(css|woff|woff2|eot|ttf|otf)$': '<rootDir>/__mocks__/styleMock.js',
    '^../configurationSidebarSections.json$': '<rootDir>/__tests__/mock-data/mockConfigurationSidebarSections.json',
    '^../src/configurationSidebarSections.json$': '<rootDir>/__tests__/mock-data/mockConfigurationSidebarSections.json',
    '^../configurationSidebarAbout.json$': '<rootDir>/__tests__/mock-data/mockConfigurationSidebarAbout.json',
    '^../src/configurationSidebarAbout.json$': '<rootDir>/__tests__/mock-data/mockConfigurationSidebarAbout.json',
    '^../configurationSidebarCommands.json$': '<rootDir>/__tests__/mock-data/mockConfigurationSidebarCommands.json',
    '^../src/configurationSidebarCommands.json$': '<rootDir>/__tests__/mock-data/mockConfigurationSidebarCommands.json'
  }
};
