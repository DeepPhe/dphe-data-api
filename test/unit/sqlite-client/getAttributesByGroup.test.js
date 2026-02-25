const path = require('path');
// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// Set the DB_PATH environment variable to an absolute path
process.env.DB_PATH = path.resolve(__dirname, '../../../data/deepphe/deepphe_sqlite_compressed');

// Import the database client
const { db } = require('../../../src/db/index');
const roaring = require('roaring');

describe('SQLiteClient.getAttributesByGroup and getAttributesForGroup', () => {
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

  test('getAttributesByGroup should return an array of unique attribute names', async () => {
    const attributeGroups = await db.getAttributesByGroup();

    // Print the first 25 unique attribute names
    console.log('First 25 unique attribute names:');
    const namesToPrint = attributeGroups.slice(0, 25);
    namesToPrint.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });

    // Check that the result is an array
    expect(Array.isArray(attributeGroups)).toBe(true);

    // Check that there are no duplicates
    expect(attributeGroups.length).toBe(new Set(attributeGroups).size);
  });

  test('getAttributesForGroup should return all attributes for a specific group', async () => {
    // Get all attribute groups first to find a valid group to test
    const attributeGroups = await db.getAttributesByGroup();
    expect(attributeGroups.length).toBeGreaterThan(0);

    // Use the first group for testing
    const testGroup = attributeGroups[0];
    const attributes = await db.getAttributesForGroup(testGroup);

    // Check that the result is an array
    expect(Array.isArray(attributes)).toBe(true);

    // Check that we have at least one attribute
    expect(attributes.length).toBeGreaterThan(0);
  });

  test('getAttributesForGroup should not include patientIds when includePatientIds is false', async () => {
    // Get all attribute groups first to find a valid group to test
    const attributeGroups = await db.getAttributesByGroup();
    expect(attributeGroups.length).toBeGreaterThan(0);

    // Use the first group for testing
    const testGroup = attributeGroups[0];
    const attributes = await db.getAttributesForGroup(testGroup, false);

    // Check that the result is an array
    expect(Array.isArray(attributes)).toBe(true);

    // Check that we have at least one attribute
    expect(attributes.length).toBeGreaterThan(0);

    // Check that none of the attributes have patientIds
    const hasPatientIds = attributes.some(attr => 'patientIds' in attr);
    expect(hasPatientIds).toBe(false);

    // Check that none of the attributes have patient_bitmap or patientbitmap
    const hasBitmap = attributes.some(attr => 'patient_bitmap' in attr || 'patientbitmap' in attr);
    expect(hasBitmap).toBe(false);
  });

  test('getAttributesForGroup should return an empty array for a non-existent group', async () => {
    const attributes = await db.getAttributesForGroup('non-existent-group-that-does-not-exist-in-db');

    // Check that the result is an array
    expect(Array.isArray(attributes)).toBe(true);

    // Check that the array is empty
    expect(attributes.length).toBe(0);
  });

  test('should extract patient IDs from patientbitmap for the first attribute group', async () => {
    // Get all attribute groups
    const attributeGroups = await db.getAttributesByGroup();

    // Ensure we have at least one group
    expect(attributeGroups.length).toBeGreaterThan(0);

    // Select the first group
    const firstGroup = attributeGroups[0];
    console.log(`Testing with first group: ${firstGroup}`);

    // Get attributes for the first group
    const attributes = await db.getAttributesForGroup(firstGroup);

    // Ensure we have attributes
    expect(attributes.length).toBeGreaterThan(0);

    // Check if attributes have patientbitmap or patient_bitmap
    const attributesWithBitmap = attributes.filter(attr => attr.patientbitmap || attr.patient_bitmap);

    if (attributesWithBitmap.length === 0) {
      console.log(`No attributes with patientbitmap or patient_bitmap found for group ${firstGroup}. Skipping bitmap tests.`);
      return;
    }

    // Process each attribute row with patientbitmap or patient_bitmap
    for (const attr of attributesWithBitmap) {
      // Extract patient IDs from the patientbitmap or patient_bitmap
      const bitmap = attr.patientbitmap || attr.patient_bitmap;
      const patientIds = await db.patientBitmapToPatientIds(bitmap, 'base64');

      // Log the patient IDs for this attribute
      console.log(`Attribute ${attr.attribute_value} has ${patientIds.length} patient IDs`);

      // Verify we got patient IDs
      expect(Array.isArray(patientIds)).toBe(true);
    }

    // Verify that we can get patient IDs for all groups with patientbitmap
    const allGroups = await Promise.all(
      attributeGroups.slice(0, 3).map(async (group) => { // Limit to first 3 groups for performance
        const attrs = await db.getAttributesForGroup(group);
        const attrsWithBitmap = attrs.filter(attr => attr.patientbitmap || attr.patient_bitmap);

        return {
          group,
          attributes: await Promise.all(
            attrsWithBitmap.map(async (attr) => {
              try {
                const bitmap = attr.patientbitmap || attr.patient_bitmap;
                const ids = await db.patientBitmapToPatientIds(bitmap, 'base64');
                return {
                  value: attr.attribute_value,
                  patientIds: ids
                };
              } catch (error) {
                console.error(`Error processing bitmap for ${group}/${attr.attribute_value}:`, error.message);
                return {
                  value: attr.attribute_value,
                  patientIds: [],
                  error: error.message
                };
              }
            })
          )
        };
      })
    );

    // Log the results for debugging
    console.log('Sample groups with patient IDs:', JSON.stringify(allGroups, null, 2));

    // Verify that each group with patientbitmap has patient IDs
    for (const groupData of allGroups) {
      for (const attrData of groupData.attributes) {
        if (!attrData.error) {
          expect(Array.isArray(attrData.patientIds)).toBe(true);
        }
      }
    }
  });
});
