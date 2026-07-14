---
title: Patient Data
description: Fetch patient documents, cancers, and concepts from the DeepPhe Data API.
---

# Patient data

Patient endpoints are rooted under `/v1/deepphe-api/deepphe/patient/{patientId}`.

## Patient documents

Fetch documents for a patient, with `text` excluded by default:

```bash
curl http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789
```

Fetch the full document endpoint:

```bash
curl http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/documents
```

Filter documents by ID:

```bash
curl "http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/documents?documentIds=123456789_D_100,123456789_D_101"
```

Exclude large or noisy fields when a client does not need them:

```bash
curl "http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/documents?excludeProperties=text,mentions,mentionRelations"
```

## Patient cancer and concept files

Fetch raw parsed patient cancer data:

```bash
curl http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/cancers
```

Fetch raw parsed patient concept data:

```bash
curl http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/concepts
```

## Episode counts

Fetch normalized episode counts for a patient's documents:

```bash
curl http://localhost:3333/v1/deepphe-api/deepphe/patient/123456789/documents/episodes
```
