const path = require('path');
const fs = require('fs');
const os = require('os');

// Import the database client
const { db } = require('../../../src/db/index');

describe('SQLiteClient.decodeBitmap', () => {
  let tempFilePath;
  let tempDir;

  beforeAll(async () => {
    // Open the database connection before all tests
    await db.open();

    // Create a temporary bitmap file for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bitmap-test-'));
    tempFilePath = path.join(tempDir, 'test-bitmap.bin');

    // Create a simple bitmap with values [1, 2, 3, 100, 1000, 10000]
    const roaring = require('roaring');
    const bitmap = new roaring.RoaringBitmap32();
    bitmap.add(1);
    bitmap.add(2);
    bitmap.add(3);
    bitmap.add(100);
    bitmap.add(1000);
    bitmap.add(10000);

    // Serialize and save to file
    const buffer = bitmap.serialize(false);
    fs.writeFileSync(tempFilePath, buffer);
  });

  afterAll(async () => {
    // Close the database connection after all tests
    await db.close();

    // Clean up temporary files and directory
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  test('should decode bitmap from file', async () => {
    const bitmap = await db.decodeBitmap(tempFilePath, 'file');

    expect(bitmap.has(1)).toBe(true);
    expect(bitmap.has(2)).toBe(true);
    expect(bitmap.has(3)).toBe(true);
    expect(bitmap.has(100)).toBe(true);
    expect(bitmap.has(1000)).toBe(true);
    expect(bitmap.has(10000)).toBe(true);
    expect(bitmap.has(4)).toBe(false);

    const array = bitmap.toArray();
    expect(array).toEqual([1, 2, 3, 100, 1000, 10000]);
  });

  test('should decode bitmap from base64', async () => {
    // Read the file and convert to base64
    const buffer = fs.readFileSync(tempFilePath);
    const base64Data = buffer.toString('base64');

    const bitmap = await db.decodeBitmap(base64Data, 'base64');

    expect(bitmap.has(1)).toBe(true);
    expect(bitmap.has(2)).toBe(true);
    expect(bitmap.has(3)).toBe(true);
    expect(bitmap.has(100)).toBe(true);
    expect(bitmap.has(1000)).toBe(true);
    expect(bitmap.has(10000)).toBe(true);
    expect(bitmap.has(4)).toBe(false);

    const array = bitmap.toArray();
    expect(array).toEqual([1, 2, 3, 100, 1000, 10000]);
  });

  test('should decode bitmap from buffer', async () => {
    // Read the file into a buffer
    const buffer = fs.readFileSync(tempFilePath);

    const bitmap = await db.decodeBitmap(buffer, 'buffer');

    expect(bitmap.has(1)).toBe(true);
    expect(bitmap.has(2)).toBe(true);
    expect(bitmap.has(3)).toBe(true);
    expect(bitmap.has(100)).toBe(true);
    expect(bitmap.has(1000)).toBe(true);
    expect(bitmap.has(10000)).toBe(true);
    expect(bitmap.has(4)).toBe(false);

    const array = bitmap.toArray();
    expect(array).toEqual([1, 2, 3, 100, 1000, 10000]);
  });

  test('should throw error for invalid source type', async () => {
    await expect(db.decodeBitmap(tempFilePath, 'invalid')).rejects.toThrow(
      'Invalid sourceType. Must be "file", "buffer", "base64", or "blob"',
    );
  });
});
