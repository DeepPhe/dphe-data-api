const zlib = require('node:zlib');
const { Pool } = require('pg');
const roaring = require('roaring-wasm');
const { DATABASE_URL, maskDatabaseUrl } = require('../config/database');
const { PostgresBitmapService } = require('./postgres-bitmap-service');
const { PostgresFileStore } = require('./postgres-file-store');
const { FilterIndex } = require('./postgres-filter-index');
const { all: pgAll, assertDatabaseOpen, get: pgGet } = require('./postgres-operations');

const DEEPPHE_SCHEMA = 'deepphe';

const OMOP_CLASS_CONFIG = Object.freeze({
  AGE_AT_DX: { table: 'lookup_age_at_dx_by_group', valueColumn: 'age_at_dx' },
  ETHNICITY: { table: 'lookup_ethnicity_by_group', valueColumn: 'ethnicity' },
  GENDER: { table: 'lookup_gender_by_group', valueColumn: 'gender' },
  RACE: { table: 'lookup_race_by_group', valueColumn: 'race' },
  CANCER: { table: 'lookup_cancers_by_group', valueColumn: 'cancer' },
});

const REQUIRED_TABLE_COLUMNS = Object.freeze({
  files: ['filename', 'content', 'encoding'],
  patient_id_mapping: ['sequential_id', 'patient_id'],
  attributes_by_group: [
    'id',
    'attribute_name',
    'classuri',
    'negated',
    'uncertain',
    'historic',
    'num_patients',
    'patient_bitmap',
  ],
  cancers_by_group: [
    'id',
    'classuri',
    'negated',
    'uncertain',
    'historic',
    'num_patients',
    'patient_bitmap',
  ],
  concepts_by_group: ['id', 'dphegroup', 'classuri', 'negated', 'num_patients', 'patient_bitmap'],
  patient_summaries: ['patient_id'],
});

const INTEGER_TYPES = new Set(['smallint', 'integer', 'bigint']);
const BOOLEAN_PUBLIC_COLUMNS = ['negated', 'uncertain', 'historic'];

// The database is static while it is served (it is only replaced by a full reload, after which the
// API is restarted), so table metadata, the filter index, the patient ID mapping and the summaries are
// cached in memory for the life of the process. DPHE_API_CACHE=0 turns every cache off (debugging).
function isCacheEnabledByEnv() {
  return String(process.env.DPHE_API_CACHE ?? '1').trim() !== '0';
}

function normalizeString(value) {
  return String(value ?? '').trim();
}

function isMissingPostgresTableError(error) {
  return error && error.code === '42P01';
}

