'use strict';

const { SQLiteClient } = require('../../../src/db/sqlite-client');

describe('SQLiteClient.processPatientBitmapRow', () => {
  let client;

  beforeEach(() => {
    client = new SQLiteClient('/tmp/bitmap-row-test.sqlite3');
    client.patientBitmapToPatientIds = jest.fn().mockResolvedValue(['patient-1']);
  });

  test('converts patient_bitmap BLOBs and removes the raw bitmap', async () => {
    const bitmap = Buffer.from([1, 2, 3]);

    const result = await client.processPatientBitmapRow({ id: 1, patient_bitmap: bitmap }, true);

    expect(client.patientBitmapToPatientIds).toHaveBeenCalledWith(bitmap, 'blob');
    expect(result).toEqual({ id: 1, patient_ids: ['patient-1'] });
  });

  test('converts patientbitmap base64 text and removes the raw bitmap', async () => {
    const result = await client.processPatientBitmapRow({ id: 2, patientbitmap: 'AQID' }, true);

    expect(client.patientBitmapToPatientIds).toHaveBeenCalledWith('AQID', 'base64');
    expect(result).toEqual({ id: 2, patient_ids: ['patient-1'] });
  });

  test('detects base64 text and binary data returned as Buffers', () => {
    expect(
      client.getPatientBitmapSource({
        patientbitmap: Buffer.from('AQID', 'utf8'),
      }),
    ).toEqual({
      source: 'AQID',
      sourceType: 'base64',
    });

    const binaryBitmap = Buffer.from([0, 255, 1]);
    expect(client.getPatientBitmapSource({ patientbitmap: binaryBitmap })).toEqual({
      source: binaryBitmap,
      sourceType: 'blob',
    });
  });

  test('removes both bitmap fields when patient IDs are not requested', async () => {
    const result = await client.processPatientBitmapRow(
      {
        id: 3,
        patient_bitmap: Buffer.from([1]),
        patientbitmap: 'AQ==',
      },
      false,
    );

    expect(client.patientBitmapToPatientIds).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 3 });
  });
});
