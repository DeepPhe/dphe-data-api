/**
 * Database configuration
 */

const path = require('path');

// Development default: the SQLite fixture shipped in the repo. This path is
// only meaningful when running from source; a packaged binary has no bundled
// database and must be given one via DB_PATH / the --db flag (see server.js).
const DEFAULT_DB_PATH = path.resolve(__dirname, '../../test/resources/deepphe.sqlite3');

function resolveDbPath() {
  const configured = process.env.DB_PATH;
  if (configured) {
    // Resolve against the real working directory. Inside a packaged binary
    // __dirname points at a virtual snapshot path, so a relative DB_PATH must
    // be anchored to process.cwd() to reach the user's actual file.
    return path.resolve(process.cwd(), configured);
  }
  return DEFAULT_DB_PATH;
}

module.exports = {
  DEFAULT_DB_PATH,
  DB_PATH: resolveDbPath(),
};
