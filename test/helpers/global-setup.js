const { TEST_DATABASE_URL } = require('./test-env');
const { seedPostgres } = require('./seed-postgres');

module.exports = async () => {
  if (process.env.SKIP_PG_SEED === '1') {
    return;
  }

  await seedPostgres(TEST_DATABASE_URL);
};
