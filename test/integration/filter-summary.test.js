const axios = require('axios');
const app = require('../../src/app');
const swaggerSpec = require('../../src/docs/swagger');
const { closeDatabase } = require('../../src/db');

describe('POST /deepphe/filter/summary', () => {
  let server;
  let endpoint;

  beforeAll(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    endpoint = `http://127.0.0.1:${server.address().port}/v1/deepphe-api/deepphe/filter/summary`;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await closeDatabase();
  });

  test('accepts the canonical patient_ids request property', async () => {
    const response = await axios.post(endpoint, {
      patient_ids: ['fake_patient1'],
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].patient_id).toBe('fake_patient1');
    expect(() => JSON.parse(response.data[0].json_text)).not.toThrow();
  });

  test('rejects the non-contract patientIds property', async () => {
    const response = await axios.post(
      endpoint,
      { patientIds: ['fake_patient1'] },
      { validateStatus: () => true }
    );

    expect(response.status).toBe(400);
    expect(response.data).toEqual({
      error: 'Missing required body parameter: patient_ids (must be a non-empty array)',
    });
  });

  test('publishes patient_ids in the OpenAPI request schema', () => {
    const schema =
      swaggerSpec.paths['/v1/deepphe-api/deepphe/filter/summary']
        .post.requestBody.content['application/json'].schema;

    expect(schema.required).toEqual(['patient_ids']);
    expect(schema.properties.patient_ids).toBeDefined();
    expect(schema.properties.patientIds).toBeUndefined();
  });
});
