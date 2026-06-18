const { db } = require('../../../src/db');
const { getConcepts } = require('../../../src/controllers/patient-concept-controller');
const { invokeController } = require('../../helpers/invoke-controller');

describe('getConcepts', () => {
  const patientId = process.env.TEST_PATIENT_ID;

  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('returns concepts matching the expected shape', async () => {
    const { body, status } = await invokeController(getConcepts, {
      query: { patientId },
    });

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    if (body.length > 0) {
      const concept = body[0];
      expect(typeof concept).toBe('object');

      const stringProperties = ['id', 'classUri', 'preferredText', 'dpheGroup'];
      stringProperties.forEach((property) => {
        if (Object.hasOwn(concept, property)) {
          expect(typeof concept[property]).toBe('string');
        }
      });

      ['negated', 'uncertain', 'historic'].forEach((property) => {
        if (Object.hasOwn(concept, property)) {
          expect(typeof concept[property]).toBe('boolean');
        }
      });

      if (Object.hasOwn(concept, 'confidence')) {
        expect(typeof concept.confidence).toBe('number');
      }
      if (Object.hasOwn(concept, 'mentionIds')) {
        expect(Array.isArray(concept.mentionIds)).toBe(true);
      }
      if (Object.hasOwn(concept, 'codifications')) {
        expect(Array.isArray(concept.codifications)).toBe(true);
      }
    }
  });

  test('requires patientId', async () => {
    const { body, status } = await invokeController(getConcepts, { query: {} });

    expect(status).toBe(400);
    expect(body.error).toContain('Missing required parameter');
  });

  test('returns 404 for an unknown patient', async () => {
    const { body, status } = await invokeController(getConcepts, {
      query: { patientId: 'NONEXISTENT_PATIENT_99999' },
    });

    expect(status).toBe(404);
    expect(body).toHaveProperty('error');
  });
});
