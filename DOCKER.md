# Docker

This project runs as a single Docker Compose service named `dphe-data-api`.

## Files

- `Dockerfile` builds the Node.js API image.
- `docker-compose.yml` defines the Compose service and port mapping.
- `.env` sets local Compose overrides such as `API_DATABASE_URL` and `PORT`.
- `docker-compose.env` is an optional tracked env file you can pass with `--env-file`.

## Database URL Rules

The API reads PostgreSQL through `DATABASE_URL`. Docker Compose uses `API_DATABASE_URL` and passes it into the container as `DATABASE_URL`:

```bash
API_DATABASE_URL=postgresql://dphe:dphe@host.docker.internal:55432/dphe
PORT=3333
```

Use `host.docker.internal` when the Postgres server is running on the host machine. The Compose file includes a Linux `host-gateway` mapping for that name.

Avoid passing a host-local `DATABASE_URL=postgresql://...@localhost:55432/...` directly into the container. Inside the container, `localhost` means the API container itself.

## Start Compose

```bash
docker compose up --build
```

Open:

```bash
http://localhost:3333/docs
```

Health check:

```bash
curl http://localhost:3333/health
```

Run in the background:

```bash
docker compose up --build -d
```

View logs:

```bash
docker compose logs -f dphe-data-api
```

Stop the service:

```bash
docker compose down
```

## Start With A Different Env File

Create another env file, for example `docker-compose.local-db.env`:

```bash
API_DATABASE_URL=postgresql://dphe:dphe@host.docker.internal:55432/dphe
PORT=3333
```

Files matching `docker-compose.*.env` are ignored by git, except for the tracked example `docker-compose.env`.

Start Compose with that env file:

```bash
docker compose --env-file ./docker-compose.local-db.env up --build
```

## Tests

Start the disposable Postgres test database:

```bash
npm run test:db
npm test
npm run test:db:down
```

The seeder refuses to reset a database unless its name ends with `_test`.

## Ports

The Docker container listens on port `3333` by default. To expose it on a different Docker port, set `PORT` in `.env` or before running Compose:

```bash
PORT=4444 docker compose up --build
```

Then open:

```bash
http://localhost:4444/docs
```

## Database

By default the container uses the local Postgres on the Mac (`host.docker.internal:55432`, database `dphe`). No extra setup is needed. To use a different database, set `API_DATABASE_URL` in an env file and start Compose with it, as in "Start With A Different Env File" above.

## Verify The Compose Configuration

Show the resolved Compose configuration:

```bash
docker compose config
```

For a quiet validation check:

```bash
docker compose config --quiet
```
