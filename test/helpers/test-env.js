const path = require('path');

const TEST_DB_PATH = path.resolve(__dirname, '../resources/deepphe.sqlite3');
const TEST_PATIENT_ID = 'fake_patient1';

process.env.DB_PATH = TEST_DB_PATH;
process.env.TEST_PATIENT_ID = TEST_PATIENT_ID;

module.exports = {
  TEST_DB_PATH,
  TEST_PATIENT_ID,
};
