const roaring = require('roaring-wasm');
const { PostgresClient } = require('../../../src/db/postgres-client');

function bitmapBuffer(ids) {
  const bitmap = new roaring.RoaringBitmap32();
  bitmap.addMany(ids);
  const buffer = Buffer.from(bitmap.serialize(false));
  roaring.dispose(bitmap);
  return buffer;
}

function missingTableError() {
  const error = new Error('relation does not exist');
  error.code = '42P01';
  return error;
}

// A client whose database is a set of in-memory tables, so no PostgreSQL is needed.
function createClient({ tables, mapping, attributeColumns = ['classuri'], options } = {}) {
  const client = new PostgresClient('postgresql://dphe:dphe@localhost:1/cache_test', options);
  client.isOpen = true;
  client.pool = { query: jest.fn() };
  client.queries = [];
  client.getAllRows = jest.fn(async (sql) => {
    const table = /FROM deepphe\.(\w+)/.exec(sql)[1];
    client.queries.push(table);
    if (table === 'patient_id_mapping') {
      return mapping.map(([sequential_id, patient_id]) => ({ sequential_id, patient_id }));
    }
    if (!tables[table]) {
      throw missingTableError();
    }
    return tables[table].map((row) => ({ ...row }));
  });
  client.getTableColumns = jest.fn(async () => new Set(attributeColumns));
  return client;
}

function baseTables() {
  return {
    attributes_by_group: [
      { id: 1, attribute_name: 'stage', classuri: 'II', patient_bitmap: bitmapBuffer([0, 1]) },
      { id: 2, attribute_name: 'stage', classuri: 'III', patient_bitmap: bitmapBuffer([2]) },
      { id: 3, attribute_name: 'grade', classuri: 'II', patient_bitmap: bitmapBuffer([1, 2, 3]) },
      { id: 4, attribute_name: 'stage', classuri: 'IV', patient_bitmap: null },
    ],
    cancers_by_group: [
      { id: 1, classuri: 'Breast', patient_bitmap: bitmapBuffer([0, 1, 2]) },
      { id: 2, classuri: 'Breast', patient_bitmap: bitmapBuffer([3]) },
      { id: 3, classuri: 'Lung', patient_bitmap: bitmapBuffer([4]) },
    ],
    concepts_by_group: [
      { id: 1, dphegroup: 'Biomarker', classuri: 'HER2', patient_bitmap: bitmapBuffer([0, 3]) },
      { id: 2, dphegroup: 'Drug', classuri: 'HER2', patient_bitmap: bitmapBuffer([4]) },
    ],
    lookup_gender_by_group: [
      { id: 1, gender: 'F', patient_bitmap: bitmapBuffer([0, 1, 2]) },
      { id: 2, gender: 'M', patient_bitmap: bitmapBuffer([3, 4, 99]) },
    ],
    lookup_race_by_group: [{ id: 1, race: 'White', patient_bitmap: bitmapBuffer([0, 3]) }],
  };
}

const MAPPING = [
  [0, 'p0'],
  [1, 'p1'],
  [2, 'p2'],
  [3, 'p3'],
  [4, 'p4'],
];

