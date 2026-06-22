const { all, assertDatabaseOpen, get, run } = require('../../../src/db/sqlite-operations');

describe('sqlite operations', () => {
  test('rejects access without an open connection', async () => {
    const client = { isOpen: false, db: null };

    expect(() => assertDatabaseOpen(client)).toThrow('Database is not open');
    await expect(all(client, 'SELECT 1')).rejects.toThrow('Database is not open');
    await expect(get(client, 'SELECT 1')).rejects.toThrow('Database is not open');
    await expect(run(client, 'SELECT 1')).rejects.toThrow('Database is not open');
  });

  test('returns all and get results via prepared statements', async () => {
    const statement = {
      all: jest.fn(() => [{ id: 1 }]),
      get: jest.fn(() => ({ id: 1 })),
    };
    const client = {
      isOpen: true,
      db: { prepare: jest.fn(() => statement) },
    };

    await expect(all(client, 'SELECT * FROM rows', [5])).resolves.toEqual([{ id: 1 }]);
    await expect(get(client, 'SELECT * FROM rows')).resolves.toEqual({ id: 1 });
    // Anonymous params are spread as individual bind arguments.
    expect(statement.all).toHaveBeenCalledWith(5);
  });

  test('maps run metadata (BigInt -> Number, lastInsertRowid -> lastID)', async () => {
    const client = {
      isOpen: true,
      db: {
        prepare: jest.fn(() => ({
          run: () => ({ changes: 2n, lastInsertRowid: 7n }),
        })),
      },
    };

    await expect(run(client, 'UPDATE rows SET value = 1')).resolves.toEqual({
      changes: 2,
      lastID: 7,
    });
  });

  test('normalizes Uint8Array (BLOB) columns to Buffer', async () => {
    const client = {
      isOpen: true,
      db: {
        prepare: jest.fn(() => ({
          all: () => [{ id: 1, blob: new Uint8Array([1, 2, 3]) }],
        })),
      },
    };

    const rows = await all(client, 'SELECT * FROM rows');
    expect(Buffer.isBuffer(rows[0].blob)).toBe(true);
    expect([...rows[0].blob]).toEqual([1, 2, 3]);
  });

  test('propagates query errors as rejections', async () => {
    const queryError = new Error('query failed');
    const client = {
      isOpen: true,
      db: {
        prepare: jest.fn(() => ({
          all: () => {
            throw queryError;
          },
        })),
      },
    };

    await expect(all(client, 'SELECT * FROM rows')).rejects.toBe(queryError);
  });
});
