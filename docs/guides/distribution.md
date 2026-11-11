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

Pass the PostgreSQL database URL with `--database-url`:

```bash
./dist/dphe-data-api-macos-arm64 --database-url postgresql://dphe:dphe@localhost:55432/dphe
```

Or use `DATABASE_URL`:

```bash
DATABASE_URL=postgresql://dphe:dphe@localhost:55432/dphe PORT=3333 ./dist/dphe-data-api-linux-x64
```

The database is not bundled into the executable.

## Release assets

Pushes to `main` run the release workflow, which first runs the PostgreSQL-backed tests, then builds platform executables, runs smoke checks, signs and notarizes macOS artifacts, creates SHA-256 checksums, and publishes release assets to `DeepPhe/DeepPhe-Dist`.