describe('table column metadata cache', () => {
  function createMetadataClient(options) {
    const client = new PostgresClient('postgresql://dphe:dphe@localhost:1/cache_test', options);
    client.isOpen = true;
    client.pool = {
      query: jest.fn(async (sql, params) => ({
        rows:
          params[1] === 'no_such_table'
            ? []
            : [
                { column_name: 'id', data_type: 'bigint' },
                { column_name: 'classuri', data_type: 'text' },
              ],
      })),
    };
    return client;
  }

  test('memoizes getTableColumns and getTableColumnDetails per table', async () => {
    const client = createMetadataClient();

    const first = await client.getTableColumns('cancers_by_group');
    const second = await client.getTableColumns('cancers_by_group');
    const details = await client.getTableColumnDetails('cancers_by_group');
    await client.getTableColumns('concepts_by_group');

    expect(first).toEqual(new Set(['id', 'classuri']));
    expect(second).toEqual(first);
    expect(details).toEqual([
      { column_name: 'id', data_type: 'bigint' },
      { column_name: 'classuri', data_type: 'text' },
    ]);
    expect(client.pool.query).toHaveBeenCalledTimes(2);
  });

  test('shares one query between concurrent callers', async () => {
    const client = createMetadataClient();

    await Promise.all([client.getTableColumns('a'), client.getTableColumns('a')]);

    expect(client.pool.query).toHaveBeenCalledTimes(1);
  });

  test('a missing table still yields no columns', async () => {
    const client = createMetadataClient();

    expect(await client.getTableColumns('no_such_table')).toEqual(new Set());
    expect(await client.getTableColumnDetails('no_such_table')).toEqual([]);
  });

  test('does not keep a failed lookup', async () => {
    const client = createMetadataClient();
    client.pool.query.mockRejectedValueOnce(new Error('boom'));

    await expect(client.getTableColumns('a')).rejects.toThrow('boom');
    await expect(client.getTableColumns('a')).resolves.toEqual(new Set(['id', 'classuri']));
  });

  test('queries every time when the cache is disabled', async () => {
    const client = createMetadataClient({ cache: false });

    await client.getTableColumns('a');
    await client.getTableColumns('a');

    expect(client.pool.query).toHaveBeenCalledTimes(2);
  });

  test('clearCaches forgets the metadata', async () => {
    const client = createMetadataClient();

    await client.getTableColumns('a');
    client.clearCaches();
    await client.getTableColumns('a');

    expect(client.pool.query).toHaveBeenCalledTimes(2);
  });
});

