// Runs before every unit test file. Unit tests never touch the network or a
// real database; anything env.ts requires is stubbed here so importing
// src/lib modules in a test does not throw. Vitest sets NODE_ENV=test itself.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-characters-long";
