function assertDatabaseOpen(client) {
  if (!client || !client.isOpen || !client.db) {
    throw new Error('Database is not open');
  }
}

// node:sqlite returns BLOB columns as Uint8Array and INTEGER columns that
// exceed Number.MAX_SAFE_INTEGER as BigInt. The rest of the codebase predates
// that driver and assumes BLOBs are Buffers (Buffer.isBuffer checks in the
// bitmap service, Buffer.from in the zstd paths). Normalize each row so those
// assumptions keep holding without touching every call site.
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

async function run(client, sql, params = []) {
  assertDatabaseOpen(client);

  const result = client.db.prepare(sql).run(...params);
  return {
    changes: Number(result.changes),
    lastID: Number(result.lastInsertRowid),
  };
}

async function get(client, sql, params = []) {
  assertDatabaseOpen(client);

  return normalizeRow(client.db.prepare(sql).get(...params));
}

async function all(client, sql, params = []) {
  assertDatabaseOpen(client);

  return client.db
    .prepare(sql)
    .all(...params)
    .map(normalizeRow);
}

module.exports = {
  all,
  assertDatabaseOpen,
  get,
  run,
};
