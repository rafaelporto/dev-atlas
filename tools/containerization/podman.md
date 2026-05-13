# Podman

> Podman is a daemonless, rootless container engine that is API-compatible with Docker and runs OCI containers without requiring a privileged background service.

---

## What is it?

Podman is a container engine developed by Red Hat that can build and run OCI-compliant containers. Its defining characteristics are that it requires no background daemon and can run containers as a regular (non-root) user.

For most day-to-day operations, Podman is a drop-in replacement for Docker: the command-line interface is intentionally compatible, and it reads the same image format. The key architectural difference is in how containers are launched.

## Why does it matter?

Docker's architecture requires a privileged daemon (`dockerd`) running as root on the host. Any user who can talk to that daemon socket effectively has root access to the host, which is a significant security concern in shared or restricted environments.

Podman addresses this by removing the daemon entirely. Containers run as child processes of the user who starts them, inheriting only that user's permissions. This makes Podman a better fit for:

- Shared servers and HPC environments where running a root service is not permitted.
- Security-conscious CI pipelines that restrict privilege escalation.
- Systems running RHEL or Fedora, where Podman ships as the default container tooling.

Podman also understands the concept of a **pod** (a group of containers sharing a network namespace), matching Kubernetes semantics, which makes it easier to test Kubernetes workloads locally.

## How it works

Docker routes every CLI call through a central daemon that manages all containers. Podman eliminates this middleman: each `podman` invocation forks the container process directly from the calling user's shell.

```
Docker model:
CLI → dockerd (root daemon) → container

Podman model:
CLI → container (forked directly, no daemon)
```

Because there is no daemon, there is no single socket to connect to. Each container is an independent process owned by the user who ran the command. Resource cleanup, networking, and storage are handled by lower-level libraries (containers/storage, containers/image, netavark) rather than a monolithic service.

Podman uses the same OCI image format as Docker, so images built with `docker build` are fully compatible. `podman-compose` provides Compose file support. `podman generate kube` converts running containers or pods into Kubernetes YAML manifests.

## Getting Started

Install Podman:

```bash
# macOS
brew install podman

# Initialize and start the Podman machine (Linux VM on macOS)
podman machine init
podman machine start
```

Verify the installation:

```bash
podman run hello-world
```

Official quickstart: [https://podman.io/get-started](https://podman.io/get-started)

## Examples

Most `docker` commands work without modification by substituting `podman`:

```bash
# Pull and run an image rootlessly
podman run -d -p 8080:8080 --name myapp myapp:latest

# Build an image from a Dockerfile
podman build -t myapp:latest .

# List running containers
podman ps
```

Working with pods (a Kubernetes-aligned concept):

```bash
# Create a pod that shares a network namespace between two containers
podman pod create --name mypod -p 8080:8080

podman run -d --pod mypod --name app myapp:latest
podman run -d --pod mypod --name sidecar mysidecar:latest

# Generate a Kubernetes Pod manifest from the running pod
podman generate kube mypod > mypod.yaml
```

## When to use

- Environments where running a root daemon is not allowed, such as restricted CI systems or shared Linux servers.
- When you need Kubernetes-compatible pod semantics locally and want to validate pod manifests before deploying to a cluster.
- RHEL, CentOS Stream, or Fedora systems where Podman is the default and Docker is not installed.
- Security-sensitive workflows where rootless container execution is a hard requirement.

## When NOT to use

- When your workflow depends on Docker Desktop's graphical interface or its extension ecosystem.
- When your toolchain explicitly requires the Docker socket at `/var/run/docker.sock` and cannot be reconfigured (e.g. some older CI agents or Docker-in-Docker setups).
- When team members are unfamiliar with Podman's differences around rootless networking and the added configuration it sometimes requires.

## References

- [Podman official documentation](https://docs.podman.io)
- [Red Hat: Podman vs Docker](https://www.redhat.com/en/topics/containers/what-is-podman)
