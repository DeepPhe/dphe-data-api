require("dotenv").config();
const { db } = require("../../../src/db/index");

describe("getAttributesByGroup and getAttributesForGroup", () => {
  beforeAll(async () => {
    await db.open();
    console.log("Database opened successfully");
  });

  afterAll(async () => {
    await db.close();
    console.log("Database closed successfully");
  });

  // Display test group header
  test("── TEST GROUP: getAttributesByGroup and getAttributesForGroup ──", () => {
    console.log(
      "\n" + "=".repeat(70) + "\nTEST GROUP: getAttributesByGroup and getAttributesForGroup\n" + "=".repeat(70)
    );
  });

  // Test getAttributesByGroup
  test("should retrieve unique attribute groups from attributes_by_group table", async () => {
    // Call the getAttributesByGroup method directly on the db instance
    const attributeGroups = await db.getAttributesByGroup();

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push("TEST: getAttributesByGroup");
    output.push("=".repeat(70));
    output.push(`Found: ${attributeGroups.length} unique attribute groups\n`);

    if (attributeGroups.length > 0) {
      // Validate that attributeGroups is an array of strings
      expect(Array.isArray(attributeGroups)).toBe(true);

      // Check that all elements are strings
      const allStrings = attributeGroups.every(name => typeof name === 'string');
      expect(allStrings).toBe(true);

      // Display first 10 attribute groups (or all if less than 10)
      output.push("Sample of attribute groups:");
      output.push("-".repeat(70));
      const sampleSize = Math.min(10, attributeGroups.length);
      for (let i = 0; i < sampleSize; i++) {
        output.push(`${i + 1}. ${attributeGroups[i]}`);
      }

      if (attributeGroups.length > 10) {
        output.push(`... (${attributeGroups.length - 10} more attribute groups)\n`);
      } else {
        output.push("");
      }

      // Check for duplicates
      const uniqueSet = new Set(attributeGroups);
      expect(uniqueSet.size).toBe(attributeGroups.length);

      output.push(`RESULT: ✓ Retrieved ${attributeGroups.length} unique attribute groups`);
      output.push("=".repeat(70));

      // Print all at once
      console.log(output.join("\n"));
    } else {
      output.push("⚠️  No attribute groups found in the database");
      output.push("=".repeat(70));
      console.log(output.join("\n"));
    }
  });

  // Test getAttributesForGroup
  test("should retrieve attributes for a specific group", async () => {
    // First get all attribute groups
    const attributeGroups = await db.getAttributesByGroup();

    // Skip test if no attribute groups are available
    if (attributeGroups.length === 0) {
      console.log("⚠️  No attribute groups available to test getAttributesForGroup");
      return;
    }

    // Use the first attribute group for testing
    const testGroup = attributeGroups[0];

    // Call the getAttributesForGroup method
    const attributes = await db.getAttributesForGroup(testGroup);

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push(`TEST: getAttributesForGroup('${testGroup}')`);
    output.push("=".repeat(70));
    output.push(`Found: ${attributes.length} attributes for group '${testGroup}'\n`);

    if (attributes.length > 0) {
      // Validate that attributes is an array
      expect(Array.isArray(attributes)).toBe(true);

      // Display first 5 attributes (or all if less than 5)
      output.push("Sample of attributes:");
      output.push("-".repeat(70));
      const sampleSize = Math.min(5, attributes.length);
      for (let i = 0; i < sampleSize; i++) {
        output.push(`${i + 1}. ${JSON.stringify(attributes[i])}`);
      }

      if (attributes.length > 5) {
        output.push(`... (${attributes.length - 5} more attributes)\n`);
      } else {
        output.push("");
      }

      output.push(`RESULT: ✓ Retrieved ${attributes.length} attributes for group '${testGroup}'`);
      output.push("=".repeat(70));

      // Print all at once
      console.log(output.join("\n"));
    } else {
      output.push(`⚠️  No attributes found for group '${testGroup}'`);
      output.push("=".repeat(70));
      console.log(output.join("\n"));
    }
  });

  // Test getAttributesForGroup with includePatientIds=false
  test("should not include patientIds when includePatientIds is false", async () => {
    // First get all attribute groups
    const attributeGroups = await db.getAttributesByGroup();

    // Skip test if no attribute groups are available
    if (attributeGroups.length === 0) {
      console.log("⚠️  No attribute groups available to test getAttributesForGroup with includePatientIds=false");
      return;
    }

    // Use the first attribute group for testing
    const testGroup = attributeGroups[0];

    // Call the getAttributesForGroup method with includePatientIds=false
    const attributes = await db.getAttributesForGroup(testGroup, false);

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push(`TEST: getAttributesForGroup('${testGroup}', false)`);
    output.push("=".repeat(70));
    output.push(`Found: ${attributes.length} attributes for group '${testGroup}' with includePatientIds=false\n`);

    if (attributes.length > 0) {
      // Validate that attributes is an array
      expect(Array.isArray(attributes)).toBe(true);

      // Check that none of the attributes have patientIds
      const hasPatientIds = attributes.some(attr => 'patientIds' in attr);
      expect(hasPatientIds).toBe(false);

      // Check that none of the attributes have patient_bitmap or patientbitmap
      const hasBitmap = attributes.some(attr => 'patient_bitmap' in attr || 'patientbitmap' in attr);
      expect(hasBitmap).toBe(false);

      // Display first 5 attributes (or all if less than 5)
      output.push("Sample of attributes (without patientIds):");
      output.push("-".repeat(70));
      const sampleSize = Math.min(5, attributes.length);
      for (let i = 0; i < sampleSize; i++) {
        output.push(`${i + 1}. ${JSON.stringify(attributes[i])}`);
      }

      if (attributes.length > 5) {
        output.push(`... (${attributes.length - 5} more attributes)\n`);
      } else {
        output.push("");
      }

      output.push(`RESULT: ✓ Retrieved ${attributes.length} attributes for group '${testGroup}' without patientIds`);
      output.push("=".repeat(70));

      // Print all at once
      console.log(output.join("\n"));
    } else {
      output.push(`⚠️  No attributes found for group '${testGroup}'`);
      output.push("=".repeat(70));
      console.log(output.join("\n"));
    }
  });

  // Test getAttributesForGroup with non-existent group
  test("should handle non-existent group in getAttributesForGroup", async () => {
    // Call the getAttributesForGroup method with a non-existent group
    const nonExistentGroup = "non-existent-group-" + Date.now();
    const attributes = await db.getAttributesForGroup(nonExistentGroup);

    // Validate that attributes is an empty array
    expect(Array.isArray(attributes)).toBe(true);
    expect(attributes.length).toBe(0);

    console.log(`✓ getAttributesForGroup('${nonExistentGroup}') correctly returned an empty array`);
  });

  // Edge case: Verify that getAttributesByGroup handles errors properly
  test("should handle database errors gracefully", async () => {
    // Create a mock db instance with a closed connection to simulate an error
    const mockDb = {
      isOpen: false,
      getAttributesByGroup: db.getAttributesByGroup,
      getAttributesForGroup: db.getAttributesForGroup
    };

    // Expect the functions to reject with an error when the database is not open
    await expect(mockDb.getAttributesByGroup()).rejects.toThrow('Database is not open');
    await expect(mockDb.getAttributesForGroup("any-group")).rejects.toThrow('Database is not open');
    console.log("✓ ERROR HANDLING: Properly handles database not open error");
  });
});
