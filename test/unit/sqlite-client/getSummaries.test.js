const { SQLiteClient } = require('../../../src/db/sqlite-client');

describe('SQLiteClient summary methods', () => {
  let db;

  beforeEach(() => {
    db = new SQLiteClient('/tmp/summary-test.db');
    db.isOpen = true;
  });

  test('getOmopSummary builds classes and instancesByClass using includePatientIds flag', async () => {
    db.getOmopClasses = jest.fn().mockResolvedValue(['RACE', 'GENDER']);
    db.getOmopInstances = jest.fn()
      .mockResolvedValueOnce([{ value: 'White', count: 10 }])
      .mockResolvedValueOnce([{ value: 'Female', count: 8 }]);

    const result = await db.getOmopSummary(false);

    expect(db.getOmopClasses).toHaveBeenCalledTimes(1);
    expect(db.getOmopInstances).toHaveBeenNthCalledWith(1, 'RACE', false);
    expect(db.getOmopInstances).toHaveBeenNthCalledWith(2, 'GENDER', false);
    expect(result).toEqual({
      classes: ['RACE', 'GENDER'],
      instancesByClass: {
        RACE: [{ value: 'White', count: 10 }],
        GENDER: [{ value: 'Female', count: 8 }]
      }
    });
  });

  test('getAttributesSummary defaults includePatientIds to true', async () => {
    db.getAttributesClasses = jest.fn().mockResolvedValue(['Behavior']);
    db.getAttributesInstances = jest.fn().mockResolvedValue([{ value: 'Benign', count: 3 }]);

    const result = await db.getAttributesSummary();

    expect(db.getAttributesClasses).toHaveBeenCalledTimes(1);
    expect(db.getAttributesInstances).toHaveBeenCalledWith('Behavior', true);
    expect(result).toEqual({
      classes: ['Behavior'],
      instancesByClass: {
        Behavior: [{ value: 'Benign', count: 3 }]
      }
    });
  });

  test('getCancersSummary builds per-class arrays', async () => {
    db.getCancersClasses = jest.fn().mockResolvedValue(['Breast_Cancer', 'Lung_Cancer']);
    db.getCancersInstances = jest.fn()
      .mockResolvedValueOnce([{ value: 'Breast Cancer', count: 5 }])
      .mockResolvedValueOnce([{ value: 'Lung Cancer', count: 2 }]);

    const result = await db.getCancersSummary(false);

    expect(db.getCancersClasses).toHaveBeenCalledTimes(1);
    expect(db.getCancersInstances).toHaveBeenNthCalledWith(1, 'Breast_Cancer', false);
    expect(db.getCancersInstances).toHaveBeenNthCalledWith(2, 'Lung_Cancer', false);
    expect(result.instancesByClass.Breast_Cancer).toEqual([{ value: 'Breast Cancer', count: 5 }]);
    expect(result.instancesByClass.Lung_Cancer).toEqual([{ value: 'Lung Cancer', count: 2 }]);
  });

  test('getConceptsSummary builds per-class arrays', async () => {
    db.getConceptsClasses = jest.fn().mockResolvedValue(['Biomarkers']);
    db.getConceptsInstances = jest.fn().mockResolvedValue([{ value: 'HER2', count: 7 }]);

    const result = await db.getConceptsSummary(false);

    expect(db.getConceptsClasses).toHaveBeenCalledTimes(1);
    expect(db.getConceptsInstances).toHaveBeenCalledWith('Biomarkers', false);
    expect(result).toEqual({
      classes: ['Biomarkers'],
      instancesByClass: {
        Biomarkers: [{ value: 'HER2', count: 7 }]
      }
    });
  });

  test('summary methods throw when database is not open', async () => {
    db.isOpen = false;

    await expect(db.getOmopSummary()).rejects.toThrow('Database is not open');
    await expect(db.getAttributesSummary()).rejects.toThrow('Database is not open');
    await expect(db.getCancersSummary()).rejects.toThrow('Database is not open');
    await expect(db.getConceptsSummary()).rejects.toThrow('Database is not open');
  });
});
