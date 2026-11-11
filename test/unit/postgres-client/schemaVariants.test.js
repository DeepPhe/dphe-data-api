const zlib = require('node:zlib');
const { Pool } = require('pg');
const { PostgresClient } = require('../../../src/db/postgres-client');
const { seedPostgres } = require('../../helpers/seed-postgres');
const { TEST_DATABASE_URL } = require('../../helpers/test-env');

async function withPool(callback) {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
    await pool.end();
  }
}

function rawSummary(patientId, facts = {}) {
  return JSON.stringify({
    patient_id: patientId,
    ...facts,
  });
}

function compressedSummary(patientId, facts = {}) {
  return zlib.zstdCompressSync(Buffer.from(rawSummary(patientId, facts)));
}

describe('PostgresClient schema variants', () => {
  const openedClients = [];

  beforeEach(async () => {
    await seedPostgres(TEST_DATABASE_URL);
  });

  afterEach(async () => {
    await Promise.all(openedClients.splice(0).map((client) => client.close()));
    await seedPostgres(TEST_DATABASE_URL);
  });

  function createClient() {
    const client = new PostgresClient(TEST_DATABASE_URL);
    openedClients.push(client);
    return client;
  }

  test('supports text patient_summaries.patient_id with raw json_text payloads', async () => {
    await withPool(async (client) => {
      await client.query('DROP TABLE deepphe.patient_summaries');
      await client.query(`
        CREATE TABLE deepphe.patient_summaries (
          patient_id text PRIMARY KEY,
          json_text text NOT NULL
        )
      `);
      await client.query(
        `INSERT INTO deepphe.patient_summaries (patient_id, json_text)
         VALUES ($1, $2), ($3, $4)`,
        [
          'fake_patient1',
          rawSummary('fake_patient1', { schema: 'external-json-text' }),
          'fake_patient2',
          rawSummary('fake_patient2', { schema: 'external-json-text' }),
        ],
      );
    });

    const client = createClient();
    await client.open();

    const [externalSummary] = await client.getPatientSummariesByPatientIds(['fake_patient1']);
    expect(externalSummary.patient_id).toBe('fake_patient1');
    expect(JSON.parse(externalSummary.json_text)).toMatchObject({
      patient_id: 'fake_patient1',
      schema: 'external-json-text',
    });

    const [sequentialAliasSummary] = await client.getPatientSummariesByPatientIds(['0']);
    expect(sequentialAliasSummary.patient_id).toBe('fake_patient1');
    expect(JSON.parse(sequentialAliasSummary.json_text)).toMatchObject({
      patient_id: 'fake_patient1',
      schema: 'external-json-text',
    });
  });

  test('supports text patient_summaries.patient_id with compressed summary_json payloads', async () => {
    await withPool(async (client) => {
      await client.query('DROP TABLE deepphe.patient_summaries');
      await client.query(`
        CREATE TABLE deepphe.patient_summaries (
          patient_id text PRIMARY KEY,
          summary_json bytea NOT NULL
        )
      `);
      await client.query(
        `INSERT INTO deepphe.patient_summaries (patient_id, summary_json)
         VALUES ($1, $2)`,
        ['fake_patient2', compressedSummary('fake_patient2', { schema: 'external-summary-json' })],
      );
    });

    const client = createClient();
    await client.open();

    const [summary] = await client.getPatientSummariesByPatientIds(['1']);
    expect(summary.patient_id).toBe('fake_patient2');
    expect(JSON.parse(summary.json_text)).toMatchObject({
      patient_id: 'fake_patient2',
      schema: 'external-summary-json',
    });
  });

  test('treats missing OMOP tables as optional at query time', async () => {
    await withPool(async (client) => {
      await client.query('DROP TABLE deepphe.lookup_race_by_group');
    });

    const client = createClient();
    await client.open();

    await expect(client.getOmopInstances('RACE')).resolves.toEqual([]);
    await expect(client.getOmopInstancesForPatient('RACE', 'fake_patient1')).resolves.toEqual([]);
    await expect(
      client.getFilteredPatientCount([{ type: 'omop', class: 'RACE', instances: ['White'] }]),
    ).resolves.toMatchObject({
      count: 0,
      patient_ids: [],
      timing: {
        itemCounts: [0],
      },
    });
  });
});