describe('in-memory filter index', () => {
  beforeAll(async () => {
    await roaring.roaringLibraryInitialize();
  });

  test('ORs instances within an item, ANDs items, and keeps the response shape', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });

    const result = await client.getFilteredPatientCount([
      { type: 'attributes', class: 'stage', instances: ['II', 'III'] },
      { type: 'cancers', class: 'ignored', instances: ['Breast'] },
      { type: 'omop', class: 'gender', instances: ['F'] },
    ]);

    expect(result.count).toBe(3);
    expect(result.patient_ids).toEqual(['p0', 'p1', 'p2']);
    expect(Object.keys(result.timing)).toEqual([
      'queryMs',
      'bitmapMs',
      'resolveMs',
      'totalMs',
      'itemCounts',
    ]);
    expect(result.timing.itemCounts).toEqual([3, 4, 3]);
  });

  test('matches attributes on the right class only', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });

    const stage = await client.getFilteredPatientCount([
      { type: 'attributes', class: 'stage', instances: ['II'] },
    ]);
    const grade = await client.getFilteredPatientCount([
      { type: 'attributes', class: 'grade', instances: ['II'] },
    ]);
    const unknownClass = await client.getFilteredPatientCount([
      { type: 'attributes', class: 'STAGE', instances: ['II'] },
    ]);

    expect(stage.timing.itemCounts).toEqual([2]);
    expect(grade.timing.itemCounts).toEqual([3]);
    expect(unknownClass.timing.itemCounts).toEqual([0]);
  });

  test('matches concepts on dphegroup and classuri', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });

    const result = await client.getFilteredPatientCount([
      { type: 'concepts', class: 'Biomarker', instances: ['HER2'] },
    ]);

    expect(result.patient_ids).toEqual(['p0', 'p3']);
  });

  test('attributes with a value column match classuri OR value, once per row', async () => {
    const tables = baseTables();
    tables.attributes_by_group = [
      {
        id: 1,
        attribute_name: 'stage',
        classuri: 'II',
        value: 'two',
        patient_bitmap: bitmapBuffer([0]),
      },
      {
        id: 2,
        attribute_name: 'stage',
        classuri: 'III',
        value: 'II',
        patient_bitmap: bitmapBuffer([1]),
      },
      {
        id: 3,
        attribute_name: 'stage',
        classuri: 'x',
        value: null,
        patient_bitmap: bitmapBuffer([2]),
      },
    ];
    const client = createClient({
      tables,
      mapping: MAPPING,
      attributeColumns: ['classuri', 'value'],
    });

    const result = await client.getFilteredPatientCount([
      { type: 'attributes', class: 'stage', instances: ['II', 'two'] },
    ]);

    expect(result.patient_ids).toEqual(['p0', 'p1']);
    expect(result.timing.itemCounts).toEqual([2]);
  });

  test('attributes with only a value column match on value', async () => {
    const tables = baseTables();
    tables.attributes_by_group = [
      { id: 1, attribute_name: 'stage', value: 'II', patient_bitmap: bitmapBuffer([0]) },
      { id: 2, attribute_name: 'stage', value: 'III', patient_bitmap: bitmapBuffer([1]) },
    ];
    const client = createClient({ tables, mapping: MAPPING, attributeColumns: ['value'] });

    const result = await client.getFilteredPatientCount([
      { type: 'attributes', class: 'stage', instances: ['III'] },
    ]);

    expect(result.patient_ids).toEqual(['p1']);
  });

  test('attributes need classuri or value', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING, attributeColumns: [] });

    await expect(
      client.getFilteredPatientCount([{ type: 'attributes', class: 'stage', instances: ['II'] }]),
    ).rejects.toThrow('attributes_by_group must contain either classuri or value');
  });

  test('an empty item short-circuits to zero but still reports every item count', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });

    const result = await client.getFilteredPatientCount(
      [
        { type: 'cancers', class: 'x', instances: ['Breast'] },
        { type: 'cancers', class: 'x', instances: ['Nope'] },
        { type: 'omop', class: 'GENDER', instances: [] },
      ],
      true,
    );

    expect(result.count).toBe(0);
    expect(result.patient_ids).toEqual([]);
    expect(result.timing.itemCounts).toEqual([4, 0, 0]);
  });

  test('an empty AND result has no patient IDs', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });

    const result = await client.getFilteredPatientCount(
      [
        { type: 'cancers', class: 'x', instances: ['Lung'] },
        { type: 'omop', class: 'RACE', instances: ['White'] },
      ],
      true,
    );

    expect(result.count).toBe(0);
    expect(result.patient_ids).toEqual([]);
    expect(result.timing.itemCounts).toEqual([1, 2]);
  });

  test('upper-cases the OMOP class and rejects an invalid one', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });

    const result = await client.getFilteredPatientCount([
      { type: 'omop', class: 'race', instances: ['White'] },
    ]);
    expect(result.patient_ids).toEqual(['p0', 'p3']);

    await expect(
      client.getFilteredPatientCount([{ type: 'omop', class: 'NOPE', instances: ['x'] }]),
    ).rejects.toThrow('Invalid OMOP class: NOPE');
    await expect(
      client.getFilteredPatientCount([{ type: 'bogus', class: 'x', instances: ['x'] }]),
    ).rejects.toThrow('Invalid filter type: bogus');
  });

  test('a missing lookup table is treated as empty', async () => {
    const tables = baseTables();
    delete tables.lookup_race_by_group;
    const client = createClient({ tables, mapping: MAPPING });

    const result = await client.getFilteredPatientCount([
      { type: 'omop', class: 'RACE', instances: ['White'] },
    ]);

    expect(result.count).toBe(0);
    expect(result.timing.itemCounts).toEqual([0]);
  });

  test('a missing cancers table is still an error', async () => {
    const tables = baseTables();
    delete tables.cancers_by_group;
    const client = createClient({ tables, mapping: MAPPING });

    await expect(
      client.getFilteredPatientCount([{ type: 'omop', class: 'RACE', instances: ['White'] }]),
    ).rejects.toThrow('relation does not exist');
  });

  test("unmapped sequential IDs become 'missing', in bitmap order", async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });

    const result = await client.getFilteredPatientCount(
      [{ type: 'omop', class: 'GENDER', instances: ['M'] }],
      true,
    );

    expect(result.patient_ids).toEqual(['p3', 'p4', 'missing']);
  });

  test('includes IDs automatically below autoIncludeThreshold only', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });
    const filters = [{ type: 'omop', class: 'GENDER', instances: ['F'] }];

    expect((await client.getFilteredPatientCount(filters)).patient_ids).toHaveLength(3);
    expect((await client.getFilteredPatientCount(filters, false, 3)).patient_ids).toEqual([]);
    expect((await client.getFilteredPatientCount(filters, false, 0)).patient_ids).toEqual([]);
    expect((await client.getFilteredPatientCount(filters, true, 0)).patient_ids).toHaveLength(3);
  });

  test('loads each table once, even for concurrent first calls', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });
    const filters = [{ type: 'cancers', class: 'x', instances: ['Breast'] }];

    await Promise.all([
      client.getFilteredPatientCount(filters),
      client.getFilteredPatientCount(filters),
      client.getFilteredPatientCount(filters),
    ]);
    await client.getFilteredPatientCount(filters);

    for (const table of [
      'attributes_by_group',
      'cancers_by_group',
      'concepts_by_group',
      'lookup_gender_by_group',
      'patient_id_mapping',
    ]) {
      expect(client.queries.filter((name) => name === table)).toHaveLength(1);
    }
  });

  test('requests never change or dispose the cached bitmaps', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });
    const filters = [
      { type: 'cancers', class: 'x', instances: ['Breast', 'Lung'] },
      { type: 'attributes', class: 'stage', instances: ['II', 'III'] },
    ];

    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(await client.getFilteredPatientCount(filters, true));
    }
    const single = await client.getFilteredPatientCount([
      { type: 'cancers', class: 'x', instances: ['Lung'] },
    ]);

    results.forEach((result) => {
      expect(result.patient_ids).toEqual(['p0', 'p1', 'p2']);
      expect(result.timing.itemCounts).toEqual([5, 3]);
    });
    expect(single.timing.itemCounts).toEqual([1]);

    const index = await client.getFilterIndex();
    const cached = index.getTable('cancers_by_group').find(null, ['Breast']);
    expect(cached.map((entry) => entry.bitmap.toArray())).toEqual([[0, 1, 2], [3]]);
  });

  test('gives the same answer as the SQL path (cache disabled)', async () => {
    const cached = createClient({ tables: baseTables(), mapping: MAPPING });
    const uncached = createClient({
      tables: baseTables(),
      mapping: MAPPING,
      options: { cache: false },
    });
    // The uncached client runs real SQL; answer its queries from the same fake tables.
    uncached.getAllRows = jest.fn(async (sql, params) => {
      if (/patient_id_mapping/.test(sql)) {
        return MAPPING.filter(([id]) => params[0].includes(id)).map(([id, pid]) => ({
          sequential_id: id,
          patient_id: pid,
        }));
      }
      const table = /FROM deepphe\.(\w+)/.exec(sql)[1];
      const [first, second] = params;
      const tableRows = baseTables()[table] || [];
      const rows = tableRows.filter((row) => {
        if (table === 'attributes_by_group') {
          return row.attribute_name === first && second.includes(row.classuri);
        }
        if (table === 'cancers_by_group') {
          return first.includes(row.classuri);
        }
        if (table === 'concepts_by_group') {
          return row.dphegroup === first && second.includes(row.classuri);
        }
        return first.includes(row.gender ?? row.race);
      });
      return rows;
    });

    const filters = [
      { type: 'attributes', class: 'stage', instances: ['II', 'III'] },
      { type: 'omop', class: 'GENDER', instances: ['F', 'M'] },
    ];
    const withCache = await cached.getFilteredPatientCount(filters, true);
    const withoutCache = await uncached.getFilteredPatientCount(filters, true);

    expect(withCache.count).toBe(withoutCache.count);
    expect(withCache.patient_ids).toEqual(withoutCache.patient_ids);
    expect(withCache.timing.itemCounts).toEqual(withoutCache.timing.itemCounts);
  });
});

