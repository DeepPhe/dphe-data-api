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

Set `API_DATABASE_URL` in `.env` so Postgres resolves from inside the container:

```bash
API_DATABASE_URL=postgresql://dphe:dphe@host.docker.internal:55432/dphe
PORT=3333
```

Then start the API:

```bash
docker compose up --build
```

## Verify the server

Open the live API documentation:

```text
http://localhost:3333/docs
```

Or check health:

```text
http://localhost:3333/health
```
