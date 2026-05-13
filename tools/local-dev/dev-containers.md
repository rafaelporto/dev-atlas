# Dev Containers

> A specification and tooling that lets you define a complete, reproducible development environment inside a Docker container using a single config file.

---

## What is it?

A Dev Container is a Docker container configured to serve as a full development environment. The setup is driven by a `.devcontainer/devcontainer.json` file committed to the repository, which specifies the base image or Dockerfile to build from, the tools and runtimes to install, the editor extensions to activate, and any post-create scripts to run.

The specification was originally created by Microsoft for VS Code but has since been formalised as an open standard at [containers.dev](https://containers.dev). It is supported by VS Code, GitHub Codespaces, and JetBrains IDEs.

## Why does it matter?

"Works on my machine" is a problem most teams solve for the application — via Docker Compose or Kubernetes — but not for the development environment itself. Dev Containers extend that same reproducibility to the toolchain: the compiler version, the CLI tools, the linter configuration, and even the editor extensions.

Any developer who clones the repository and opens it in a Dev Container gets an environment that is bit-for-bit identical to every other contributor's. There is no manual setup guide to follow, no version mismatch to debug, and no difference between the CI environment and the local one.

This also makes onboarding significantly faster: a new team member can be productive within minutes rather than spending a day installing and configuring tools.

## How it works

When a repository is opened in VS Code with the Dev Containers extension installed, the editor reads `.devcontainer/devcontainer.json`. It then starts (or builds) a Docker container according to that configuration, mounts the project directory into the container at `/workspace`, installs a VS Code Server process inside the container, and reconnects the editor UI to that server. All terminal sessions, language servers, debuggers, and extensions run inside the container. The host machine only provides the editor shell and the Docker engine.

```
Host machine
├── VS Code (editor UI)
└── Docker
    └── Dev Container
        ├── Runtime (Go, Node, Python…)
        ├── CLI tools (git, make, curl…)
        ├── VS Code Server + extensions
        └── /workspace (your repo, mounted)
```

The container is ephemeral by default — stopping it does not lose code because the source files live on the host and are only mounted in. Persistent data (databases, caches) that must survive container restarts should be stored in a named Docker volume.

## Getting Started

Install the prerequisites:

```bash
# 1. VS Code — https://code.visualstudio.com
# 2. Dev Containers extension
code --install-extension ms-vscode-remote.remote-containers

# 3. A container runtime (Docker or Colima)
brew install docker colima && colima start
```

Add a Dev Container config to any project:

```bash
mkdir -p .devcontainer
cat > .devcontainer/devcontainer.json << 'EOF'
{
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {}
}
EOF
```

Open VS Code, run **Dev Containers: Reopen in Container** from the Command Palette (`Cmd+Shift+P`).

Official quickstart: [https://code.visualstudio.com/docs/devcontainers/tutorial](https://code.visualstudio.com/docs/devcontainers/tutorial)

## Examples

**Minimal `devcontainer.json` using a pre-built image:**

```json
{
  "name": "My Project",
  "image": "mcr.microsoft.com/devcontainers/go:1.22",
  "extensions": [
    "golang.go",
    "streetsidesoftware.code-spell-checker"
  ],
  "postCreateCommand": "go mod download"
}
```

**`devcontainer.json` referencing a local `Dockerfile`** — useful when the pre-built images do not include a required tool:

```json
{
  "name": "My Project",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "extensions": [
    "golang.go",
    "ms-azuretools.vscode-docker"
  ],
  "postCreateCommand": "make setup"
}
```

Key `devcontainer.json` properties:

| Property | Purpose |
|---|---|
| `image` | Pre-built image to use as the container base |
| `build` | Path to a local `Dockerfile` (and optional build context) |
| `features` | Pre-packaged tool bundles (e.g. Docker-in-Docker, AWS CLI) |
| `extensions` | VS Code extension IDs to install inside the container |
| `postCreateCommand` | Shell command to run once after the container is first created |

## When to use

- Onboarding new developers onto a project with a non-trivial environment setup (multiple runtimes, specific CLI versions, local certificates).
- Teams with contributors on macOS, Windows, and Linux who need a consistent, OS-agnostic environment.
- Projects where the CI environment should match the local environment exactly.
- When you want to version-control the development environment alongside the application code.

## When NOT to use

- Very simple projects where the only prerequisite is a single well-known runtime version — a `.tool-versions` or `.nvmrc` file is sufficient overhead.
- Teams where no contributor uses VS Code or GitHub Codespaces and has no plan to adopt an alternative runtime that supports the spec.
- Workflows with heavy file I/O on macOS where the Docker filesystem layer introduces unacceptable latency (e.g. large monorepos with thousands of small files, intensive test runs that read/write many files per second).

## References

- [Dev Containers specification](https://containers.dev)
- [VS Code Dev Containers documentation](https://code.visualstudio.com/docs/devcontainers/containers)
