require("dotenv").config();
const { db } = require("../../../src/db/index");

describe("getConceptsByGroup and getConceptsForGroup", () => {
  beforeAll(async () => {
    await db.open();
    console.log("Database opened successfully");
  });

  afterAll(async () => {
    await db.close();
    console.log("Database closed successfully");
  });

  // Display test group header
  test("── TEST GROUP: getConceptsByGroup and getConceptsForGroup ──", () => {
    console.log(
      "\n" + "=".repeat(70) + "\nTEST GROUP: getConceptsByGroup and getConceptsForGroup\n" + "=".repeat(70)
    );
  });

  // Test getConceptsByGroup
  test("should retrieve unique concept groups from concepts_by_group table", async () => {
    // Call the getConceptsByGroup method directly on the db instance
    const conceptGroups = await db.getConceptsByGroup();

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push("TEST: getConceptsByGroup");
    output.push("=".repeat(70));
    output.push(`Found: ${conceptGroups.length} unique concept groups\n`);

    if (conceptGroups.length > 0) {
      // Validate that conceptGroups is an array of strings
      expect(Array.isArray(conceptGroups)).toBe(true);
      
      // Check that all elements are strings
      const allStrings = conceptGroups.every(group => typeof group === 'string');
      expect(allStrings).toBe(true);

      // Display first 10 concept groups (or all if less than 10)
      output.push("Sample of concept groups:");
      output.push("-".repeat(70));
      const sampleSize = Math.min(10, conceptGroups.length);
      for (let i = 0; i < sampleSize; i++) {
        output.push(`${i + 1}. ${conceptGroups[i]}`);
      }
      
      if (conceptGroups.length > 10) {
        output.push(`... (${conceptGroups.length - 10} more concept groups)\n`);
      } else {
        output.push("");
      }

      // Check for duplicates
      const uniqueSet = new Set(conceptGroups);
      expect(uniqueSet.size).toBe(conceptGroups.length);
      
      output.push(`RESULT: ✓ Retrieved ${conceptGroups.length} unique concept groups`);
      output.push("=".repeat(70));

      // Print all at once
      console.log(output.join("\n"));
    } else {
      output.push("⚠️  No concept groups found in the database");
      output.push("=".repeat(70));
      console.log(output.join("\n"));
    }
  });

  // Test getConceptsForGroup
  test("should retrieve concepts for a specific group", async () => {
    // First get all concept groups
    const conceptGroups = await db.getConceptsByGroup();
    
    // Skip test if no concept groups are available
    if (conceptGroups.length === 0) {
      console.log("⚠️  No concept groups available to test getConceptsForGroup");
      return;
    }

    // Use the first concept group for testing
    const testGroup = conceptGroups[0];
    
    // Call the getConceptsForGroup method
    const concepts = await db.getConceptsForGroup(testGroup);

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push(`TEST: getConceptsForGroup('${testGroup}')`);
    output.push("=".repeat(70));
    output.push(`Found: ${concepts.length} concepts for group '${testGroup}'\n`);

    if (concepts.length > 0) {
      // Validate that concepts is an array
      expect(Array.isArray(concepts)).toBe(true);

      // Display first 5 concepts (or all if less than 5)
      output.push("Sample of concepts:");
      output.push("-".repeat(70));
      const sampleSize = Math.min(5, concepts.length);
      for (let i = 0; i < sampleSize; i++) {
        output.push(`${i + 1}. ${JSON.stringify(concepts[i])}`);
      }
      
      if (concepts.length > 5) {
        output.push(`... (${concepts.length - 5} more concepts)\n`);
      } else {
        output.push("");
      }
      
      output.push(`RESULT: ✓ Retrieved ${concepts.length} concepts for group '${testGroup}'`);
      output.push("=".repeat(70));

      // Print all at once
      console.log(output.join("\n"));
    } else {
      output.push(`⚠️  No concepts found for group '${testGroup}'`);
      output.push("=".repeat(70));
      console.log(output.join("\n"));
    }
  });

  // Test getConceptsForGroup with non-existent group
  test("should handle non-existent group in getConceptsForGroup", async () => {
    // Call the getConceptsForGroup method with a non-existent group
    const nonExistentGroup = "non-existent-group-" + Date.now();
    const concepts = await db.getConceptsForGroup(nonExistentGroup);

    // Validate that concepts is an empty array
    expect(Array.isArray(concepts)).toBe(true);
    expect(concepts.length).toBe(0);

    console.log(`✓ getConceptsForGroup('${nonExistentGroup}') correctly returned an empty array`);
  });

  // Edge case: Verify that getConceptsByGroup handles errors properly
  test("should handle database errors gracefully", async () => {
    // Create a mock db instance with a closed connection to simulate an error
    const mockDb = {
      isOpen: false,
      getConceptsByGroup: db.getConceptsByGroup,
      getConceptsForGroup: db.getConceptsForGroup
    };

    // Expect the functions to reject with an error when the database is not open
    await expect(mockDb.getConceptsByGroup()).rejects.toThrow('Database is not open');
    await expect(mockDb.getConceptsForGroup("any-group")).rejects.toThrow('Database is not open');
    console.log("✓ ERROR HANDLING: Properly handles database not open error");
  });
});