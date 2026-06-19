'use strict';

const mockDb = {
  open: jest.fn(),
  getOmopClasses: jest.fn(),
  getOmopInstances: jest.fn(),
  getOmopInstancesForPatient: jest.fn(),
};

jest.mock('../../../src/db/sqlite-client', () => ({
  getInstance: jest.fn(() => mockDb),
}));

const omopController = require('../../../src/controllers/omop-controller');
const { invokeController } = require('../../helpers/invoke-controller');

describe('OMOP controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.open.mockResolvedValue(undefined);
  });

  test('returns supported classes', async () => {
    const classes = ['RACE', 'GENDER'];
    mockDb.getOmopClasses.mockResolvedValue(classes);

    const result = await invokeController(omopController.getOmopClasses, {});

    expect(mockDb.open).toHaveBeenCalled();
    expect(result).toEqual({ status: 200, body: classes });
  });

  test('returns 500 when class retrieval fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDb.getOmopClasses.mockRejectedValue(new Error('boom'));

    const result = await invokeController(omopController.getOmopClasses, {});

    expect(result).toEqual({
      status: 500,
      body: { error: 'Internal server error' },
    });
    errorSpy.mockRestore();
  });

  test('requires an attribute query parameter for instances', async () => {
    const result = await invokeController(omopController.getOmopInstances, {
      query: {},
      path: '/instances',
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('Missing required parameter: attribute');
  });

  test('rejects invalid attributes before opening the database', async () => {
    const result = await invokeController(omopController.getOmopInstances, {
      query: { attribute: 'invalid' },
      path: '/instances',
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toContain('Invalid attribute type');
    expect(mockDb.open).not.toHaveBeenCalled();
  });

  test.each([
    ['/instances', false],
    ['/instances/patients', true],
  ])('passes patient ID mode for %s', async (path, includePatientIds) => {
    const rows = [{ race: 'white' }];
    mockDb.getOmopInstances.mockResolvedValue(rows);

    const result = await invokeController(omopController.getOmopInstances, {
      query: { attribute: 'race' },
      path,
    });

    expect(mockDb.getOmopInstances).toHaveBeenCalledWith('RACE', includePatientIds);
    expect(result).toEqual({ status: 200, body: rows });
  });

  test('returns 404 when a class has no instances', async () => {
    mockDb.getOmopInstances.mockResolvedValue([]);

    const result = await invokeController(omopController.getOmopInstances, {
      query: { attribute: 'RACE' },
      path: '/instances',
    });

    expect(result).toEqual({
      status: 404,
      body: { error: 'No OMOP entries found for this class' },
    });
  });

  test.each([
    [{ params: {}, query: { attribute: 'RACE' }, path: '/instances/patient/' }, 'patientId'],
    [
      {
        params: { patientId: 'patient-1' },
        query: {},
        path: '/instances/patient/patient-1',
      },
      'attribute',
    ],
  ])('requires patient endpoint parameter %s', async (req, parameter) => {
    const result = await invokeController(omopController.getOmopInstancesForPatient, req);

    expect(result.status).toBe(400);
    expect(result.body.error).toBe(`Missing required parameter: ${parameter}`);
  });

  test('fetches patient-specific instances with the normalized class', async () => {
    const rows = [{ ethnicity: 'not hispanic' }];
    mockDb.getOmopInstancesForPatient.mockResolvedValue(rows);

    const result = await invokeController(omopController.getOmopInstancesForPatient, {
      params: { patientId: 'patient-1' },
      query: { attribute: 'ethnicity' },
      path: '/instances/patient/patient-1/patients',
    });

    expect(mockDb.getOmopInstancesForPatient).toHaveBeenCalledWith('ETHNICITY', 'patient-1', true);
    expect(result).toEqual({ status: 200, body: rows });
  });

  test('returns 404 when no patient-specific instances match', async () => {
    mockDb.getOmopInstancesForPatient.mockResolvedValue([]);

    const result = await invokeController(omopController.getOmopInstancesForPatient, {
      params: { patientId: 'patient-1' },
      query: { attribute: 'RACE' },
      path: '/instances/patient/patient-1',
    });

    expect(result).toEqual({
      status: 404,
      body: { error: 'No OMOP entries found for this class and patient' },
    });
  });

  test('returns 500 when instance retrieval fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDb.getOmopInstances.mockRejectedValue(new Error('boom'));

    const result = await invokeController(omopController.getOmopInstances, {
      query: { attribute: 'RACE' },
      path: '/instances',
    });

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: 'Internal server error' });
    errorSpy.mockRestore();
  });
});
