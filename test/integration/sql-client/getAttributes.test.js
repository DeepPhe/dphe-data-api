require("dotenv").config();
const { db } = require("../../../src/db/index");

describe("getAttributes", () => {
  beforeAll(async () => {
    await db.open();
    console.log("Database opened successfully");
  });

  afterAll(async () => {
    await db.close();
    console.log("Database closed successfully");
  });

  // Display test group header
  test("── TEST GROUP: getAttributes ──", () => {
    console.log(
      "\n" + "=".repeat(70) + "\nTEST GROUP: getAttributes\n" + "=".repeat(70)
    );
  });

  // Main test: Verify that getAttributes returns an array of unique attribute names
  test("should retrieve unique attribute names from attributes_by_group table", async () => {
    // Call the getAttributes method directly on the db instance
    const attributeNames = await db.getAttributes();

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push("TEST: getAttributes");
    output.push("=".repeat(70));
    output.push(`Found: ${attributeNames.length} unique attribute names\n`);

    if (attributeNames.length > 0) {
      // Validate that attributeNames is an array of strings
      expect(Array.isArray(attributeNames)).toBe(true);
      
      // Check that all elements are strings
      const allStrings = attributeNames.every(name => typeof name === 'string');
      expect(allStrings).toBe(true);

      // Display first 10 attribute names (or all if less than 10)
      output.push("Sample of attribute names:");
      output.push("-".repeat(70));
      const sampleSize = Math.min(10, attributeNames.length);
      for (let i = 0; i < sampleSize; i++) {
        output.push(`${i + 1}. ${attributeNames[i]}`);
      }
      
      if (attributeNames.length > 10) {
        output.push(`... (${attributeNames.length - 10} more attribute names)\n`);
      } else {
        output.push("");
      }

      // Check for duplicates
      const uniqueSet = new Set(attributeNames);
      expect(uniqueSet.size).toBe(attributeNames.length);
      
      output.push(`RESULT: ✓ Retrieved ${attributeNames.length} unique attribute names`);
      output.push("=".repeat(70));

      // Print all at once
      console.log(output.join("\n"));
    } else {
      output.push("⚠️  No attribute names found in the database");
      output.push("=".repeat(70));
      console.log(output.join("\n"));
    }
  });

  // Edge case: Verify that getAttributes handles errors properly
  test("should handle database errors gracefully", async () => {
    // Create a mock db instance with a closed connection to simulate an error
    const mockDb = {
      isOpen: false,
      getAttributes: db.getAttributes
    };

    // Expect the function to reject with an error when the database is not open
    await expect(mockDb.getAttributes()).rejects.toThrow('Database is not open');
    console.log("✓ ERROR HANDLING [getAttributes]: Properly handles database not open error");
  });
});