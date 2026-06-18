const { db } = require('../../../src/db');

describe('getAttributes', () => {
  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns unique attribute names', async () => {
    const attributeNames = await db.getAttributes();

    expect(attributeNames.length).toBeGreaterThan(0);
    expect(attributeNames.every((name) => typeof name === 'string')).toBe(true);
    expect(new Set(attributeNames).size).toBe(attributeNames.length);
  });

  test('throws when the database is closed', async () => {
    const closedDb = {
      isOpen: false,
      getAttributes: db.getAttributes,
    };

    await expect(closedDb.getAttributes()).rejects.toThrow('Database is not open');
  });
});
