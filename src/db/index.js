const { getInstance } = require("./sqlite-client");
const { DB_PATH } = require("../config/database");
const MySQLClient = require("./mysql-client");

// Get the database instance
const db = getInstance(DB_PATH);

/**
 * Initialize the database connection
 * Call this when the application starts
 */
async function initializeDatabase() {
  try {
    await db.open();
    console.log("Database initialized successfully");
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

/**
 * Close the database connection
 * Call this when the application shuts down
 */
async function closeDatabase() {
  try {
    await db.close();
    console.log("Database closed successfully");
  } catch (error) {
    console.error("Failed to close database:", error);
    throw error;
  }
}

module.exports = {
  db,
  initializeDatabase,
  closeDatabase,
  MySQLClient,
};
