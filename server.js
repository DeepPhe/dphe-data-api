// node:zlib's zstd APIs are stable enough for our use but may emit
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

function printHelp() {
  console.log(`Usage: dphe-data-api [options]

Options:
  -d, --database-url <url>  PostgreSQL connection URL
      --database-url=<url>  PostgreSQL connection URL
  -h, --help                Show this help message

Environment:
  DATABASE_URL              PostgreSQL connection URL
  PORT                      HTTP port (default: 3333)
`);
}

function parseDatabaseUrlArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      return { help: true };
    }

    if (arg === '--db' || arg.startsWith('--db=')) {
      return {
        error:
          'The --db flag was removed with the PostgreSQL migration. Use --database-url instead.',
      };
    }

    if (arg === '--database-url' || arg === '-d') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        return { error: `${arg} requires a PostgreSQL connection URL` };
      }
      return { databaseUrl: value };
    }

    if (arg.startsWith('--database-url=')) {
      const value = arg.slice('--database-url='.length);
      if (!value) {
        return { error: '--database-url requires a PostgreSQL connection URL' };
      }
      return { databaseUrl: value };
    }
  }

  return {};
}

const parsedArgs = parseDatabaseUrlArg(process.argv.slice(2));
if (parsedArgs.help) {
  printHelp();
  process.exit(0);
}

if (parsedArgs.error) {
  console.error(`Error: ${parsedArgs.error}`);
  process.exit(1);
}

if (parsedArgs.databaseUrl) {
  process.env.DATABASE_URL = parsedArgs.databaseUrl;
}

if (process.pkg && !process.env.DATABASE_URL) {
  console.error('Error: no PostgreSQL database specified.');
  console.error('Provide one with --database-url <url> or the DATABASE_URL environment variable.');
  process.exit(1);
}

const app = require('./src/app');
const { initializeDatabase, closeDatabase } = require('./src/db');

const port = process.env.PORT || 3333;

async function startServer() {
  try {
    const db = await initializeDatabase();

    const server = app.listen(port, () => {
      console.log(`dphe-data-api listening on http://localhost:${port}`);
      console.log(`Swagger UI: http://localhost:${port}/docs`);
      console.log(`OpenAPI JSON: http://localhost:${port}/openapi.json`);
    });

    // Load the in-memory caches in the background; requests fall back to loading them lazily.
    db.warmCaches().catch((error) => {
      console.error('Cache warm-up failed:', error.message);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed');
        await closeDatabase();
        process.exit(0);
      });

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
