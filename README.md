![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)
![GitHub package.json version](https://img.shields.io/github/package-json/v/DeepPhe/dphe-data-api)
![GitHub last commit](https://img.shields.io/github/last-commit/DeepPhe/dphe-data-api)
![GitHub issues](https://img.shields.io/github/issues/DeepPhe/dphe-data-api)

# DeepPhe Data API

A RESTful API for managing and accessing patient health data, including cancer information, demographics, documents, and
clinical concepts. Built with Express.js and SQLite3.

## Prerequisites

- Node.js v24 or higher (the SQLite driver uses the built-in `node:sqlite` module)
- npm or yarn

All runtime dependencies are pure-JS, WASM, or Node built-ins (`node:sqlite`, `node:zlib`),
so there is no native build toolchain to install and the app can be packaged as a
self-contained executable (see [Standalone executables](#standalone-executables-no-node-required)).

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd dphe-data-api
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment configuration file:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

```bash
PORT=3000
DB_PATH=./test/resources/deepphe.sqlite3
TEST_PATIENT_ID=fake_patient1
```

## Database Setup (SQLite3)

This project uses SQLite3 as an embedded database with a key-value store interface for high-performance data storage.

### Database Configuration

The database path is configured in `src/config/database.js` and can be overridden with the `DB_PATH` environment
variable.

Default location: `./test/resources/deepphe.sqlite3`

### Database Schema

The database uses a simple key-value structure with a `files` table:

- `filename` (TEXT PRIMARY KEY) - The document key/identifier
- `content` (TEXT) - JSON-encoded document data
- `encoding` (TEXT) - Encoding type ('raw' or 'zstd' for compressed content)

### Naming Conventions

- Document Keys: `{patientId}_D_{documentId}.json` (e.g., `123456789_D_100.json`)
- Patient Keys: `{patientId}` (e.g., `123456789.json`)
- Cancer Keys: `{patientId}_Cancers.json` (e.g., `123456789_Cancers.json`)
- Concept Keys: `{patientId}_Concepts.json}` (e.g., `123456789_Concepts.json`)

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Debug Mode

```bash
npm run start:debug
```

This starts the server with the Node.js inspector enabled on port 9229.

The server will start on `http://localhost:3000` (or the port specified in your environment variables).

### Docker Compose

The Docker image includes the local test fixture at `/app/test/resources/deepphe.sqlite3`.

Set the container database path in `.env`:

```bash
DB_PATH=./test/resources/deepphe.sqlite3
PORT=3333
```

Then build and run the API:

```bash
docker compose up --build
```

By default, the Docker container listens on port `3333`. To expose it on a different Docker port, set `PORT` before running
Compose, for example:

```bash
PORT=4444 docker compose up --build
```

See `DOCKER.md` for more Docker examples.

## Standalone executables (no Node required)

The app can be packaged into a single self-contained executable per platform using
[`@yao-pkg/pkg`](https://github.com/yao-pkg/pkg). End users do not need Node.js or Docker
installed — only the database file.

Build all targets (macOS arm64/x64, Linux x64, Windows x64) into `dist/`:

```bash
npm run build
```

This first regenerates the OpenAPI spec (`npm run build:spec`) so `/docs` works without the
source tree, then produces the binaries. Run one, pointing it at a SQLite database:

```bash
./dist/dphe-data-api-macos-arm64 --db /path/to/deepphe.sqlite3
# or via environment variable:
DB_PATH=/path/to/deepphe.sqlite3 PORT=3333 ./dist/dphe-data-api-linux-x64
```

The database is **not** bundled into the binary; supply it with `--db <path>` or the
`DB_PATH` environment variable. A relative path is resolved against the current working
directory.

> Note: `pkg` generates bytecode by running each target's base binary, which is not possible
> for foreign CPU architectures. The build therefore uses `--no-bytecode`, which embeds the
> JavaScript source in the binary instead.

## API Documentation

Once the server is running, access the interactive Swagger documentation at:

```
http://localhost:3000/docs
```

## API Endpoints

### Patient

- **`GET /v1/deepphe-api/deepphe/patient/{patientId}`**
    - Get patient documents with `text` excluded by default
    - Note: `documentIds` and `excludeProperties` are not supported on this endpoint

- **`GET /v1/deepphe-api/deepphe/patient/{patientId}/documents`**
    - Get all documents for a patient (full document endpoint)
    - Query Parameters:
        - `documentIds` (optional) - Comma-separated list of document IDs to filter by
        - `excludeProperties` (optional) - Comma-separated list of properties to exclude (e.g.,
          `text,mentions,mentionRelations`)
    - Returns: Array of DocumentXn objects

- **`GET /v1/deepphe-api/deepphe/patient/{patientId}/cancers`**
    - Get raw parsed `{patientId}_Cancers.json` payload

- **`GET /v1/deepphe-api/deepphe/patient/{patientId}/concepts`**
    - Get raw parsed `{patientId}_Concepts.json` payload

### Group Data

#### Attributes
- `GET /v1/deepphe-api/deepphe/attributes/classes` - Get all unique attribute classes
- `GET /v1/deepphe-api/deepphe/attributes/instances` - Get all attribute instances for a specific class
  - Query Parameters:
    - `groupname` (required) - The attribute group name to filter by

#### Cancers
- `GET /v1/deepphe-api/deepphe/cancers/classes` - Get all unique cancer classes
- `GET /v1/deepphe-api/deepphe/cancers/instances` - Get all cancer instances for a specific class
  - Query Parameters:
    - `classUri` (required) - The cancer group classUri to filter by

#### Concepts
- `GET /v1/deepphe-api/deepphe/concepts/classes` - Get all unique concept classes
- `GET /v1/deepphe-api/deepphe/concepts/instances` - Get all concept instances for a specific class
  - Query Parameters:
    - `dpheGroup` (required) - The concept group dpheGroup to filter by

## API Examples

### Get Patient Documents (Text Excluded by Default)

```bash
curl http://localhost:3000/v1/deepphe-api/deepphe/patient/123456789
```

### Get All Documents for a Patient

```bash
curl http://localhost:3000/v1/deepphe-api/deepphe/patient/123456789/documents
```

### Get Specific Documents by ID

```bash
curl "http://localhost:3000/v1/deepphe-api/deepphe/patient/123456789/documents?documentIds=123456789_D_100,123456789_D_101"
```

### Get Documents Without Text Content

```bash
curl "http://localhost:3000/v1/deepphe-api/deepphe/patient/123456789/documents?excludeProperties=text"
```

### Get Documents Excluding Multiple Properties

```bash
curl "http://localhost:3000/v1/deepphe-api/deepphe/patient/123456789/documents?excludeProperties=text,mentions,mentionRelations"
```

### Combine Filters

```bash
curl "http://localhost:3000/v1/deepphe-api/deepphe/patient/123456789/documents?documentIds=123456789_D_100&excludeProperties=text,mentions"
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/db/sqlite-client.test.js
```

## Scripts

| Script                     | Description                                                     |
|----------------------------|-----------------------------------------------------------------|
| `npm start`                | Start the server                                                |
| `npm run start:debug`      | Start the server with the Node.js inspector (port 9229)         |
| `npm run dev`              | Start the server in development mode with auto-reload (nodemon) |
| `npm run generate-schemas` | Generate TypeScript definitions from JSON schemas               |
| `npm run build:spec`       | Generate the static OpenAPI spec for packaged binaries          |
| `npm run build`            | Build standalone executables for all platforms into `dist/`     |
| `npm test`                 | Run all tests                                                   |
| `npm run test:watch`       | Run tests in watch mode                                         |
| `npm run test:coverage`    | Run tests with coverage report                                  |

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `DB_PATH` - Path to SQLite database file
- `TEST_PATIENT_ID` - Patient ID used in tests; the bundled fixture uses fake IDs

### Database Path

The database path is centralized in `src/config/database.js`:

```javascript
const DB_PATH = process.env.DB_PATH || './test/resources/deepphe.sqlite3';
```

To change the database location:

1. Edit `src/config/database.js`, OR
2. Set `DB_PATH` in your `.env` file

## Security Notes

**Important:** Never commit the `.env` file to version control. It may contain sensitive information such as
patient IDs and database paths.

The `.gitignore` file is configured to exclude:

- `.env`
- `.env.local`
- `.env.*.local`
- `data/` directory

Only `.env.example` should be committed as a template.

## Support

For issues and questions, please open an issue in the GitHub repository.

### TypeScript Type Definitions

Type definitions are available in `src/types/` for all data structures including DocumentXn, Patient, Cancer, Concept,
etc.
