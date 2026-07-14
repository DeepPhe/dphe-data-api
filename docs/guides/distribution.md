---
title: Distribution
description: Build standalone DeepPhe Data API executables.
---

# Distribution

The API can be packaged into standalone executables with `@yao-pkg/pkg`.

## Build executables

```bash
npm run build
```

The build regenerates the OpenAPI spec and writes platform binaries to `dist/`.

## Run a packaged binary

Pass the SQLite database path with `--db`:

```bash
./dist/dphe-data-api-macos-arm64 --db /path/to/deepphe.sqlite3
```

Or use `DB_PATH`:

```bash
DB_PATH=/path/to/deepphe.sqlite3 PORT=3333 ./dist/dphe-data-api-linux-x64
```

The database is not bundled into the executable.

## Release assets

Pushes to `main` run the release workflow, which builds platform executables, signs and notarizes macOS artifacts, creates SHA-256 checksums, and publishes release assets to `DeepPhe/DeepPhe-Dist`.
