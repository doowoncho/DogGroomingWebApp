const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  testEnvironment: 'jsdom',
  // run this before tests to ensure module mocks are in place
  setupFiles: ['<rootDir>/jest.setup.mock.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@upstash/redis$': '<rootDir>/__mocks__/upstash-redis.ts',
  },
}

module.exports = createJestConfig(config)