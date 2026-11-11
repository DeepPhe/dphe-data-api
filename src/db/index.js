const { getInstance } = require('./postgres-client');
const { DATABASE_URL } = require('../config/database');

const db = getInstance(DATABASE_URL);

async function initializeDatabase() {
  try {
    await db.open();
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function closeDatabase() {
  try {
    await db.close();
  } catch (error) {
    console.error('Failed to close database:', error);
    throw error;
  }
}

module.exports = {
  db,
  initializeDatabase,
  closeDatabase,
};
