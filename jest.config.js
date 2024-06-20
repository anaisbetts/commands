module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  roots: ["<rootDir>/src"],
  clearMocks: true,
  coveragePathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
};