const { all, assertDatabaseOpen, get, run } = require('../../../src/db/postgres-operations');

describe('postgres operations', () => {
  test('rejects access without an open pool', async () => {
    const client = { isOpen: false, pool: null };

    expect(() => assertDatabaseOpen(client)).toThrow('Database is not open');
    await expect(all(client, 'SELECT 1')).rejects.toThrow('Database is not open');
    await expect(get(client, 'SELECT 1')).rejects.toThrow('Database is not open');
    await expect(run(client, 'SELECT 1')).rejects.toThrow('Database is not open');
  });

  test('returns all and get rows via pool.query', async () => {
    const client = {
      isOpen: true,
      pool: {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }),
      },
    };

    await expect(all(client, 'SELECT * FROM rows WHERE id = $1', [5])).resolves.toEqual([
      { id: 1 },
      { id: 2 },
    ]);
    await expect(get(client, 'SELECT * FROM rows WHERE id = $1', [5])).resolves.toEqual({
      id: 1,
    });
    expect(client.pool.query).toHaveBeenCalledWith('SELECT * FROM rows WHERE id = $1', [5]);
  });

  test('maps run metadata from rowCount', async () => {
    const client = {
      isOpen: true,
      pool: {
        query: jest.fn().mockResolvedValue({ rowCount: 2, rows: [] }),
      },
    };

    await expect(run(client, 'UPDATE rows SET value = $1', [1])).resolves.toEqual({
      changes: 2,
    });
  });

  test('normalizes Uint8Array columns to Buffer', async () => {
    const client = {
      isOpen: true,
      pool: {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, blob: new Uint8Array([1, 2, 3]) }],
        }),
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
      pool: {
        query: jest.fn().mockRejectedValue(queryError),
      },
    };

    await expect(all(client, 'SELECT * FROM rows')).rejects.toBe(queryError);
  });
});
