const { db } = require('../../../src/db');
const { getDocuments } = require('../../../src/controllers/patient-document-controller');
const { invokeController } = require('../../helpers/invoke-controller');

describe('getDocuments', () => {
  const patientId = process.env.TEST_PATIENT_ID;

  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns documents for the configured patient', async () => {
    const { body, status } = await invokeController(getDocuments, {
      params: { patientId },
      query: {},
    });

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    body.forEach((document) => {
      expect(document).toEqual(expect.any(Object));
    });
  });

  test('excludes requested document properties', async () => {
    const { body, status } = await invokeController(getDocuments, {
      params: { patientId },
      query: { excludeProperties: 'text,mentions,mentionRelations' },
    });

    expect(status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    body.forEach((document) => {
      expect(document).not.toHaveProperty('text');
      expect(document).not.toHaveProperty('mentions');
      expect(document).not.toHaveProperty('mentionRelations');
      expect(document).toHaveProperty('id');
      expect(document).toHaveProperty('name');
    });
  });

  test('requires patientId', async () => {
    const { body, status } = await invokeController(getDocuments, {
      params: {},
      query: {},
    });

    expect(status).toBe(400);
    expect(body.message).toContain('Patient ID is required');
  });

  test('rejects invalid excludeProperties', async () => {
    const { body, status } = await invokeController(getDocuments, {
      params: { patientId },
      query: { excludeProperties: 'invalidProperty,anotherInvalid' },
    });

    expect(status).toBe(400);
    expect(body.message).toContain('Invalid properties to exclude');
  });

  test('filters by documentIds', async () => {
    const allDocuments = await invokeController(getDocuments, {
      params: { patientId },
      query: {},
    });
    expect(allDocuments.body.length).toBeGreaterThanOrEqual(2);

    const expectedIds = allDocuments.body.slice(0, 2).map((document) => document.id);
    const { body, status } = await invokeController(getDocuments, {
      params: { patientId },
      query: { documentIds: expectedIds.join(',') },
    });

    expect(status).toBe(200);
    expect(body.map((document) => document.id)).toEqual(expect.arrayContaining(expectedIds));
    expect(body).toHaveLength(2);
  });

  test('returns an empty array when documentIds do not match', async () => {
    const { body, status } = await invokeController(getDocuments, {
      params: { patientId },
      query: { documentIds: 'nonexistent_doc_id_1,nonexistent_doc_id_2' },
    });

    expect(status).toBe(200);
    expect(body).toEqual([]);
  });
});
