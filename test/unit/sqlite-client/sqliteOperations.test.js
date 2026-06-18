const {
    all,
    assertDatabaseOpen,
    get,
    run
} = require('../../../src/db/sqlite-operations');

describe('sqlite operations', () => {
    test('rejects access without an open connection', () => {
        const client = { isOpen: false, db: null };

        expect(() => assertDatabaseOpen(client)).toThrow('Database is not open');
        expect(() => all(client, 'SELECT 1')).toThrow('Database is not open');
        expect(() => get(client, 'SELECT 1')).toThrow('Database is not open');
        expect(() => run(client, 'SELECT 1')).toThrow('Database is not open');
    });

    test('promisifies all and get results', async () => {
        const client = {
            isOpen: true,
            db: {
                all: jest.fn((sql, params, callback) => {
                    callback(null, [{ id: 1 }]);
                }),
                get: jest.fn((sql, params, callback) => {
                    callback(null, { id: 1 });
                })
            }
        };

        await expect(all(client, 'SELECT * FROM rows')).resolves.toEqual([
            { id: 1 }
        ]);
        await expect(get(client, 'SELECT * FROM rows')).resolves.toEqual({
            id: 1
        });
    });

    test('returns run metadata and propagates query errors', async () => {
        const queryError = new Error('query failed');
        const client = {
            isOpen: true,
            db: {
                all: jest.fn((sql, params, callback) => {
                    callback(queryError);
                }),
                run: jest.fn((sql, params, callback) => {
                    callback.call({ changes: 2, lastID: 7 }, null);
                })
            }
        };

        await expect(run(client, 'UPDATE rows SET value = 1')).resolves.toEqual({
            changes: 2,
            lastID: 7
        });
        await expect(all(client, 'SELECT * FROM rows')).rejects.toBe(queryError);
    });
});