describe('in-memory patient ID mapping', () => {
  test('answers sequential ID lookups from memory', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });

    expect(await client.getSequentialIdForPatient('p3')).toBe(3);
    expect(await client.getSequentialIdForPatient(' p3')).toBeNull();
    expect(await client.getSequentialIdForPatient('nobody')).toBeNull();
    expect(client.queries.filter((name) => name === 'patient_id_mapping')).toHaveLength(1);
  });

  test('still requires an open database', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });
    client.isOpen = false;

    await expect(client.getSequentialIdForPatient('p3')).rejects.toThrow('Database is not open');
  });

  test('bitmap decoding resolves IDs from memory and keeps order and placeholders', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });
    const bitmapBytes = bitmapBuffer([4, 1, 77, 0]);

    expect(await client.patientBitmapToPatientIds(bitmapBytes, 'buffer')).toEqual([
      'p0',
      'p1',
      'p4',
      'missing',
    ]);
    expect(client.queries).toEqual(['patient_id_mapping']);
  });

  test('summary mapping rows match on external or sequential ID, once per patient', async () => {
    const client = createClient({ tables: baseTables(), mapping: MAPPING });

    const rows = await client.getMappingRows(['p2', '3', 'nobody'], [3, 9]);

    expect(rows).toEqual([
      { sequential_id: 2, patient_id: 'p2' },
      { sequential_id: 3, patient_id: 'p3' },
    ]);
  });

  test('falls back to SQL lookups when the mapping is not one-to-one', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const client = createClient({
      tables: baseTables(),
      mapping: [
        [0, 'p0'],
        [1, 'p0'],
      ],
    });

    expect(await client.getPatientIdMapping()).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('uses SQL when the cache is disabled', async () => {
    const client = createClient({
      tables: baseTables(),
      mapping: MAPPING,
      options: { cache: false },
    });

    expect(await client.getPatientIdMapping()).toBeNull();
  });
});

