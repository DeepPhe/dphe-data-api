'use strict';

const { SQLiteClient } = require('../../../src/db/sqlite-client');

describe('SQLiteClient.getPatientSummaryByPatientId', () => {
  let client;

  beforeEach(() => {
    client = new SQLiteClient('./test/resources/deepphe.sqlite3');
    client.isOpen = true;
  });

  test('throws when database is not open', async () => {
    client.isOpen = false;
    await expect(client.getPatientSummaryByPatientId('patient123')).rejects.toThrow(
      'Database is not open',
    );
  });

  test('throws when patientId is missing', async () => {
    await expect(client.getPatientSummaryByPatientId('')).rejects.toThrow('patientId is required');
  });

  test('returns null when summaries are unavailable', async () => {
    client.getPatientSummariesByPatientIds = jest.fn().mockResolvedValue([]);

    const result = await client.getPatientSummaryByPatientId('patient123');

    expect(client.getPatientSummariesByPatientIds).toHaveBeenCalledWith(['patient123']);
    expect(result).toBeNull();
  });

  test('returns null when patient_summaries table is unavailable', async () => {
    client.getPatientSummariesByPatientIds = jest
      .fn()
      .mockRejectedValue(new Error('SQLITE_ERROR: no such table: patient_summaries'));

    const result = await client.getPatientSummaryByPatientId('patient123');

    expect(result).toBeNull();
  });

  test('returns parsed summary JSON for the requested patient', async () => {
    client.getPatientSummariesByPatientIds = jest.fn().mockResolvedValue([
      {
        patient_id: 'patient123',
        json_text: JSON.stringify({ patient_id: 'patient123', demographics: { gender: 'female' } }),
      },
    ]);

    const result = await client.getPatientSummaryByPatientId('patient123');

    expect(result).toEqual({
      patient_id: 'patient123',
      demographics: { gender: 'female' },
    });
  });

  test('throws when summary JSON cannot be parsed', async () => {
    client.getPatientSummariesByPatientIds = jest.fn().mockResolvedValue([
      {
        patient_id: 'patient123',
        json_text: '{bad json',
      },
    ]);

    await expect(client.getPatientSummaryByPatientId('patient123')).rejects.toThrow(
      'Failed to parse patient summary JSON for patient123',
    );
  });
});

describe('SQLiteClient.getPatientProfile', () => {
  let client;

  beforeEach(() => {
    client = new SQLiteClient('./test/resources/deepphe.sqlite3');
    client.isOpen = true;

    client.get = jest.fn().mockResolvedValue(null);
    client.getPatientSummaryByPatientId = jest.fn().mockResolvedValue(null);
    client.getByPrefix = jest.fn().mockResolvedValue([]);
    client.getOmopInstancesForPatient = jest.fn().mockResolvedValue([]);
  });

  test('throws when database is not open', async () => {
    client.isOpen = false;
    await expect(client.getPatientProfile('patient123')).rejects.toThrow('Database is not open');
  });

  test('throws when patientId is missing', async () => {
    await expect(client.getPatientProfile('')).rejects.toThrow('patientId is required');
  });

  test('returns null when no profile signal exists', async () => {
    const result = await client.getPatientProfile('patient123');
    expect(result).toBeNull();
  });

  test('builds profile using summary, OMOP fallbacks, and document-derived dates', async () => {
    client.get.mockResolvedValue({ id: 'patient123', name: 'Patient 123' });
    client.getPatientSummaryByPatientId.mockResolvedValue({
      patient_id: 'patient123',
      demographics: {
        gender: 'female',
        age_at_dx: '62',
        cancer_type: 'BreastCancer',
      },
      diagnoses: [{ name: 'Breast carcinoma' }],
    });
    client.getByPrefix.mockResolvedValue([
      {
        key: 'patient123_D_1_Doc.json',
        value: {
          id: 'patient123_D_1',
          type: 'Clinical Note',
          date: '20110310',
          text: 'Patient DOB...................01/15/1949',
        },
      },
      {
        key: 'patient123_D_2_Doc.json',
        value: {
          id: 'patient123_D_2',
          type: 'Surgical Pathology Report',
          date: '20110727',
        },
      },
    ]);
    client.getOmopInstancesForPatient.mockImplementation(async (className) => {
      if (className === 'RACE') {
        return [{ race: 'white' }];
      }
      if (className === 'ETHNICITY') {
        return [{ ethnicity: 'Not Hispanic or Latino' }];
      }
      return [];
    });

    const result = await client.getPatientProfile('patient123');

    expect(result).toMatchObject({
      patientId: 'patient123',
      patientName: 'Patient 123',
      documentCount: 2,
      firstEncounterDate: '2011-03-10',
      lastEncounterDate: '2011-07-27',
    });

    expect(result.demographics).toMatchObject({
      patientId: 'patient123',
      patientName: 'Patient 123',
      gender: 'female',
      race: 'white',
      ethnicity: 'Not Hispanic or Latino',
      birthDate: '1949-01-15',
      firstEncounterDate: '2011-03-10',
      lastEncounterDate: '2011-07-27',
      ageAtDiagnosis: '62',
      ageAtDx: '62',
      cancerType: 'BreastCancer',
      ageOfFirstEncounter: '62',
      ageOfLastEncounter: '62',
    });

    expect(result.documentTypeCounts).toEqual({
      'Clinical Note': 1,
      'Surgical Pathology Report': 1,
    });

    expect(result.summary).toMatchObject({
      patient_id: 'patient123',
      diagnoses: [{ name: 'Breast carcinoma' }],
    });
  });

  test('continues when summary source is unavailable', async () => {
    client.getPatientSummaryByPatientId.mockRejectedValue(
      new Error('SQLITE_ERROR: no such table: patient_summaries'),
    );
    client.get.mockResolvedValue({ id: 'patient123', name: 'Patient 123' });

    const result = await client.getPatientProfile('patient123');

    expect(result).toMatchObject({
      patientId: 'patient123',
      patientName: 'Patient 123',
    });
    expect(result.summary).toBeNull();
  });
});
