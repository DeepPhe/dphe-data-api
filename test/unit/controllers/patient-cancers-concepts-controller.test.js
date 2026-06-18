'use strict';

// ── Mock the DB singleton BEFORE requiring controllers ─────────────────────
const mockDb = {
  isOpen: true,
  open: jest.fn().mockResolvedValue(undefined),
  getPatientCancers: jest.fn(),
  getPatientConcepts: jest.fn(),
};

jest.mock('../../../src/db/sqlite-client', () => ({
  getInstance: jest.fn().mockReturnValue(mockDb),
}));

const cancersController = require('../../../src/controllers/cancers-controller');
const conceptsController = require('../../../src/controllers/concepts-controller');

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ── cancersController.getPatientCancersFile ────────────────────────────────

describe('cancersController.getPatientCancersFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.open.mockResolvedValue(undefined);
  });

  test('200 — returns cancers data when found', async () => {
    const mockData = { cancers: [{ id: 1, type: 'Breast_Cancer' }] };
    mockDb.getPatientCancers.mockResolvedValue(mockData);

    const req = { params: { patientId: 'patient123' } };
    const res = makeRes();

    await cancersController.getPatientCancersFile(req, res);

    expect(mockDb.open).toHaveBeenCalled();
    expect(mockDb.getPatientCancers).toHaveBeenCalledWith('patient123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockData);
  });

  test('404 — returns Not found when getPatientCancers returns null', async () => {
    mockDb.getPatientCancers.mockResolvedValue(null);

    const req = { params: { patientId: 'unknown' } };
    const res = makeRes();

    await cancersController.getPatientCancersFile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  test('404 — returns Not found when getPatientCancers returns undefined', async () => {
    mockDb.getPatientCancers.mockResolvedValue(undefined);

    const req = { params: { patientId: 'unknown' } };
    const res = makeRes();

    await cancersController.getPatientCancersFile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  test('500 — returns Internal server error when db throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDb.getPatientCancers.mockRejectedValue(new Error('DB exploded'));

    const req = { params: { patientId: 'patient123' } };
    const res = makeRes();

    await cancersController.getPatientCancersFile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    errorSpy.mockRestore();
  });
});

// ── conceptsController.getPatientConceptsFile ──────────────────────────────

describe('conceptsController.getPatientConceptsFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.open.mockResolvedValue(undefined);
  });

  test('200 — returns concepts data when found', async () => {
    const mockData = { concepts: [{ id: 2, group: 'Tumor_Size' }] };
    mockDb.getPatientConcepts.mockResolvedValue(mockData);

    const req = { params: { patientId: 'patient123' } };
    const res = makeRes();

    await conceptsController.getPatientConceptsFile(req, res);

    expect(mockDb.open).toHaveBeenCalled();
    expect(mockDb.getPatientConcepts).toHaveBeenCalledWith('patient123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockData);
  });

  test('404 — returns Not found when getPatientConcepts returns null', async () => {
    mockDb.getPatientConcepts.mockResolvedValue(null);

    const req = { params: { patientId: 'unknown' } };
    const res = makeRes();

    await conceptsController.getPatientConceptsFile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  test('404 — returns Not found when getPatientConcepts returns undefined', async () => {
    mockDb.getPatientConcepts.mockResolvedValue(undefined);

    const req = { params: { patientId: 'unknown' } };
    const res = makeRes();

    await conceptsController.getPatientConceptsFile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  test('500 — returns Internal server error when db throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDb.getPatientConcepts.mockRejectedValue(new Error('DB exploded'));

    const req = { params: { patientId: 'patient123' } };
    const res = makeRes();

    await conceptsController.getPatientConceptsFile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    errorSpy.mockRestore();
  });
});
