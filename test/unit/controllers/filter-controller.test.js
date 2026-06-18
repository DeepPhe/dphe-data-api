'use strict';

const mockDb = {
  open: jest.fn(),
  getFilteredPatientCount: jest.fn(),
  getPatientSummariesByPatientIds: jest.fn()
};

jest.mock('../../../src/db/sqlite-client', () => ({
  getInstance: jest.fn(() => mockDb)
}));

const filterController = require('../../../src/controllers/filter-controller');
const { invokeController } = require('../../helpers/invoke-controller');

const validFilter = {
  type: 'omop',
  class: 'RACE',
  instances: ['white']
};

describe('filter controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.open.mockResolvedValue(undefined);
  });

  describe('getFilteredPatientCount', () => {
    test.each([
      ['a missing body', undefined, 'Missing required body parameter'],
      ['empty filters', { filters: [] }, 'Missing required body parameter'],
      [
        'a non-object filter',
        { filters: [null] },
        'filters[0] must be an object'
      ],
      [
        'an invalid type',
        { filters: [{ ...validFilter, type: 'invalid' }] },
        'filters[0].type must be one of'
      ],
      [
        'a missing class',
        { filters: [{ ...validFilter, class: '' }] },
        'filters[0].class must be a non-empty string'
      ],
      [
        'empty instances',
        { filters: [{ ...validFilter, instances: [] }] },
        'filters[0].instances must be a non-empty array'
      ]
    ])('returns 400 for %s', async (description, body, errorText) => {
      const result = await invokeController(
        filterController.getFilteredPatientCount,
        { body, query: {} }
      );

      expect(result.status).toBe(400);
      expect(result.body.error).toContain(errorText);
      expect(mockDb.open).not.toHaveBeenCalled();
    });

    test('passes normalized query options to the database', async () => {
      const dbResult = {
        count: 1,
        patient_ids: ['patient-1'],
        timing: { totalMs: 1 }
      };
      mockDb.getFilteredPatientCount.mockResolvedValue(dbResult);

      const result = await invokeController(
        filterController.getFilteredPatientCount,
        {
          body: { filters: [validFilter] },
          query: {
            includePatientIds: 'TRUE',
            autoIncludeThreshold: '-4'
          }
        }
      );

      expect(mockDb.open).toHaveBeenCalled();
      expect(mockDb.getFilteredPatientCount).toHaveBeenCalledWith(
        [validFilter],
        true,
        0
      );
      expect(result).toEqual({ status: 200, body: dbResult });
    });

    test('uses the default auto-include threshold', async () => {
      mockDb.getFilteredPatientCount.mockResolvedValue({
        count: 0,
        patient_ids: []
      });

      await invokeController(filterController.getFilteredPatientCount, {
        body: { filters: [validFilter] },
        query: {}
      });

      expect(mockDb.getFilteredPatientCount).toHaveBeenCalledWith(
        [validFilter],
        false,
        20
      );
    });

    test('returns 500 when the database call fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockDb.getFilteredPatientCount.mockRejectedValue(new Error('boom'));

      const result = await invokeController(
        filterController.getFilteredPatientCount,
        {
          body: { filters: [validFilter] },
          query: {}
        }
      );

      expect(result).toEqual({
        status: 500,
        body: { error: 'Internal server error' }
      });
      errorSpy.mockRestore();
    });
  });

  describe('getBatchFilteredPatientCount', () => {
    test.each([
      ['a missing body', undefined, 'Missing required body parameter'],
      ['empty queries', { queries: [] }, 'Missing required body parameter'],
      [
        'a non-object query',
        { queries: [null] },
        'queries[0] must be an object'
      ],
      [
        'empty query filters',
        { queries: [{ filters: [] }] },
        'queries[0].filters must be a non-empty array'
      ],
      [
        'an invalid nested filter',
        { queries: [{ filters: [{ ...validFilter, type: 'bad' }] }] },
        'queries[0]: filters[0].type must be one of'
      ]
    ])('returns 400 for %s', async (description, body, errorText) => {
      const result = await invokeController(
        filterController.getBatchFilteredPatientCount,
        { body }
      );

      expect(result.status).toBe(400);
      expect(result.body.error).toContain(errorText);
    });

    test('rejects batches over the maximum size', async () => {
      const queries = Array.from({ length: 501 }, () => ({
        filters: [validFilter]
      }));

      const result = await invokeController(
        filterController.getBatchFilteredPatientCount,
        { body: { queries } }
      );

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('exceeds maximum of 500');
    });

    test('returns successful and failed query results in order', async () => {
      const success = { count: 2, patient_ids: ['one', 'two'] };
      mockDb.getFilteredPatientCount
        .mockResolvedValueOnce(success)
        .mockRejectedValueOnce(new Error('bad query'));
      const queries = [
        {
          filters: [validFilter],
          includePatientIds: 'true',
          autoIncludeThreshold: 5
        },
        {
          filters: [validFilter],
          autoIncludeThreshold: 'invalid'
        }
      ];

      const result = await invokeController(
        filterController.getBatchFilteredPatientCount,
        { body: { queries } }
      );

      expect(mockDb.getFilteredPatientCount).toHaveBeenNthCalledWith(
        1,
        [validFilter],
        true,
        5
      );
      expect(mockDb.getFilteredPatientCount).toHaveBeenNthCalledWith(
        2,
        [validFilter],
        false,
        0
      );
      expect(result).toEqual({
        status: 200,
        body: {
          results: [
            success,
            { error: 'bad query', count: 0, patient_ids: [] }
          ]
        }
      });
    });
  });

  describe('getPatientSummaries', () => {
    test.each([
      [undefined, 'Missing required body parameter'],
      [{ patient_ids: [] }, 'Missing required body parameter'],
      [{ patient_ids: [{}] }, 'patient_ids must contain only'],
      [{ patient_ids: ['  '] }, 'at least one non-empty ID']
    ])('returns 400 for invalid input %#', async (body, errorText) => {
      const result = await invokeController(
        filterController.getPatientSummaries,
        { body }
      );

      expect(result.status).toBe(400);
      expect(result.body.error).toContain(errorText);
    });

    test('normalizes IDs before fetching summaries', async () => {
      const summaries = [{ patient_id: '12', json_text: '{}' }];
      mockDb.getPatientSummariesByPatientIds.mockResolvedValue(summaries);

      const result = await invokeController(
        filterController.getPatientSummaries,
        { body: { patient_ids: [' 12 ', 34, ''] } }
      );

      expect(mockDb.getPatientSummariesByPatientIds).toHaveBeenCalledWith([
        '12',
        '34'
      ]);
      expect(result).toEqual({ status: 200, body: summaries });
    });

    test('returns 500 when summary retrieval fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockDb.getPatientSummariesByPatientIds.mockRejectedValue(new Error('boom'));

      const result = await invokeController(
        filterController.getPatientSummaries,
        { body: { patient_ids: ['12'] } }
      );

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: 'Internal server error' });
      errorSpy.mockRestore();
    });
  });
});
