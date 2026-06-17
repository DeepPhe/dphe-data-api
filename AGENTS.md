# AGENTS.md — Coding Agent Guidelines for dphe-data-api

This file provides instructions and conventions for AI coding agents (e.g. GitHub Copilot, Cursor, Claude) working
inside the `dphe-data-api` codebase.

---

## Project Overview

`dphe-data-api` is a **Node.js / Express REST API** that serves patient health data extracted by the
[DeepPhe](https://github.com/DeepPhe) NLP pipeline. Data is stored in **SQLite3** using a compressed key-value store
(zstd) with Roaring Bitmaps for fast cohort-level patient filtering.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Runtime      | Node.js ≥ 14 (CommonJS modules)     |
| Framework    | Express 5                           |
| Database     | SQLite3 (`sqlite3` npm package)     |
| Compression  | `@mongodb-js/zstd`                  |
| Bitmaps      | `roaring` (RoaringBitmap32)         |
| API Docs     | Swagger / OpenAPI (`swagger-jsdoc`) |
| Testing      | Jest (unit + integration)           |
| Dev server   | Nodemon                             |

---

## Repository Layout

```
src/
  app.js                   # Express app setup (middleware, routes, swagger)
  schema.mjs               # JSON schema definitions
  config/
    database.js            # DB_PATH config (env-aware)
  controllers/             # Route handler logic (thin wrappers over db client)
    attributes-controller.js
    cancers-controller.js
    concepts-controller.js
    filter-controller.js
    omop-controller.js
    patient-concept-controller.js
    patient-document-controller.js
    patient-filter-controller.js
    summary-controller.js
  db/
    index.js               # Re-exports active client
    sqlite-client.js       # SQLiteClient class + singleton getInstance()
    mysql-client.js        # Alternative MySQL client (rarely used)
  docs/
    swagger.js             # swagger-jsdoc spec assembly
    components.js          # Reusable OpenAPI component schemas
    generated-components.js
  routes/
    dphe-data-routes.js    # Top-level router
    *.routes.js            # Feature-specific sub-routers
  types/                   # TypeScript type definitions (generated from JSON schema)
  utils/                   # Shared helpers
test/
  unit/                    # Jest unit tests
  integration/             # Jest integration tests (require live DB)
server.js                  # Entry point — calls app.listen()
```

---

## Coding Conventions

### General

- Use **CommonJS** (`require` / `module.exports`). Do **not** add `"type": "module"` or use ESM `import` in `src/`.
  The one exception is `schema.mjs`, which is intentionally ESM.
- Use `async/await` for all new async code. Legacy code uses `new Promise(...)` — you may leave it as-is unless
  refactoring a file for another reason.
- Keep controllers thin: validation and HTTP response shaping belong in the controller; all data-access logic belongs
  in `sqlite-client.js` or a db helper.

### Naming

- Route files: `<feature>-routes.js`
- Controller files: `<feature>-controller.js`
- DB methods follow the pattern `get<Entity>Classes()`, `get<Entity>Instances(class, includePatientIds)`,
  `get<Entity>InstancesForPatient(class, patientId, includePatientIds)`, `get<Entity>Summary(includePatientIds)`.

### Database Access

- **Always** use `getInstance()` from `src/db/sqlite-client.js` to get the shared singleton.
- **Always** check `this.isOpen` before running SQL and reject/throw with `'Database is not open'` if not.
- Bitmap columns can appear as either `patient_bitmap` (BLOB) or `patientbitmap` (base64 TEXT). Always handle both
  cases — see `filterRowsByPatientId()` for the canonical pattern.
- Use `patientBitmapToPatientIds()` to convert a bitmap to human-readable patient IDs. Never expose raw sequential
  IDs in API responses.
- SQLite `IN (?)` queries must be chunked (max ~900 params). Use the chunked loop pattern from
  `patientBitmapToPatientIds()` when building large `IN` clauses.

### Database Key Naming

When reading or writing the `files` key-value table, use the established key conventions:

| Data type       | Key format                            | Example                         |
|-----------------|---------------------------------------|---------------------------------|
| Patient record  | `{patientId}.json`                    | `123456789.json`                |
| Document        | `{patientId}_D_{documentId}.json`     | `123456789_D_100.json`          |
| Cancers         | `{patientId}_Cancers.json`            | `123456789_Cancers.json`        |
| Concepts        | `{patientId}_Concepts.json`           | `123456789_Concepts.json`       |

### API / Routes

- All routes are mounted under `/v1/deepphe-api/deepphe/`.
- Document query parameters and response shapes with **JSDoc `@swagger`** comments so Swagger auto-gen picks them up.
- Return `404` with `{ error: 'Not found' }` when a patient or resource does not exist.
- Return `500` with `{ error: <message> }` for unexpected server errors; never leak stack traces to the client.

### Environment Variables

| Variable          | Purpose                                  | Default                                |
|-------------------|------------------------------------------|----------------------------------------|
| `PORT`            | HTTP listen port                         | `3000`                                 |
| `DB_PATH`         | Path to the SQLite database file         | `./data/deepphe/deepphe_sqlite_compressed` |
| `TEST_PATIENT_ID` | Patient ID used in tests (keep private!) | —                                      |

Never hard-code `DB_PATH` or patient identifiers. Always read from environment or `src/config/database.js`.

---

## Testing

```bash
npm test                 # run all tests
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report
```

- Unit tests live in `test/unit/`. They must **mock** the SQLiteClient singleton — do not open a real database.
- Integration tests live in `test/integration/`. They require a valid `DB_PATH` and `TEST_PATIENT_ID` set in `.env`.
- Never commit `.env` or any file containing real patient IDs.
- Test file naming: `<module>.test.js` co-located or mirrored under `test/`.

### Mocking the DB Client

```js
jest.mock('../../src/db/sqlite-client', () => ({
    getInstance: jest.fn().mockReturnValue({
        isOpen: true,
        open: jest.fn().mockResolvedValue(),
        get: jest.fn(),
        getByPrefix: jest.fn(),
        // add other methods as needed
    }),
}));
```

---

## Adding a New Feature

1. **DB method** — add a method to `SQLiteClient` in `src/db/sqlite-client.js`.
2. **Controller** — create or update a controller in `src/controllers/`.
3. **Route** — register the route in the relevant `src/routes/` file (or create a new one and mount it in
   `src/routes/dphe-data-routes.js`).
4. **Swagger docs** — add `@swagger` JSDoc annotations to the route handler.
5. **Tests** — add unit tests under `test/unit/` and, where feasible, integration tests under `test/integration/`.

---

## Security & Data Privacy

- **Never** log full patient records or document content at `INFO` level or above.
- **Never** include `TEST_PATIENT_ID` or any real patient identifiers in committed code or test fixtures.
- The `data/` directory is in `.gitignore` — do not commit database files.
- The `.env` file is in `.gitignore` — do not commit it; use `.env.example` as a template.

---

## Common Pitfalls

| Pitfall | Resolution |
|---------|-----------|
| `Database is not open` error on startup | Ensure `client.open()` is `await`-ed before the server begins handling requests. |
| Bitmap decode fails silently | Both `patient_bitmap` (BLOB) and `patientbitmap` (TEXT/base64) columns exist in different DB versions. Always check both. |
| SQLite `SQLITE_RANGE` error on large `IN` queries | Chunk parameters at ≤ 900 per query. |
| zstd decompression fails on old rows | Wrap decompression in try/catch and fall back to raw UTF-8 text (see `getPatientSummariesByPatientIds`). |
| Sequential IDs exposed in response | Always resolve via `patientBitmapToPatientIds()` before returning data. |
| ESM/CJS mismatch | Keep all new source files as `.js` (CommonJS). Only `schema.mjs` is ESM. |

