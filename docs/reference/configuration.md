---
title: Configuration
description: DeepPhe Data API environment variables and PostgreSQL behavior.
---

# Configuration

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3333` | HTTP server port. |
| `DATABASE_URL` | `postgresql://dphe:dphe@localhost:55432/dphe` | PostgreSQL connection URL for local/source runs. |
| `API_DATABASE_URL` | `postgresql://dphe:dphe@host.docker.internal:55432/dphe` | Compose-facing PostgreSQL URL passed into the container as `DATABASE_URL`. |
| `TEST_DATABASE_URL` | `postgresql://dphe:dphe@localhost:55435/dphe_api_test` | PostgreSQL URL used by tests. |
| `TEST_PATIENT_ID` | `fake_patient1` | Patient ID used by tests and local examples. |

## Database URL precedence

At startup, the server resolves the database URL in this order:

1. `--database-url <url>`, `--database-url=<url>`, or `-d <url>`
2. `DATABASE_URL`
3. The source default in `src/config/database.js`

Packaged binaries require an explicit database URL with `--database-url` or `DATABASE_URL`.

## PostgreSQL tables

The API expects these tables in the `deepphe` schema:

| Table | Purpose |
| --- | --- |
| `files` | Raw, zstd, or LZ4-compressed DeepPhe JSON payloads keyed by filename. |
| `patient_id_mapping` | External patient IDs mapped to sequential bitmap IDs. |
| `attributes_by_group` | Attribute group bitmap rows. |
| `cancers_by_group` | Cancer class bitmap rows. |
| `concepts_by_group` | Concept group bitmap rows. |
| `patient_summaries` | zstd-compressed summary JSON payloads. |

DeepPhe lookup summary bitmap tables are optional. Missing summary tables return empty OMOP endpoint instance arrays; official OHDSI OMOP CDM tables are managed separately in the pipeline database's `omop` schema.
