function assertDatabaseOpen(client) {
  if (!client || !client.isOpen || !client.db) {
    throw new Error('Database is not open');
  }
}

function run(client, sql, params = []) {
  assertDatabaseOpen(client);

  return new Promise((resolve, reject) => {
    client.db.run(sql, params, function handleRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        changes: this.changes,
        lastID: this.lastID,
      });
    });
  });
}

function get(client, sql, params = []) {
  assertDatabaseOpen(client);

  return new Promise((resolve, reject) => {
    client.db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function all(client, sql, params = []) {
  assertDatabaseOpen(client);

  return new Promise((resolve, reject) => {
    client.db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

module.exports = {
  all,
  assertDatabaseOpen,
  get,
  run,
};
