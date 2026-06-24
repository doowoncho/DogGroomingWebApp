// Ensure @upstash packages are mocked before any modules are imported by tests
jest.mock('@upstash/ratelimit');

// Provide a manual mock for @upstash/redis to avoid resolver/moduleNameMapper issues in CI
jest.mock('@upstash/redis', () => {
  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    // add other methods used in tests if needed
  };

  return {
    Redis: {
      fromEnv: jest.fn(() => mockRedisClient),
    },
  };
});
