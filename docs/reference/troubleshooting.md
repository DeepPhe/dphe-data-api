---
title: Troubleshooting
description: Common DeepPhe Data API setup and runtime fixes.
---

# Troubleshooting

## The server cannot find the database

Check that `DB_PATH` points to an existing SQLite file:

```bash
DB_PATH=/absolute/path/to/deepphe.sqlite3 npm start
```

For packaged binaries, pass `--db` explicitly:

```bash
dphe-data-api --db /absolute/path/to/deepphe.sqlite3
```

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
