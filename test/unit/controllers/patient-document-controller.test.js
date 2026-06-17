'use strict';

const mockDb = {
    open: jest.fn().mockResolvedValue(undefined),
    getByPrefix: jest.fn(),
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

describe('patientDocumentController.getDocumentEpisodeCounts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('400 when patientId is missing', async () => {
        const req = { params: {}, query: {} };
        const res = makeRes();

        await patientDocumentController.getDocumentEpisodeCounts(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Patient ID is required' });
    });

    test('200 with normalized episode counts', async () => {
        mockDb.getByPrefix.mockResolvedValue([
            {
                key: 'patient123.json',
                value: {
                    id: 'patient123',
                    name: 'Patient Metadata Row'
                }
            },
            {
                key: 'patient123_some_Doc.json',
                value: {
                    id: 'doc-2',
                    name: 'Doc 2',
                    type: 'Clinical Note',
                    date: '202501020900',
                    episode: 'Treatment Plan'
                }
            },
            {
                key: 'patient123_other_Doc.json',
                value: {
                    id: 'doc-3',
                    name: 'Doc 3',
                    type: 'Clinical Note',
                    date: '202501030900'
                }
            },
            {
                key: 'patient123_Concepts.json',
                value: {
                    id: 'not-a-document'
                }
            }
        ]);

        const req = { params: { patientId: 'patient123' }, query: {} };
        const res = makeRes();

        await patientDocumentController.getDocumentEpisodeCounts(req, res);

        expect(mockDb.getByPrefix).toHaveBeenCalledWith('patient123');
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            unknown: 1,
            treatment: 1
        });
    });

    test('200 supports documentIds filtering', async () => {
        mockDb.getByPrefix.mockResolvedValue([
            {
                key: 'patient123.json',
                value: {
                    id: 'doc-1',
                    episode: 'Unknown'
                }
            },
            {
                key: 'patient123_some_Doc.json',
                value: {
                    id: 'doc-2',
                    episode: 'Treatment'
                }
            }
        ]);

        const req = {
            params: { patientId: 'patient123' },
            query: { documentIds: 'doc-2' }
        };
        const res = makeRes();

        await patientDocumentController.getDocumentEpisodeCounts(req, res);

        expect(res.json).toHaveBeenCalledWith({
            treatment: 1
        });
    });

    test('500 when data lookup throws', async () => {
        mockDb.getByPrefix.mockRejectedValue(new Error('boom'));

        const req = { params: { patientId: 'patient123' }, query: {} };
        const res = makeRes();

        await patientDocumentController.getDocumentEpisodeCounts(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
});
