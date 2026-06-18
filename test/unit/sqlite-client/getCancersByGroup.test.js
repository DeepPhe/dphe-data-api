const { db } = require('../../../src/db');

describe('SQLiteClient cancer groups', () => {
  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns unique cancer groups', async () => {
    const groups = await db.getCancersByGroup();

    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group) => typeof group === 'string')).toBe(true);
    expect(new Set(groups).size).toBe(groups.length);
  });

  test('returns cancers for an existing group', async () => {
    const [group] = await db.getCancersByGroup();
    const cancers = await db.getCancersForGroup(group);

    expect(Array.isArray(cancers)).toBe(true);
    expect(cancers.length).toBeGreaterThan(0);
  });

  test('returns an empty array for an unknown group', async () => {
    await expect(db.getCancersForGroup('non-existent-cancer-group')).resolves.toEqual([]);
  });
});
