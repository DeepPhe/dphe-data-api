const { db } = require('../../../src/db');
const { PostgresClient } = require('../../../src/db/postgres-client');

describe('cancer groups (getCancersClasses / getCancersInstances)', () => {
  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns unique cancer classes', async () => {
    const classes = await db.getCancersClasses();

    expect(classes.length).toBeGreaterThan(0);
    expect(classes.every((value) => typeof value === 'string')).toBe(true);
    expect(new Set(classes).size).toBe(classes.length);
  });

  test('returns instances for an existing class', async () => {
    const [classUri] = await db.getCancersClasses();
    const instances = await db.getCancersInstances(classUri);

    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBeGreaterThan(0);
  });

  test('returns the public cancer row shape, not physical PostgreSQL column names', async () => {
    const instances = await db.getCancersInstances('Breast_Cancer', false);

    expect(instances[0]).toMatchObject({
      id: expect.any(Number),
      classUri: 'Breast_Cancer',
      negated: expect.any(Number),
      uncertain: expect.any(Number),
      historic: expect.any(Number),
      num_patients: expect.any(Number),
    });
    expect(instances[0]).not.toHaveProperty('classuri');
    expect([0, 1]).toContain(instances[0].negated);
    expect([0, 1]).toContain(instances[0].uncertain);
    expect([0, 1]).toContain(instances[0].historic);
  });

  test('returns an empty array for an unknown class', async () => {
    await expect(db.getCancersInstances('non-existent-cancer-group')).resolves.toEqual([]);
  });

  test('throws when the database is not open', async () => {
    const closedDb = new PostgresClient('postgresql://dphe:dphe@localhost:1/closed_cancers_test');

    await expect(closedDb.getCancersClasses()).rejects.toThrow('Database is not open');
    await expect(closedDb.getCancersInstances('any-class')).rejects.toThrow('Database is not open');
  });
});
