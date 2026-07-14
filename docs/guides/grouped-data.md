---
title: Grouped Data
description: Discover DeepPhe attributes, cancers, concepts, and OMOP classes.
---

# Grouped data

Grouped endpoints let clients discover available classes, fetch instances for a class, and optionally include patient identifiers.

## Attributes

```bash
curl http://localhost:3333/v1/deepphe-api/deepphe/attributes/classes
curl "http://localhost:3333/v1/deepphe-api/deepphe/attributes/instances?groupname=Genes"
curl "http://localhost:3333/v1/deepphe-api/deepphe/attributes/summary?includePatientIds=false"
```

## Cancers

```bash
curl http://localhost:3333/v1/deepphe-api/deepphe/cancers/classes
curl "http://localhost:3333/v1/deepphe-api/deepphe/cancers/instances?classUri=Breast_Cancer"
curl "http://localhost:3333/v1/deepphe-api/deepphe/cancers/summary?includePatientIds=false"
```

## Concepts

```bash
curl http://localhost:3333/v1/deepphe-api/deepphe/concepts/classes
curl "http://localhost:3333/v1/deepphe-api/deepphe/concepts/instances?dpheGroup=Biomarkers"
curl "http://localhost:3333/v1/deepphe-api/deepphe/concepts/summary?includePatientIds=false"
```

## OMOP

```bash
curl http://localhost:3333/v1/deepphe-api/omop/classes
curl "http://localhost:3333/v1/deepphe-api/omop/instances?attribute=RACE"
curl "http://localhost:3333/v1/deepphe-api/omop/summary?includePatientIds=false"
```

Use the `/instances/patients` variants when a client needs patient identifier arrays with each instance row.
