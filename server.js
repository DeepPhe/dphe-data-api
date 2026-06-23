// node:sqlite and node:zlib's zstd APIs are stable enough for our use but emit
// ExperimentalWarning noise on startup. Drop those specific warnings while
// leaving every other warning intact.
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, type, ...rest) => {
  const warningType = type && typeof type === 'object' ? type.type : type;
  if (warningType === 'ExperimentalWarning') {
    return undefined;
  }
  return originalEmitWarning(warning, type, ...rest);
};

require('dotenv').config({ quiet: true });

// Resolve the database location from a CLI flag before any module that reads
// the configuration is loaded. Supported: `--db <path>`, `--db=<path>`, `-d`.
function parseDbPathArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--db' || arg === '-d') {
      return argv[i + 1];
    }
    if (arg.startsWith('--db=')) {
      return arg.slice('--db='.length);
    }
  }
  return undefined;
}

const dbPathArg = parseDbPathArg(process.argv.slice(2));
if (dbPathArg) {
  process.env.DB_PATH = dbPathArg;
}

// A packaged binary has no bundled database, so one must be supplied.
if (process.pkg && !process.env.DB_PATH) {
  console.error('Error: no database specified.');
  console.error('Provide one with --db <path> or the DB_PATH environment variable.');
  console.error('Example: dphe-data-api --db ./deepphe.sqlite3');
  process.exit(1);
}

const app = require('./src/app');
const { initializeDatabase, closeDatabase } = require('./src/db');

const port = process.env.PORT || 3333;

// Initialize database and start server
async function startServer() {
  try {
    // Initialize the shared SQLite connection.
    await initializeDatabase();

    const server = app.listen(port, () => {
      console.log(`dphe-data-api listening on http://localhost:${port}`);
      console.log(`Swagger UI: http://localhost:${port}/docs`);
      console.log(`OpenAPI JSON: http://localhost:${port}/openapi.json`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed');
        await closeDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
