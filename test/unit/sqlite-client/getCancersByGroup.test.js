const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// Set the DB_PATH environment variable to an absolute path
process.env.DB_PATH = path.resolve(__dirname, '../../../test/resources/deepphe.sqlite3');

// Import the database client
const { db } = require('../../../src/db/index');

describe('SQLiteClient.getCancersByGroup and getCancersForGroup', () => {
  beforeAll(async () => {
    // Open the database connection before all tests
    await db.open();
    console.log("Database opened successfully");
  });

  afterAll(async () => {
    // Close the database connection after all tests
    await db.close();
    console.log("Database closed successfully");
  });

  test('getCancersByGroup should return an array of unique cancer classUri values', async () => {
    const cancerGroups = await db.getCancersByGroup();

    // Print the first 25 cancer groups
    console.log('First 25 cancer groups:');
    const groupsToPrint = cancerGroups.slice(0, 25);
    groupsToPrint.forEach((group, index) => {
      console.log(`${index + 1}. ${group}`);
    });

    // Check that the result is an array
    expect(Array.isArray(cancerGroups)).toBe(true);

    // Check that there are no duplicates
    expect(cancerGroups.length).toBe(new Set(cancerGroups).size);

    // Check that we have at least one cancer group
    expect(cancerGroups.length).toBeGreaterThan(0);
  });

  test('getCancersForGroup should return all cancers for a specific group', async () => {
    // Get all cancer groups first to find a valid group to test
    const cancerGroups = await db.getCancersByGroup();
    expect(cancerGroups.length).toBeGreaterThan(0);

    // Use the first group for testing
    const testGroup = cancerGroups[0];
    console.log(`Testing with cancer group: ${testGroup}`);

    const cancers = await db.getCancersForGroup(testGroup);

    // Check that the result is an array
    expect(Array.isArray(cancers)).toBe(true);

    // Log the cancer names for this group
    console.log(`Cancer names for group ${testGroup}:`);
    cancers.forEach((cancer, index) => {
      console.log(`${index + 1}. ${cancer.cancer_name || 'No name'}`);
    });

    // Check that we have at least one cancer for this group
    expect(cancers.length).toBeGreaterThan(0);
  });

  test('getCancersForGroup should return an empty array for a non-existent group', async () => {
    const cancers = await db.getCancersForGroup('non-existent-cancer-that-does-not-exist-in-db');

    // Check that the result is an array
    expect(Array.isArray(cancers)).toBe(true);

    // Check that the array is empty
    expect(cancers.length).toBe(0);
  });
});