describe('summary cache', () => {
  function createSummaryClient(options) {
    const client = new PostgresClient('postgresql://dphe:dphe@localhost:1/cache_test', options);
    client.isOpen = true;
    client.getOmopClasses = jest.fn().mockResolvedValue(['RACE']);
    client.getOmopInstances = jest.fn(
      (omopClass, includePatientIds) =>
        new Promise((resolve) =>
          setTimeout(() => resolve([{ race: 'White', withIds: includePatientIds }]), 20),
        ),
    );
    return client;
  }

  test('concurrent first requests share one computation', async () => {
    const client = createSummaryClient();

    const [a, b, c] = await Promise.all([
      client.getOmopSummary(true),
      client.getOmopSummary(true),
      client.getOmopSummary(),
    ]);
    const later = await client.getOmopSummary(true);

    expect(client.getOmopInstances).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(later).toBe(a);
  });

  test('is cached separately per includePatientIds value and per summary', async () => {
    const client = createSummaryClient();
    client.getCancersClasses = jest.fn().mockResolvedValue(['Breast']);
    client.getCancersInstances = jest.fn().mockResolvedValue([{ classUri: 'Breast' }]);

    const withIds = await client.getOmopSummary(true);
    const withoutIds = await client.getOmopSummary(false);
    await client.getCancersSummary(true);
    await client.getCancersSummary(true);

    expect(withIds.instancesByClass.RACE[0].withIds).toBe(true);
    expect(withoutIds.instancesByClass.RACE[0].withIds).toBe(false);
    expect(client.getOmopInstances).toHaveBeenCalledTimes(2);
    expect(client.getCancersInstances).toHaveBeenCalledTimes(1);
  });

  test('a failed computation is not cached', async () => {
    const client = createSummaryClient();
    client.getOmopInstances.mockRejectedValueOnce(new Error('boom'));

    await expect(client.getOmopSummary(true)).rejects.toThrow('boom');
    await expect(client.getOmopSummary(true)).resolves.toEqual({
      classes: ['RACE'],
      instancesByClass: { RACE: [{ race: 'White', withIds: true }] },
    });
  });

  test('is recomputed every time when the cache is disabled', async () => {
    const client = createSummaryClient({ cache: false });

    const first = await client.getOmopSummary(true);
    const second = await client.getOmopSummary(true);

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(client.getOmopInstances).toHaveBeenCalledTimes(2);
  });

  test('still requires an open database', async () => {
    const client = createSummaryClient();
    await client.getOmopSummary(true);
    client.isOpen = false;

    await expect(client.getOmopSummary(true)).rejects.toThrow('Database is not open');
  });
});
