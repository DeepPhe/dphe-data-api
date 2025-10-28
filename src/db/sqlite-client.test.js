require('dotenv').config();
const { db } = require('./index');
const { getDocuments } = require('../controllers/patient-document-controller');

describe('SQLiteClient - Real Database Tests', () => {
  const TEST_PATIENT_ID = process.env.TEST_PATIENT_ID;

  if (!TEST_PATIENT_ID) {
    throw new Error('TEST_PATIENT_ID must be set in .env file');
  }

  beforeAll(async () => {
    await db.open();
    console.log('Database opened successfully');
  });

  afterAll(async () => {
    await db.close();
    console.log('Database closed successfully');
  });

  describe('getDocuments', () => {
    test('should retrieve documents for patient via controller', async () => {
      const req = {
        params: {
          patientId: TEST_PATIENT_ID
        },
        query: {}
      };

      let responseData;
      let statusCode = 200;

      const res = {
        json: (data) => {
          responseData = data;
        },
        status: (code) => {
          statusCode = code;
          return res;
        }
      };

      await getDocuments(req, res);

      console.log(`Found ${responseData.length} documents for patient ${TEST_PATIENT_ID}`);

      expect(responseData).toBeDefined();
      expect(Array.isArray(responseData)).toBe(true);
      expect(statusCode).toBe(200);
      expect(responseData.length).toBeGreaterThan(0);

      if (responseData.length > 0) {
        console.log('Sample documents:');
        responseData.slice(0, 5).forEach((doc) => {
          console.log(`  - ${JSON.stringify(doc).substring(0, 100)}...`);
        });

        const firstDoc = responseData[0];
        expect(firstDoc).toBeDefined();
        expect(typeof firstDoc).toBe('object');
        console.log('First document keys:', Object.keys(firstDoc));
      }
    });

    test('should exclude text when excludeProperties includes text', async () => {
      const req = {
        params: {
          patientId: TEST_PATIENT_ID
        },
        query: {
          excludeProperties: 'text'
        }
      };

      let responseData;

      const res = {
        json: (data) => {
          responseData = data;
        },
        status: (code) => {
          return res;
        }
      };

      await getDocuments(req, res);

      if (responseData.length > 0) {
        const firstDoc = responseData[0];
        console.log('Document without text has keys:', Object.keys(firstDoc));

        expect(firstDoc).not.toHaveProperty('text');
        console.log('✓ Text property successfully excluded');
      }
    });

    test('should handle missing patientId parameter', async () => {
      const req = {
        params: {},
        query: {}
      };

      let responseData;
      let statusCode = 200;

      const res = {
        json: (data) => {
          responseData = data;
        },
        status: (code) => {
          statusCode = code;
          return res;
        }
      };

      await getDocuments(req, res);

      expect(statusCode).toBe(400);
      expect(responseData).toHaveProperty('message');
      expect(responseData.message).toContain('Patient ID is required');
      console.log('✓ Correctly handles missing patientId');
    });

    test('should handle decompression correctly via controller', async () => {
      const req = {
        params: {
          patientId: TEST_PATIENT_ID
        },
        query: {}
      };

      let responseData;

      const res = {
        json: (data) => {
          responseData = data;
        },
        status: (code) => {
          return res;
        }
      };

      await getDocuments(req, res);

      responseData.forEach((doc) => {
        expect(doc).toBeDefined();
        expect(typeof doc).toBe('object');
      });

      console.log('All documents decompressed and parsed successfully via controller');
    });

    test('should exclude properties when excludeProperties is specified', async () => {
      const req = {
        params: {
          patientId: TEST_PATIENT_ID
        },
        query: {
          excludeProperties: 'mentions,mentionRelations'
        }
      };

      let responseData;
      let statusCode = 200;

      const res = {
        json: (data) => {
          responseData = data;
        },
        status: (code) => {
          statusCode = code;
          return res;
        }
      };

      await getDocuments(req, res);

      expect(statusCode).toBe(200);
      expect(responseData).toBeDefined();
      expect(Array.isArray(responseData)).toBe(true);

      if (responseData.length > 0) {
        responseData.forEach((doc) => {
          expect(doc).not.toHaveProperty('mentions');
          expect(doc).not.toHaveProperty('mentionRelations');
          expect(doc).toHaveProperty('id');
          expect(doc).toHaveProperty('name');
        });
        console.log('✓ Properties successfully excluded via excludeProperties parameter');
      }
    });

    test('should return 400 for invalid excludeProperties', async () => {
      const req = {
        params: {
          patientId: TEST_PATIENT_ID
        },
        query: {
          excludeProperties: 'invalidProperty,anotherInvalid'
        }
      };

      let responseData;
      let statusCode = 200;

      const res = {
        json: (data) => {
          responseData = data;
        },
        status: (code) => {
          statusCode = code;
          return res;
        }
      };

      await getDocuments(req, res);

      expect(statusCode).toBe(400);
      expect(responseData).toHaveProperty('message');
      expect(responseData.message).toContain('Invalid properties to exclude');
      console.log('✓ Correctly returns 400 for invalid excludeProperties');
    });

    test('should filter documents by documentIds when specified', async () => {
      const req = {
        params: {
          patientId: TEST_PATIENT_ID
        },
        query: {
          documentIds: `${TEST_PATIENT_ID}_04022025183705_D_100,${TEST_PATIENT_ID}_04022025183705_D_101`
        }
      };

      let responseData;
      let statusCode = 200;

      const res = {
        json: (data) => {
          responseData = data;
        },
        status: (code) => {
          statusCode = code;
          return res;
        }
      };

      await getDocuments(req, res);

      expect(statusCode).toBe(200);
      expect(responseData).toBeDefined();
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(2);

      // Verify only the specified documents are returned
      const returnedIds = responseData.map(doc => doc.id);
      expect(returnedIds).toContain(`${TEST_PATIENT_ID}_04022025183705_D_100`);
      expect(returnedIds).toContain(`${TEST_PATIENT_ID}_04022025183705_D_101`);

      console.log(`✓ Successfully filtered to ${responseData.length} documents by documentIds`);
    });

    test('should return empty array when documentIds do not match any documents', async () => {
      const req = {
        params: {
          patientId: TEST_PATIENT_ID
        },
        query: {
          documentIds: 'nonexistent_doc_id_1,nonexistent_doc_id_2'
        }
      };

      let responseData;
      let statusCode = 200;

      const res = {
        json: (data) => {
          responseData = data;
        },
        status: (code) => {
          statusCode = code;
          return res;
        }
      };

      await getDocuments(req, res);

      expect(statusCode).toBe(200);
      expect(responseData).toBeDefined();
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(0);

      console.log('✓ Correctly returns empty array for non-matching documentIds');
    });
  });

  describe('Database connection', () => {
    test('should be open', () => {
      expect(db.isOpen).toBe(true);
    });

    test('should have valid database path', () => {
      expect(db.dbPath).toBeDefined();
      console.log('Database path:', db.dbPath);
    });
  });
});

