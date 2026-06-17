const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// Set the DB_PATH environment variable to an absolute path
process.env.DB_PATH = path.resolve(__dirname, '../../../test/resources/deepphe.sqlite3');

// Import the database client
const { db } = require('../../../src/db/index');

describe('SQLiteClient.getConceptsByGroup and getConceptsForGroup', () => {
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

  test('getConceptsByGroup should return an array of unique concept dpheGroup values', async () => {
    const conceptGroups = await db.getConceptsByGroup();

    // Print the first 25 concept groups
    console.log('First 25 concept groups:');
    const groupsToPrint = conceptGroups.slice(0, 25);
    groupsToPrint.forEach((group, index) => {
      console.log(`${index + 1}. ${group}`);
    });

    // Check that the result is an array
    expect(Array.isArray(conceptGroups)).toBe(true);

    // Check that there are no duplicates
    expect(conceptGroups.length).toBe(new Set(conceptGroups).size);

    // Check that we have at least one concept group
    expect(conceptGroups.length).toBeGreaterThan(0);
  });

  test('getConceptsForGroup should return all concepts for a specific group', async () => {
    // Get all concept groups first to find a valid group to test
    const conceptGroups = await db.getConceptsByGroup();
    expect(conceptGroups.length).toBeGreaterThan(0);

    // Use the first group for testing
    const testGroup = conceptGroups[0];
    console.log(`Testing with concept group: ${testGroup}`);

    const concepts = await db.getConceptsForGroup(testGroup);

    // Check that the result is an array
    expect(Array.isArray(concepts)).toBe(true);

    // Log the concept names for this group
    console.log(`Concept names for group ${testGroup}:`);
    concepts.forEach((concept, index) => {
      console.log(`${index + 1}. ${concept.concept_name || 'No name'}`);
    });

    // Check that we have at least one concept for this group
    expect(concepts.length).toBeGreaterThan(0);
  });

  test('getConceptsForGroup should return an empty array for a non-existent group', async () => {
    const concepts = await db.getConceptsForGroup('non-existent-group-that-does-not-exist-in-db');

    // Check that the result is an array
    expect(Array.isArray(concepts)).toBe(true);

    // Check that the array is empty
    expect(concepts.length).toBe(0);
  });
});
