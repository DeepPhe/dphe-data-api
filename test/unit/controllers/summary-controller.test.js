'use strict';

const mockDb = {
  open: jest.fn(),
  getOmopSummary: jest.fn(),
  getAttributesSummary: jest.fn(),
  getCancersSummary: jest.fn(),
  getConceptsSummary: jest.fn()
};

jest.mock('../../../src/db/sqlite-client', () => ({
  getInstance: jest.fn(() => mockDb)
}));

const summaryController = require('../../../src/controllers/summary-controller');
const { invokeController } = require('../../helpers/invoke-controller');

const handlers = [
  ['OMOP', 'getOmopSummary', summaryController.getOmopSummary],
  ['attributes', 'getAttributesSummary', summaryController.getAttributesSummary],
  ['cancers', 'getCancersSummary', summaryController.getCancersSummary],
  ['concepts', 'getConceptsSummary', summaryController.getConceptsSummary]
];

describe('summary controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.open.mockResolvedValue(undefined);
  });

  test.each(handlers)(
    'returns the %s summary with timing',
    async (label, methodName, handler) => {
      const summary = {
        classes: ['class-1'],
        instancesByClass: { 'class-1': [{ value: 'value-1' }] }
      };
      mockDb[methodName].mockResolvedValue(summary);

      const result = await invokeController(handler, {
        query: {}
      });

      expect(mockDb[methodName]).toHaveBeenCalledWith(true);
      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        ...summary,
        timing: {
          totalMs: expect.any(Number)
        }
      });
    }
  );

  test.each([
    ['false', false],
    [false, false],
    ['TRUE', true],
    [true, true],
    ['anything-else', false]
  ])(
    'parses includePatientIds=%p as %p',
    async (queryValue, expectedValue) => {
      mockDb.getOmopSummary.mockResolvedValue({
        classes: [],
        instancesByClass: {}
      });

      await invokeController(summaryController.getOmopSummary, {
        query: { includePatientIds: queryValue }
      });

      expect(mockDb.getOmopSummary).toHaveBeenCalledWith(expectedValue);
    }
  );

  test('returns 500 when summary retrieval fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDb.getCancersSummary.mockRejectedValue(new Error('boom'));

    const result = await invokeController(summaryController.getCancersSummary, {
      query: {}
    });

    expect(result).toEqual({
      status: 500,
      body: { error: 'Internal server error' }
    });
    errorSpy.mockRestore();
  });
});
