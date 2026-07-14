---
title: Cohort Filtering
description: Count patients matching DeepPhe filter criteria.
---

# Cohort filtering

The filter API counts patients matching a set of independent criteria. Use it when a client needs to build cohorts without downloading all patient records.

## Count matching patients

```bash
curl -X POST "http://localhost:3333/v1/deepphe-api/deepphe/filter/count" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      {
        "type": "omop",
        "class": "RACE",
        "instances": ["White", "Black"]
      },
      {
        "type": "attributes",
        "class": "Behavior",
        "instances": ["Benign", "Invasive"]
      }
    ]
  }'
```

Within a single filter item, `instances` are combined with OR. Across filter items, results are combined with AND.

## Include patient IDs

Set `includePatientIds=true` to include matching patient identifiers:

```bash
curl -X POST "http://localhost:3333/v1/deepphe-api/deepphe/filter/count?includePatientIds=true" \
  -H "Content-Type: application/json" \
  -d '{"filters":[{"type":"omop","class":"GENDER","instances":["Female"]}]}'
```

The API may also include patient IDs automatically when the match count is below `autoIncludeThreshold`.

## Batch independent counts

Use `/filter/count/batch` to collapse many independent count requests into one round trip:

```bash
curl -X POST "http://localhost:3333/v1/deepphe-api/deepphe/filter/count/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      {"filters":[{"type":"omop","class":"RACE","instances":["White"]}]},
      {"filters":[{"type":"omop","class":"RACE","instances":["Black"]}]}
    ]
  }'
```
