const { db } = require('../../../src/db');
const { SQLiteClient } = require('../../../src/db/sqlite-client');

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

  test('returns an empty array for an unknown class', async () => {
    await expect(db.getCancersInstances('non-existent-cancer-group')).resolves.toEqual([]);
  });

  test('throws when the database is not open', async () => {
    const closedDb = new SQLiteClient('/tmp/closed-cancers.sqlite3');

    await expect(closedDb.getCancersClasses()).rejects.toThrow('Database is not open');
    await expect(closedDb.getCancersInstances('any-class')).rejects.toThrow('Database is not open');
  });
});