function asSafeNumber(columnName, value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${columnName} exceeds JavaScript safe integer range: ${value}`);
    }
    return value;
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      throw new Error(`${columnName} exceeds JavaScript safe integer range: ${value}`);
    }
    return parsed;
  }

  return value;
}

function normalizePublicRow(row) {
  const normalized = { ...row };

  if (Object.prototype.hasOwnProperty.call(normalized, 'id')) {
    normalized.id = asSafeNumber('id', normalized.id);
  }

  for (const columnName of BOOLEAN_PUBLIC_COLUMNS) {
    if (typeof normalized[columnName] === 'boolean') {
      normalized[columnName] = normalized[columnName] ? 1 : 0;
    }
  }

  return normalized;
}

function isNumericId(value) {
  return /^\d+$/.test(String(value || ''));
}

// Sequential IDs are PostgreSQL `integer`. Larger numbers (e.g. 10-digit person IDs) can only be
// external patient IDs, and passing them in an ::integer[] parameter would fail the whole query.
const PG_INTEGER_MAX = 2147483647;

function toIntegerArray(values) {
  const integers = [];
  for (const value of values) {
    if (!isNumericId(value)) {
      continue;
    }

    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= PG_INTEGER_MAX) {
      integers.push(parsed);
    }
  }
  return Array.from(new Set(integers));
}

function decodeSummaryJson(content, patientIdForError) {
  const originalContent = content;
  if (originalContent === null || originalContent === undefined) {
    return null;
  }

  const contentBuffer = Buffer.isBuffer(originalContent)
    ? originalContent
    : Buffer.from(String(originalContent));

  try {
    return zlib.zstdDecompressSync(contentBuffer).toString('utf8');
  } catch (decompressErr) {
    const fallbackText = Buffer.isBuffer(originalContent)
      ? originalContent.toString('utf8')
      : String(originalContent);

    try {
      JSON.parse(fallbackText);
      return fallbackText;
    } catch (_) {
      throw new Error(
        `Failed to decompress patient summary for patient_id=${patientIdForError}: ${decompressErr.message}`,
      );
    }
  }
}

class PostgresClient {
  constructor(databaseUrl = DATABASE_URL, options = {}) {
    this.databaseUrl = databaseUrl;
    this.options = options;
    this.pool = null;
    this.isOpen = false;
    this.summaryPayloadColumn = null;
    this.summaryPatientIdMode = null;
    this.cacheEnabled =
      options.cache !== undefined ? Boolean(options.cache) : isCacheEnabledByEnv();
    this.clearCaches();
    this._bitmapService = new PostgresBitmapService(this);
    this._fileStore = new PostgresFileStore(this);
  }

  async open() {
    if (this.isOpen) {
      return;
    }

    await roaring.roaringLibraryInitialize();

    this.clearCaches();
    this.pool = new Pool({
      connectionString: this.databaseUrl,
      max: Number(process.env.PG_POOL_MAX || this.options.max || 10),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5000),
    });

    try {
      await this.pool.query('SELECT 1');
      await this.validateSchema();
      this.isOpen = true;
    } catch (error) {
      await this.pool.end().catch(() => {});
      this.pool = null;
      throw error;
    }
  }

  // Forget everything cached from the database. open() and close() call this; tests that modify the
  // database under an open client call it too.
  clearCaches() {
    this._columnDetailsCache = new Map();
    this._filterIndexPromise = null;
    this._patientIdMappingPromise = null;
    this._summaryCache = new Map();
  }

  // Load the in-memory caches ahead of the first request. Failures are left to the lazy loaders.
  async warmCaches() {
    if (!this.cacheEnabled) {
      return;
    }
    await Promise.all([this.getFilterIndex(), this.getPatientIdMapping()]);
  }

  // Run compute once per key and share the promise (and so the result) with concurrent and later
  // callers. A failed computation is not kept.
  getCached(cache, key, compute) {
    if (!this.cacheEnabled) {
      return compute();
    }

    let promise = cache.get(key);
    if (!promise) {
      promise = compute().catch((error) => {
        if (cache.get(key) === promise) {
          cache.delete(key);
        }
        throw error;
      });
      cache.set(key, promise);
    }
    return promise;
  }

  async close() {
    this.clearCaches();
    if (!this.pool) {
      this.isOpen = false;
      return;
    }

    await this.pool.end();
    this.pool = null;
    this.isOpen = false;
  }

  async healthCheck() {
    if (!this.isOpen || !this.pool) {
      throw new Error('Database is not open');
    }
    await this.pool.query('SELECT 1');
  }

  async validateSchema() {
    const tableNames = Object.keys(REQUIRED_TABLE_COLUMNS);
    const tableResult = await this.pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_name = ANY($2::text[])`,
      [DEEPPHE_SCHEMA, tableNames],
    );
    const existingTables = new Set(tableResult.rows.map((row) => row.table_name));
    const missingTables = tableNames.filter((tableName) => !existingTables.has(tableName));
    if (missingTables.length > 0) {
      throw new Error(`Missing required PostgreSQL table(s): ${missingTables.join(', ')}`);
    }

    for (const [tableName, requiredColumns] of Object.entries(REQUIRED_TABLE_COLUMNS)) {
      const columns = await this.getTableColumns(tableName);
      const missingColumns = requiredColumns.filter((columnName) => !columns.has(columnName));
      if (missingColumns.length > 0) {
        throw new Error(
          `Table ${DEEPPHE_SCHEMA}.${tableName} is missing required column(s): ${missingColumns.join(', ')}`,
        );
      }
    }

    const summaryColumns = await this.getTableColumnDetails('patient_summaries');
    const columnNames = new Set(summaryColumns.map((column) => column.column_name));
    this.summaryPayloadColumn = columnNames.has('json_text')
      ? 'json_text'
      : columnNames.has('summary_json')
        ? 'summary_json'
        : null;

    if (!this.summaryPayloadColumn) {
      throw new Error('patient_summaries table must contain either json_text or summary_json');
    }

    const patientIdColumn = summaryColumns.find((column) => column.column_name === 'patient_id');
    this.summaryPatientIdMode =
      patientIdColumn && INTEGER_TYPES.has(patientIdColumn.data_type) ? 'sequential' : 'external';
  }

  async getTableColumns(tableName) {
    const rows = await this.getTableColumnDetails(tableName);
    return new Set(rows.map((row) => row.column_name));
  }

  async getTableColumnDetails(tableName) {
    // Column metadata is fixed for the life of the process (missing tables give an empty list).
    return this.getCached(this._columnDetailsCache, tableName, () =>
      this.queryTableColumnDetails(tableName),
    );
  }

  async queryTableColumnDetails(tableName) {
    const result = await this.pool.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = $2`,
      [DEEPPHE_SCHEMA, tableName],
    );
    return result.rows;
  }

  async get(key, parseJson = true) {
    return this._fileStore.get(key, parseJson);
  }

  async getByPrefix(prefix) {
    return this._fileStore.getByPrefix(prefix);
  }

  async decodeBitmap(source, sourceType = 'file') {
    return this._bitmapService.decodeBitmap(source, sourceType);
  }

  async getAttributes() {
    const rows = await pgAll(
      this,
      'SELECT DISTINCT attribute_name FROM deepphe.attributes_by_group ORDER BY attribute_name',
    );
    return rows.map((row) => row.attribute_name);
  }

  async getAttributesClasses() {
    return this.getAttributes();
  }

  async getCancersClasses() {
    const rows = await pgAll(
      this,
      'SELECT DISTINCT classuri AS "classUri" FROM deepphe.cancers_by_group ORDER BY classuri',
    );
    return rows.map((row) => row.classUri);
  }

  async getConceptsClasses() {
    const rows = await pgAll(
      this,
      'SELECT DISTINCT dphegroup AS "dpheGroup" FROM deepphe.concepts_by_group ORDER BY dphegroup',
    );
    return rows.map((row) => row.dpheGroup);
  }

  async getOmopClasses() {
    return Promise.resolve(['AGE_AT_DX', 'ETHNICITY', 'GENDER', 'RACE', 'CANCER']);
  }

  // The four summaries are expensive and the data is static: compute each (per includePatientIds)
  // once. The returned object is shared, so callers must treat it as read-only.
  getCachedSummary(kind, includePatientIds, compute) {
    return this.getCached(this._summaryCache, `${kind}:${includePatientIds ? 1 : 0}`, compute);
  }

  async getOmopSummary(includePatientIds = true) {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    return this.getCachedSummary('omop', includePatientIds, async () => {
      const classes = await this.getOmopClasses();
      const instancesByClass = {};

      for (const omopClass of classes) {
        instancesByClass[omopClass] = await this.getOmopInstances(omopClass, includePatientIds);
      }

      return { classes, instancesByClass };
    });
  }

  async getAttributesSummary(includePatientIds = true) {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    return this.getCachedSummary('attributes', includePatientIds, async () => {
      const classes = await this.getAttributesClasses();
      const instancesByClass = {};

      for (const attributeClass of classes) {
        instancesByClass[attributeClass] = await this.getAttributesInstances(
          attributeClass,
          includePatientIds,
        );
      }

      return { classes, instancesByClass };
    });
  }

  async getCancersSummary(includePatientIds = true) {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    return this.getCachedSummary('cancers', includePatientIds, async () => {
      const classes = await this.getCancersClasses();
      const instancesByClass = {};

      for (const classUri of classes) {
        instancesByClass[classUri] = await this.getCancersInstances(classUri, includePatientIds);
      }

      return { classes, instancesByClass };
    });
  }

  async getConceptsSummary(includePatientIds = true) {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    return this.getCachedSummary('concepts', includePatientIds, async () => {
      const classes = await this.getConceptsClasses();
      const instancesByClass = {};

      for (const dpheGroup of classes) {
        instancesByClass[dpheGroup] = await this.getConceptsInstances(dpheGroup, includePatientIds);
      }

      return { classes, instancesByClass };
    });
  }

  // sequential_id <-> patient_id, loaded once. Resolves to null when caching is off, or when the
  // mapping is not one-to-one (then the SQL lookups stay authoritative).
  async getPatientIdMapping() {
    assertDatabaseOpen(this);
    if (!this.cacheEnabled) {
      return null;
    }

    if (!this._patientIdMappingPromise) {
      const promise = this.loadPatientIdMapping().catch((error) => {
        if (this._patientIdMappingPromise === promise) {
          this._patientIdMappingPromise = null;
        }
        throw error;
      });
      this._patientIdMappingPromise = promise;
    }
    return this._patientIdMappingPromise;
  }

  async loadPatientIdMapping() {
    const rows = await this.getAllRows(
      'SELECT sequential_id, patient_id FROM deepphe.patient_id_mapping',
    );
    const patientIdBySequentialId = new Map();
    const sequentialIdByPatientId = new Map();

    for (const row of rows) {
      patientIdBySequentialId.set(row.sequential_id, row.patient_id);
      sequentialIdByPatientId.set(row.patient_id, row.sequential_id);
    }

    if (
      patientIdBySequentialId.size !== rows.length ||
      sequentialIdByPatientId.size !== rows.length
    ) {
      console.warn(
        `patient_id_mapping is not one-to-one (${rows.length} rows); using SQL lookups instead of the in-memory mapping`,
      );
      return null;
    }

    return { patientIdBySequentialId, sequentialIdByPatientId };
  }

  // Rows of patient_id_mapping whose patient_id is in patientIds or whose sequential_id is in
  // sequentialIds.
  async getMappingRows(patientIds, sequentialIds) {
    const mapping = await this.getPatientIdMapping();
    if (!mapping) {
      return this.getAllRows(
        `SELECT sequential_id, patient_id
         FROM deepphe.patient_id_mapping
         WHERE patient_id = ANY($1::text[])
            OR sequential_id = ANY($2::integer[])`,
        [patientIds, sequentialIds],
      );
    }

    const rows = [];
    const seen = new Set();
    const add = (sequentialId, patientId) => {
      if (sequentialId !== undefined && patientId !== undefined && !seen.has(sequentialId)) {
        seen.add(sequentialId);
        rows.push({ sequential_id: sequentialId, patient_id: patientId });
      }
    };
    for (const patientId of patientIds) {
      add(mapping.sequentialIdByPatientId.get(patientId), patientId);
    }
    for (const sequentialId of sequentialIds) {
      add(sequentialId, mapping.patientIdBySequentialId.get(sequentialId));
    }
    return rows;
  }

  async getSequentialIdForPatient(patientId) {
    const mapping = await this.getPatientIdMapping();
    if (mapping) {
      const sequentialId = mapping.sequentialIdByPatientId.get(String(patientId));
      return sequentialId !== undefined ? sequentialId : null;
    }

    const row = await pgGet(
      this,
      'SELECT sequential_id FROM deepphe.patient_id_mapping WHERE patient_id = $1 LIMIT 1',
      [String(patientId)],
    );
    return row ? row.sequential_id : null;
  }

  async getAllRows(sql, params = []) {
    return pgAll(this, sql, params);
  }

  getPatientBitmapSource(row) {
    return this._bitmapService.getPatientBitmapSource(row);
  }

  async processPatientBitmapRow(row, includePatientIds = false) {
    return this._bitmapService.processPatientBitmapRow(normalizePublicRow(row), includePatientIds);
  }

  async processPatientBitmapRows(rows, includePatientIds = false) {
    return this._bitmapService.processPatientBitmapRows(
      rows.map((row) => normalizePublicRow(row)),
      includePatientIds,
    );
  }

  async getProcessedBitmapRows(sql, params, includePatientIds, missingTableName) {
    let rows;
    try {
      rows = await this.getAllRows(sql, params);
    } catch (error) {
      if (missingTableName && isMissingPostgresTableError(error)) {
        return [];
      }
      throw error;
    }

    return this.processPatientBitmapRows(rows, includePatientIds);
  }

  async filterRowsByPatientId(rows, patientId, includePatientIds = false) {
    return this._bitmapService.filterRowsByPatientId(rows, patientId, includePatientIds);
  }

  async getRowsForPatient(sql, params, patientId, includePatientIds = false, missingTableName) {
    let rows;
    try {
      rows = await this.getAllRows(sql, params);
    } catch (error) {
      if (missingTableName && isMissingPostgresTableError(error)) {
        return [];
      }
      throw error;
    }
    return this.filterRowsByPatientId(rows, patientId, includePatientIds);
  }

  async getAttributesInstances(groupname, includePatientIds = true) {
    return this.getProcessedBitmapRows(
      `SELECT id, attribute_name, classuri AS "classUri", negated, uncertain, historic,
              num_patients, patient_bitmap
       FROM deepphe.attributes_by_group
       WHERE attribute_name = $1
       ORDER BY attribute_name, classuri`,
      [groupname],
      includePatientIds,
    );
  }

  async getAttributesInstancesForPatient(groupname, patientId, includePatientIds = false) {
    return this.getRowsForPatient(
      `SELECT id, attribute_name, classuri AS "classUri", negated, uncertain, historic,
              num_patients, patient_bitmap
       FROM deepphe.attributes_by_group
       WHERE attribute_name = $1
       ORDER BY attribute_name, classuri`,
      [groupname],
      patientId,
      includePatientIds,
    );
  }

  async getCancersInstances(classUri, includePatientIds = true) {
    return this.getProcessedBitmapRows(
      `SELECT id, classuri AS "classUri", negated, uncertain, historic, num_patients,
              patient_bitmap
       FROM deepphe.cancers_by_group
       WHERE classuri = $1
       ORDER BY classuri`,
      [classUri],
      includePatientIds,
    );
  }

  async getCancersInstancesForPatient(classUri, patientId, includePatientIds = false) {
    return this.getRowsForPatient(
      `SELECT id, classuri AS "classUri", negated, uncertain, historic, num_patients,
              patient_bitmap
       FROM deepphe.cancers_by_group
       WHERE classuri = $1
       ORDER BY classuri`,
      [classUri],
      patientId,
      includePatientIds,
    );
  }

  async getConceptsInstances(dpheGroup, includePatientIds = true) {
    return this.getProcessedBitmapRows(
      `SELECT id, dphegroup AS "dpheGroup", classuri AS "classUri", negated,
              num_patients, patient_bitmap
       FROM deepphe.concepts_by_group
       WHERE dphegroup = $1
       ORDER BY dphegroup, classuri`,
      [dpheGroup],
      includePatientIds,
    );
  }

  async getConceptsInstancesForPatient(dpheGroup, patientId, includePatientIds = false) {
    return this.getRowsForPatient(
      `SELECT id, dphegroup AS "dpheGroup", classuri AS "classUri", negated,
              num_patients, patient_bitmap
       FROM deepphe.concepts_by_group
       WHERE dphegroup = $1
       ORDER BY dphegroup, classuri`,
      [dpheGroup],
      patientId,
      includePatientIds,
    );
  }

  async getOmopInstances(omopClass, includePatientIds = true) {
    const className = String(omopClass || '').toUpperCase();
    const config = OMOP_CLASS_CONFIG[className];
    if (!config) {
      throw new Error(`Invalid OMOP class: ${omopClass}`);
    }

    return this.getProcessedBitmapRows(
      `SELECT id, ${config.valueColumn}, num_patients, patient_bitmap
       FROM deepphe.${config.table}
       ORDER BY ${config.valueColumn}`,
      [],
      includePatientIds,
      config.table,
    );
  }

  async getOmopInstancesForPatient(omopClass, patientId, includePatientIds = false) {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    const className = String(omopClass || '').toUpperCase();
    const config = OMOP_CLASS_CONFIG[className];
    if (!config) {
      throw new Error(`Invalid OMOP class: ${omopClass}`);
    }

    return this.getRowsForPatient(
      `SELECT id, ${config.valueColumn}, num_patients, patient_bitmap
       FROM deepphe.${config.table}
       ORDER BY ${config.valueColumn}`,
      [],
      patientId,
      includePatientIds,
      config.table,
    );
  }

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

    if (this.summaryPatientIdMode === 'sequential') {
      return this.getSequentialPatientSummaries(normalizedPatientIds);
    }

    return this.getExternalPatientSummaries(normalizedPatientIds);
  }

  async getSequentialPatientSummaries(normalizedPatientIds) {
    const numericSequentialIds = toIntegerArray(normalizedPatientIds);
    const mappingRows = await this.getMappingRows(normalizedPatientIds, numericSequentialIds);

    const summaryIds = new Set(numericSequentialIds);
    const externalBySequentialId = new Map();
    const aliasesBySequentialId = new Map();

    for (const row of mappingRows) {
      const sequentialId = row.sequential_id;
      summaryIds.add(sequentialId);
      externalBySequentialId.set(sequentialId, String(row.patient_id));
      aliasesBySequentialId.set(sequentialId, [
        ...(aliasesBySequentialId.get(sequentialId) || []),
        String(row.patient_id),
        String(sequentialId),
      ]);
    }

    if (summaryIds.size === 0) {
      return [];
    }

    const rows = await this.getAllRows(
      `SELECT patient_id AS summary_patient_id, ${this.summaryPayloadColumn} AS compressed_json
       FROM deepphe.patient_summaries
       WHERE patient_id = ANY($1::integer[])`,
      [Array.from(summaryIds)],
    );

    const summariesByPatientId = new Map();
    for (const row of rows) {
      const sequentialId = Number(row.summary_patient_id);
      const resolvedPatientId = externalBySequentialId.get(sequentialId) || String(sequentialId);
      const jsonText = decodeSummaryJson(row.compressed_json, resolvedPatientId);
      if (!jsonText) {
        continue;
      }

      const summary = {
        patient_id: resolvedPatientId,
        json_text: jsonText,
      };

      summariesByPatientId.set(resolvedPatientId, summary);
      summariesByPatientId.set(String(sequentialId), summary);

      for (const alias of aliasesBySequentialId.get(sequentialId) || []) {
        summariesByPatientId.set(alias, summary);
      }
    }

    return normalizedPatientIds
      .map((patientId) => summariesByPatientId.get(patientId))
      .filter(Boolean);
  }

  async getExternalPatientSummaries(normalizedPatientIds) {
    const numericSequentialIds = toIntegerArray(normalizedPatientIds);
    const mappingRows = await this.getMappingRows(normalizedPatientIds, numericSequentialIds);

    const candidatePatientIds = new Set(normalizedPatientIds);
    const aliasesByPatientId = new Map();
    for (const row of mappingRows) {
      const patientId = String(row.patient_id);
      candidatePatientIds.add(patientId);
      aliasesByPatientId.set(patientId, [
        ...(aliasesByPatientId.get(patientId) || []),
        patientId,
        String(row.sequential_id),
      ]);
    }

    const rows = await this.getAllRows(
      `SELECT patient_id AS summary_patient_id, ${this.summaryPayloadColumn} AS compressed_json
       FROM deepphe.patient_summaries
       WHERE patient_id = ANY($1::text[])`,
      [Array.from(candidatePatientIds)],
    );

    const summariesByPatientId = new Map();
    for (const row of rows) {
      const resolvedPatientId = String(row.summary_patient_id);
      const jsonText = decodeSummaryJson(row.compressed_json, resolvedPatientId);
      if (!jsonText) {
        continue;
      }

      const summary = {
        patient_id: resolvedPatientId,
        json_text: jsonText,
      };

      summariesByPatientId.set(resolvedPatientId, summary);
      for (const alias of aliasesByPatientId.get(resolvedPatientId) || []) {
        summariesByPatientId.set(alias, summary);
      }
    }

    return normalizedPatientIds
      .map((patientId) => summariesByPatientId.get(patientId))
      .filter(Boolean);
  }

  async getFilterTypeConfig() {
    const attributeColumns = await this.getTableColumns('attributes_by_group');
    const attributeValueColumns = [];
    if (attributeColumns.has('classuri')) {
      attributeValueColumns.push('classuri');
    }
    if (attributeColumns.has('value')) {
      attributeValueColumns.push('value');
    }
    if (attributeValueColumns.length === 0) {
      throw new Error(
        'attributes_by_group must contain either classuri or value for attribute filtering',
      );
    }

    const typeConfig = {
      attributes: {
        table: 'attributes_by_group',
        classColumn: 'attribute_name',
        valueColumns: attributeValueColumns,
      },
      cancers: {
        table: 'cancers_by_group',
        classColumn: null,
        valueColumns: ['classuri'],
      },
      concepts: {
        table: 'concepts_by_group',
        classColumn: 'dphegroup',
        valueColumns: ['classuri'],
      },
    };

    return typeConfig;
  }

  // The in-memory filter index, loaded once (lazily, or by warmCaches()) and shared by all requests.
  async getFilterIndex() {
    if (!this._filterIndexPromise) {
      const promise = this.getFilterTypeConfig()
        .then((typeConfig) =>
          FilterIndex.load(this, [
            ...Object.values(typeConfig).map((cfg) => ({
              table: cfg.table,
              classColumn: cfg.classColumn,
              valueColumns: cfg.valueColumns,
            })),
            ...Object.values(OMOP_CLASS_CONFIG).map((cfg) => ({
              table: cfg.table,
              classColumn: null,
              valueColumns: [cfg.valueColumn],
              optional: true,
            })),
          ]),
        )
        .catch((error) => {
          if (this._filterIndexPromise === promise) {
            this._filterIndexPromise = null;
          }
          throw error;
        });
      this._filterIndexPromise = promise;
    }
    return this._filterIndexPromise;
  }

  async getFilteredPatientCount(filters, includePatientIds = false, autoIncludeThreshold = 20) {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }

    const totalStart = process.hrtime.bigint();
    const typeConfig = await this.getFilterTypeConfig();

    if (this.cacheEnabled) {
      return this.getFilteredPatientCountFromIndex(
        filters,
        includePatientIds,
        autoIncludeThreshold,
        totalStart,
      );
    }

    const queryStart = process.hrtime.bigint();
    const filterRows = [];

    for (const filter of filters) {
      const { type, class: filterClass, instances } = filter;
      const normalizedInstances = Array.from(
        new Set((Array.isArray(instances) ? instances : []).map((value) => String(value))),
      );

      let sql;
      let params;
      let missingTableName;

      if (type === 'omop') {
        const className = String(filterClass || '').toUpperCase();
        const cfg = OMOP_CLASS_CONFIG[className];
        if (!cfg) throw new Error(`Invalid OMOP class: ${filterClass}`);
        sql = `SELECT patient_bitmap FROM deepphe.${cfg.table} WHERE ${cfg.valueColumn} = ANY($1::text[])`;
        params = [normalizedInstances];
        missingTableName = cfg.table;
      } else {
        const cfg = typeConfig[type];
        if (!cfg) throw new Error(`Invalid filter type: ${type}`);
        const valueClauses = cfg.valueColumns
          .map((columnName) => `${columnName} = ANY($${cfg.classColumn ? 2 : 1}::text[])`)
          .join(' OR ');

        if (cfg.classColumn) {
          sql = `SELECT patient_bitmap FROM deepphe.${cfg.table} WHERE ${cfg.classColumn} = $1 AND (${valueClauses})`;
          params = [filterClass, normalizedInstances];
        } else {
          sql = `SELECT patient_bitmap FROM deepphe.${cfg.table} WHERE ${valueClauses}`;
          params = [normalizedInstances];
        }
      }

      try {
        const rows = await this.getAllRows(sql, params);
        filterRows.push(rows);
      } catch (error) {
        if (missingTableName && isMissingPostgresTableError(error)) {
          filterRows.push([]);
        } else {
          throw error;
        }
      }
    }

    const queryEnd = process.hrtime.bigint();
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

        let itemBitmap;
        if (bitmaps.length === 0) {
          itemBitmap = new roaring.RoaringBitmap32();
        } else {
          itemBitmap = bitmaps[0];
          for (let i = 1; i < bitmaps.length; i++) {
            itemBitmap.orInPlace(bitmaps[i]);
            roaring.dispose(bitmaps[i]);
          }
        }
        itemBitmaps.push(itemBitmap);
        itemCounts.push(itemBitmap.size);
      }

      if (itemBitmaps.length === 0) {
        resultBitmap = new roaring.RoaringBitmap32();
      } else {
        const emptyIdx = itemBitmaps.findIndex((bitmap) => bitmap.size === 0);
        if (emptyIdx !== -1) {
          resultBitmap = new roaring.RoaringBitmap32();
        } else {
          resultBitmap = itemBitmaps[0].clone();
          for (let i = 1; i < itemBitmaps.length; i++) {
            resultBitmap.andInPlace(itemBitmaps[i]);
            if (resultBitmap.size === 0) break;
          }
        }
      }

      const bitmapEnd = process.hrtime.bigint();
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
      const ms = (start, end) => Math.round(Number(end - start) / 1e4) / 100;

      return {
        count: resultBitmap.size,
        patient_ids,
        timing: {
          queryMs: ms(queryStart, queryEnd),
          bitmapMs: ms(bitmapStart, bitmapEnd),
          resolveMs: ms(resolveStart, resolveEnd),
          totalMs: ms(totalStart, resolveEnd),
          itemCounts,
        },
      };
    } finally {
      for (const bitmap of itemBitmaps) {
        if (bitmap) {
          roaring.dispose(bitmap);
        }
      }
      if (resultBitmap) {
        roaring.dispose(resultBitmap);
      }
    }
  }

  // Same semantics as the SQL path in getFilteredPatientCount, answered from the in-memory index.
  // The index's bitmaps are shared: only clones made here are modified or disposed.
  async getFilteredPatientCountFromIndex(
    filters,
    includePatientIds,
    autoIncludeThreshold,
    totalStart,
  ) {
    const index = await this.getFilterIndex();

    const queryStart = process.hrtime.bigint();
    const filterEntries = [];

    for (const filter of filters) {
      const { type, class: filterClass, instances } = filter;
      const normalizedInstances = Array.from(
        new Set((Array.isArray(instances) ? instances : []).map((value) => String(value))),
      );

      let tableName;
      let classKey = null;
      if (type === 'omop') {
        const className = String(filterClass || '').toUpperCase();
        const cfg = OMOP_CLASS_CONFIG[className];
        if (!cfg) throw new Error(`Invalid OMOP class: ${filterClass}`);
        tableName = cfg.table;
      } else if (type === 'attributes' || type === 'cancers' || type === 'concepts') {
        tableName = `${type}_by_group`;
        classKey = filterClass;
      } else {
        throw new Error(`Invalid filter type: ${type}`);
      }

      filterEntries.push(index.getTable(tableName).find(classKey, normalizedInstances));
    }

    const queryEnd = process.hrtime.bigint();
    const bitmapStart = process.hrtime.bigint();
    const ownedBitmaps = []; // clones and empty bitmaps created for this call: disposed below
    const itemBitmaps = [];
    const itemCounts = [];
    let resultBitmap = null;

    try {
      for (const entries of filterEntries) {
        let itemBitmap;
        const bitmaps = entries.map((entry) => entry.bitmap).filter(Boolean);
        if (bitmaps.length === 0) {
          itemBitmap = new roaring.RoaringBitmap32();
          ownedBitmaps.push(itemBitmap);
        } else if (bitmaps.length === 1) {
          itemBitmap = bitmaps[0];
        } else {
          itemBitmap = bitmaps[0].clone();
          ownedBitmaps.push(itemBitmap);
          for (let i = 1; i < bitmaps.length; i++) {
            itemBitmap.orInPlace(bitmaps[i]);
          }
        }
        itemBitmaps.push(itemBitmap);
        itemCounts.push(itemBitmap.size);
      }

      if (itemBitmaps.length === 0 || itemBitmaps.some((bitmap) => bitmap.size === 0)) {
        resultBitmap = new roaring.RoaringBitmap32();
      } else {
        resultBitmap = itemBitmaps[0].clone();
        for (let i = 1; i < itemBitmaps.length; i++) {
          resultBitmap.andInPlace(itemBitmaps[i]);
          if (resultBitmap.size === 0) break;
        }
      }

      const bitmapEnd = process.hrtime.bigint();
      const shouldResolveIds =
        resultBitmap.size > 0 &&
        (includePatientIds ||
          (autoIncludeThreshold > 0 && resultBitmap.size < autoIncludeThreshold));

      const resolveStart = process.hrtime.bigint();
      let patient_ids = [];

      if (shouldResolveIds) {
        patient_ids = await this._bitmapService.sequentialIdsToPatientIds(resultBitmap.toArray());
      }

      const resolveEnd = process.hrtime.bigint();
      const ms = (start, end) => Math.round(Number(end - start) / 1e4) / 100;

      return {
        count: resultBitmap.size,
        patient_ids,
        timing: {
          queryMs: ms(queryStart, queryEnd),
          bitmapMs: ms(bitmapStart, bitmapEnd),
          resolveMs: ms(resolveStart, resolveEnd),
          totalMs: ms(totalStart, resolveEnd),
          itemCounts,
        },
      };
    } finally {
      for (const bitmap of ownedBitmaps) {
        roaring.dispose(bitmap);
      }
      if (resultBitmap) {
        roaring.dispose(resultBitmap);
      }
    }
  }

  async patientBitmapToPatientIds(source, sourceType = 'file') {
    return this._bitmapService.patientBitmapToPatientIds(source, sourceType);
  }

  async getPatientCancers(patientId) {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }
    return this.get(`${patientId}_Cancers.json`);
  }

  async getPatientConcepts(patientId) {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }
    return this.get(`${patientId}_Concepts.json`);
  }
}

let instance = null;

function getInstance(databaseUrl = DATABASE_URL) {
  const resolvedUrl = String(databaseUrl || DATABASE_URL);
  if (!instance) {
    instance = new PostgresClient(resolvedUrl);
  } else if (resolvedUrl !== instance.databaseUrl) {
    throw new Error(
      `PostgreSQL client already initialized with "${maskDatabaseUrl(instance.databaseUrl)}"; ` +
        `refusing to re-initialize with "${maskDatabaseUrl(resolvedUrl)}".`,
    );
  }
  return instance;
}

module.exports = {
  PostgresClient,
  getInstance,
};
