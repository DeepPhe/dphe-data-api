const zstd = require('@mongodb-js/zstd');
const { all, assertDatabaseOpen, get, run } = require('./sqlite-operations');

function normalizeString(value) {
    return String(value ?? '').trim();
}

async function decodeContent(content, encoding) {
    if (encoding !== 'zstd') {
        return content;
    }

    const decompressed = await zstd.decompress(Buffer.from(content));
    return decompressed.toString('utf8');
}

function parseContent(content) {
    if (!content) {
        return content;
    }

    const text = Buffer.isBuffer(content) ? content.toString('utf8') : content;
    try {
        return JSON.parse(text);
    } catch (_) {
        return content;
    }
}

class SQLiteFileStore {
    constructor(client) {
        this.client = client;
    }

    async put(key, value) {
        const valueText = typeof value === 'string' ? value : JSON.stringify(value);
        await run(
            this.client,
            'INSERT OR REPLACE INTO files (filename, content, encoding) VALUES (?, ?, ?)',
            [key, valueText, 'raw']
        );
    }

    async get(key, parseJson = true) {
        const row = await get(
            this.client,
            'SELECT content, encoding FROM files WHERE filename = ?',
            [key]
        );
        if (!row) {
            return null;
        }

        const content = await decodeContent(row.content, row.encoding);
        return parseJson ? parseContent(content) : content;
    }

    async del(key) {
        await run(this.client, 'DELETE FROM files WHERE filename = ?', [key]);
    }

    async batch(operations) {
        assertDatabaseOpen(this.client);

        if (!Array.isArray(operations) || operations.length === 0) {
            return;
        }

        await run(this.client, 'BEGIN TRANSACTION');
        try {
            for (const operation of operations) {
                if (operation.type === 'put') {
                    const valueText =
                        typeof operation.value === 'string'
                            ? operation.value
                            : JSON.stringify(operation.value);
                    await run(
                        this.client,
                        'INSERT OR REPLACE INTO files (filename, content, encoding) VALUES (?, ?, ?)',
                        [operation.key, valueText, 'raw']
                    );
                } else if (operation.type === 'del') {
                    await run(
                        this.client,
                        'DELETE FROM files WHERE filename = ?',
                        [operation.key]
                    );
                } else {
                    throw new Error(`Unsupported batch operation: ${operation.type}`);
                }
            }

            await run(this.client, 'COMMIT');
        } catch (error) {
            try {
                await run(this.client, 'ROLLBACK');
            } catch (_) {
                // Preserve the operation failure if rollback also fails.
            }
            throw error;
        }
    }

    async getByPrefix(prefix) {
        assertDatabaseOpen(this.client);

        const normalizedPrefix = normalizeString(prefix);
        if (!normalizedPrefix) {
            return [];
        }

        const nextPrefix = /^\d+$/.test(normalizedPrefix)
            ? (BigInt(normalizedPrefix) + 1n).toString()
            : `${normalizedPrefix}\uFFFF`;
        const rows = await all(
            this.client,
            'SELECT filename, content, encoding FROM files WHERE filename >= ? and filename < ? ORDER BY filename',
            [normalizedPrefix, nextPrefix]
        );

        return Promise.all(rows.map((row) => this.processRow(row)));
    }

    async getAll(limit = 1000) {
        const rows = await all(
            this.client,
            'SELECT filename, content, encoding FROM files ORDER BY filename LIMIT ?',
            [limit]
        );

        return Promise.all(rows.map((row) => this.processRow(row)));
    }

    async clear() {
        await run(this.client, 'DELETE FROM files');
    }

    async processRow(row) {
        const content = await decodeContent(row.content, row.encoding);
        return {
            key: row.filename,
            value: parseContent(content)
        };
    }
}

module.exports = {
    SQLiteFileStore
};
