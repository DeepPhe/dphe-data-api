function assertDatabaseOpen(client) {
  if (!client || !client.isOpen || !client.pool) {
    throw new Error('Database is not open');
  }
}

function normalizeValue(value) {
  if (value instanceof Uint8Array && !Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }
  return value;
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') {
    return row;
  }

  for (const key of Object.keys(row)) {
    row[key] = normalizeValue(row[key]);
  }
  return row;
}

async function query(client, sql, params = []) {
  assertDatabaseOpen(client);
  return client.pool.query(sql, params);
}

async function run(client, sql, params = []) {
  const result = await query(client, sql, params);
  return {
    changes: Number(result.rowCount || 0),
  };
}

async function get(client, sql, params = []) {
  const result = await query(client, sql, params);
  return normalizeRow(result.rows[0] || null);
}

async function all(client, sql, params = []) {
  const result = await query(client, sql, params);
  return result.rows.map(normalizeRow);
}

module.exports = {
  all,
  assertDatabaseOpen,
  get,
  query,
  run,
};
