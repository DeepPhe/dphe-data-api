const zlib = require('node:zlib');
const { db } = require('../../../src/db/index');
const { PostgresClient } = require('../../../src/db/postgres-client');

describe('PostgresClient.getPatientSummariesByPatientIds', () => {
  let knownPatientId = null;
  let knownSummaryPatientId = null;

  beforeAll(async () => {
    await db.open();

    const [sample] = await db.getAllRows(
      `SELECT
           ps.patient_id AS summary_patient_id,
           pim.patient_id AS patient_id
         FROM deepphe.patient_summaries ps
         LEFT JOIN deepphe.patient_id_mapping pim
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

  describe('with real-world 10-digit numeric patient IDs', () => {
    // Real patient IDs (cdm.person_id) are 10 digits, beyond PostgreSQL integer, so they must not be
    // treated as candidate sequential IDs. Regression: POST /deepphe/filter/summary returned 500
    // ("value ... is out of range for type integer") when the patient drawer opened.
    const largePatientId = '9000000001';
    const sequentialId = 2;

    beforeAll(async () => {
      await db.getAllRows(
        `INSERT INTO deepphe.patient_id_mapping (sequential_id, patient_id) VALUES ($1, $2)`,
        [sequentialId, largePatientId],
      );
      await db.getAllRows(
        `INSERT INTO deepphe.patient_summaries (patient_id, summary_json) VALUES ($1, $2)`,
        [
          sequentialId,
          zlib.zstdCompressSync(Buffer.from(JSON.stringify({ patient_id: largePatientId }))),
        ],
      );
    });

    afterAll(async () => {
      await db.getAllRows(`DELETE FROM deepphe.patient_summaries WHERE patient_id = $1`, [
        sequentialId,
      ]);
      await db.getAllRows(`DELETE FROM deepphe.patient_id_mapping WHERE sequential_id = $1`, [
        sequentialId,
      ]);
    });

    test('returns the summary for a patient ID above the integer range', async () => {
      const summaries = await db.getPatientSummariesByPatientIds([largePatientId]);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].patient_id).toBe(largePatientId);
      expect(JSON.parse(summaries[0].json_text)).toMatchObject({ patient_id: largePatientId });
    });

    test('returns no summary, not an error, for an unknown patient ID above the integer range', async () => {
      await expect(db.getPatientSummariesByPatientIds(['9999999999'])).resolves.toEqual([]);
    });
  });

  test('returns empty array for unknown patient IDs', async () => {
    const summaries = await db.getPatientSummariesByPatientIds(['NO_SUCH_PATIENT_123456789']);
    expect(summaries).toEqual([]);
  });

  test('throws if database is not open', async () => {
    const closedDb = new PostgresClient('postgresql://dphe:dphe@localhost:1/closed_test');
    await expect(closedDb.getPatientSummariesByPatientIds(['123'])).rejects.toThrow(
      'Database is not open',
    );
  });
});
