# Docker

> Docker is a platform for building, shipping, and running applications in isolated containers that carry their own dependencies.

---

## What is it?

Docker is a tool that packages an application and everything it needs to run — libraries, runtime, configuration — into a single unit called a container. That container runs the same way on any machine that has Docker installed, regardless of the underlying operating system or environment.

A container is not a virtual machine. It shares the host OS kernel but is isolated from other processes through Linux kernel primitives. This makes containers lightweight and fast to start compared to full VMs.

## Why does it matter?

Without Docker, deploying software across different environments (a developer's laptop, a CI server, a production host) is fragile. Dependency versions differ, environment variables are missing, and system libraries conflict. The result is bugs that only appear in specific environments.

Docker eliminates this class of problems by making the environment itself part of the deliverable. The same image that passes tests in CI is the exact artifact that runs in production. This property makes Docker the foundation of modern CI/CD pipelines and a prerequisite for working with container orchestrators like Kubernetes.

## How it works

Docker uses two Linux kernel features to create containers:

- **Namespaces** isolate a container's view of the system: its own process tree, network interfaces, filesystem mounts, and hostname.
- **cgroups** (control groups) limit the CPU, memory, and I/O a container can consume.

An **image** is a read-only, layered filesystem built from a `Dockerfile`. Each instruction in the `Dockerfile` adds a new layer. Layers are cached and shared across images, which makes builds fast and storage efficient.

The **Docker daemon** (`dockerd`) is a background service on the host that manages images, containers, networks, and volumes. The **Docker CLI** (`docker`) is the command-line client that talks to the daemon via a Unix socket (`/var/run/docker.sock`).

Images are stored in and distributed from **registries**. Docker Hub is the default public registry; organizations typically run private registries as well.

```
┌─────────────────────────────────────┐
│            Docker Host              │
│  ┌──────────────────────────────┐   │
│  │         Docker Daemon        │   │
│  │  ┌──────────┐ ┌──────────┐  │   │
│  │  │Container │ │Container │  │   │
│  │  │  (App A) │ │  (App B) │  │   │
│  │  └──────────┘ └──────────┘  │   │
│  └──────────────────────────────┘   │
│              Docker CLI             │
└─────────────────────────────────────┘
       ↕ push/pull
┌──────────────────┐
│  Image Registry  │
│  (Docker Hub /   │
│   private repo)  │
└──────────────────┘
```

## Getting Started

Install Docker Desktop (macOS/Windows) or the Docker Engine (Linux):

```bash
# macOS — via Homebrew (uses Colima as the runtime, no Docker Desktop license needed)
brew install docker colima
colima start

# Linux (Ubuntu/Debian)
sudo apt-get update && sudo apt-get install -y docker.io
sudo systemctl enable --now docker
```

Verify the installation:

```bash
docker run hello-world
```

Official quickstart: [https://docs.docker.com/get-started/](https://docs.docker.com/get-started/)

## Examples

A multi-stage `Dockerfile` for a Go application. The first stage compiles the binary; the second stage copies only the binary into a minimal runtime image, keeping the final image small.

```dockerfile
# Stage 1: build
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o server ./cmd/server

# Stage 2: run
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
ENTRYPOINT ["./server"]
```

Common CLI commands:

```bash
# Build an image from the Dockerfile in the current directory and tag it
docker build -t myapp:latest .

# Run a container from the image, map host port 8080 to container port 8080
docker run -d -p 8080:8080 --name myapp myapp:latest

# List running containers
docker ps

# Open a shell inside a running container
docker exec -it myapp sh

# Tail the logs of a running container
docker logs -f myapp

# Stop and remove the container
docker stop myapp && docker rm myapp
```

## When to use

- Packaging an application so it runs identically in development, CI, and production.
- Isolating services from each other and from the host in a local development environment.
- Building CI/CD pipelines where each step runs in a fresh, reproducible container.
- Preparing workloads for deployment on Kubernetes or another container orchestrator.

## When NOT to use

- Running GUI-heavy desktop applications that require direct access to a display server or GPU without additional configuration overhead.
- Workloads that need direct, unrestricted access to kernel modules or hardware interfaces not supported through container runtimes.
- Very short-lived scripts or one-off commands where the overhead of building and managing an image outweighs the benefit of isolation.

## References

- [Docker official documentation](https://docs.docker.com)
- Poulton, Nigel. *Docker Deep Dive*. Independently published, updated annually.
