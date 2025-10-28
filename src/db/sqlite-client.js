const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const zstd = require('@mongodb-js/zstd');

/**
 * SQLite3 Client Wrapper
 * Provides a simplified interface for interacting with SQLite3
 */
class SQLiteClient {
    constructor(dbPath = './data/deepphe/deepphe_sqlite_compressed') {
        this.dbPath = path.resolve(dbPath);
        this.db = null;
        this.isOpen = false;
    }

    /**
     * Open the database connection
     * @returns {Promise<void>}
     */
    async open() {
        return new Promise((resolve, reject) => {
            if (this.isOpen) {
                return resolve();
            }

            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Failed to open SQLite:', err);
                    return reject(err);
                }

                this.isOpen = true;
                console.log(`SQLite opened at: ${this.dbPath}`);
                resolve();
            });

        });
    }

    /**
     * Close the database connection
     * @returns {Promise<void>}
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (!this.isOpen || !this.db) {
                return resolve();
            }

            this.db.close((err) => {
                if (err) {
                    console.error('Failed to close SQLite:', err);
                    return reject(err);
                }
                this.isOpen = false;
                console.log('SQLite closed');
                resolve();
            });
        });
    }

    /**
     * Put a key-value pair in the database
     * @param {string} key - The key
     * @param {any} value - The value (will be JSON stringified)
     * @returns {Promise<void>}
     */
    async put(key, value) {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            this.db.run(
                'INSERT OR REPLACE INTO files (filename, content, encoding) VALUES (?, ?, ?)',
                [key, valueStr, 'raw'],
                (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    /**
     * Get a value by key from the database
     * @param {string} key - The key
     * @param {boolean} parseJson - Whether to parse the value as JSON (default: true)
     * @returns {Promise<any>}
     */
    async get(key, parseJson = true) {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.get('SELECT content, encoding FROM files WHERE filename = ?', [key], async (err, row) => {
                if (err) {
                    return reject(err);
                }

                if (!row) {
                    return resolve(null);
                }

                let content = row.content;

                // Decompress if encoding is zstd
                if (row.encoding === 'zstd') {
                    try {
                        const decompressed = await zstd.decompress(Buffer.from(content));
                        content = decompressed.toString('utf8');
                    } catch (decompressErr) {
                        console.error(`Failed to decompress ${key}:`, decompressErr);
                        return reject(decompressErr);
                    }
                }

                if (parseJson && content) {
                    try {
                        resolve(JSON.parse(content));
                    } catch (e) {
                        resolve(content);
                    }
                } else {
                    resolve(content);
                }
            });
        });
    }

    /**
     * Delete a key-value pair from the database
     * @param {string} key - The key
     * @returns {Promise<void>}
     */
    async del(key) {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.run('DELETE FROM files WHERE filename = ?', [key], (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    /**
     * Batch operations
     * @param {Array} operations - Array of {type: 'put'|'del', key: string, value?: any}
     * @returns {Promise<void>}
     */
    async batch(operations) {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                let hasError = false;
                let completed = 0;

                operations.forEach((op) => {
                    if (hasError) return;

                    if (op.type === 'put') {
                        const valueStr = typeof op.value === 'string' ? op.value : JSON.stringify(op.value);
                        this.db.run(
                            'INSERT OR REPLACE INTO files (filename, content, encoding) VALUES (?, ?, ?)',
                            [op.key, valueStr, 'raw'],
                            (err) => {
                                if (err && !hasError) {
                                    hasError = true;
                                    this.db.run('ROLLBACK');
                                    return reject(err);
                                }
                                completed++;
                                if (completed === operations.length) {
                                    this.db.run('COMMIT', (err) => {
                                        if (err) return reject(err);
                                        resolve();
                                    });
                                }
                            }
                        );
                    } else if (op.type === 'del') {
                        this.db.run('DELETE FROM files WHERE filename = ?', [op.key], (err) => {
                            if (err && !hasError) {
                                hasError = true;
                                this.db.run('ROLLBACK');
                                return reject(err);
                            }
                            completed++;
                            if (completed === operations.length) {
                                this.db.run('COMMIT', (err) => {
                                    if (err) return reject(err);
                                    resolve();
                                });
                            }
                        });
                    }
                });
            });
        });
    }

    /**
     * Get all keys with a specific prefix
     * @param {string} prefix - The key prefix
     * @returns {Promise<Array>}
     */
    async getByPrefix(prefix) {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }
            //get prefix as an int and add 1
            let next_prefix = (parseInt(prefix) + 1).toString();

            this.db.all(
                'SELECT filename, content, encoding FROM files WHERE filename >= ? and filename < ? ORDER BY filename',
                [prefix, next_prefix],
                async (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        const results = await Promise.all(rows.map(async row => {
                            let content = row.content;

                            // Decompress if encoding is zstd
                            if (row.encoding === 'zstd') {
                                try {
                                    // Content is stored as Buffer, decompress it
                                    const decompressed = await zstd.decompress(Buffer.from(content));
                                    content = decompressed.toString('utf8');
                                } catch (decompressErr) {
                                    console.error(`Failed to decompress ${row.filename}:`, decompressErr);
                                    throw decompressErr;
                                }
                            }

                            // Parse JSON
                            try {
                                const parsedValue = JSON.parse(content);
                                return { key: row.filename, value: parsedValue };
                            } catch (e) {
                                return { key: row.filename, value: content };
                            }
                        }));

                        resolve(results);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Get all entries in the database
     * @param {number} limit - Maximum number of entries to return (default: 1000)
     * @returns {Promise<Array>}
     */
    async getAll(limit = 1000) {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.all(
                'SELECT filename, content, encoding FROM files ORDER BY filename LIMIT ?',
                [limit],
                async (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        const results = await Promise.all(rows.map(async row => {
                            let content = row.content;

                            // Decompress if encoding is zstd
                            if (row.encoding === 'zstd') {
                                try {
                                    const decompressed = await zstd.decompress(Buffer.from(content));
                                    content = decompressed.toString('utf8');
                                } catch (decompressErr) {
                                    console.error(`Failed to decompress ${row.filename}:`, decompressErr);
                                    throw decompressErr;
                                }
                            }

                            // Parse JSON
                            try {
                                const parsedValue = JSON.parse(content);
                                return { key: row.filename, value: parsedValue };
                            } catch (e) {
                                return { key: row.filename, value: content };
                            }
                        }));

                        resolve(results);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Check if a key exists
     * @param {string} key - The key
     * @returns {Promise<boolean>}
     */
    async exists(key) {
        try {
            const value = await this.get(key);
            return value !== null;
        } catch (err) {
            return false;
        }
    }

    /**
     * Clear all data from the database (use with caution!)
     * @returns {Promise<void>}
     */
    async clear() {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.run('DELETE FROM files', (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}

// Singleton instance
let instance = null;

/**
 * Get the singleton instance of SQLite client
 * @param {string} dbPath - Optional database path
 * @returns {SQLiteClient}
 */
function getInstance(dbPath) {
    if (!instance) {
        instance = new SQLiteClient(dbPath);
    }
    return instance;
}

module.exports = {
    SQLiteClient,
    getInstance
};

