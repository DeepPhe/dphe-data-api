---
title: Configuration
description: DeepPhe Data API environment variables and database path behavior.
---

# Configuration

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3333` | HTTP server port. |
| `DB_PATH` | `./test/resources/deepphe.sqlite3` | SQLite database path. |
| `TEST_PATIENT_ID` | none | Patient ID used by tests and local examples. |

## Database path precedence

At startup, the server resolves the database path in this order:

1. `--db <path>`, `--db=<path>`, or `-d <path>`
2. `DB_PATH`
3. The default in `src/config/database.js`

Packaged binaries require an explicit database path with `--db` or `DB_PATH`.

## SQLite file store

The database uses a key-value style `files` table:

| Column | Purpose |
| --- | --- |
| `filename` | Document or patient key. |
| `content` | JSON payload, either raw or compressed. |
| `encoding` | Payload encoding, such as `raw` or `zstd`. |

Common key shapes include `{patientId}`, `{patientId}_D_{documentId}.json`, `{patientId}_Cancers.json`, and `{patientId}_Concepts.json`.
