const { db } = require('../../../src/db');
const { SQLiteClient } = require('../../../src/db/sqlite-client');

describe('concept groups (getConceptsClasses / getConceptsInstances)', () => {
  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns unique concept classes', async () => {
    const classes = await db.getConceptsClasses();

    expect(classes.length).toBeGreaterThan(0);
    expect(classes.every((value) => typeof value === 'string')).toBe(true);
    expect(new Set(classes).size).toBe(classes.length);
  });

  test('returns instances for an existing class', async () => {
    const [dpheGroup] = await db.getConceptsClasses();
    const instances = await db.getConceptsInstances(dpheGroup);

    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBeGreaterThan(0);
  });

  test('returns an empty array for an unknown class', async () => {
    await expect(db.getConceptsInstances('non-existent-concept-group')).resolves.toEqual([]);
  });

  test('throws when the database is not open', async () => {
    const closedDb = new SQLiteClient('/tmp/closed-concepts.sqlite3');

    await expect(closedDb.getConceptsClasses()).rejects.toThrow('Database is not open');
    await expect(closedDb.getConceptsInstances('any-class')).rejects.toThrow(
      'Database is not open',
    );
  });
});
