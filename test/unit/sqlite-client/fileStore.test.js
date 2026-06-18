const fs = require('fs');
const os = require('os');
const path = require('path');
const zstd = require('@mongodb-js/zstd');
const { SQLiteClient } = require('../../../src/db/sqlite-client');
const { run } = require('../../../src/db/sqlite-operations');

describe('SQLiteClient file store', () => {
    let client;
    let tempDir;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-store-test-'));
        client = new SQLiteClient(path.join(tempDir, 'test.sqlite3'));
        await client.open();
        await run(
            client,
            `CREATE TABLE files (
                filename TEXT PRIMARY KEY,
                content BLOB,
                encoding TEXT
            )`
        );
    });

    afterEach(async () => {
        await client.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('stores, reads, checks, and deletes JSON values', async () => {
        await client.put('patient.json', { id: 'patient-1' });

        await expect(client.get('patient.json')).resolves.toEqual({
            id: 'patient-1'
        });
        await expect(client.exists('patient.json')).resolves.toBe(true);

        await client.del('patient.json');
        await expect(client.get('patient.json')).resolves.toBeNull();
        await expect(client.exists('patient.json')).resolves.toBe(false);
    });

    test('reads zstd-compressed rows and supports raw reads', async () => {
        const compressed = await zstd.compress(
            Buffer.from(JSON.stringify({ id: 'compressed' }))
        );
        await run(
            client,
            'INSERT INTO files (filename, content, encoding) VALUES (?, ?, ?)',
            ['compressed.json', compressed, 'zstd']
        );

        await expect(client.get('compressed.json')).resolves.toEqual({
            id: 'compressed'
        });
        await expect(client.get('compressed.json', false)).resolves.toBe(
            '{"id":"compressed"}'
        );
    });

    test('runs batch operations atomically and handles empty batches', async () => {
        await expect(client.batch([])).resolves.toBeUndefined();
        await client.batch([
            { type: 'put', key: 'one.json', value: { id: 1 } },
            { type: 'put', key: 'two.json', value: { id: 2 } },
            { type: 'del', key: 'one.json' }
        ]);

        await expect(client.get('one.json')).resolves.toBeNull();
        await expect(client.get('two.json')).resolves.toEqual({ id: 2 });

        await expect(
            client.batch([
                { type: 'put', key: 'rolled-back.json', value: { id: 3 } },
                { type: 'unsupported', key: 'invalid.json' }
            ])
        ).rejects.toThrow('Unsupported batch operation');
        await expect(client.get('rolled-back.json')).resolves.toBeNull();
    });

    test('scans prefixes, limits getAll, and clears the table', async () => {
        await client.batch([
            { type: 'put', key: 'fake_patient1.json', value: { id: 1 } },
            { type: 'put', key: 'fake_patient1_D_1.json', value: { id: 2 } },
            { type: 'put', key: 'fake_patient2.json', value: { id: 3 } }
        ]);

        const prefixedRows = await client.getByPrefix('fake_patient1');
        expect(prefixedRows.map((row) => row.key)).toEqual([
            'fake_patient1.json',
            'fake_patient1_D_1.json'
        ]);
        await expect(client.getAll(2)).resolves.toHaveLength(2);

        await client.clear();
        await expect(client.getAll()).resolves.toEqual([]);
    });

    test('rejects operations when the database is closed', async () => {
        await client.close();

        await expect(client.put('closed.json', {})).rejects.toThrow(
            'Database is not open'
        );
        await expect(client.get('closed.json')).rejects.toThrow(
            'Database is not open'
        );
        await expect(client.getByPrefix('closed')).rejects.toThrow(
            'Database is not open'
        );
    });
});
