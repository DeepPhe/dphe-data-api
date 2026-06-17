const { db } = require('../../../src/db');
const {
  getConceptRelations
} = require('../../../src/controllers/patient-concept-controller');
const { invokeController } = require('../../helpers/invoke-controller');

describe('getConceptRelations', () => {
  const patientId = process.env.TEST_PATIENT_ID;

  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns concept relations matching the expected shape', async () => {
    const { body, status } = await invokeController(getConceptRelations, {
      query: { patientId }
    });

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    if (body.length > 0) {
      const relation = body[0];
      expect(typeof relation).toBe('object');

      ['id', 'sourceId', 'targetId', 'type'].forEach((property) => {
        if (Object.hasOwn(relation, property)) {
          expect(typeof relation[property]).toBe('string');
        }
      });

      ['negated', 'uncertain', 'historic'].forEach((property) => {
        if (Object.hasOwn(relation, property)) {
          expect(typeof relation[property]).toBe('boolean');
        }
      });

      if (Object.hasOwn(relation, 'confidence')) {
        expect(typeof relation.confidence).toBe('number');
      }
    }
  });

  test('requires patientId', async () => {
    const { body, status } = await invokeController(getConceptRelations, {
      query: {}
    });

    expect(status).toBe(400);
    expect(body.error).toContain('Missing required parameter');
  });

  test('returns 404 for an unknown patient', async () => {
    const { body, status } = await invokeController(getConceptRelations, {
      query: { patientId: 'NONEXISTENT_PATIENT_99999' }
    });

    expect(status).toBe(404);
    expect(body).toHaveProperty('error');
  });
});
