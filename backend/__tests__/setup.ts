// Global test setup
import seedrandom from 'seedrandom';

// Set a fixed seed for deterministic tests
seedrandom('test-seed', { global: true });

// Increase timeout for integration tests
jest.setTimeout(10000);