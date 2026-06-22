const { db } = require('../../../src/db/index');
const { SQLiteClient } = require('../../../src/db/sqlite-client');

describe('SQLiteClient.getPatientSummariesByPatientIds', () => {
  let knownPatientId = null;
  let knownSummaryPatientId = null;

  beforeAll(async () => {
    await db.open();

    const [sample] = await db.getAllRows(
      `SELECT
           ps.patient_id AS summary_patient_id,
           pim.patient_id AS patient_id
         FROM patient_summaries ps
         LEFT JOIN patient_id_mapping pim
           ON pim.sequential_id = ps.patient_id
         LIMIT 1`,
    );

    if (sample) {
      knownSummaryPatientId = String(sample.summary_patient_id);
      if (sample.patient_id !== null && sample.patient_id !== undefined) {
        knownPatientId = String(sample.patient_id);
      }
    }

    expect(knownSummaryPatientId).toBeTruthy();
    expect(knownPatientId).toBeTruthy();
  });

  afterAll(async () => {
    await db.close();
  });

  test('returns decompressed summaries for external patient IDs', async () => {
    const summaries = await db.getPatientSummariesByPatientIds([knownPatientId]);

    expect(Array.isArray(summaries)).toBe(true);
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries[0].patient_id).toBe(knownPatientId);
    expect(typeof summaries[0].json_text).toBe('string');
    expect(() => JSON.parse(summaries[0].json_text)).not.toThrow();
  });

  test('supports direct summary-table patient_id lookups', async () => {
    const summaries = await db.getPatientSummariesByPatientIds([knownSummaryPatientId]);
    expect(Array.isArray(summaries)).toBe(true);
    expect(summaries.length).toBeGreaterThan(0);
    expect(typeof summaries[0].json_text).toBe('string');
    expect(() => JSON.parse(summaries[0].json_text)).not.toThrow();
  });

  test('returns empty array for unknown patient IDs', async () => {
    const summaries = await db.getPatientSummariesByPatientIds(['NO_SUCH_PATIENT_123456789']);
    expect(summaries).toEqual([]);
  });

  test('throws if database is not open', async () => {
    const closedDb = new SQLiteClient('/tmp/nonexistent.sqlite');
    await expect(closedDb.getPatientSummariesByPatientIds(['123'])).rejects.toThrow(
      'Database is not open',
    );
  });
});
