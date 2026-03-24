// Jest Setup File
const db = require('./src/config/database');

beforeAll(async () => {
  console.log('Setting up test database...');
});

afterAll(async () => {
  console.log('Cleaning up test database...');
  db.close();
});

// Increase timeout for database operations
jest.setTimeout(10000);
