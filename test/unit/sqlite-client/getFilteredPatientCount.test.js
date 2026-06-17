const { db } = require('../../../src/db');
const { SQLiteClient } = require('../../../src/db/sqlite-client');

jest.setTimeout(30000);

describe('SQLiteClient.getFilteredPatientCount', () => {
  let raceValues;
  let genderValues;

  beforeAll(async () => {
    await db.open();
    const [raceRows, genderRows] = await Promise.all([
      db.getOmopInstances('RACE', false),
      db.getOmopInstances('GENDER', false)
    ]);
    raceValues = raceRows.map((row) => row.race).filter(Boolean);
    genderValues = genderRows.map((row) => row.gender).filter(Boolean);

    expect(raceValues.length).toBeGreaterThan(0);
    expect(genderValues.length).toBeGreaterThan(0);
  });

  afterAll(() => db.close());

  test('returns count and timing for a single filter', async () => {
    const result = await db.getFilteredPatientCount([
      { type: 'omop', class: 'RACE', instances: raceValues.slice(0, 2) }
    ]);

    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(result.timing.totalMs).toBeGreaterThan(0);
    expect(result.patient_ids).toHaveLength(result.count);
  });

  test('intersects multiple filters', async () => {
    const filters = [
      { type: 'omop', class: 'RACE', instances: raceValues.slice(0, 2) },
      { type: 'omop', class: 'GENDER', instances: genderValues.slice(0, 1) }
    ];
    const result = await db.getFilteredPatientCount(filters);

    expect(result.timing.itemCounts).toHaveLength(filters.length);
    result.timing.itemCounts.forEach((itemCount) => {
      expect(result.count).toBeLessThanOrEqual(itemCount);
    });
  });

  test('explicitly includes patient IDs', async () => {
    const result = await db.getFilteredPatientCount(
      [
        {
          type: 'omop',
          class: 'GENDER',
          instances: genderValues.slice(0, 1)
        }
      ],
      true
    );

    expect(result.patient_ids).toHaveLength(result.count);
    expect(result.timing.resolveMs).toBeGreaterThan(0);
  });

  test('handles repeated filters in under two seconds', async () => {
    const pool = [
      { type: 'omop', class: 'RACE', instances: raceValues.slice(0, 2) },
      { type: 'omop', class: 'GENDER', instances: genderValues.slice(0, 1) }
    ];
    const filters = Array.from({ length: 10 }, (_, index) => {
      return pool[index % pool.length];
    });

    const result = await db.getFilteredPatientCount(filters);

    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(result.timing.totalMs).toBeLessThan(2000);
  });

  test('rejects an invalid filter type', async () => {
    await expect(
      db.getFilteredPatientCount([
        { type: 'bogus', class: 'X', instances: ['Y'] }
      ])
    ).rejects.toThrow('Invalid filter type');
  });

  test('rejects an invalid OMOP class', async () => {
    await expect(
      db.getFilteredPatientCount([
        { type: 'omop', class: 'NONEXISTENT', instances: ['Y'] }
      ])
    ).rejects.toThrow('Invalid OMOP class');
  });

  test('returns zero for non-matching instances', async () => {
    const result = await db.getFilteredPatientCount([
      {
        type: 'omop',
        class: 'RACE',
        instances: ['ZZZ_NO_SUCH_RACE_VALUE']
      }
    ]);

    expect(result.count).toBe(0);
    expect(result.patient_ids).toEqual([]);
    expect(result.timing.itemCounts).toEqual([0]);
  });

  test('throws when the database is closed', async () => {
    const closedDb = new SQLiteClient('/tmp/nonexistent');

    await expect(
      closedDb.getFilteredPatientCount([
        { type: 'omop', class: 'RACE', instances: ['White'] }
      ])
    ).rejects.toThrow('Database is not open');
  });

  test('can disable automatic patient ID inclusion', async () => {
    const result = await db.getFilteredPatientCount(
      [
        { type: 'omop', class: 'RACE', instances: raceValues.slice(0, 2) }
      ],
      false,
      0
    );

    expect(result.patient_ids).toEqual([]);
  });
});
