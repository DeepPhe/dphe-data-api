const axios = require('axios');
const app = require('../../../src/app');
const { closeDatabase } = require('../../../src/db');

jest.setTimeout(30000);

describe('POST /deepphe/filter/count', () => {
  let server;
  let baseUrl;
  let raceValues;
  let genderValues;

  beforeAll(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/v1/deepphe-api`;

    const [{ data: raceRows }, { data: genderRows }] = await Promise.all([
      axios.get(`${baseUrl}/omop/instances?attribute=RACE`),
      axios.get(`${baseUrl}/omop/instances?attribute=GENDER`),
    ]);
    raceValues = raceRows.map((row) => row.race).filter(Boolean);
    genderValues = genderRows.map((row) => row.gender).filter(Boolean);

    expect(raceValues.length).toBeGreaterThan(0);
    expect(genderValues.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await closeDatabase();
  });

  test('returns count, patient IDs, and timing for a single filter', async () => {
    const { data } = await axios.post(`${baseUrl}/deepphe/filter/count`, {
      filters: [{ type: 'omop', class: 'RACE', instances: raceValues.slice(0, 2) }],
    });

    expect(data.count).toBeGreaterThanOrEqual(0);
    expect(data.timing.totalMs).toBeGreaterThan(0);
    expect(data.patient_ids).toHaveLength(data.count);
  });

  test('includes patient IDs when explicitly requested', async () => {
    const { data } = await axios.post(`${baseUrl}/deepphe/filter/count?includePatientIds=true`, {
      filters: [
        {
          type: 'omop',
          class: 'GENDER',
          instances: genderValues.slice(0, 1),
        },
      ],
    });

    expect(data.patient_ids).toHaveLength(data.count);
    expect(data.timing.resolveMs).toBeGreaterThan(0);
  });

  test('intersects multiple filters', async () => {
    const filters = [
      { type: 'omop', class: 'RACE', instances: raceValues.slice(0, 2) },
      { type: 'omop', class: 'GENDER', instances: genderValues.slice(0, 1) },
    ];
    const { data } = await axios.post(`${baseUrl}/deepphe/filter/count`, {
      filters,
    });

    expect(data.count).toBeGreaterThanOrEqual(0);
    expect(data.timing.itemCounts).toHaveLength(filters.length);
    data.timing.itemCounts.forEach((itemCount) => {
      expect(data.count).toBeLessThanOrEqual(itemCount);
    });
  });

  test('handles 50 filters in under two seconds', async () => {
    const pool = [
      { type: 'omop', class: 'RACE', instances: raceValues.slice(0, 2) },
      { type: 'omop', class: 'GENDER', instances: genderValues.slice(0, 1) },
    ];
    const filters = Array.from({ length: 50 }, (_, index) => {
      return pool[index % pool.length];
    });

    const { data } = await axios.post(`${baseUrl}/deepphe/filter/count`, {
      filters,
    });

    expect(data.count).toBeGreaterThanOrEqual(0);
    expect(data.timing.totalMs).toBeLessThan(2000);
  });

  test.each([
    ['empty filters', { filters: [] }],
    ['missing filters', {}],
    ['invalid filter type', { filters: [{ type: 'bogus', class: 'X', instances: ['Y'] }] }],
    ['missing instances', { filters: [{ type: 'omop', class: 'RACE' }] }],
  ])('returns 400 for %s', async (description, payload) => {
    await expect(axios.post(`${baseUrl}/deepphe/filter/count`, payload)).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  test('can disable automatic patient ID inclusion', async () => {
    const { data } = await axios.post(`${baseUrl}/deepphe/filter/count?autoIncludeThreshold=0`, {
      filters: [{ type: 'omop', class: 'RACE', instances: raceValues.slice(0, 2) }],
    });

    expect(data.count).toBeGreaterThanOrEqual(0);
    expect(data.patient_ids).toEqual([]);
  });
});
