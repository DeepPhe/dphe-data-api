'use strict';

const mockDb = {
    open: jest.fn().mockResolvedValue(undefined),
    getPatientSummaryByPatientId: jest.fn(),
    getPatientProfile: jest.fn(),
};

jest.mock('../../../src/db', () => ({
    db: mockDb,
}));

const patientDocumentController = require('../../../src/controllers/patient-document-controller');

function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('patientDocumentController.getPatientSummary', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDb.open.mockResolvedValue(undefined);
    });

    test('400 when patientId is missing', async () => {
        const req = { params: {} };
        const res = makeRes();

        await patientDocumentController.getPatientSummary(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Patient ID is required' });
        expect(mockDb.getPatientSummaryByPatientId).not.toHaveBeenCalled();
    });

    test('200 when summary is found', async () => {
        const summary = {
            patient_id: 'patient123',
            demographics: { gender: 'female' },
            diagnoses: [],
        };
        mockDb.getPatientSummaryByPatientId.mockResolvedValue(summary);

        const req = { params: { patientId: 'patient123' } };
        const res = makeRes();

        await patientDocumentController.getPatientSummary(req, res);

        expect(mockDb.open).toHaveBeenCalledTimes(1);
        expect(mockDb.getPatientSummaryByPatientId).toHaveBeenCalledWith('patient123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(summary);
    });

    test('404 when summary is not found', async () => {
        mockDb.getPatientSummaryByPatientId.mockResolvedValue(null);

        const req = { params: { patientId: 'patient123' } };
        const res = makeRes();

        await patientDocumentController.getPatientSummary(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    test('500 when summary lookup throws', async () => {
        mockDb.getPatientSummaryByPatientId.mockRejectedValue(new Error('boom'));

        const req = { params: { patientId: 'patient123' } };
        const res = makeRes();

        await patientDocumentController.getPatientSummary(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
});

describe('patientDocumentController.getPatientProfile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDb.open.mockResolvedValue(undefined);
    });

    test('400 when patientId is missing', async () => {
        const req = { params: {} };
        const res = makeRes();

        await patientDocumentController.getPatientProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Patient ID is required' });
        expect(mockDb.getPatientProfile).not.toHaveBeenCalled();
    });

    test('200 when profile is found', async () => {
        const profile = {
            patientId: 'patient123',
            demographics: { gender: 'female' },
            documentCount: 10,
        };
        mockDb.getPatientProfile.mockResolvedValue(profile);

        const req = { params: { patientId: 'patient123' } };
        const res = makeRes();

        await patientDocumentController.getPatientProfile(req, res);

        expect(mockDb.open).toHaveBeenCalledTimes(1);
        expect(mockDb.getPatientProfile).toHaveBeenCalledWith('patient123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(profile);
    });

    test('404 when profile is not found', async () => {
        mockDb.getPatientProfile.mockResolvedValue(null);

        const req = { params: { patientId: 'patient123' } };
        const res = makeRes();

        await patientDocumentController.getPatientProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    test('500 when profile lookup throws', async () => {
        mockDb.getPatientProfile.mockRejectedValue(new Error('boom'));

        const req = { params: { patientId: 'patient123' } };
        const res = makeRes();

        await patientDocumentController.getPatientProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
});
