const { db } = require('../../../src/db');
const { getCancers } = require('../../../src/controllers/patient-cancer-controller');
const { invokeController } = require('../../helpers/invoke-controller');

describe('getCancers', () => {
  const patientId = process.env.TEST_PATIENT_ID;

  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns cancers for the configured patient', async () => {
    const { body, status } = await invokeController(getCancers, {
      query: { patientId },
    });

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    if (body.length > 0) {
      const cancer = body[0];
      expect(typeof cancer).toBe('object');

      if (Object.hasOwn(cancer, 'id')) {
        expect(typeof cancer.id).toBe('string');
      }
      if (Object.hasOwn(cancer, 'classUri')) {
        expect(typeof cancer.classUri).toBe('string');
      }
      if (Object.hasOwn(cancer, 'attributes')) {
        expect(typeof cancer.attributes).toBe('object');
      }
      if (Object.hasOwn(cancer, 'factIds')) {
        expect(typeof cancer.factIds).toBe('object');
      }
      if (Object.hasOwn(cancer, 'tumors')) {
        expect(typeof cancer.tumors).toBe('object');
      }
      if (Object.hasOwn(cancer, 'relatedFactIds')) {
        expect(typeof cancer.relatedFactIds).toBe('object');
      }
    }
  });

  test('requires patientId', async () => {
    const { body, status } = await invokeController(getCancers, { query: {} });

    expect(status).toBe(400);
    expect(body.error).toContain('Missing required parameter');
  });

  test('returns 404 for an unknown patient', async () => {
    const { body, status } = await invokeController(getCancers, {
      query: { patientId: 'NONEXISTENT_PATIENT_99999' },
    });

    expect(status).toBe(404);
    expect(body).toHaveProperty('error');
  });
});
