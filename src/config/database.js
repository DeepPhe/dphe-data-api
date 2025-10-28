/**
 * Database configuration
 */

const path = require('path');

// Database path constant
const DB_PATH = process.env.DB_PATH || './data/deepphe/deepphe_sqlite_compressed';

module.exports = {
  DB_PATH: path.resolve(DB_PATH)
};

