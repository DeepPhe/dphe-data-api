const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
process.env.DB_PATH = path.resolve(__dirname, '../../../test/resources/deepphe.sqlite3');
const { db } = require('../../../src/db/index');
// Give bitmap-heavy tests plenty of room
jest.setTimeout(30000);
/**
 * Helper: pick up to `n` items from an array.
 */
function pickN(arr, n) {
  return arr.slice(0, n);
}
/**
 * Pretty-print a timing table row to the console.
 */
function logTiming(label, timing) {
  console.log(
    [
      '',
      '-'.repeat(70),
      `  ${label}`,
      '-'.repeat(70),
      `  queryMs   : ${timing.queryMs}`,
      `  bitmapMs  : ${timing.bitmapMs}`,
      `  resolveMs : ${timing.resolveMs}`,
      `  totalMs   : ${timing.totalMs}`,
      `  itemCounts: [${timing.itemCounts.join(', ')}]`,
      '-'.repeat(70),
    ].join('\n')
  );
}
describe('SQLiteClient.getFilteredPatientCount', () => {
  // Discovered at runtime in beforeAll
  let omopRaceInstances = [];
  let omopGenderInstances = [];
  let attributeClass = null;
  let attributeInstances = [];
  let cancerClass = null;
  let cancerInstances = [];
  let conceptClass = null;
  let conceptInstances = [];
  beforeAll(async () => {
    await db.open();
    console.log('Database opened');
    /* ── discover OMOP RACE values ──────────────────────────────── */
    const raceRows = await db.getOmopInstances('RACE', false);
    omopRaceInstances = raceRows.map(r => r.race).filter(Boolean);
    console.log(`Discovered ${omopRaceInstances.length} RACE instances: ${omopRaceInstances.join(', ')}`);
    /* ── discover OMOP GENDER values ────────────────────────────── */
    const genderRows = await db.getOmopInstances('GENDER', false);
    omopGenderInstances = genderRows.map(r => r.gender).filter(Boolean);
    console.log(`Discovered ${omopGenderInstances.length} GENDER instances: ${omopGenderInstances.join(', ')}`);
    /* ── discover first attribute class + instances ──────────────── */
    const attrClasses = await db.getAttributesClasses();
    if (attrClasses.length > 0) {
      attributeClass = attrClasses[0];
      const attrRows = await db.getAttributesInstances(attributeClass, false);
      attributeInstances = attrRows.map(r => r.value).filter(Boolean);
      console.log(`Discovered attribute class "${attributeClass}" with ${attributeInstances.length} instances`);
    }
    /* ── discover first cancer class + instances ────────────────── */
    const cancerClasses = await db.getCancersClasses();
    if (cancerClasses.length > 0) {
      cancerClass = cancerClasses[0];
      const cancerRows = await db.getCancersInstances(cancerClass, false);
      cancerInstances = cancerRows.map(r => r.value).filter(Boolean);
      console.log(`Discovered cancer class "${cancerClass}" with ${cancerInstances.length} instances`);
    }
    /* ── discover first concept class + instances ───────────────── */
    const conceptClasses = await db.getConceptsClasses();
    if (conceptClasses.length > 0) {
      conceptClass = conceptClasses[0];
      const conceptRows = await db.getConceptsInstances(conceptClass, false);
      conceptInstances = conceptRows.map(r => r.value).filter(Boolean);
      console.log(`Discovered concept class "${conceptClass}" with ${conceptInstances.length} instances`);
    }
  });
  afterAll(async () => {
    await db.close();
    console.log('Database closed');
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  Single-filter tests                                          */
  /* ────────────────────────────────────────────────────────────── */
  test('single OMOP RACE filter returns count >= 0 with timing', async () => {
    if (omopRaceInstances.length === 0) return;
    const filters = [
      { type: 'omop', class: 'RACE', instances: pickN(omopRaceInstances, 2) }
    ];
    const result = await db.getFilteredPatientCount(filters, false);
    logTiming('Single OMOP RACE filter', result.timing);
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(result.timing.totalMs).toBeGreaterThan(0);
    // patient_ids auto-included when count < 20 (default threshold)
    if (result.count < 20) {
      expect(result.patient_ids.length).toBe(result.count);
    } else {
      expect(result.patient_ids).toEqual([]);
    }
  });
  test('single attribute filter returns count >= 0', async () => {
    if (!attributeClass || attributeInstances.length === 0) return;
    const filters = [
      { type: 'attributes', class: attributeClass, instances: pickN(attributeInstances, 2) }
    ];
    const result = await db.getFilteredPatientCount(filters, false);
    logTiming(`Single attribute filter (${attributeClass})`, result.timing);
    expect(result.count).toBeGreaterThanOrEqual(0);
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  Multi-filter (AND) tests                                     */
  /* ────────────────────────────────────────────────────────────── */
  test('two filters (OMOP RACE + GENDER) AND together', async () => {
    if (omopRaceInstances.length === 0 || omopGenderInstances.length === 0) return;
    const filters = [
      { type: 'omop', class: 'RACE',   instances: pickN(omopRaceInstances, 2) },
      { type: 'omop', class: 'GENDER', instances: pickN(omopGenderInstances, 1) }
    ];
    const result = await db.getFilteredPatientCount(filters, false);
    logTiming('Two OMOP filters (RACE + GENDER)', result.timing);
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(result.timing.itemCounts.length).toBe(2);
    // AND count must be <= each individual item count
    result.timing.itemCounts.forEach(ic => {
      expect(result.count).toBeLessThanOrEqual(ic);
    });
  });
  test('mixed-type filter (OMOP + attributes + cancers)', async () => {
    const filters = [];
    if (omopRaceInstances.length > 0) {
      filters.push({ type: 'omop', class: 'RACE', instances: pickN(omopRaceInstances, 2) });
    }
    if (attributeClass && attributeInstances.length > 0) {
      filters.push({ type: 'attributes', class: attributeClass, instances: pickN(attributeInstances, 2) });
    }
    if (cancerClass && cancerInstances.length > 0) {
      filters.push({ type: 'cancers', class: cancerClass, instances: pickN(cancerInstances, 2) });
    }
    if (filters.length < 2) {
      console.log('Skipping mixed-type test — not enough data types with instances');
      return;
    }
    const result = await db.getFilteredPatientCount(filters, false);
    logTiming(`Mixed-type filter (${filters.length} items)`, result.timing);
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(result.timing.itemCounts.length).toBe(filters.length);
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  includePatientIds = true                                     */
  /* ────────────────────────────────────────────────────────────── */
  test('includePatientIds returns patient_ids array matching count', async () => {
    if (omopGenderInstances.length === 0) return;
    const filters = [
      { type: 'omop', class: 'GENDER', instances: pickN(omopGenderInstances, 1) }
    ];
    const result = await db.getFilteredPatientCount(filters, true);
    logTiming('Single GENDER filter (with patient_ids)', result.timing);
    expect(result.patient_ids.length).toBe(result.count);
    expect(result.timing.resolveMs).toBeGreaterThan(0);
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  Stress test — many filters                                   */
  /* ────────────────────────────────────────────────────────────── */
  test('10-filter stress test completes under 2 seconds', async () => {
    // Build a pool of available filters
    const pool = [];
    if (omopRaceInstances.length > 0) {
      pool.push({ type: 'omop', class: 'RACE', instances: pickN(omopRaceInstances, 2) });
    }
    if (omopGenderInstances.length > 0) {
      pool.push({ type: 'omop', class: 'GENDER', instances: pickN(omopGenderInstances, 2) });
    }
    if (attributeClass && attributeInstances.length > 0) {
      pool.push({ type: 'attributes', class: attributeClass, instances: pickN(attributeInstances, 2) });
    }
    if (cancerClass && cancerInstances.length > 0) {
      pool.push({ type: 'cancers', class: cancerClass, instances: pickN(cancerInstances, 2) });
    }
    if (conceptClass && conceptInstances.length > 0) {
      pool.push({ type: 'concepts', class: conceptClass, instances: pickN(conceptInstances, 2) });
    }
    if (pool.length === 0) {
      console.log('Skipping stress test — no data available');
      return;
    }
    // Repeat pool items to reach 10 filters
    const filters = [];
    for (let i = 0; i < 10; i++) {
      filters.push(pool[i % pool.length]);
    }
    const result = await db.getFilteredPatientCount(filters, false);
    logTiming(`10-filter stress test`, result.timing);
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(result.timing.totalMs).toBeLessThan(2000);
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  Error / edge cases                                           */
  /* ────────────────────────────────────────────────────────────── */
  test('invalid type throws', async () => {
    const filters = [
      { type: 'bogus', class: 'X', instances: ['Y'] }
    ];
    await expect(db.getFilteredPatientCount(filters)).rejects.toThrow('Invalid filter type');
  });
  test('invalid OMOP class throws', async () => {
    const filters = [
      { type: 'omop', class: 'NONEXISTENT', instances: ['Y'] }
    ];
    await expect(db.getFilteredPatientCount(filters)).rejects.toThrow('Invalid OMOP class');
  });
  test('non-matching instances return count 0', async () => {
    const filters = [
      { type: 'omop', class: 'RACE', instances: ['ZZZ_NO_SUCH_RACE_VALUE'] }
    ];
    const result = await db.getFilteredPatientCount(filters, false);
    expect(result.count).toBe(0);
    expect(result.timing.itemCounts[0]).toBe(0);
  });
  test('database not open throws', async () => {
    const closedDb = new (require('../../../src/db/sqlite-client').SQLiteClient)('/tmp/nonexistent');
    await expect(
      closedDb.getFilteredPatientCount([{ type: 'omop', class: 'RACE', instances: ['White'] }])
    ).rejects.toThrow('Database is not open');
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  Auto-include patient IDs threshold tests                     */
  /* ────────────────────────────────────────────────────────────── */
  test('autoIncludeThreshold=0 never auto-includes patient_ids', async () => {
    if (omopRaceInstances.length === 0) return;
    const filters = [
      { type: 'omop', class: 'RACE', instances: pickN(omopRaceInstances, 2) }
    ];
    const result = await db.getFilteredPatientCount(filters, false, 0);
    logTiming('Auto-include disabled (threshold=0)', result.timing);
    expect(result.patient_ids).toEqual([]);
  });
  test('non-matching instances with auto-include returns empty patient_ids', async () => {
    const filters = [
      { type: 'omop', class: 'RACE', instances: ['ZZZ_NO_SUCH_RACE_VALUE'] }
    ];
    const result = await db.getFilteredPatientCount(filters, false, 20);
    expect(result.count).toBe(0);
    expect(result.patient_ids).toEqual([]);
  });
});
