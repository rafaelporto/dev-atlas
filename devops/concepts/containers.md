---
type: concept
tags:
  - concept
  - devops
  - containerization
related:
  - devops/concepts/devops
  - devops/concepts/container-orchestration
  - devops/containerization/docker
  - devops/containerization/podman
  - devops/containerization/docker-compose
language: null
---
# Containers

> A way to package an application together with its dependencies so it runs identically anywhere, using lightweight isolation provided by the operating system kernel.

---

## What is it?

A container is a running process (or group of processes) that the operating system **isolates** so it behaves as if it had its own filesystem, network, and process tree — while still sharing the host's kernel. You bundle your application, its libraries, and its runtime into a **container image**, and any machine with a container runtime can start that image and get the same result.

The frequent comparison is to a virtual machine, but a container does **not** include a full guest operating system. It is much smaller and starts in milliseconds rather than seconds.

## Why does it matter?

The classic problem containers solve is *"it works on my machine."* An application that runs on a developer's laptop but fails in production usually differs in some hidden dependency — a library version, an environment variable, a system package. By packaging everything the app needs into one immutable image, a container makes the runtime environment part of the artifact. The same image runs on the laptop, in CI, in staging, and in production.

Containers also make efficient use of hardware. Because they share the host kernel, you can pack many more of them onto a machine than virtual machines, and they start fast enough to scale up and down in seconds — which is what makes [orchestration](container-orchestration.md) and elastic autoscaling practical.

## How it works

Containers are built from two long-standing Linux kernel features:

- **Namespaces** isolate *what a process can see* — its own PID space, network interfaces, mount points, hostname, and users. A process in a PID namespace sees itself as PID 1 and cannot see host processes.
- **Control groups (cgroups)** limit *what a process can use* — CPU, memory, and I/O quotas.

A **container image** is a stack of read-only **layers**. Each instruction in a build (install a package, copy a file) produces a layer; layers are cached and shared between images, so pulling a new image only downloads the layers you don't already have. At runtime the engine adds a thin writable layer on top.

```
Virtual Machines                    Containers
┌──────┐ ┌──────┐ ┌──────┐          ┌──────┐ ┌──────┐ ┌──────┐
│ App  │ │ App  │ │ App  │          │ App  │ │ App  │ │ App  │
│ Libs │ │ Libs │ │ Libs │          │ Libs │ │ Libs │ │ Libs │
│Guest │ │Guest │ │Guest │          └──────┘ └──────┘ └──────┘
│  OS  │ │  OS  │ │  OS  │          ┌──────────────────────────┐
├──────┴─┴──────┴─┴──────┤          │  Container runtime        │
│      Hypervisor         │          ├──────────────────────────┤
├─────────────────────────┤          │      Host OS kernel       │
│        Host OS          │          ├──────────────────────────┤
│        Hardware         │          │        Hardware           │
└─────────────────────────┘          └──────────────────────────┘
```

The formats and runtimes are standardized by the **Open Container Initiative (OCI)**, which is why an image built by [Docker](../containerization/docker.md) can run under [Podman](../containerization/podman.md), containerd, or CRI-O without change.

## Examples

A minimal image definition (a `Dockerfile`) — each line is a cached layer:

```dockerfile
FROM node:22-alpine          # base layer: OS + Node runtime
WORKDIR /app
COPY package*.json ./        # dependency manifest layer
RUN npm ci --omit=dev        # installed-dependencies layer
COPY . .                     # application-code layer
CMD ["node", "server.js"]    # what to run when the container starts
```

Building and running it produces the same behaviour on any host:

```bash
docker build -t my-api:1.0 .
docker run -p 8080:8080 my-api:1.0
```

Multiple containers on one host stay isolated — separate filesystems and network namespaces — yet share the single host kernel.

## When to use

- Packaging services for consistent deployment across dev, CI, and production.
- Microservices, where each service ships as its own independently deployable image.
- Reproducible build and test environments in CI pipelines.
- Workloads that need to scale up and down quickly.

## When NOT to use

- When you need **strong security isolation** between untrusted tenants — containers share a kernel, so a kernel exploit can cross the boundary; a VM (or a sandboxed runtime like gVisor/Kata) is stronger.
- For a GUI desktop application or anything tightly coupled to specific host hardware/drivers.
- When the operational overhead of images and registries outweighs the benefit for a simple, single-server app.

## References

- [Open Container Initiative (OCI)](https://opencontainers.org/)
- [Docker — What is a container?](https://www.docker.com/resources/what-container/)
- [Linux man pages — namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)
