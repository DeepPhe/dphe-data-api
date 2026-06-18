'use strict';

const mockDb = {
  open: jest.fn().mockResolvedValue(undefined),
  getAttributesClasses: jest.fn(),
  getAttributesInstances: jest.fn(),
  getAttributesInstancesForPatient: jest.fn(),
  getCancersClasses: jest.fn(),
  getCancersInstances: jest.fn(),
  getCancersInstancesForPatient: jest.fn(),
  getConceptsClasses: jest.fn(),
  getConceptsInstances: jest.fn(),
  getConceptsInstancesForPatient: jest.fn(),
};

jest.mock('../../../src/db/sqlite-client', () => ({
  getInstance: jest.fn().mockReturnValue(mockDb),
}));

const attributesController = require('../../../src/controllers/attributes-controller');
const cancersController = require('../../../src/controllers/cancers-controller');
const conceptsController = require('../../../src/controllers/concepts-controller');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('grouped resource controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.open.mockResolvedValue(undefined);
  });

  test('returns attribute classes', async () => {
    const classes = ['Biomarkers'];
    mockDb.getAttributesClasses.mockResolvedValue(classes);
    const res = makeRes();

    await attributesController.getAttributesClasses({}, res);

    expect(mockDb.open).toHaveBeenCalled();
    expect(mockDb.getAttributesClasses).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(classes);
  });

  test('requires the configured class query parameter', async () => {
    const res = makeRes();

    await cancersController.getCancersInstances({ query: {}, path: '/instances' }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required parameter: classUri',
    });
    expect(mockDb.getCancersInstances).not.toHaveBeenCalled();
  });

  test('includes patient IDs only for the patients route variant', async () => {
    const rows = [{ classUri: 'Cancer', patient_ids: ['patient-1'] }];
    mockDb.getCancersInstances.mockResolvedValue(rows);
    const res = makeRes();

    await cancersController.getCancersInstances(
      { query: { classUri: 'Cancer' }, path: '/instances/patients' },
      res,
    );

    expect(mockDb.getCancersInstances).toHaveBeenCalledWith('Cancer', true);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(rows);
  });

  test('passes class, patient, and patient ID option to the database', async () => {
    const rows = [{ dpheGroup: 'Biomarkers' }];
    mockDb.getConceptsInstancesForPatient.mockResolvedValue(rows);
    const res = makeRes();

    await conceptsController.getConceptsInstancesForPatient(
      {
        params: { patientId: 'patient-1' },
        query: { dpheGroup: 'Biomarkers' },
        path: '/instances/patient/patient-1',
      },
      res,
    );

    expect(mockDb.getConceptsInstancesForPatient).toHaveBeenCalledWith(
      'Biomarkers',
      'patient-1',
      false,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(rows);
  });

  test('returns 404 when no instances match', async () => {
    mockDb.getAttributesInstances.mockResolvedValue([]);
    const res = makeRes();

    await attributesController.getAttributesInstances(
      { query: { groupname: 'Genes' }, path: '/instances' },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No attributes found for this class',
    });
  });

  test('returns 500 when a grouped database call fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDb.getConceptsClasses.mockRejectedValue(new Error('DB exploded'));
    const res = makeRes();

    await conceptsController.getConceptsClasses({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    errorSpy.mockRestore();
  });
});
