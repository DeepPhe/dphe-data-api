require("dotenv").config();
const { db } = require("../../src/db/index");
const fs = require('fs');
const path = require('path');
const os = require('os');
const roaring = require('roaring');

describe("SQLiteClient Integration Tests", () => {
  let tempFilePath;
  let tempDir;

  beforeAll(async () => {
    await db.open();
    console.log("Database opened successfully");

    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-test-'));
  });

  afterAll(async () => {
    await db.close();
    console.log("Database closed successfully");

    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      fs.rmdirSync(tempDir);
    }
  });

  // Display test group header
  test("── TEST GROUP: patientBitmapToPatientIds ──", () => {
    console.log(
      "\n" + "=".repeat(70) + "\nTEST GROUP: patientBitmapToPatientIds\n" + "=".repeat(70)
    );
  });

  // Main test: Verify that patientBitmapToPatientIds correctly maps sequential IDs to patient IDs
  test("should map sequential IDs to patient IDs from bitmap", async () => {
    // Step 1: Query the database to get some sequential IDs and their corresponding patient IDs
    const sampleSize = 5; // Number of mappings to test
    const mappings = await new Promise((resolve, reject) => {
      db.db.all(
        'SELECT sequential_id, patient_id FROM patient_id_mapping LIMIT ?',
        [sampleSize],
        (err, rows) => {
          if (err) {
            return reject(err);
          }
          resolve(rows);
        }
      );
    });

    // If no mappings found, the test can't proceed
    if (mappings.length === 0) {
      console.log("⚠️ No patient_id_mapping records found in the database. Test skipped.");
      return;
    }

    // Step 2: Create a bitmap with the sequential IDs
    const bitmap = new roaring.RoaringBitmap32();
    const sequentialIds = mappings.map(m => m.sequential_id);
    sequentialIds.forEach(id => bitmap.add(id));

    // Add a non-existent ID to test "missing" handling
    const nonExistentId = 999999;
    bitmap.add(nonExistentId);

    // Serialize and save the bitmap to a file
    tempFilePath = path.join(tempDir, 'test-patient-bitmap.bin');
    const buffer = bitmap.serialize(false);
    fs.writeFileSync(tempFilePath, buffer);

    // Step 3: Call patientBitmapToPatientIds with the bitmap file
    const result = await db.patientBitmapToPatientIds(tempFilePath, 'file');

    // Step 4: Build expected result array
    // The expected result should have patient IDs for existing mappings and "missing" for non-existent IDs
    const expectedPatientIds = {};
    mappings.forEach(m => {
      expectedPatientIds[m.sequential_id] = m.patient_id;
    });

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push("TEST: patientBitmapToPatientIds");
    output.push("=".repeat(70));
    output.push(`Bitmap contains ${bitmap.toArray().length} sequential IDs`);
    output.push(`Sequential IDs in bitmap: ${bitmap.toArray().join(', ')}`);
    output.push("\nMapping from database:");
    output.push("-".repeat(70));

    mappings.forEach(m => {
      output.push(`Sequential ID ${m.sequential_id} -> Patient ID ${m.patient_id}`);
    });

    output.push(`\nNon-existent ID added for testing: ${nonExistentId}`);
    output.push("\nResults:");
    output.push("-".repeat(70));

    // Verify each result matches expected
    let allMatch = true;
    bitmap.toArray().forEach((seqId, index) => {
      const expected = expectedPatientIds[seqId] || "missing";
      const actual = result[index];
      const matches = expected === actual;

      if (!matches) allMatch = false;

      output.push(`Sequential ID ${seqId}: Expected "${expected}", Got "${actual}" - ${matches ? '✓' : '✗'}`);
    });

    output.push("\nAssertions:");
    output.push("-".repeat(70));

    // Assert that the result array has the correct length
    expect(result.length).toBe(bitmap.toArray().length);
    output.push(`✓ Result array length (${result.length}) matches bitmap cardinality`);

    // Assert that each sequential ID is correctly mapped to its patient ID or "missing"
    bitmap.toArray().forEach((seqId, index) => {
      const expected = expectedPatientIds[seqId] || "missing";
      expect(result[index]).toBe(expected);
    });

    output.push(`${allMatch ? '✓' : '✗'} All sequential IDs correctly mapped to patient IDs or "missing"`);
    output.push("=".repeat(70));

    // Print all at once
    console.log(output.join("\n"));
  });

  // Edge case: Test with empty bitmap
  test("should handle empty bitmap", async () => {
    // Create an empty bitmap
    const emptyBitmap = new roaring.RoaringBitmap32();

    // Serialize and save to file
    const emptyBitmapPath = path.join(tempDir, 'empty-bitmap.bin');
    const buffer = emptyBitmap.serialize(false);
    fs.writeFileSync(emptyBitmapPath, buffer);

    // Call patientBitmapToPatientIds with the empty bitmap
    const result = await db.patientBitmapToPatientIds(emptyBitmapPath, 'file');

    // Assert that the result is an empty array
    expect(result).toEqual([]);
    console.log("✓ Empty bitmap returns empty array");
  });

  // Error case: Test with invalid source type
  test("should handle invalid source type", async () => {
    // Create a simple bitmap
    const bitmap = new roaring.RoaringBitmap32();
    bitmap.add(1);

    // Serialize and save to file
    const bitmapPath = path.join(tempDir, 'invalid-source-bitmap.bin');
    const buffer = bitmap.serialize(false);
    fs.writeFileSync(bitmapPath, buffer);

    // Expect the function to reject with an error for invalid source type
    await expect(db.patientBitmapToPatientIds(bitmapPath, 'invalid')).rejects.toThrow(
      'Invalid sourceType. Must be "file", "buffer", or "base64"'
    );
    console.log("✓ Invalid source type properly rejected");
  });
});
