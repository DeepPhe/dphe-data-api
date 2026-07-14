---
slug: /
title: DeepPhe Data API
sidebar_label: Welcome
description: Run, package, and integrate with the DeepPhe Data API.
---

# DeepPhe Data API

The DeepPhe Data API is an Express service that exposes patient documents, patient summaries, cancer and concept data, OMOP demographic rows, and cohort filter counts from a SQLite database.

Most consumers use it in one of three ways:

1. Start the API locally and browse Swagger UI at `http://localhost:3333/docs`.
2. Query patient and group endpoints directly from a client application.
3. Package the service as a standalone executable and point it at a DeepPhe SQLite database.

## Start here

New setup? Begin with [Installation](getting-started/installation.md), then [Run the API](getting-started/running-the-api.md).

Building a client? Review [Patient data](guides/patient-data.md), [Cohort filtering](guides/cohort-filtering.md), and the generated [OpenAPI reference](reference/openapi.md).

:::caution Clinical interpretation

DeepPhe data may include structured values and natural-language-processing output. Confirm important findings against source records and your organization's review process. An absent value is not a confirmed negative clinical finding.

:::
