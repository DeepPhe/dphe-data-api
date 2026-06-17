const { db } = require('../../../src/db');

describe('getConceptsByGroup and getConceptsForGroup', () => {
  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns unique concept groups', async () => {
    const groups = await db.getConceptsByGroup();

    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group) => typeof group === 'string')).toBe(true);
    expect(new Set(groups).size).toBe(groups.length);
  });

  test('returns concepts for an existing group', async () => {
    const [group] = await db.getConceptsByGroup();
    const concepts = await db.getConceptsForGroup(group);

    expect(Array.isArray(concepts)).toBe(true);
    expect(concepts.length).toBeGreaterThan(0);
  });

  test('returns an empty array for an unknown group', async () => {
    await expect(
      db.getConceptsForGroup('non-existent-concept-group')
    ).resolves.toEqual([]);
  });

  test('throws when the database is closed', async () => {
    const closedDb = {
      isOpen: false,
      getConceptsByGroup: db.getConceptsByGroup,
      getConceptsForGroup: db.getConceptsForGroup
    };

    await expect(closedDb.getConceptsByGroup()).rejects.toThrow(
      'Database is not open'
    );
    await expect(closedDb.getConceptsForGroup('any-group')).rejects.toThrow(
      'Database is not open'
    );
  });
});
