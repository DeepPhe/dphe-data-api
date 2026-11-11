const { db } = require('../../../src/db');

describe('PostgresClient file store', () => {
  beforeAll(() => db.open());
  afterAll(() => db.close());

  test('reads raw JSON rows', async () => {
    await expect(db.get('fake_patient1_Cancers.json')).resolves.toEqual({
      cancers: [{ classUri: 'Breast_Cancer' }],
    });
  });

  test('reads zstd-compressed rows and supports raw text reads', async () => {
    await expect(db.get('fake_patient1_beta_Doc.json')).resolves.toMatchObject({
      id: 'fake_patient1_doc2',
      type: 'RAD',
    });
    await expect(db.get('fake_patient1_beta_Doc.json', false)).resolves.toContain(
      'fake_patient1_doc2',
    );
  });

  test('reads LZ4 rows produced by JavaScript and Python frame encoders', async () => {
    await expect(db.get('fake_patient2_lz4_Doc.json')).resolves.toMatchObject({
      id: 'fake_patient2_doc1',
      type: 'NOTE',
    });
    await expect(db.get('python_lz4.json')).resolves.toEqual({
      id: 'python-lz4',
      source: 'python lz4.frame',
    });
  });

  test('scans prefixes with starts_with semantics', async () => {
    const prefixedRows = await db.getByPrefix('fake_patient1');
    expect(prefixedRows.map((row) => row.key)).toEqual([
      'fake_patient1.json',
      'fake_patient1_Cancers.json',
      'fake_patient1_Concepts.json',
      'fake_patient1_alpha_Doc.json',
      'fake_patient1_beta_Doc.json',
    ]);
  });

  test('returns null for missing keys', async () => {
    await expect(db.get('missing.json')).resolves.toBeNull();
  });

  test('rejects reads when the database is closed', async () => {
    await db.close();

    await expect(db.get('closed.json')).rejects.toThrow('Database is not open');
    await expect(db.getByPrefix('closed')).rejects.toThrow('Database is not open');

    await db.open();
  });
});
