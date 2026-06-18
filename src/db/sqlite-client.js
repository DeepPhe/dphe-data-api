const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const zstd = require('@mongodb-js/zstd');
const roaring = require('roaring');
const { DB_PATH } = require('../config/database');
const { SQLiteBitmapService } = require('./sqlite-bitmap-service');
const { SQLiteFileStore } = require('./sqlite-file-store');
const {
    all: sqliteAll,
    get: sqliteGet
} = require('./sqlite-operations');

const OMOP_CLASS_CONFIG = Object.freeze({
    AGE_AT_DX: { table: 'omop_age_at_dx', valueColumn: 'age_at_dx' },
    ETHNICITY: { table: 'omop_ethnicity', valueColumn: 'ethnicity' },
    GENDER: { table: 'omop_gender', valueColumn: 'gender' },
    RACE: { table: 'omop_race', valueColumn: 'race' },
    CANCER: { table: 'omop_cancers', valueColumn: 'cancer' }
});

function toObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeString(value) {
    return String(value ?? '').trim();
}

function firstNonEmpty(values = []) {
    for (const value of values) {
        const normalizedValue = normalizeString(value);
        if (normalizedValue) {
            return normalizedValue;
        }
    }

    return '';
}

function toStringArray(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => normalizeString(item))
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    const normalizedValue = normalizeString(value);
    return normalizedValue ? [normalizedValue] : [];
}

function parseDateValue(value) {
    const rawValue = normalizeString(value);
    if (!rawValue) {
        return null;
    }

    // YYYYMMDD or YYYYMMDDHHMM commonly used in DeepPhe document dates.
    if (/^\d{8,12}$/.test(rawValue)) {
        const year = Number(rawValue.slice(0, 4));
        const month = Number(rawValue.slice(4, 6));
        const day = Number(rawValue.slice(6, 8));

        if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
            return new Date(Date.UTC(year, month - 1, day));
        }
    }

    const monthDayYearMatch = rawValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (monthDayYearMatch) {
        let [, monthRaw, dayRaw, yearRaw] = monthDayYearMatch;
        let year = Number(yearRaw);
        const month = Number(monthRaw);
        const day = Number(dayRaw);

        if (yearRaw.length === 2) {
            year += year >= 70 ? 1900 : 2000;
        }

        if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
            return new Date(Date.UTC(year, month - 1, day));
        }
    }

    const parsedMs = Date.parse(rawValue);
    if (Number.isNaN(parsedMs)) {
        return null;
    }

    return new Date(parsedMs);
}

