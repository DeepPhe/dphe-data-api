require("dotenv").config();
const { db } = require("../../../src/db/index");

describe("getCancersByGroup and getCancersForGroup", () => {
  beforeAll(async () => {
    await db.open();
    console.log("Database opened successfully");
  });

  afterAll(async () => {
    await db.close();
    console.log("Database closed successfully");
  });

  // Display test group header
  test("── TEST GROUP: getCancersByGroup and getCancersForGroup ──", () => {
    console.log(
      "\n" + "=".repeat(70) + "\nTEST GROUP: getCancersByGroup and getCancersForGroup\n" + "=".repeat(70)
    );
  });

  // Test getCancersByGroup
  test("should retrieve unique cancer groups from cancers_by_group table", async () => {
    // Call the getCancersByGroup method directly on the db instance
    const cancerGroups = await db.getCancersByGroup();

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push("TEST: getCancersByGroup");
    output.push("=".repeat(70));
    output.push(`Found: ${cancerGroups.length} unique cancer groups\n`);

    if (cancerGroups.length > 0) {
      // Validate that cancerGroups is an array of strings
      expect(Array.isArray(cancerGroups)).toBe(true);
      
      // Check that all elements are strings
      const allStrings = cancerGroups.every(uri => typeof uri === 'string');
      expect(allStrings).toBe(true);

      // Display first 10 cancer groups (or all if less than 10)
      output.push("Sample of cancer groups:");
      output.push("-".repeat(70));
      const sampleSize = Math.min(10, cancerGroups.length);
      for (let i = 0; i < sampleSize; i++) {
        output.push(`${i + 1}. ${cancerGroups[i]}`);
      }
      
      if (cancerGroups.length > 10) {
        output.push(`... (${cancerGroups.length - 10} more cancer groups)\n`);
      } else {
        output.push("");
      }

      // Check for duplicates
      const uniqueSet = new Set(cancerGroups);
      expect(uniqueSet.size).toBe(cancerGroups.length);
      
      output.push(`RESULT: ✓ Retrieved ${cancerGroups.length} unique cancer groups`);
      output.push("=".repeat(70));

      // Print all at once
      console.log(output.join("\n"));
    } else {
      output.push("⚠️  No cancer groups found in the database");
      output.push("=".repeat(70));
      console.log(output.join("\n"));
    }
  });

  // Test getCancersForGroup
  test("should retrieve cancers for a specific group", async () => {
    // First get all cancer groups
    const cancerGroups = await db.getCancersByGroup();
    
    // Skip test if no cancer groups are available
    if (cancerGroups.length === 0) {
      console.log("⚠️  No cancer groups available to test getCancersForGroup");
      return;
    }

    // Use the first cancer group for testing
    const testGroup = cancerGroups[0];
    
    // Call the getCancersForGroup method
    const cancers = await db.getCancersForGroup(testGroup);

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push(`TEST: getCancersForGroup('${testGroup}')`);
    output.push("=".repeat(70));
    output.push(`Found: ${cancers.length} cancers for group '${testGroup}'\n`);

    if (cancers.length > 0) {
      // Validate that cancers is an array
      expect(Array.isArray(cancers)).toBe(true);

      // Display first 5 cancers (or all if less than 5)
      output.push("Sample of cancers:");
      output.push("-".repeat(70));
      const sampleSize = Math.min(5, cancers.length);
      for (let i = 0; i < sampleSize; i++) {
        output.push(`${i + 1}. ${JSON.stringify(cancers[i])}`);
      }
      
      if (cancers.length > 5) {
        output.push(`... (${cancers.length - 5} more cancers)\n`);
      } else {
        output.push("");
      }
      
      output.push(`RESULT: ✓ Retrieved ${cancers.length} cancers for group '${testGroup}'`);
      output.push("=".repeat(70));

      // Print all at once
      console.log(output.join("\n"));
    } else {
      output.push(`⚠️  No cancers found for group '${testGroup}'`);
      output.push("=".repeat(70));
      console.log(output.join("\n"));
    }
  });

  // Test getCancersForGroup with non-existent group
  test("should handle non-existent group in getCancersForGroup", async () => {
    // Call the getCancersForGroup method with a non-existent group
    const nonExistentGroup = "non-existent-group-" + Date.now();
    const cancers = await db.getCancersForGroup(nonExistentGroup);

    // Validate that cancers is an empty array
    expect(Array.isArray(cancers)).toBe(true);
    expect(cancers.length).toBe(0);

    console.log(`✓ getCancersForGroup('${nonExistentGroup}') correctly returned an empty array`);
  });

  // Edge case: Verify that getCancersByGroup handles errors properly
  test("should handle database errors gracefully", async () => {
    // Create a mock db instance with a closed connection to simulate an error
    const mockDb = {
      isOpen: false,
      getCancersByGroup: db.getCancersByGroup,
      getCancersForGroup: db.getCancersForGroup
    };

    // Expect the functions to reject with an error when the database is not open
    await expect(mockDb.getCancersByGroup()).rejects.toThrow('Database is not open');
    await expect(mockDb.getCancersForGroup("any-group")).rejects.toThrow('Database is not open');
    console.log("✓ ERROR HANDLING: Properly handles database not open error");
  });
});