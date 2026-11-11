/**
 * PostgreSQL database configuration.
 */

const DEFAULT_DATABASE_URL = 'postgresql://dphe:dphe@localhost:55432/dphe';

function resolveDatabaseUrl() {
  return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
}

function maskDatabaseUrl(databaseUrl) {
  const value = String(databaseUrl || '');
  if (!value) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch (_) {
    return value.replace(/(password=)([^ ]+)/i, '$1***');
  }
}

module.exports = {
  DEFAULT_DATABASE_URL,
  DATABASE_URL: resolveDatabaseUrl(),
  maskDatabaseUrl,
};
