const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const zstd = require('@mongodb-js/zstd');
const roaring = require('roaring');

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

    /**
     * Decode a bitmap from a file, base64 string, or blob
     * @param {string|Buffer} source - Either a file path, Buffer, base64 string, or blob
     * @param {string} sourceType - Type of source: 'file', 'buffer', 'base64', or 'blob'
     * @returns {Promise<any>} - The decoded bitmap
     */
    async decodeBitmap(source, sourceType = 'file') {
        return new Promise((resolve, reject) => {
            try {
                let buffer;

                // Get buffer based on source type
                if (sourceType === 'file') {
                    // Read from file
                    if (typeof source !== 'string') {
                        return reject(new Error('File path must be a string'));
                    }
                    buffer = fs.readFileSync(source);
                } else if (sourceType === 'base64') {
                    // Convert base64 to buffer
                    if (typeof source !== 'string') {
                        return reject(new Error('Base64 data must be a string'));
                    }
                    buffer = Buffer.from(source, 'base64');
                } else if (sourceType === 'buffer') {
                    // Use buffer directly
                    if (!Buffer.isBuffer(source)) {
                        return reject(new Error('Source must be a Buffer when sourceType is "buffer"'));
                    }
                    buffer = source;
                } else if (sourceType === 'blob') {
                    // Use blob directly as buffer
                    if (!Buffer.isBuffer(source)) {
                        // If it's not already a Buffer, try to convert it
                        if (source instanceof Uint8Array) {
                            buffer = Buffer.from(source);
                        } else {
                            return reject(new Error('Blob source must be a Buffer or Uint8Array'));
                        }
                    } else {
                        buffer = source;
                    }
                } else {
                    return reject(new Error('Invalid sourceType. Must be "file", "buffer", "base64", or "blob"'));
                }

                // Deserialize the bitmap with portable format (required for pyroaring compatibility)
                try {
                    // Try with portable format (false)
                    const bitmap = roaring.RoaringBitmap32.deserialize(buffer, false);
                    return resolve(bitmap);
                } catch (e) {
                    // If that fails, try with non-portable format (true)
                    try {
                        const bitmap = roaring.RoaringBitmap32.deserialize(buffer, true);
                        return resolve(bitmap);
                    } catch (e2) {
                        // If both fail, reject with the original error
                        return reject(e);
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get unique attribute names from the attributes_by_group table
     * @returns {Promise<Array<string>>} - Array of unique attribute names
     */
    async getAttributes() {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.all(
                'SELECT DISTINCT attribute_name FROM attributes_by_group ORDER BY attribute_name',
                [],
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    // Extract attribute_name values from the rows
                    const attributeNames = rows.map(row => row.attribute_name);
                    resolve(attributeNames);
                }
            );
        });
    }

    /**
     * Get unique attribute classes from the attributes_by_group table
     * @returns {Promise<Array<string>>} - Array of unique attribute classes
     */
    async getAttributesClasses() {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.all(
                'SELECT DISTINCT attribute_name FROM attributes_by_group ORDER BY attribute_name',
                [],
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    // Extract attribute_name values from the rows
                    const attributeGroups = rows.map(row => row.attribute_name);
                    resolve(attributeGroups);
                }
            );
        });
    }

    /**
     * Get unique cancer classes from the cancers_by_group table
     * @returns {Promise<Array<string>>} - Array of unique cancer classes
     */
    async getCancersClasses() {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.all(
                'SELECT DISTINCT classUri FROM cancers_by_group ORDER BY classUri',
                [],
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    // Extract classUri values from the rows
                    const cancerGroups = rows.map(row => row.classUri);
                    resolve(cancerGroups);
                }
            );
        });
    }

    /**
     * Get unique concept classes from the concepts_by_group table
     * @returns {Promise<Array<string>>} - Array of unique concept classes
     */
    async getConceptsClasses() {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.all(
                'SELECT DISTINCT dpheGroup FROM concepts_by_group ORDER BY dpheGroup',
                [],
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    // Extract dpheGroup values from the rows
                    const conceptGroups = rows.map(row => row.dpheGroup);
                    resolve(conceptGroups);
                }
            );
        });
    }

    /**
     * Get supported OMOP classes
     * @returns {Promise<Array<string>>} - Array of OMOP class names
     */
    async getOmopClasses() {
        return Promise.resolve(['AGE_AT_DX', 'ETHNICITY', 'GENDER', 'RACE', 'CANCER']);
    }

    /**
     * Get all OMOP classes with instances in one response payload
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in rows (default: true)
     * @returns {Promise<{classes: Array<string>, instancesByClass: Object<string, Array<Object>>}>}
     */
    async getOmopSummary(includePatientIds = true) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const classes = await this.getOmopClasses();
        const instancesByClass = {};

        for (const omopClass of classes) {
            instancesByClass[omopClass] = await this.getOmopInstances(omopClass, includePatientIds);
        }

        return { classes, instancesByClass };
    }

    /**
     * Get all attribute classes with instances in one response payload
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in rows (default: true)
     * @returns {Promise<{classes: Array<string>, instancesByClass: Object<string, Array<Object>>}>}
     */
    async getAttributesSummary(includePatientIds = true) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const classes = await this.getAttributesClasses();
        const instancesByClass = {};

        for (const attributeClass of classes) {
            instancesByClass[attributeClass] = await this.getAttributesInstances(
                attributeClass,
                includePatientIds
            );
        }

        return { classes, instancesByClass };
    }

    /**
     * Get all cancer classes with instances in one response payload
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in rows (default: true)
     * @returns {Promise<{classes: Array<string>, instancesByClass: Object<string, Array<Object>>}>}
     */
    async getCancersSummary(includePatientIds = true) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const classes = await this.getCancersClasses();
        const instancesByClass = {};

        for (const classUri of classes) {
            instancesByClass[classUri] = await this.getCancersInstances(classUri, includePatientIds);
        }

        return { classes, instancesByClass };
    }

    /**
     * Get all concept classes with instances in one response payload
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in rows (default: true)
     * @returns {Promise<{classes: Array<string>, instancesByClass: Object<string, Array<Object>>}>}
     */
    async getConceptsSummary(includePatientIds = true) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const classes = await this.getConceptsClasses();
        const instancesByClass = {};

        for (const dpheGroup of classes) {
            instancesByClass[dpheGroup] = await this.getConceptsInstances(dpheGroup, includePatientIds);
        }

        return { classes, instancesByClass };
    }

    /**
     * Get sequential ID for a patient ID from patient_id_mapping
     * @param {string} patientId - Patient ID
     * @returns {Promise<number|null>} Sequential ID or null if not found
     */
    async getSequentialIdForPatient(patientId) {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.get(
                'SELECT sequential_id FROM patient_id_mapping WHERE patient_id = ? LIMIT 1',
                [String(patientId)],
                (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(row ? row.sequential_id : null);
                }
            );
        });
    }

    /**
     * Filter rows to only those that contain a specific patient in their bitmap
     * @param {Array<Object>} rows - Rows containing patient bitmap fields
     * @param {string} patientId - Patient ID to match
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in matching rows
     * @returns {Promise<Array<Object>>} Filtered rows for the patient
     */
    async filterRowsByPatientId(rows, patientId, includePatientIds = false) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const sequentialId = await this.getSequentialIdForPatient(patientId);
        if (sequentialId === null || sequentialId === undefined) {
            return [];
        }

        const matchingRows = [];

        for (const row of rows) {
            const processedRow = { ...row };

            let bitmapSource = null;
            let sourceType = null;

            if (processedRow.patient_bitmap) {
                bitmapSource = processedRow.patient_bitmap;
                sourceType = 'blob';
            } else if (processedRow.patientbitmap) {
                bitmapSource = processedRow.patientbitmap;
                sourceType = 'base64';
            } else {
                continue;
            }

            const bitmap = await this.decodeBitmap(bitmapSource, sourceType);
            if (!bitmap.has(sequentialId)) {
                continue;
            }

            if (includePatientIds) {
                processedRow.patient_ids = await this.patientBitmapToPatientIds(bitmapSource, sourceType);
            }

            delete processedRow.patient_bitmap;
            delete processedRow.patientbitmap;
            matchingRows.push(processedRow);
        }

        return matchingRows;
    }

    /**
     * Run a query and return only rows that include a specific patient in the bitmap
     * @param {string} sql - SQL query
     * @param {Array<any>} params - Query params
     * @param {string} patientId - Patient ID to match
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in matching rows
     * @returns {Promise<Array<Object>>} Filtered rows
     */
    async getRowsForPatient(sql, params, patientId, includePatientIds = false) {
        return new Promise((resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.all(sql, params, async (err, rows) => {
                if (err) {
                    return reject(err);
                }

                try {
                    const filteredRows = await this.filterRowsByPatientId(
                        rows,
                        patientId,
                        includePatientIds
                    );
                    resolve(filteredRows);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Get all attribute instances for a specific group
     * @param {string} groupname - The group name to filter by
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in the response (default: true)
     * @returns {Promise<Array<Object>>} - Array of attribute instances for the specified group
     */
    async getAttributesInstances(groupname, includePatientIds = true) {
        return new Promise(async (resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.all(
                'SELECT * FROM attributes_by_group WHERE attribute_name = ? ORDER BY attribute_name',
                [groupname],
                async (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        // Process each row
                        const processedRows = await Promise.all(rows.map(async (row) => {
                            // Create a copy of the row to avoid modifying the original
                            const processedRow = { ...row };

                            if (includePatientIds) {
                                // Check if the row has a patient_bitmap field
                                if (processedRow.patient_bitmap) {
                                    // Convert the bitmap to patient IDs
                                    processedRow.patient_ids = await this.patientBitmapToPatientIds(
                                        processedRow.patient_bitmap, 
                                        'blob'
                                    );
                                    // Delete the original patient_bitmap after conversion
                                    delete processedRow.patient_bitmap;
                                }
                                // Check if the row has a patientbitmap field
                                else if (processedRow.patientbitmap) {
                                    // Convert the bitmap to patient IDs
                                    processedRow.patient_ids = await this.patientBitmapToPatientIds(
                                        processedRow.patientbitmap, 
                                        'base64'
                                    );
                                    // Delete the original patientbitmap after conversion
                                    delete processedRow.patientbitmap;
                                }
                            } else {
                                // If not including patient IDs, just remove the bitmap fields
                                if (processedRow.patient_bitmap) {
                                    delete processedRow.patient_bitmap;
                                }
                                if (processedRow.patientbitmap) {
                                    delete processedRow.patientbitmap;
                                }
                            }

                            return processedRow;
                        }));

                        resolve(processedRows);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Get attribute instances for a specific group that contain a specific patient
     * @param {string} groupname - The group name to filter by
     * @param {string} patientId - Patient ID to match
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in the response (default: false)
     * @returns {Promise<Array<Object>>} - Array of attribute instances for the patient
     */
    async getAttributesInstancesForPatient(groupname, patientId, includePatientIds = false) {
        return this.getRowsForPatient(
            'SELECT * FROM attributes_by_group WHERE attribute_name = ? ORDER BY attribute_name',
            [groupname],
            patientId,
            includePatientIds
        );
    }

    /**
     * Get all cancer instances for a specific class
     * @param {string} classUri - The classUri to filter by
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in the response (default: true)
     * @returns {Promise<Array<Object>>} - Array of cancer instances for the specified class
     */
    async getCancersInstances(classUri, includePatientIds = true) {
        return new Promise(async (resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.all(
                'SELECT * FROM cancers_by_group WHERE classUri = ? ORDER BY classUri',
                [classUri],
                async (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        // Process each row
                        const processedRows = await Promise.all(rows.map(async (row) => {
                            // Create a copy of the row to avoid modifying the original
                            const processedRow = { ...row };

                            if (includePatientIds) {
                                // Check if the row has a patient_bitmap field
                                if (processedRow.patient_bitmap) {
                                    // Convert the bitmap to patient IDs
                                    processedRow.patient_ids = await this.patientBitmapToPatientIds(
                                        processedRow.patient_bitmap, 
                                        'blob'
                                    );
                                    // Delete the original patient_bitmap after conversion
                                    delete processedRow.patient_bitmap;
                                }
                                // Check if the row has a patientbitmap field
                                else if (processedRow.patientbitmap) {
                                    // Convert the bitmap to patient IDs
                                    processedRow.patient_ids = await this.patientBitmapToPatientIds(
                                        processedRow.patientbitmap, 
                                        'base64'
                                    );
                                    // Delete the original patientbitmap after conversion
                                    delete processedRow.patientbitmap;
                                }
                            } else {
                                // If not including patient IDs, just remove the bitmap fields
                                if (processedRow.patient_bitmap) {
                                    delete processedRow.patient_bitmap;
                                }
                                if (processedRow.patientbitmap) {
                                    delete processedRow.patientbitmap;
                                }
                            }

                            return processedRow;
                        }));

                        resolve(processedRows);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Get cancer instances for a specific class that contain a specific patient
     * @param {string} classUri - The classUri to filter by
     * @param {string} patientId - Patient ID to match
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in the response (default: false)
     * @returns {Promise<Array<Object>>} - Array of cancer instances for the patient
     */
    async getCancersInstancesForPatient(classUri, patientId, includePatientIds = false) {
        return this.getRowsForPatient(
            'SELECT * FROM cancers_by_group WHERE classUri = ? ORDER BY classUri',
            [classUri],
            patientId,
            includePatientIds
        );
    }

    /**
     * Get all concept instances for a specific class
     * @param {string} dpheGroup - The dpheGroup to filter by
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in the response (default: true)
     * @returns {Promise<Array<Object>>} - Array of concept instances for the specified class
     */
    async getConceptsInstances(dpheGroup, includePatientIds = true) {
        return new Promise(async (resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            this.db.all(
                'SELECT * FROM concepts_by_group WHERE dpheGroup = ? ORDER BY dpheGroup',
                [dpheGroup],
                async (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        // Process each row
                        const processedRows = await Promise.all(rows.map(async (row) => {
                            // Create a copy of the row to avoid modifying the original
                            const processedRow = { ...row };

                            if (includePatientIds) {
                                // Check if the row has a patient_bitmap field
                                if (processedRow.patient_bitmap) {
                                    // Convert the bitmap to patient IDs
                                    processedRow.patient_ids = await this.patientBitmapToPatientIds(
                                        processedRow.patient_bitmap, 
                                        'blob'
                                    );
                                    // Delete the original patient_bitmap after conversion
                                    delete processedRow.patient_bitmap;
                                }
                                // Check if the row has a patientbitmap field
                                else if (processedRow.patientbitmap) {
                                    // Convert the bitmap to patient IDs
                                    processedRow.patient_ids = await this.patientBitmapToPatientIds(
                                        processedRow.patientbitmap, 
                                        'base64'
                                    );
                                    // Delete the original patientbitmap after conversion
                                    delete processedRow.patientbitmap;
                                }
                            } else {
                                // If not including patient IDs, just remove the bitmap fields
                                if (processedRow.patient_bitmap) {
                                    delete processedRow.patient_bitmap;
                                }
                                if (processedRow.patientbitmap) {
                                    delete processedRow.patientbitmap;
                                }
                            }

                            return processedRow;
                        }));

                        resolve(processedRows);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Get concept instances for a specific class that contain a specific patient
     * @param {string} dpheGroup - The dpheGroup to filter by
     * @param {string} patientId - Patient ID to match
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in the response (default: false)
     * @returns {Promise<Array<Object>>} - Array of concept instances for the patient
     */
    async getConceptsInstancesForPatient(dpheGroup, patientId, includePatientIds = false) {
        return this.getRowsForPatient(
            'SELECT * FROM concepts_by_group WHERE dpheGroup = ? ORDER BY dpheGroup',
            [dpheGroup],
            patientId,
            includePatientIds
        );
    }

    /**
     * Get all OMOP instances for a specific class
     * @param {string} omopClass - The OMOP class to filter by (AGE_AT_DX, ETHNICITY, GENDER, RACE, CANCER)
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in the response (default: true)
     * @returns {Promise<Array<Object>>} - Array of OMOP instances for the specified class
     */
    async getOmopInstances(omopClass, includePatientIds = true) {
        return new Promise(async (resolve, reject) => {
            if (!this.isOpen) {
                return reject(new Error('Database is not open'));
            }

            const className = String(omopClass || '').toUpperCase();
            const omopClassConfig = {
                AGE_AT_DX: { table: 'omop_age_at_dx', valueColumn: 'age_at_dx' },
                ETHNICITY: { table: 'omop_ethnicity', valueColumn: 'ethnicity' },
                GENDER: { table: 'omop_gender', valueColumn: 'gender' },
                RACE: { table: 'omop_race', valueColumn: 'race' },
                CANCER: { table: 'omop_cancers', valueColumn: 'cancer' }
            };

            const config = omopClassConfig[className];
            if (!config) {
                return reject(new Error(`Invalid OMOP class: ${omopClass}`));
            }

            this.db.all(
                `SELECT * FROM ${config.table} ORDER BY ${config.valueColumn}`,
                [],
                async (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        // Process each row
                        const processedRows = await Promise.all(rows.map(async (row) => {
                            // Create a copy of the row to avoid modifying the original
                            const processedRow = { ...row };

                            if (includePatientIds) {
                                // Check if the row has a patient_bitmap field
                                if (processedRow.patient_bitmap) {
                                    // Convert the bitmap to patient IDs
                                    processedRow.patient_ids = await this.patientBitmapToPatientIds(
                                        processedRow.patient_bitmap,
                                        'blob'
                                    );
                                    // Delete the original patient_bitmap after conversion
                                    delete processedRow.patient_bitmap;
                                }
                                // Check if the row has a patientbitmap field
                                else if (processedRow.patientbitmap) {
                                    // Convert the bitmap to patient IDs
                                    processedRow.patient_ids = await this.patientBitmapToPatientIds(
                                        processedRow.patientbitmap,
                                        'base64'
                                    );
                                    // Delete the original patientbitmap after conversion
                                    delete processedRow.patientbitmap;
                                }
                            } else {
                                // If not including patient IDs, just remove the bitmap fields
                                if (processedRow.patient_bitmap) {
                                    delete processedRow.patient_bitmap;
                                }
                                if (processedRow.patientbitmap) {
                                    delete processedRow.patientbitmap;
                                }
                            }

                            return processedRow;
                        }));

                        resolve(processedRows);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Get OMOP instances for a specific class that contain a specific patient
     * @param {string} omopClass - The OMOP class to filter by
     * @param {string} patientId - Patient ID to match
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in the response (default: false)
     * @returns {Promise<Array<Object>>} - Array of OMOP instances for the patient
     */
    async getOmopInstancesForPatient(omopClass, patientId, includePatientIds = false) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const className = String(omopClass || '').toUpperCase();
        const omopClassConfig = {
            AGE_AT_DX: { table: 'omop_age_at_dx', valueColumn: 'age_at_dx' },
            ETHNICITY: { table: 'omop_ethnicity', valueColumn: 'ethnicity' },
            GENDER: { table: 'omop_gender', valueColumn: 'gender' },
            RACE: { table: 'omop_race', valueColumn: 'race' },
            CANCER: { table: 'omop_cancers', valueColumn: 'cancer' }
        };

        const config = omopClassConfig[className];
        if (!config) {
            throw new Error(`Invalid OMOP class: ${omopClass}`);
        }

        return this.getRowsForPatient(
            `SELECT * FROM ${config.table} ORDER BY ${config.valueColumn}`,
            [],
            patientId,
            includePatientIds
        );
    }

    /**
     * Get patient summaries for a set of patient IDs.
     * Supports schemas where patient_summaries stores:
     *   - json_text (BLOB/TEXT), or
     *   - summary_json (BLOB/TEXT)
     * and where patient_summaries.patient_id is either external patient_id
     * or sequential_id mapped via patient_id_mapping.
     *
     * @param {Array<string|number>} patientIds - Patient IDs to fetch summaries for
     * @returns {Promise<Array<{patient_id: string, json_text: string}>>}
     */
    async getPatientSummariesByPatientIds(patientIds) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const normalizedPatientIds = Array.from(
            new Set(
                (Array.isArray(patientIds) ? patientIds : [])
                    .map(id => String(id).trim())
                    .filter(Boolean)
            )
        );

        if (normalizedPatientIds.length === 0) {
            return [];
        }

        // Detect which summary payload column exists in this database.
        const tableInfo = await new Promise((resolve, reject) => {
            this.db.all(
                'PRAGMA table_info(patient_summaries)',
                [],
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(rows);
                }
            );
        });

        const columnNames = new Set(tableInfo.map(col => col.name));
        const jsonColumn = columnNames.has('json_text')
            ? 'json_text'
            : (columnNames.has('summary_json') ? 'summary_json' : null);

        if (!jsonColumn) {
            throw new Error('patient_summaries table must contain either json_text or summary_json');
        }

        // Keep well below SQLite variable limits (query uses placeholders twice).
        const chunkSize = 400;
        const allRows = [];

        for (let i = 0; i < normalizedPatientIds.length; i += chunkSize) {
            const chunk = normalizedPatientIds.slice(i, i + chunkSize);
            const placeholders = chunk.map(() => '?').join(',');

            const sql = `
                SELECT
                    ps.patient_id AS summary_patient_id,
                    ps.${jsonColumn} AS compressed_json,
                    pim.patient_id AS mapped_patient_id
                FROM patient_summaries ps
                LEFT JOIN patient_id_mapping pim
                    ON pim.sequential_id = ps.patient_id
                WHERE CAST(ps.patient_id AS TEXT) IN (${placeholders})
                   OR pim.patient_id IN (${placeholders})
            `;

            const rows = await new Promise((resolve, reject) => {
                this.db.all(sql, [...chunk, ...chunk], (err, resultRows) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(resultRows);
                });
            });

            allRows.push(...rows);
        }

        const summariesByPatientId = new Map();

        for (const row of allRows) {
            const summaryPatientId = String(row.summary_patient_id);
            const resolvedPatientId = row.mapped_patient_id
                ? String(row.mapped_patient_id)
                : summaryPatientId;

            const existingSummary =
                summariesByPatientId.get(resolvedPatientId) ||
                summariesByPatientId.get(summaryPatientId);

            if (existingSummary) {
                if (!summariesByPatientId.has(resolvedPatientId)) {
                    summariesByPatientId.set(resolvedPatientId, existingSummary);
                }
                if (!summariesByPatientId.has(summaryPatientId)) {
                    summariesByPatientId.set(summaryPatientId, existingSummary);
                }
                continue;
            }

            const originalContent = row.compressed_json;
            if (originalContent === null || originalContent === undefined) {
                continue;
            }

            const compressedBuffer = Buffer.isBuffer(originalContent)
                ? originalContent
                : Buffer.from(originalContent);

            let jsonText;
            try {
                const decompressed = await zstd.decompress(compressedBuffer);
                jsonText = decompressed.toString('utf8');
            } catch (decompressErr) {
                // Backward compatibility for rows that may already be raw JSON text.
                const fallbackText = Buffer.isBuffer(originalContent)
                    ? originalContent.toString('utf8')
                    : String(originalContent);

                try {
                    JSON.parse(fallbackText);
                    jsonText = fallbackText;
                } catch (_) {
                    throw new Error(
                        `Failed to decompress patient summary for patient_id=${resolvedPatientId}: ${decompressErr.message}`
                    );
                }
            }

            const summary = {
                patient_id: resolvedPatientId,
                json_text: jsonText
            };

            summariesByPatientId.set(resolvedPatientId, summary);
            summariesByPatientId.set(summaryPatientId, summary);
        }

        return normalizedPatientIds
            .map(patientId => summariesByPatientId.get(patientId))
            .filter(Boolean);
    }

    /**
     * Multi-criteria patient filter using Roaring bitmap intersection.
     *
     * Each filter item contains { type, class, instances[] }.
     *   - Within an item the instance bitmaps are OR'd (patient matches ANY instance).
     *   - Across items the results are AND'd (patient must match ALL items).
     *
     * @param {Array<{type: string, class: string, instances: string[]}>} filters
     * @param {boolean} includePatientIds - Resolve sequential IDs to patient IDs (default: false)
     * @returns {Promise<{count: number, patient identifier arrays: string[], timing: Object}>}
     */
    async getFilteredPatientCount(filters, includePatientIds = false, autoIncludeThreshold = 20) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const totalStart = process.hrtime.bigint();

        /* ── table / column lookup maps ─────────────────────────────── */
        const OMOP_CONFIG = {
            AGE_AT_DX:  { table: 'omop_age_at_dx',  valueColumn: 'age_at_dx' },
            ETHNICITY:  { table: 'omop_ethnicity',   valueColumn: 'ethnicity' },
            GENDER:     { table: 'omop_gender',      valueColumn: 'gender' },
            RACE:       { table: 'omop_race',        valueColumn: 'race' },
            CANCER:     { table: 'omop_cancers',     valueColumn: 'cancer' }
        };

        const TYPE_CONFIG = {
            attributes: { table: 'attributes_by_group', classColumn: 'attribute_name', valueColumn: 'classUri' },
            cancers:    { table: 'cancers_by_group',    classColumn: null,              valueColumn: 'classUri' },
            concepts:   { table: 'concepts_by_group',   classColumn: 'dpheGroup',       valueColumn: 'classUri' }
        };

        /* ── Phase 1: Query — fetch bitmap blobs for every filter item ── */
        const queryStart = process.hrtime.bigint();
        const filterRows = [];

        for (const filter of filters) {
            const { type, class: filterClass, instances } = filter;
            let sql, params;

            if (type === 'omop') {
                const className = String(filterClass || '').toUpperCase();
                const cfg = OMOP_CONFIG[className];
                if (!cfg) throw new Error(`Invalid OMOP class: ${filterClass}`);
                const ph = instances.map(() => '?').join(',');
                sql = `SELECT * FROM ${cfg.table} WHERE ${cfg.valueColumn} IN (${ph})`;
                params = [...instances];
            } else {
                const cfg = TYPE_CONFIG[type];
                if (!cfg) throw new Error(`Invalid filter type: ${type}`);
                const ph = instances.map(() => '?').join(',');
                if (cfg.classColumn) {
                    sql = `SELECT * FROM ${cfg.table} WHERE ${cfg.classColumn} = ? AND ${cfg.valueColumn} IN (${ph})`;
                    params = [filterClass, ...instances];
                } else {
                    sql = `SELECT * FROM ${cfg.table} WHERE ${cfg.valueColumn} IN (${ph})`;
                    params = [...instances];
                }
            }

            const rows = await new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });
            filterRows.push(rows);
        }

        const queryEnd = process.hrtime.bigint();

        /* ── Phase 2: Bitmap ops — OR within items, AND across items ── */
        const bitmapStart = process.hrtime.bigint();
        const itemBitmaps = [];
        const itemCounts = [];

        for (const rows of filterRows) {
            const bitmaps = [];
            for (const row of rows) {
                let source = row.patient_bitmap || row.patientbitmap || null;
                let srcType = row.patient_bitmap ? 'blob' : 'base64';

                if (!source) continue;

                // SQLite TEXT columns (patientbitmap / base64) may be returned
                // as a Buffer by the sqlite3 driver.  decodeBitmap('base64')
                // requires a plain string, so convert when necessary — same
                // guard used in patientBitmapToPatientIds.
                if (srcType === 'base64' && Buffer.isBuffer(source)) {
                    const str = source.toString('utf-8');
                    // If bytes look like binary (not valid base64 chars) treat as blob
                    srcType = /^[A-Za-z0-9+/=]+$/.test(str) ? 'base64' : 'blob';
                    source = srcType === 'base64' ? str : source;
                }

                bitmaps.push(await this.decodeBitmap(source, srcType));
            }

            // OR: patient in ANY selected instance for this filter item
            let itemBitmap;
            if (bitmaps.length === 0) {
                itemBitmap = new roaring.RoaringBitmap32();
            } else {
                itemBitmap = bitmaps[0];
                for (let i = 1; i < bitmaps.length; i++) {
                    itemBitmap.orInPlace(bitmaps[i]);
                }
            }
            itemBitmaps.push(itemBitmap);
            itemCounts.push(itemBitmap.size);
        }

        // AND: patient must match ALL filter items
        let resultBitmap;
        if (itemBitmaps.length === 0) {
            resultBitmap = new roaring.RoaringBitmap32();
        } else {
            // Short-circuit when any item already matched zero patients
            const emptyIdx = itemBitmaps.findIndex(b => b.size === 0);
            if (emptyIdx !== -1) {
                resultBitmap = new roaring.RoaringBitmap32();
            } else {
                resultBitmap = itemBitmaps[0].clone();
                for (let i = 1; i < itemBitmaps.length; i++) {
                    resultBitmap.andInPlace(itemBitmaps[i]);
                    if (resultBitmap.size === 0) break; // early exit
                }
            }
        }

        const bitmapEnd = process.hrtime.bigint();

        /* ── Phase 3: Resolve sequential IDs → patient IDs ────────── */
        // Auto-include patient IDs when the result count is small enough
        // (below autoIncludeThreshold), even when not explicitly requested.
        const shouldResolveIds =
            resultBitmap.size > 0 &&
            (includePatientIds ||
             (autoIncludeThreshold > 0 && resultBitmap.size < autoIncludeThreshold));

        const resolveStart = process.hrtime.bigint();
        let patient_ids = [];

        if (shouldResolveIds) {
            const serialized = resultBitmap.serialize(false);
            patient_ids = await this.patientBitmapToPatientIds(
                Buffer.from(serialized), 'buffer'
            );
        }

        const resolveEnd = process.hrtime.bigint();

        /* ── Build timing report ────────────────────────────────────── */
        const ms = (s, e) => Math.round(Number(e - s) / 1e4) / 100; // 2-decimal ms

        return {
            count: resultBitmap.size,
            patient_ids,
            timing: {
                queryMs:   ms(queryStart, queryEnd),
                bitmapMs:  ms(bitmapStart, bitmapEnd),
                resolveMs: ms(resolveStart, resolveEnd),
                totalMs:   ms(totalStart, resolveEnd),
                itemCounts // per-filter-item patient counts (before AND)
            }
        };
    }

    /**
     * Maps sequential IDs from a bitmap to patient IDs using the patient_id_mapping table
     * @param {string|Buffer} source - Either a file path, Buffer, base64 string, or blob containing the bitmap
     * @param {string} sourceType - Type of source: 'file', 'buffer', 'base64', or 'blob'
     * @returns {Promise<Array<string>>} - Array of patient IDs or "missing" for unmapped IDs
     */
    async patientBitmapToPatientIds(source, sourceType = 'file') {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.isOpen) {
                    return reject(new Error('Database is not open'));
                }

                // Check if source is valid
                if (source === null || source === undefined) {
                    console.log('Warning: Bitmap source is null or undefined, returning empty array');
                    return resolve([]);
                }

                // Auto-detect source type if it's a Buffer
                let effectiveSourceType = sourceType;
                let effectiveSource = source;

                // When SQLite returns a TEXT column, it can come back as a Buffer
                // If it's a Buffer and sourceType is 'base64', we need to check if it's actually base64 text
                if (Buffer.isBuffer(source) && sourceType === 'base64') {
                    try {
                        // Try to convert the Buffer to a string and see if it looks like base64
                        const str = source.toString('utf-8');
                        // If it's valid base64, it should only contain base64 characters
                        const isBase64 = /^[A-Za-z0-9+/=]+$/.test(str);

                        if (isBase64) {
                            // It's a Buffer containing base64 text - convert to string and keep 'base64' sourceType
                            effectiveSource = str;
                        } else {
                            // It's a Buffer containing binary data - treat as blob
                            effectiveSourceType = 'blob';
                        }
                    } catch (e) {
                        // If there's an error, treat it as a blob
                        effectiveSourceType = 'blob';
                    }
                }

                // For base64 type, ensure it's a string
                if (effectiveSourceType === 'base64' && typeof effectiveSource !== 'string') {
                    return resolve([]);
                }

                // Decode the bitmap and get sequential IDs
                let sequentialIds;
                try {
                    // First decode the bitmap
                    const bitmap = await this.decodeBitmap(effectiveSource, effectiveSourceType);

                    // Get the sequential IDs from the bitmap
                    sequentialIds = bitmap.toArray();

                    if (sequentialIds.length === 0) {
                        return resolve([]);
                    }
                } catch (bitmapError) {
                    return reject(new Error(`Failed to decode bitmap: ${bitmapError.message}`));
                }

                // SQLite has a max variable limit for IN (?) queries.
                // Use chunks so large bitmaps (for common demographics) do not fail.
                const chunkSize = 900;
                const idMapping = {};

                for (let i = 0; i < sequentialIds.length; i += chunkSize) {
                    const chunk = sequentialIds.slice(i, i + chunkSize);
                    const placeholders = chunk.map(() => '?').join(',');

                    const rows = await new Promise((resolveChunk, rejectChunk) => {
                        this.db.all(
                            `SELECT sequential_id, patient_id FROM patient_id_mapping WHERE sequential_id IN (${placeholders})`,
                            chunk,
                            (err, resultRows) => {
                                if (err) {
                                    return rejectChunk(err);
                                }
                                resolveChunk(resultRows);
                            }
                        );
                    });

                    rows.forEach((row) => {
                        idMapping[row.sequential_id] = row.patient_id;
                    });
                }

                // Map each sequential ID to its patient ID or "missing"
                const result = sequentialIds.map(id =>
                    idMapping[id] !== undefined ? idMapping[id] : "missing"
                );

                resolve(result);
            } catch (error) {
                reject(error);
            }
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
