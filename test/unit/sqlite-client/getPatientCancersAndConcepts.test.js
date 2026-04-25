const { SQLiteClient } = require('../../../src/db/sqlite-client');

describe('SQLiteClient.getPatientCancers / getPatientConcepts', () => {
    let client;

    beforeEach(() => {
        client = new SQLiteClient('./data/deepphe/deepphe_sqlite_compressed');
        // Inject a minimal mock db with get stub
        client.isOpen = true;
    });

    // ── getPatientCancers ──────────────────────────────────────────────────

    describe('getPatientCancers', () => {
        test('returns parsed cancers data when key exists', async () => {
            const mockData = { cancers: [{ id: 1, type: 'Breast_Cancer' }] };
            client.get = jest.fn().mockResolvedValue(mockData);

            const result = await client.getPatientCancers('patient123');

            expect(client.get).toHaveBeenCalledWith('patient123_Cancers.json');
            expect(result).toEqual(mockData);
        });

        test('returns null when key does not exist', async () => {
            client.get = jest.fn().mockResolvedValue(null);

            const result = await client.getPatientCancers('unknown_patient');

            expect(client.get).toHaveBeenCalledWith('unknown_patient_Cancers.json');
            expect(result).toBeNull();
        });

        test('throws when database is not open', async () => {
            client.isOpen = false;

            await expect(client.getPatientCancers('patient123')).rejects.toThrow('Database is not open');
        });
    });

    // ── getPatientConcepts ─────────────────────────────────────────────────

    describe('getPatientConcepts', () => {
        test('returns parsed concepts data when key exists', async () => {
            const mockData = { concepts: [{ id: 2, group: 'Tumor_Size' }] };
            client.get = jest.fn().mockResolvedValue(mockData);

            const result = await client.getPatientConcepts('patient123');

            expect(client.get).toHaveBeenCalledWith('patient123_Concepts.json');
            expect(result).toEqual(mockData);
        });

        test('returns null when key does not exist', async () => {
            client.get = jest.fn().mockResolvedValue(null);

            const result = await client.getPatientConcepts('unknown_patient');

            expect(client.get).toHaveBeenCalledWith('unknown_patient_Concepts.json');
            expect(result).toBeNull();
        });

        test('throws when database is not open', async () => {
            client.isOpen = false;

            await expect(client.getPatientConcepts('patient123')).rejects.toThrow('Database is not open');
        });
    });
});

