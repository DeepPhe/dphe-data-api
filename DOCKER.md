# Docker

This project runs as a single Docker Compose service named `dphe-data-api`.

## Files

- `Dockerfile` builds the Node.js API image.
- `docker-compose.yml` defines the Compose service, port mapping, and local data mount.
- `.env` sets local Compose overrides such as `DB_PATH` and `PORT`.
- `docker-compose.env` is an optional tracked env file you can pass with `--env-file`.

## Database Path Rules

Compose mounts:

- `./data` into the container at `/app/data`.
- `../dphe-db-pipeline` into the container at `/dphe-db-pipeline`.

Because the API runs inside the container, `DB_PATH` must be a container path, not a macOS/Linux host path. These are both valid for the default mount:

```bash
DB_PATH=./data/deepphe/deepphe_sqlite_compressed
DB_PATH=/app/data/deepphe/deepphe_sqlite_compressed
```

This sibling-repository path also works because Compose mounts `../dphe-db-pipeline` at `/dphe-db-pipeline`, and the app resolves relative paths from `/app`:

```bash
DB_PATH=../dphe-db-pipeline/deepphe_test.sqlite3
```

The SQLite client opens the database read/write, so the mounted directory must be writable.

## `.env` Overrides Defaults

Compose automatically reads `.env` and uses those values to fill `docker-compose.yml`. Values in `.env` override the Docker defaults in Compose.

For your sibling pipeline database, put this in `.env`:

```bash
DB_PATH=../dphe-db-pipeline/deepphe_test.sqlite3
PORT=3333
```

Then build and start:

```bash
docker compose up --build
```

Open:

```bash
http://localhost:3333/docs
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
DB_PATH=/app/data/deepphe/my_local_database
PORT=3333
```

Files matching `docker-compose.*.env` are ignored by git, except for the tracked example `docker-compose.env`.

Start Compose with that env file:

```bash
docker compose --env-file ./docker-compose.local-db.env up --build
```

Using `--env-file` replaces Compose's automatic `.env` file for that run. If you want `.env` to win, put the final values in `.env` or pass them directly before the command.

## Start With DB_PATH On The Command Line Instead Of `.env`

For `docker compose up`, prefix the command with env vars:

```bash
DB_PATH=../dphe-db-pipeline/deepphe_test.sqlite3 PORT=3333 docker compose up --build
```

`docker compose up` does not support a per-service `-e DB_PATH=...` flag. If you specifically want `-e`, use `docker compose run` with `--service-ports`:

```bash
docker compose build
docker compose run --rm --service-ports \
  -e DB_PATH=../dphe-db-pipeline/deepphe_test.sqlite3 \
  dphe-data-api
```

If a normal Compose container is already running, stop it first so port `3333` is free:

```bash
docker compose down
```

## Use A Database Outside This Repository

The default Compose file mounts `./data` and `../dphe-db-pipeline`. If your database lives somewhere else, mount its directory when using `docker compose run`:

```bash
docker compose build
docker compose run --rm --service-ports \
  -v /absolute/host/db-dir:/app/data:rw \
  -e DB_PATH=/app/data/deepphe_sqlite_compressed \
  dphe-data-api
```

Replace `/absolute/host/db-dir` with the host directory that contains the SQLite database file.

## Ports

The Docker container listens on port `3333` by default. To expose it on a different Docker port, set `PORT` in `.env` or before running Compose:

```bash
PORT=4444 docker compose up --build
```

Then open:

```bash
http://localhost:4444/docs
```

## Verify The Compose Configuration

Show the resolved Compose configuration:

```bash
docker compose config
```

For a quiet validation check:

```bash
docker compose config --quiet
```
