---
title: Run the API
description: Start the DeepPhe Data API in development, production, Docker, or debug mode.
---

# Run the API

## Development mode

```bash
npm run dev
```

Development mode uses `nodemon` so changes restart the server.

## Production mode

```bash
npm start
```

By default the server listens on `http://localhost:3333`.

## Debug mode

```bash
npm run start:debug
```

The Node.js inspector listens on port `9229`.

## Docker Compose

```bash
docker compose up --build
```

The Docker image includes the local test fixture at `/app/test/resources/deepphe.sqlite3`. Set `DB_PATH` in `.env` before starting the container.

## Verify the server

Open the live API documentation:

```text
http://localhost:3333/docs
```

Or fetch the OpenAPI JSON:

```text
http://localhost:3333/openapi.json
```
