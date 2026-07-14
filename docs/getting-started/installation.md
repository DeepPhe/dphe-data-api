---
title: Installation
description: Install dependencies and configure the DeepPhe Data API.
---

# Installation

## Prerequisites

- Node.js 24 or newer
- npm
- A DeepPhe SQLite database

The API uses built-in Node.js SQLite support plus pure JavaScript and WASM dependencies, so it does not require a native build toolchain.

## Install dependencies

```bash
git clone https://github.com/DeepPhe/dphe-data-webservice.git
cd dphe-data-webservice
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
DB_PATH=./test/resources/deepphe.sqlite3
TEST_PATIENT_ID=fake_patient1
```

`DB_PATH` can point to an absolute path or a path relative to the current working directory.
