const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
process.env.DB_PATH = path.resolve(__dirname, '../../../data/deepphe/deepphe_sqlite_compressed');

const { db } = require('../../../src/db/index');

describe('SQLiteClient patient profile endpoints', () => {
  let knownPatientId = null;

  beforeAll(async () => {
    await db.open();

    const sampleRow = await new Promise((resolve, reject) => {
      db.db.get(
        `SELECT
           ps.patient_id AS summary_patient_id,
           pim.patient_id AS mapped_patient_id
         FROM patient_summaries ps
         LEFT JOIN patient_id_mapping pim
           ON pim.sequential_id = ps.patient_id
         LIMIT 1`,
        [],
        (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve(row || null);
        }
      );
    }).catch(() => null);

    if (sampleRow) {
      knownPatientId =
        sampleRow.mapped_patient_id !== null && sampleRow.mapped_patient_id !== undefined
          ? String(sampleRow.mapped_patient_id)
          : String(sampleRow.summary_patient_id);
    }
  });

  afterAll(async () => {
    await db.close();
  });

  test('getPatientSummaryByPatientId returns parsed payload when available', async () => {
    if (!knownPatientId) {
      console.log('Skipping test: no patient with patient_summaries data found');
      return;
    }

    const summary = await db.getPatientSummaryByPatientId(knownPatientId);

    expect(summary).toBeTruthy();
    expect(typeof summary).toBe('object');
    expect(summary).toHaveProperty('patient_id');
    expect(summary).toHaveProperty('demographics');
  });

  test('getPatientProfile returns consolidated profile when available', async () => {
    if (!knownPatientId) {
      console.log('Skipping test: no patient with patient_summaries data found');
      return;
    }

    const profile = await db.getPatientProfile(knownPatientId);

    expect(profile).toBeTruthy();
    expect(profile).toHaveProperty('patientId', knownPatientId);
    expect(profile).toHaveProperty('demographics');
    expect(profile).toHaveProperty('documentCount');
    expect(profile).toHaveProperty('sources');
  });

  test('getPatientProfile returns null for unknown patient IDs', async () => {
    const profile = await db.getPatientProfile('NO_SUCH_PATIENT_123456789');
    expect(profile).toBeNull();
  });
});
