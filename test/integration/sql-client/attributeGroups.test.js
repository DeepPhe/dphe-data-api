const { db } = require('../../../src/db');
const { PostgresClient } = require('../../../src/db/postgres-client');

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

  test('returns the public attribute row shape, not physical PostgreSQL column names', async () => {
    const instances = await db.getAttributesInstances('stage', false);

    expect(instances[0]).toMatchObject({
      id: expect.any(Number),
      attribute_name: 'stage',
      classUri: expect.any(String),
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
    const closedDb = new PostgresClient(
      'postgresql://dphe:dphe@localhost:1/closed_attributes_test',
    );

    await expect(closedDb.getAttributesClasses()).rejects.toThrow('Database is not open');
    await expect(closedDb.getAttributesInstances('any-class')).rejects.toThrow(
      'Database is not open',
    );
  });
});
