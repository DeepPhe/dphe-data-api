![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
![GitHub package.json version](https://img.shields.io/github/package-json/v/DeepPhe/dphe-data-api)
![GitHub last commit](https://img.shields.io/github/last-commit/DeepPhe/dphe-data-api)
![GitHub issues](https://img.shields.io/github/issues/DeepPhe/dphe-data-api)

# DeepPhe Data API

A RESTful API for managing and accessing patient health data, including cancer information, demographics, documents, and
clinical concepts. Built with Express.js and PostgreSQL.

## Prerequisites

- Node.js v24 or higher
- npm or yarn
- A PostgreSQL database produced by the DeepPhe database pipeline

All runtime dependencies are pure-JS, WASM, or Node built-ins (`node:zlib`),
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
PORT=3333
DATABASE_URL=postgresql://dphe:dphe@localhost:55432/dphe
```

## Database Setup (PostgreSQL)

This project reads from the PostgreSQL database created by `dphe-db-pipeline`. The source/development default matches the pipeline's local Compose database:

```bash
postgresql://dphe:dphe@localhost:55432/dphe
```

### Database Configuration

The database URL is configured in `src/config/database.js` and can be overridden with the `DATABASE_URL` environment variable or the `--database-url` CLI flag.

Packaged binaries require an explicit `DATABASE_URL` or `--database-url`.

### In-memory caching (restart after a database reload)

The API treats the database as static while it is being served. To keep filter and summary requests
fast it caches, in memory and for the life of the process: table column metadata, every row of the
bitmap tables used by the filter endpoints (with the patient bitmaps decoded once), the whole
`patient_id_mapping` table, and the four `summary` responses (per `includePatientIds` value). The
caches load on first use (and in the background at startup).

**Restart the API after the database is reloaded or modified**, otherwise it keeps serving the old
data. Set `DPHE_API_CACHE=0` to turn all caches off and run every request against PostgreSQL (for
debugging; much slower).

### Database Schema

The API expects the following tables in the `deepphe` schema:

- `files`
- `patient_id_mapping`
- `attributes_by_group`
- `cancers_by_group`
- `concepts_by_group`
- `patient_summaries`

DeepPhe lookup summary bitmap tables (`lookup_age_at_dx_by_group`, `lookup_ethnicity_by_group`, `lookup_gender_by_group`, `lookup_race_by_group`, and `lookup_cancers_by_group`) are optional. If the pipeline skipped them, OMOP instance endpoints return no rows rather than failing startup. Official OHDSI OMOP CDM tables live separately in the pipeline database's `omop` schema.

> Operational note: the pipeline can drop and recreate the application schemas during a full rebuild.
> Do not run the API against the same database while the pipeline is rebuilding it; use a maintenance window or a
> blue/green database swap.

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

The server will start on `http://localhost:3333` (or the port specified in your environment variables).

### Docker Compose

Set the container database URL in `.env`:

```bash
API_DATABASE_URL=postgresql://dphe:dphe@host.docker.internal:55432/dphe
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
installed, but they do need network access to PostgreSQL.

Build all targets (macOS arm64/x64, Linux x64, Windows x64) into `dist/`:

```bash
npm run build
```

This first regenerates the OpenAPI spec (`npm run build:spec`) so `/docs` works without the
source tree, then produces the binaries. Run one, pointing it at PostgreSQL:

```bash
./dist/dphe-data-api-macos-arm64 --database-url postgresql://dphe:dphe@localhost:55432/dphe
# or via environment variable:
DATABASE_URL=postgresql://dphe:dphe@localhost:55432/dphe PORT=3333 ./dist/dphe-data-api-linux-x64
```

The database is **not** bundled into the binary; supply it with `--database-url <url>` or the
`DATABASE_URL` environment variable.

> Note: `pkg` generates bytecode by running each target's base binary, which is not possible
> for foreign CPU architectures. The build therefore uses `--no-bytecode`, which embeds the
> JavaScript source in the binary instead.

### Publishing release assets

Pushes to `main` run `.github/workflows/publish-dist-release.yml`. The workflow builds each executable on its native
platform, Authenticode-signs and timestamps Windows, Developer ID-signs and notarizes both macOS architectures, creates
a SHA-256 checksum for every binary, and publishes the verified assets to
[`DeepPhe/DeepPhe-Dist`](https://github.com/DeepPhe/DeepPhe-Dist/releases).

The release tag is `dphe-data-api-<DPHE_VERSION>`, for example `dphe-data-api-7.1`. Re-running the
workflow for the same DeepPhe version replaces matching assets on that release.

Configure these repository secrets in `DeepPhe/dphe-data-api`:

| Secret | Value |
| --- | --- |
| `DEEPHE_DIST_RELEASE_TOKEN` | Token able to create releases and upload assets in `DeepPhe/DeepPhe-Dist` |
| `WINDOWS_CERTIFICATE_PFX_BASE64` | Base64-encoded Windows code-signing PFX |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for the Windows PFX |
| `MACOS_CERTIFICATE_P12_BASE64` | Base64-encoded Apple Developer ID PKCS#12 |
| `MACOS_CERTIFICATE_PASSWORD` | Password for the Apple PKCS#12 |
| `APPLE_ID` | Apple developer account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password used by Apple's notarization service |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

A fine-grained `DEEPHE_DIST_RELEASE_TOKEN` needs access to `DeepPhe/DeepPhe-Dist` and `Contents` read/write
permission. Set passwords interactively rather than putting them in a command or shell history:

```bash
gh secret set WINDOWS_CERTIFICATE_PASSWORD --repo DeepPhe/dphe-data-api
gh secret set MACOS_CERTIFICATE_PASSWORD --repo DeepPhe/dphe-data-api
gh secret set APPLE_APP_SPECIFIC_PASSWORD --repo DeepPhe/dphe-data-api
```

## API Documentation

Once the server is running, access the interactive Swagger documentation at:

```
http://localhost:3333/docs
```

The GitHub Pages documentation site is built with Docusaurus from `docs-site/` and `docs/`:

```bash
npm run docs:install
npm run docs:start
npm run docs:build
```

Pushes to `main` that change docs or OpenAPI inputs deploy the generated site to
<https://deepphe.github.io/dphe-data-api/>.

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
curl http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789
```

### Get All Documents for a Patient

```bash
curl http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/documents
```

### Get Specific Documents by ID

```bash
curl "http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/documents?documentIds=123456789_D_100,123456789_D_101"
```

### Get Documents Without Text Content

```bash
curl "http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/documents?excludeProperties=text"
```

### Get Documents Excluding Multiple Properties

```bash
curl "http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/documents?excludeProperties=text,mentions,mentionRelations"
```

### Combine Filters

```bash
curl "http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/documents?documentIds=123456789_D_100&excludeProperties=text,mentions"
```

## Testing

Run the test suite:

```bash
# Start the disposable Postgres test database once
npm run test:db

# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- test/unit/postgres-client/fileStore.test.js

# Stop and remove the disposable test database
npm run test:db:down
```

The test seeder refuses to reset a database unless its name ends with `_test`.

## Scripts

| Script                     | Description                                                     |
|----------------------------|-----------------------------------------------------------------|
| `npm start`                | Start the server                                                |
| `npm run start:debug`      | Start the server with the Node.js inspector (port 9229)         |
| `npm run dev`              | Start the server in development mode with auto-reload (nodemon) |
| `npm run generate-schemas` | Generate TypeScript definitions from JSON schemas               |
| `npm run build:spec`       | Generate the static OpenAPI spec for packaged binaries          |
| `npm run build`            | Build standalone executables for all platforms into `dist/`     |
| `npm run docs:start`       | Start the local Docusaurus documentation site                   |
| `npm run docs:build`       | Build the Docusaurus site into `site/`                          |
| `npm test`                 | Run all tests                                                   |
| `npm run test:db`           | Start the disposable PostgreSQL test database                   |
| `npm run test:db:down`      | Stop and remove the disposable PostgreSQL test database         |
| `npm run test:seed`         | Re-seed the PostgreSQL test database                            |
| `npm run test:watch`       | Run tests in watch mode                                         |
| `npm run test:coverage`    | Run tests with coverage report                                  |

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3333)
- `DATABASE_URL` - PostgreSQL connection URL
- `DPHE_API_CACHE` - set to `0` to disable the in-memory caches (default: enabled)
- `API_DATABASE_URL` - Docker Compose PostgreSQL connection URL
- `TEST_DATABASE_URL` - PostgreSQL URL used by tests
- `TEST_PATIENT_ID` - Patient ID used in tests

### Database URL

The source/development database URL is centralized in `src/config/database.js`:

```javascript
const DEFAULT_DATABASE_URL = 'postgresql://dphe:dphe@localhost:55432/dphe';
```

To change the database, set `DATABASE_URL` in `.env` or pass `--database-url`.

## Security Notes

**Important:** Never commit the `.env` file to version control. It may contain sensitive information such as
patient IDs and database credentials.

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

## License

This project is licensed under the Apache License, Version 2.0 — see [LICENSE](LICENSE) for
the full text and [NOTICE](NOTICE) for attribution.

Copyright 2014–2026 University of Pittsburgh and Boston Children's Hospital.
