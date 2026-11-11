---
title: Installation
description: Install dependencies and configure the DeepPhe Data API.
---

# Installation

## Prerequisites

- Node.js 24 or newer
- npm
- A DeepPhe PostgreSQL database, normally produced by `dphe-db-pipeline`

The API uses pure JavaScript, WASM, and Node built-in dependencies, so it does not require a native build toolchain.

## Install dependencies

```bash
git clone https://github.com/DeepPhe/dphe-data-api.git
cd dphe-data-api
npm install
```

## Configure environment

Copy the example environment file and edit it for your database:

```bash
cp .env.example .env
```

Typical local values:

```bash
PORT=3333
DATABASE_URL=postgresql://dphe:dphe@localhost:55432/dphe
```

The source default matches the local pipeline Compose database. Packaged binaries require `DATABASE_URL` or `--database-url`.

:::warning Pipeline rebuilds

The pipeline can drop and recreate schemas during a full rebuild. Do not serve API traffic from a database while the pipeline is rebuilding it; use a maintenance window or a blue/green database swap.

:::
