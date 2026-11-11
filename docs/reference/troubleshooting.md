---
title: Troubleshooting
description: Common DeepPhe Data API setup and runtime fixes.
---

# Troubleshooting

## The server cannot connect to PostgreSQL

Check that `DATABASE_URL` points at a reachable DeepPhe database:

```bash
DATABASE_URL=postgresql://dphe:dphe@localhost:55432/dphe npm start
```

For packaged binaries, pass `--database-url` explicitly:

```bash
dphe-data-api --database-url postgresql://dphe:dphe@localhost:55432/dphe
```

Inside Docker Compose, use `API_DATABASE_URL` with `host.docker.internal` when Postgres is running on the host:

```bash
API_DATABASE_URL=postgresql://dphe:dphe@host.docker.internal:55432/dphe docker compose up --build
```

## Startup reports missing tables

Run the DeepPhe database pipeline first, or point `DATABASE_URL` at the database that already contains the `deepphe` schema. The API requires `files`, `patient_id_mapping`, grouped bitmap tables, and `patient_summaries`.

## Tests cannot connect

Start the disposable test database before running tests locally:

```bash
npm run test:db
npm test
```

The test seeder refuses to reset a database unless its name ends with `_test`.

## Swagger UI is stale

Regenerate the OpenAPI spec:

```bash
npm run build:spec
```

The live server serves `/openapi.json` from the same Swagger definition used by `/docs`.

## GitHub Pages docs do not update

The Pages workflow only runs when docs, route annotations, OpenAPI support files, or the workflow itself changes. You can also run `Deploy docs to Pages` manually from GitHub Actions.

## The docs build fails locally

Install root and docs dependencies first:

```bash
npm install
npm run docs:install
```

Then build the site:

```bash
npm run docs:build
```
