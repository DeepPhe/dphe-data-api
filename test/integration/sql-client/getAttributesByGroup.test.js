const { db } = require('../../../src/db');

describe('getAttributesByGroup and getAttributesForGroup', () => {
  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns unique attribute groups', async () => {
    const groups = await db.getAttributesByGroup();

    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group) => typeof group === 'string')).toBe(true);
    expect(new Set(groups).size).toBe(groups.length);
  });

  test('returns attributes for an existing group', async () => {
    const [group] = await db.getAttributesByGroup();
    const attributes = await db.getAttributesForGroup(group);

    expect(Array.isArray(attributes)).toBe(true);
    expect(attributes.length).toBeGreaterThan(0);
  });

  test('omits patient IDs and raw bitmaps when requested', async () => {
    const [group] = await db.getAttributesByGroup();
    const attributes = await db.getAttributesForGroup(group, false);

    expect(attributes.length).toBeGreaterThan(0);
    attributes.forEach((attribute) => {
      expect(attribute).not.toHaveProperty('patient_ids');
      expect(attribute).not.toHaveProperty('patient_bitmap');
      expect(attribute).not.toHaveProperty('patientbitmap');
    });
  });

  test('returns an empty array for an unknown group', async () => {
    await expect(db.getAttributesForGroup('non-existent-attribute-group')).resolves.toEqual([]);
  });

  test('throws when the database is closed', async () => {
    const closedDb = {
      isOpen: false,
      getAttributesByGroup: db.getAttributesByGroup,
      getAttributesForGroup: db.getAttributesForGroup,
    };

    await expect(closedDb.getAttributesByGroup()).rejects.toThrow('Database is not open');
    await expect(closedDb.getAttributesForGroup('any-group')).rejects.toThrow(
      'Database is not open',
    );
  });
});
