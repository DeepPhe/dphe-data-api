const { db } = require('../../../src/db');

describe('SQLiteClient concept groups', () => {
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
    await expect(db.getConceptsForGroup('non-existent-concept-group')).resolves.toEqual([]);
  });
});
