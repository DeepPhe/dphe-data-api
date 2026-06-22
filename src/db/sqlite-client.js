const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const zlib = require('node:zlib');
const roaring = require('roaring-wasm');
const { DB_PATH } = require('../config/database');
const { SQLiteBitmapService } = require('./sqlite-bitmap-service');
const { SQLiteFileStore } = require('./sqlite-file-store');
const { all: sqliteAll, get: sqliteGet } = require('./sqlite-operations');

const OMOP_CLASS_CONFIG = Object.freeze({
  AGE_AT_DX: { table: 'omop_age_at_dx', valueColumn: 'age_at_dx' },
  ETHNICITY: { table: 'omop_ethnicity', valueColumn: 'ethnicity' },
  GENDER: { table: 'omop_gender', valueColumn: 'gender' },
  RACE: { table: 'omop_race', valueColumn: 'race' },
  CANCER: { table: 'omop_cancers', valueColumn: 'cancer' },
});

function normalizeString(value) {
  return String(value ?? '').trim();
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
    if (this.isOpen) {
      return;
    }

    // roaring-wasm loads its WASM module asynchronously. Initialize it before
    // the connection is marked open so every bitmap operation downstream can
    // run synchronously.
    await roaring.roaringLibraryInitialize();

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(this.dbPath);
    // node:sqlite has no implicit busy handler (unlike the old native driver),
    // so a concurrent writer would surface SQLITE_BUSY immediately. Wait a few
    // seconds for the lock instead of failing the query.
    this.db.exec('PRAGMA busy_timeout = 5000');
    this.isOpen = true;
  }

  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.isOpen || !this.db) {
      return;
    }

    this.db.close();
    this.isOpen = false;
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
      'SELECT DISTINCT attribute_name FROM attributes_by_group ORDER BY attribute_name',
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
      'SELECT DISTINCT classUri FROM cancers_by_group ORDER BY classUri',
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
      'SELECT DISTINCT dpheGroup FROM concepts_by_group ORDER BY dpheGroup',
    );
    return rows.map((row) => row.dpheGroup);
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
        includePatientIds,
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
      [String(patientId)],
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
    return this._bitmapService.filterRowsByPatientId(rows, patientId, includePatientIds);
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
      includePatientIds,
    );
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
      includePatientIds,
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
      includePatientIds,
    );
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
      includePatientIds,
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
      includePatientIds,
    );
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
      includePatientIds,
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
      config.table,
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
        includePatientIds,
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
          .map((id) => String(id).trim())
          .filter(Boolean),
      ),
    );

    if (normalizedPatientIds.length === 0) {
      return [];
    }

    // Detect which summary payload column exists in this database.
    const tableInfo = await sqliteAll(this, 'PRAGMA table_info(patient_summaries)');

    const columnNames = new Set(tableInfo.map((col) => col.name));
    const jsonColumn = columnNames.has('json_text')
      ? 'json_text'
      : columnNames.has('summary_json')
        ? 'summary_json'
        : null;

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
        summariesByPatientId.get(resolvedPatientId) || summariesByPatientId.get(summaryPatientId);

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
        const decompressed = zlib.zstdDecompressSync(compressedBuffer);
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
            `Failed to decompress patient summary for patient_id=${resolvedPatientId}: ${decompressErr.message}`,
          );
        }
      }

      const summary = {
        patient_id: resolvedPatientId,
        json_text: jsonText,
      };

      summariesByPatientId.set(resolvedPatientId, summary);
      summariesByPatientId.set(summaryPatientId, summary);
    }

    return normalizedPatientIds
      .map((patientId) => summariesByPatientId.get(patientId))
      .filter(Boolean);
  }

  /**
   * Multi-criteria patient filter using Roaring bitmap intersection.
   *
   * Each filter item contains { type, class, instances[] }.
   *   - Within an item the instance bitmaps are OR'd (patient matches any instance).
   *   - Across items the results are AND'd (patient must match all items).
   *
   * @param {Array<{type: string, class: string, instances: string[]}>} filters
   * @param {boolean} includePatientIds - Resolve sequential IDs to patient IDs (default: false)
   * @returns {Promise<{count: number, patient_ids: string[], timing: Object}>}
   */
  async getFilteredPatientCount(filters, includePatientIds = false, autoIncludeThreshold = 20) {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    const totalStart = process.hrtime.bigint();

    const getTableColumnNames = async (tableName) => {
      const pragmaRows = await sqliteAll(this, `PRAGMA table_info(${tableName})`);

      return new Set(
        (Array.isArray(pragmaRows) ? pragmaRows : [])
          .map((row) => normalizeString(row && row.name).toLowerCase())
          .filter(Boolean),
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
        'attributes_by_group must contain either classUri or value for attribute filtering',
      );
    }

    const TYPE_CONFIG = {
      attributes: {
        table: 'attributes_by_group',
        classColumn: 'attribute_name',
        valueColumns: attributeValueColumns,
      },
      cancers: {
        table: 'cancers_by_group',
        classColumn: null,
        valueColumns: ['classUri'],
      },
      concepts: {
        table: 'concepts_by_group',
        classColumn: 'dpheGroup',
        valueColumns: ['classUri'],
      },
    };

    // Phase 1: fetch the bitmap blobs for every filter item.
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

    // Phase 2: OR the bitmaps within each item, then AND across items.
    const bitmapStart = process.hrtime.bigint();
    const itemBitmaps = [];
    const itemCounts = [];
    let resultBitmap = null;

    try {
      for (const rows of filterRows) {
        const bitmaps = [];
        for (const row of rows) {
          const bitmapSource = this.getPatientBitmapSource(row);
          if (!bitmapSource) {
            continue;
          }

          bitmaps.push(await this.decodeBitmap(bitmapSource.source, bitmapSource.sourceType));
        }

        // OR: patient in any selected instance for this filter item
        let itemBitmap;
        if (bitmaps.length === 0) {
          itemBitmap = new roaring.RoaringBitmap32();
        } else {
          itemBitmap = bitmaps[0];
          for (let i = 1; i < bitmaps.length; i++) {
            itemBitmap.orInPlace(bitmaps[i]);
            // bitmaps[i] has been merged in; free its WASM memory now.
            roaring.dispose(bitmaps[i]);
          }
        }
        itemBitmaps.push(itemBitmap);
        itemCounts.push(itemBitmap.size);
      }

      // AND: patient must match all filter items
      if (itemBitmaps.length === 0) {
        resultBitmap = new roaring.RoaringBitmap32();
      } else {
        // Short-circuit when any item already matched zero patients
        const emptyIdx = itemBitmaps.findIndex((b) => b.size === 0);
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

      // Phase 3: resolve sequential IDs to patient IDs.
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
        patient_ids = await this.patientBitmapToPatientIds(Buffer.from(serialized), 'buffer');
      }

      const resolveEnd = process.hrtime.bigint();

      // Build the timing report.
      const ms = (s, e) => Math.round(Number(e - s) / 1e4) / 100; // 2-decimal ms

      return {
        count: resultBitmap.size,
        patient_ids,
        timing: {
          queryMs: ms(queryStart, queryEnd),
          bitmapMs: ms(bitmapStart, bitmapEnd),
          resolveMs: ms(resolveStart, resolveEnd),
          totalMs: ms(totalStart, resolveEnd),
          itemCounts, // per-filter-item patient counts (before AND)
        },
      };
    } finally {
      // RoaringBitmap32 instances hold WASM memory that is not garbage
      // collected; release every bitmap allocated for this request.
      for (const bitmap of itemBitmaps) {
        roaring.dispose(bitmap);
      }
      roaring.dispose(resultBitmap);
    }
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
        `refusing to re-initialize with "${resolvedPath}".`,
    );
  }
  return instance;
}

module.exports = {
  SQLiteClient,
  getInstance,
};
