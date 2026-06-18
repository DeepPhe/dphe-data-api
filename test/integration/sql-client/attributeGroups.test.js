const { db } = require('../../../src/db');
const { SQLiteClient } = require('../../../src/db/sqlite-client');

describe('attribute groups (getAttributesClasses / getAttributesInstances)', () => {
  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns unique attribute classes', async () => {
    const classes = await db.getAttributesClasses();

    expect(classes.length).toBeGreaterThan(0);
    expect(classes.every((value) => typeof value === 'string')).toBe(true);
    expect(new Set(classes).size).toBe(classes.length);
  });

  test('returns instances for an existing class', async () => {
    const [groupName] = await db.getAttributesClasses();
    const instances = await db.getAttributesInstances(groupName);

    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBeGreaterThan(0);
  });

  test('omits patient IDs and raw bitmaps when includePatientIds is false', async () => {
    const [groupName] = await db.getAttributesClasses();
    const instances = await db.getAttributesInstances(groupName, false);

    expect(instances.length).toBeGreaterThan(0);
    instances.forEach((instance) => {
      expect(instance).not.toHaveProperty('patient_ids');
      expect(instance).not.toHaveProperty('patient_bitmap');
      expect(instance).not.toHaveProperty('patientbitmap');
    });
  });

  test('returns an empty array for an unknown class', async () => {
    await expect(db.getAttributesInstances('non-existent-attribute-group')).resolves.toEqual([]);
  });

  test('throws when the database is not open', async () => {
    const closedDb = new SQLiteClient('/tmp/closed-attributes.sqlite3');

    await expect(closedDb.getAttributesClasses()).rejects.toThrow('Database is not open');
    await expect(closedDb.getAttributesInstances('any-class')).rejects.toThrow(
      'Database is not open',
    );
  });
});
