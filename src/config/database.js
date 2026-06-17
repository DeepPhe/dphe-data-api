/**
 * Database configuration
 */

const path = require('path');

const DEFAULT_DB_PATH = path.resolve(__dirname, '../../test/resources/deepphe.sqlite3');
const configuredDbPath = process.env.DB_PATH || DEFAULT_DB_PATH;

module.exports = {
  DEFAULT_DB_PATH,
  DB_PATH: path.resolve(configuredDbPath)
};