function toIsoDate(dateValue) {
    if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
        return '';
    }

    const year = dateValue.getUTCFullYear();
    const month = `${dateValue.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${dateValue.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateAgeYears(birthDate, eventDate) {
    if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) {
        return null;
    }

    if (!(eventDate instanceof Date) || Number.isNaN(eventDate.getTime())) {
        return null;
    }

    let ageYears = eventDate.getUTCFullYear() - birthDate.getUTCFullYear();
    const hasHadBirthdayThisYear =
        eventDate.getUTCMonth() > birthDate.getUTCMonth() ||
        (eventDate.getUTCMonth() === birthDate.getUTCMonth() &&
            eventDate.getUTCDate() >= birthDate.getUTCDate());

    if (!hasHadBirthdayThisYear) {
        ageYears -= 1;
    }

    return ageYears >= 0 ? ageYears : null;
}

function extractBirthDateFromText(text) {
    const sourceText = typeof text === 'string' ? text : '';
    if (!sourceText) {
        return '';
    }

    const patterns = [
        /Patient DOB[\s.:_-]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
        /\bDOB[\s.:_-]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})\b/i,
        /Date of Birth[\s.:_-]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
    ];

    for (const pattern of patterns) {
        const match = sourceText.match(pattern);
        if (!match) {
            continue;
        }

        const parsedDate = parseDateValue(match[1]);
        const isoDate = toIsoDate(parsedDate);
        if (isoDate) {
            return isoDate;
        }
    }

    return '';
}

function isPatientSummaryUnavailableError(error) {
    const errorMessage = normalizeString(error && error.message);
    return (
        /no such table:\s*patient_summaries/i.test(errorMessage) ||
        /patient_summaries table must contain/i.test(errorMessage)
    );
}

function isMissingSqliteTableError(error, tableName) {
    const errorMessage = normalizeString(error && error.message);
    if (!errorMessage) {
        return false;
    }

    const escapedTableName = String(tableName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escapedTableName) {
        return /no such table:/i.test(errorMessage);
    }

    return new RegExp(`no such table:\\s*${escapedTableName}`, 'i').test(errorMessage);
}

/**
 * SQLite3 Client Wrapper
 * Provides a simplified interface for interacting with SQLite3
 */
class SQLiteClient {
    constructor(dbPath = DB_PATH) {
        this.dbPath = path.resolve(dbPath);
        this.db = null;
        this.isOpen = false;
        this._bitmapService = new SQLiteBitmapService(this);
        this._fileStore = new SQLiteFileStore(this);
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
        return this._fileStore.put(key, value);
    }

    /**
     * Get a value by key from the database
     * @param {string} key - The key
     * @param {boolean} parseJson - Whether to parse the value as JSON (default: true)
     * @returns {Promise<any>}
     */
    async get(key, parseJson = true) {
        return this._fileStore.get(key, parseJson);
    }

    /**
     * Delete a key-value pair from the database
     * @param {string} key - The key
     * @returns {Promise<void>}
     */
    async del(key) {
        return this._fileStore.del(key);
    }

    /**
     * Batch operations
     * @param {Array} operations - Array of {type: 'put'|'del', key: string, value?: any}
     * @returns {Promise<void>}
     */
    async batch(operations) {
        return this._fileStore.batch(operations);
    }

    /**
     * Get all keys with a specific prefix
     * @param {string} prefix - The key prefix
     * @returns {Promise<Array>}
     */
    async getByPrefix(prefix) {
        return this._fileStore.getByPrefix(prefix);
    }

    /**
     * Get all entries in the database
     * @param {number} limit - Maximum number of entries to return (default: 1000)
     * @returns {Promise<Array>}
     */
    async getAll(limit = 1000) {
        return this._fileStore.getAll(limit);
    }

    /**
     * Check if a key exists
     * @param {string} key - The key
     * @returns {Promise<boolean>}
     */
    async exists(key) {
        try {
            return (await this.get(key)) !== null;
        } catch (_) {
            return false;
        }
    }

    /**
     * Clear all data from the database (use with caution!)
     * @returns {Promise<void>}
     */
    async clear() {
        return this._fileStore.clear();
    }

    /**
     * Decode a bitmap from a file, base64 string, or blob
     * @param {string|Buffer} source - Either a file path, Buffer, base64 string, or blob
     * @param {string} sourceType - Type of source: 'file', 'buffer', 'base64', or 'blob'
     * @returns {Promise<any>} - The decoded bitmap
     */
    async decodeBitmap(source, sourceType = 'file') {
        return this._bitmapService.decodeBitmap(source, sourceType);
    }

    /**
     * Get unique attribute names from the attributes_by_group table
     * @returns {Promise<Array<string>>} - Array of unique attribute names
     */
    async getAttributes() {
        const rows = await sqliteAll(
            this,
            'SELECT DISTINCT attribute_name FROM attributes_by_group ORDER BY attribute_name'
        );
        return rows.map((row) => row.attribute_name);
    }

    /**
     * Get unique attribute classes from the attributes_by_group table
     * @returns {Promise<Array<string>>} - Array of unique attribute classes
     */
    async getAttributesClasses() {
        return this.getAttributes();
    }

    /**
     * Get unique cancer classes from the cancers_by_group table
     * @returns {Promise<Array<string>>} - Array of unique cancer classes
     */
    async getCancersClasses() {
        const rows = await sqliteAll(
            this,
            'SELECT DISTINCT classUri FROM cancers_by_group ORDER BY classUri'
        );
        return rows.map((row) => row.classUri);
    }

    /**
     * Get unique concept classes from the concepts_by_group table
     * @returns {Promise<Array<string>>} - Array of unique concept classes
     */
    async getConceptsClasses() {
        const rows = await sqliteAll(
            this,
            'SELECT DISTINCT dpheGroup FROM concepts_by_group ORDER BY dpheGroup'
        );
        return rows.map((row) => row.dpheGroup);
    }

    /**
     * Backward-compatible alias for getAttributesClasses.
     * @returns {Promise<Array<string>>}
     */
    async getAttributesByGroup() {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }
        return this.getAttributesClasses();
    }

    /**
     * Backward-compatible alias for getCancersClasses.
     * @returns {Promise<Array<string>>}
     */
    async getCancersByGroup() {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }
        return this.getCancersClasses();
    }

    /**
     * Backward-compatible alias for getConceptsClasses.
     * @returns {Promise<Array<string>>}
     */
    async getConceptsByGroup() {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }
        return this.getConceptsClasses();
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
        const row = await sqliteGet(
            this,
            'SELECT sequential_id FROM patient_id_mapping WHERE patient_id = ? LIMIT 1',
            [String(patientId)]
        );
        return row ? row.sequential_id : null;
    }

    async getAllRows(sql, params = []) {
        return sqliteAll(this, sql, params);
    }

    getPatientBitmapSource(row) {
        return this._bitmapService.getPatientBitmapSource(row);
    }

    async processPatientBitmapRow(row, includePatientIds = false) {
        return this._bitmapService.processPatientBitmapRow(row, includePatientIds);
    }

    async processPatientBitmapRows(rows, includePatientIds = false) {
        return this._bitmapService.processPatientBitmapRows(rows, includePatientIds);
    }

    async getProcessedBitmapRows(sql, params, includePatientIds, missingTableName) {
        let rows;
        try {
            rows = await this.getAllRows(sql, params);
        } catch (error) {
            if (missingTableName && isMissingSqliteTableError(error, missingTableName)) {
                return [];
            }
            throw error;
        }

        return this.processPatientBitmapRows(rows, includePatientIds);
    }

    /**
     * Filter rows to only those that contain a specific patient in their bitmap
     * @param {Array<Object>} rows - Rows containing patient bitmap fields
     * @param {string} patientId - Patient ID to match
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in matching rows
     * @returns {Promise<Array<Object>>} Filtered rows for the patient
     */
    async filterRowsByPatientId(rows, patientId, includePatientIds = false) {
        return this._bitmapService.filterRowsByPatientId(
            rows,
            patientId,
            includePatientIds
        );
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
        const rows = await this.getAllRows(sql, params);
        return this.filterRowsByPatientId(rows, patientId, includePatientIds);
    }

    /**
     * Get all attribute instances for a specific group
     * @param {string} groupname - The group name to filter by
     * @param {boolean} includePatientIds - Whether to include patient identifier arrays in the response (default: true)
     * @returns {Promise<Array<Object>>} - Array of attribute instances for the specified group
     */
    async getAttributesInstances(groupname, includePatientIds = true) {
        return this.getProcessedBitmapRows(
            'SELECT * FROM attributes_by_group WHERE attribute_name = ? ORDER BY attribute_name',
            [groupname],
            includePatientIds
        );
    }

    /**
     * Backward-compatible alias for getAttributesInstances.
     * @param {string} groupname
     * @param {boolean} includePatientIds
     * @returns {Promise<Array<Object>>}
     */
    async getAttributesForGroup(groupname, includePatientIds = false) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }
        return this.getAttributesInstances(groupname, includePatientIds);
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
        return this.getProcessedBitmapRows(
            'SELECT * FROM cancers_by_group WHERE classUri = ? ORDER BY classUri',
            [classUri],
            includePatientIds
        );
    }

    /**
     * Backward-compatible alias for getCancersInstances.
     * @param {string} classUri
     * @param {boolean} includePatientIds
     * @returns {Promise<Array<Object>>}
     */
    async getCancersForGroup(classUri, includePatientIds = false) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }
        return this.getCancersInstances(classUri, includePatientIds);
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
        return this.getProcessedBitmapRows(
            'SELECT * FROM concepts_by_group WHERE dpheGroup = ? ORDER BY dpheGroup',
            [dpheGroup],
            includePatientIds
        );
    }

    /**
     * Backward-compatible alias for getConceptsInstances.
     * @param {string} dpheGroup
     * @param {boolean} includePatientIds
     * @returns {Promise<Array<Object>>}
     */
    async getConceptsForGroup(dpheGroup, includePatientIds = false) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }
        return this.getConceptsInstances(dpheGroup, includePatientIds);
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
        const className = String(omopClass || '').toUpperCase();
        const config = OMOP_CLASS_CONFIG[className];
        if (!config) {
            throw new Error(`Invalid OMOP class: ${omopClass}`);
        }

        return this.getProcessedBitmapRows(
            `SELECT * FROM ${config.table} ORDER BY ${config.valueColumn}`,
            [],
            includePatientIds,
            config.table
        );
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
        const config = OMOP_CLASS_CONFIG[className];
        if (!config) {
            throw new Error(`Invalid OMOP class: ${omopClass}`);
        }

        try {
            return await this.getRowsForPatient(
                `SELECT * FROM ${config.table} ORDER BY ${config.valueColumn}`,
                [],
                patientId,
                includePatientIds
            );
        } catch (error) {
            if (isMissingSqliteTableError(error, config.table)) {
                return [];
            }

            throw error;
        }
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
        const tableInfo = await sqliteAll(
            this,
            'PRAGMA table_info(patient_summaries)'
        );

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

            const rows = await sqliteAll(this, sql, [...chunk, ...chunk]);

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

        const getTableColumnNames = async (tableName) => {
            const pragmaRows = await sqliteAll(
                this,
                `PRAGMA table_info(${tableName})`
            );

            return new Set(
                (Array.isArray(pragmaRows) ? pragmaRows : [])
                    .map((row) => normalizeString(row && row.name).toLowerCase())
                    .filter(Boolean)
            );
        };

        const attributeTableColumns = await getTableColumnNames('attributes_by_group');
        const attributeValueColumns = [];
        if (attributeTableColumns.has('classuri')) {
            attributeValueColumns.push('classUri');
        }
        if (attributeTableColumns.has('value')) {
            attributeValueColumns.push('value');
        }
        if (attributeValueColumns.length === 0) {
            throw new Error(
                'attributes_by_group must contain either classUri or value for attribute filtering'
            );
        }

        const TYPE_CONFIG = {
            attributes: {
                table: 'attributes_by_group',
                classColumn: 'attribute_name',
                valueColumns: attributeValueColumns
            },
            cancers: {
                table: 'cancers_by_group',
                classColumn: null,
                valueColumns: ['classUri']
            },
            concepts: {
                table: 'concepts_by_group',
                classColumn: 'dpheGroup',
                valueColumns: ['classUri']
            }
        };

        /* ── Phase 1: Query — fetch bitmap blobs for every filter item ── */
        const queryStart = process.hrtime.bigint();
        const filterRows = [];

        for (const filter of filters) {
            const { type, class: filterClass, instances } = filter;
            let sql, params;

            if (type === 'omop') {
                const className = String(filterClass || '').toUpperCase();
                const cfg = OMOP_CLASS_CONFIG[className];
                if (!cfg) throw new Error(`Invalid OMOP class: ${filterClass}`);
                const ph = instances.map(() => '?').join(',');
                sql = `SELECT * FROM ${cfg.table} WHERE ${cfg.valueColumn} IN (${ph})`;
                params = [...instances];
            } else {
                const cfg = TYPE_CONFIG[type];
                if (!cfg) throw new Error(`Invalid filter type: ${type}`);
                const valueColumns = Array.isArray(cfg.valueColumns)
                    ? cfg.valueColumns.filter(Boolean)
                    : [];
                if (valueColumns.length === 0) {
                    throw new Error(`No value columns configured for filter type: ${type}`);
                }
                const ph = instances.map(() => '?').join(',');
                if (cfg.classColumn) {
                    if (valueColumns.length === 1) {
                        sql = `SELECT * FROM ${cfg.table} WHERE ${cfg.classColumn} = ? AND ${valueColumns[0]} IN (${ph})`;
                        params = [filterClass, ...instances];
                    } else {
                        const valueColumnClauses = valueColumns
                            .map((columnName) => `${columnName} IN (${ph})`)
                            .join(' OR ');
                        sql = `SELECT * FROM ${cfg.table} WHERE ${cfg.classColumn} = ? AND (${valueColumnClauses})`;
                        params = [filterClass, ...valueColumns.flatMap(() => instances)];
                    }
                } else {
                    if (valueColumns.length === 1) {
                        sql = `SELECT * FROM ${cfg.table} WHERE ${valueColumns[0]} IN (${ph})`;
                        params = [...instances];
                    } else {
                        const valueColumnClauses = valueColumns
                            .map((columnName) => `${columnName} IN (${ph})`)
                            .join(' OR ');
                        sql = `SELECT * FROM ${cfg.table} WHERE (${valueColumnClauses})`;
                        params = [...valueColumns.flatMap(() => instances)];
                    }
                }
            }

            const rows = await sqliteAll(this, sql, params);
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
                const bitmapSource = this.getPatientBitmapSource(row);
                if (!bitmapSource) {
                    continue;
                }

                bitmaps.push(
                    await this.decodeBitmap(
                        bitmapSource.source,
                        bitmapSource.sourceType
                    )
                );
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
        return this._bitmapService.patientBitmapToPatientIds(source, sourceType);
    }

    /**
     * Get a parsed patient summary payload from patient_summaries by patient ID.
     * @param {string} patientId - External or summary-table patient ID
     * @returns {Promise<Object|null>} Parsed summary payload or null when unavailable
     */
    async getPatientSummaryByPatientId(patientId) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const normalizedPatientId = normalizeString(patientId);
        if (!normalizedPatientId) {
            throw new Error('patientId is required');
        }

        let summaries;
        try {
            summaries = await this.getPatientSummariesByPatientIds([normalizedPatientId]);
        } catch (error) {
            if (isPatientSummaryUnavailableError(error)) {
                return null;
            }
            throw error;
        }

        if (!Array.isArray(summaries) || summaries.length === 0) {
            return null;
        }

        const summaryRow =
            summaries.find((row) => normalizeString(row && row.patient_id) === normalizedPatientId) ||
            summaries[0];

        const jsonText = normalizeString(summaryRow && summaryRow.json_text);
        if (!jsonText) {
            return null;
        }

        try {
            return JSON.parse(jsonText);
        } catch (error) {
            throw new Error(`Failed to parse patient summary JSON for ${normalizedPatientId}: ${error.message}`);
        }
    }

    /**
     * Build a patient profile payload with demographics, encounter bounds, and summary details.
     * This composes data from patient files, patient summaries, OMOP demographic tables, and documents.
     *
     * @param {string} patientId - Patient ID
     * @returns {Promise<Object|null>} Profile payload or null when no patient signal exists
     */
    async getPatientProfile(patientId) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }

        const normalizedPatientId = normalizeString(patientId);
        if (!normalizedPatientId) {
            throw new Error('patientId is required');
        }

        const [patientRecord, patientSummary, prefixedRows] = await Promise.all([
            this.get(`${normalizedPatientId}.json`),
            this.getPatientSummaryByPatientId(normalizedPatientId).catch((error) => {
                if (isPatientSummaryUnavailableError(error)) {
                    return null;
                }
                throw error;
            }),
            this.getByPrefix(normalizedPatientId),
        ]);

        const summaryObject = toObject(patientSummary);
        const summaryDemographics = toObject(summaryObject.demographics);
        const patientRecordObject = toObject(patientRecord);
        const patientRecordDemographics = toObject(patientRecordObject.demographics);

        const documentRows = (Array.isArray(prefixedRows) ? prefixedRows : []).filter((row) => {
            const key = normalizeString(row && row.key);
            return key.startsWith(`${normalizedPatientId}_`) && key.endsWith('_Doc.json');
        });

        const documents = documentRows
            .map((row) => toObject(row && row.value))
            .filter((row) => Object.keys(row).length > 0);

        const documentCount = documents.length;
        const documentTypeCounts = {};

        for (const document of documents) {
            const type = normalizeString(document.type) || 'Unknown';
            documentTypeCounts[type] = (documentTypeCounts[type] || 0) + 1;
        }

        const sortedDocumentDates = documents
            .map((document) => parseDateValue(document.date))
            .filter(Boolean)
            .sort((leftDate, rightDate) => leftDate.getTime() - rightDate.getTime());

        const firstEncounterDate = sortedDocumentDates.length > 0 ? toIsoDate(sortedDocumentDates[0]) : '';
        const lastEncounterDate =
            sortedDocumentDates.length > 0
                ? toIsoDate(sortedDocumentDates[sortedDocumentDates.length - 1])
                : '';

        const omopClassNames = ['GENDER', 'RACE', 'ETHNICITY', 'AGE_AT_DX', 'CANCER'];
        const omopByClass = {};

        await Promise.all(
            omopClassNames.map(async (omopClassName) => {
                try {
                    omopByClass[omopClassName] = await this.getOmopInstancesForPatient(
                        omopClassName,
                        normalizedPatientId,
                        false
                    );
                } catch (_) {
                    omopByClass[omopClassName] = [];
                }
            })
        );

        const getFirstOmopValue = (className, possibleKeys) => {
            const rows = Array.isArray(omopByClass[className]) ? omopByClass[className] : [];
            for (const row of rows) {
                const rowObject = toObject(row);
                for (const key of possibleKeys) {
                    const normalizedValue = normalizeString(rowObject[key]);
                    if (normalizedValue) {
                        return normalizedValue;
                    }
                }
            }
            return '';
        };

        const getOmopValues = (className, possibleKeys) => {
            const rows = Array.isArray(omopByClass[className]) ? omopByClass[className] : [];
            const values = rows.flatMap((row) =>
                possibleKeys.map((key) => normalizeString(toObject(row)[key])).filter(Boolean)
            );
            return [...new Set(values)];
        };

        const patientName = firstNonEmpty([
            patientRecordObject.name,
            patientRecordObject.patientName,
            patientRecordDemographics.name,
            summaryObject.patient_name,
            summaryObject.patientName,
            normalizedPatientId,
        ]);

        const gender = firstNonEmpty([
            summaryDemographics.gender,
            patientRecordObject.gender,
            patientRecordDemographics.gender,
            getFirstOmopValue('GENDER', ['gender', 'value']),
        ]);

        const race = firstNonEmpty([
            summaryDemographics.race,
            patientRecordObject.race,
            patientRecordDemographics.race,
            getFirstOmopValue('RACE', ['race', 'value']),
        ]);

        const ethnicity = firstNonEmpty([
            summaryDemographics.ethnicity,
            patientRecordObject.ethnicity,
            patientRecordDemographics.ethnicity,
            getFirstOmopValue('ETHNICITY', ['ethnicity', 'value']),
        ]);

        const ageAtDiagnosis = firstNonEmpty([
            summaryDemographics.age_at_dx,
            summaryDemographics.ageAtDx,
            patientRecordObject.ageAtDiagnosis,
            patientRecordDemographics.ageAtDiagnosis,
            getFirstOmopValue('AGE_AT_DX', ['age_at_dx', 'ageAtDx', 'value']),
        ]);

        let cancerTypes = [
            ...toStringArray(summaryDemographics.cancer_type),
            ...toStringArray(summaryDemographics.cancerType),
            ...toStringArray(patientRecordObject.cancerType),
            ...toStringArray(patientRecordDemographics.cancerType),
        ];
        if (cancerTypes.length === 0) {
            cancerTypes = getOmopValues('CANCER', ['cancer', 'value']);
        }
        cancerTypes = [...new Set(cancerTypes)];

        let birthDate = firstNonEmpty([
            patientRecordObject.birthDate,
            patientRecordObject.dateOfBirth,
            patientRecordObject.DateOfBirth,
            patientRecordDemographics.birthDate,
            patientRecordDemographics.dateOfBirth,
            patientRecordDemographics.DateOfBirth,
            summaryDemographics.birth_date,
            summaryDemographics.birthDate,
            summaryDemographics.date_of_birth,
            summaryDemographics.dateOfBirth,
        ]);

        if (!birthDate) {
            for (const document of documents) {
                const extractedBirthDate = extractBirthDateFromText(document.text);
                if (extractedBirthDate) {
                    birthDate = extractedBirthDate;
                    break;
                }
            }
        }

        const parsedBirthDate = parseDateValue(birthDate);
        const normalizedBirthDate = toIsoDate(parsedBirthDate) || birthDate;

        let ageOfFirstEncounter = firstNonEmpty([
            summaryDemographics.age_of_first_encounter,
            summaryDemographics.ageOfFirstEncounter,
            patientRecordObject.ageOfFirstEncounter,
            patientRecordDemographics.ageOfFirstEncounter,
        ]);

        let ageOfLastEncounter = firstNonEmpty([
            summaryDemographics.age_of_last_encounter,
            summaryDemographics.ageOfLastEncounter,
            patientRecordObject.ageOfLastEncounter,
            patientRecordDemographics.ageOfLastEncounter,
        ]);

        if (!ageOfFirstEncounter && parsedBirthDate && firstEncounterDate) {
            const firstEncounterAge = calculateAgeYears(parsedBirthDate, parseDateValue(firstEncounterDate));
            ageOfFirstEncounter = firstEncounterAge === null ? '' : String(firstEncounterAge);
        }

        if (!ageOfLastEncounter && parsedBirthDate && lastEncounterDate) {
            const lastEncounterAge = calculateAgeYears(parsedBirthDate, parseDateValue(lastEncounterDate));
            ageOfLastEncounter = lastEncounterAge === null ? '' : String(lastEncounterAge);
        }

        const summary = Object.keys(summaryObject).length > 0
            ? {
                patient_id: normalizeString(summaryObject.patient_id) || normalizedPatientId,
                demographics: summaryDemographics,
                diagnoses: Array.isArray(summaryObject.diagnoses) ? summaryObject.diagnoses : [],
                staging: Array.isArray(summaryObject.staging) ? summaryObject.staging : [],
                grading: Array.isArray(summaryObject.grading) ? summaryObject.grading : [],
                biomarkers: Array.isArray(summaryObject.biomarkers) ? summaryObject.biomarkers : [],
                treatments: Array.isArray(summaryObject.treatments) ? summaryObject.treatments : [],
                procedures: Array.isArray(summaryObject.procedures) ? summaryObject.procedures : [],
                findings: Array.isArray(summaryObject.findings) ? summaryObject.findings : [],
                behavior: Array.isArray(summaryObject.behavior) ? summaryObject.behavior : [],
            }
            : null;

        const hasAnySignal =
            Object.keys(patientRecordObject).length > 0 ||
            summary !== null ||
            documentCount > 0 ||
            !!gender ||
            !!race ||
            !!ethnicity ||
            !!normalizedBirthDate ||
            !!ageAtDiagnosis ||
            cancerTypes.length > 0;

        if (!hasAnySignal) {
            return null;
        }

        return {
            patientId: normalizedPatientId,
            patientName,
            demographics: {
                patientId: normalizedPatientId,
                patientName,
                gender,
                race,
                ethnicity,
                birthDate: normalizedBirthDate,
                firstEncounterDate,
                lastEncounterDate,
                ageAtDiagnosis,
                ageAtDx: ageAtDiagnosis,
                ageOfFirstEncounter,
                ageOfLastEncounter,
                cancerType: cancerTypes[0] || '',
                cancerTypes,
            },
            documentCount,
            documentTypeCounts,
            firstEncounterDate,
            lastEncounterDate,
            summary,
            sources: {
                patientRecord: Object.keys(patientRecordObject).length > 0,
                patientSummary: summary !== null,
                documents: documentCount > 0,
                omopFallback: Object.values(omopByClass).some(
                    (rows) => Array.isArray(rows) && rows.length > 0
                ),
            },
        };
    }

    /**
     * Get the _Cancers.json file for a specific patient
     * @param {string} patientId - Patient ID
     * @returns {Promise<Object|null>} Parsed cancers data or null if not found
     */
    async getPatientCancers(patientId) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }
        return this.get(`${patientId}_Cancers.json`);
    }

    /**
     * Get the _Concepts.json file for a specific patient
     * @param {string} patientId - Patient ID
     * @returns {Promise<Object|null>} Parsed concepts data or null if not found
     */
    async getPatientConcepts(patientId) {
        if (!this.isOpen) {
            throw new Error('Database is not open');
        }
        return this.get(`${patientId}_Concepts.json`);
    }
}

// Singleton instance
let instance = null;

/**
 * Get the singleton instance of SQLite client.
 *
 * The path is resolved from the argument (defaulting to the configured
 * DB_PATH) on first call and locked in for the life of the process, so the
 * connection target can never depend on which module imported the client
 * first. Re-requesting the singleton with a different resolved path is a
 * programming error and throws rather than silently returning a client
 * pointed at the wrong database.
 *
 * @param {string} [dbPath=DB_PATH] - Database path (used only on first call)
 * @returns {SQLiteClient}
 */
function getInstance(dbPath = DB_PATH) {
    const resolvedPath = path.resolve(dbPath);
    if (!instance) {
        instance = new SQLiteClient(resolvedPath);
    } else if (resolvedPath !== instance.dbPath) {
        throw new Error(
            `SQLite client already initialized with "${instance.dbPath}"; ` +
            `refusing to re-initialize with "${resolvedPath}".`
        );
    }
    return instance;
}

module.exports = {
    SQLiteClient,
    getInstance
};
