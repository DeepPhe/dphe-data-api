// Tests reset schema deepphe, so they never fall back to DATABASE_URL (which may point at real data).
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://dphe:dphe@localhost:55435/dphe_api_test';
const TEST_PATIENT_ID = 'fake_patient1';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.TEST_PATIENT_ID = TEST_PATIENT_ID;

module.exports = {
  TEST_DATABASE_URL,
  TEST_PATIENT_ID,
};
