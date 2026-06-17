const fs = require('fs');
const os = require('os');
const path = require('path');
const roaring = require('roaring');
const { db } = require('../../src/db');

describe('SQLiteClient.patientBitmapToPatientIds', () => {
  let tempDir;

  beforeAll(async () => {
    await db.open();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-test-'));
  });

  afterAll(async () => {
    await db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('maps sequential IDs and marks unknown IDs as missing', async () => {
    const mappings = await new Promise((resolve, reject) => {
      db.db.all(
        'SELECT sequential_id, patient_id FROM patient_id_mapping LIMIT 5',
        [],
        (error, rows) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(rows);
        }
      );
    });
    expect(mappings.length).toBeGreaterThan(0);

    const bitmap = new roaring.RoaringBitmap32();
    mappings.forEach(({ sequential_id: sequentialId }) => bitmap.add(sequentialId));
    bitmap.add(999999);

    const bitmapPath = path.join(tempDir, 'patient-bitmap.bin');
    fs.writeFileSync(bitmapPath, bitmap.serialize(false));

    const result = await db.patientBitmapToPatientIds(bitmapPath, 'file');
    const expectedById = new Map(
      mappings.map(({ sequential_id: sequentialId, patient_id: patientId }) => [
        sequentialId,
        patientId
      ])
    );
    const expected = bitmap
      .toArray()
      .map((sequentialId) => expectedById.get(sequentialId) || 'missing');

    expect(result).toEqual(expected);
  });

  test('returns an empty array for an empty bitmap', async () => {
    const bitmapPath = path.join(tempDir, 'empty-bitmap.bin');
    const bitmap = new roaring.RoaringBitmap32();
    fs.writeFileSync(bitmapPath, bitmap.serialize(false));

    await expect(db.patientBitmapToPatientIds(bitmapPath, 'file')).resolves.toEqual(
      []
    );
  });

  test('rejects an invalid source type', async () => {
    await expect(
      db.patientBitmapToPatientIds(Buffer.alloc(0), 'invalid')
    ).rejects.toThrow(
      'Invalid sourceType. Must be "file", "buffer", or "base64"'
    );
  });
});
