# Docker Compose

> Docker Compose lets you define and run a multi-container application from a single YAML file, replacing long chains of `docker run` commands with one command that brings an entire stack up.

---

## What is it?

Docker Compose is a tool for defining and running applications that consist of multiple Docker containers. You describe every service, network, and volume your application needs in a single `compose.yml` file (also accepted as `docker-compose.yml`). A single command starts, stops, or rebuilds the whole stack.

The current version, Compose v2, ships as a plugin built into the Docker CLI and is invoked as `docker compose` (without a hyphen). It supersedes the older standalone `docker-compose` v1 binary.

## Why does it matter?

Running a realistic application locally usually means running several processes: the application server, a relational database, a cache, perhaps a message broker. Without Compose, each service requires its own `docker run` command with its own flags for ports, volumes, environment variables, and network settings. Those commands must be run in the right order, and sharing the setup with a teammate means sharing a script that is easy to get out of sync.

Compose solves this by making the entire environment declarative and version-controlled. A new team member clones the repository and runs `docker compose up` to get a fully working environment in seconds. The same file drives local development and integration test runs, ensuring everyone tests against the same dependencies.

## How it works

When you run `docker compose up`, Compose reads the `compose.yml` file and:

1. Creates an isolated Docker network shared by all services in the file. Services reach each other by their service name as a DNS hostname.
2. Builds or pulls images as needed.
3. Starts containers in an order that respects `depends_on` declarations.
4. Mounts named volumes and bind mounts.
5. Streams aggregated logs to the terminal (or runs in detached mode with `-d`).

Each service maps to one container (by default). Networks and volumes defined at the top level persist across `up`/`down` cycles unless explicitly removed.

A typical `compose.yml` layout:

```yaml
services:
  app:
    build: .
    ports: ["8080:8080"]
    depends_on: [db, cache]
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes: [pgdata:/var/lib/postgresql/data]
  cache:
    image: redis:7-alpine
volumes:
  pgdata:
```

## Getting Started

Docker Compose v2 ships with Docker. Verify it is available:

```bash
docker compose version
```

Create a minimal `compose.yml` in an empty directory:

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
```

Bring it up:

```bash
docker compose up -d
# open http://localhost:8080
docker compose down
```

Official quickstart: [https://docs.docker.com/compose/gettingstarted/](https://docs.docker.com/compose/gettingstarted/)

## Examples

A full `compose.yml` for a web application with a Postgres database and a Redis cache:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: appdb
      REDIS_URL: redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d appdb"]
      interval: 5s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

Key commands:

```bash
# Start all services in detached mode
docker compose up -d

# Stop and remove containers, networks (volumes are preserved)
docker compose down

# Stop and remove containers, networks, AND volumes
docker compose down -v

# Tail logs from all services
docker compose logs -f

# Tail logs from a single service
docker compose logs -f app

# Run a one-off command inside the app service container
docker compose exec app sh

# Rebuild images without using the cache and restart services
docker compose build --no-cache && docker compose up -d
```

## When to use

- Local development environments where the application depends on external services like databases, caches, or message brokers.
- Running integration tests against real dependency instances rather than mocks, ensuring test fidelity.
- Spinning up reproducible demo or staging environments that can be started and torn down quickly.
- Sharing a consistent development environment across a team through a version-controlled `compose.yml`.

## When NOT to use

- Production deployments at scale: Compose provides no scheduling, autoscaling, self-healing, or rolling update capabilities. Use Kubernetes or a managed container platform instead.
- Single-container applications: if you have only one service, a plain `docker run` command or a simple shell script is simpler and has less overhead.
- Workloads that need to span multiple physical hosts: Compose manages containers on a single Docker host. For multi-host deployments, Docker Swarm or Kubernetes are the appropriate tools.

## References

- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Compose file reference](https://docs.docker.com/reference/compose-file/)
