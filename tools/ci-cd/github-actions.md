> GitHub Actions is GitHub's built-in CI/CD and automation platform that runs event-driven workflows defined as YAML files directly inside a repository.

## What is it?

GitHub Actions is a continuous integration and delivery platform built into GitHub. Workflows are YAML files stored in `.github/workflows/` that respond to GitHub events — such as a push, a pull request, or a schedule — and run jobs on GitHub-hosted or self-hosted runners.

## Why does it matter?

There is no external CI infrastructure to set up or maintain for teams already on GitHub. The platform integrates directly with pull requests, issue tracking, and deployment environments. A large marketplace of reusable **actions** covers common tasks (checkout, language setup, Docker build, cloud deployments) so teams rarely need to write custom scripts from scratch. For open-source projects, GitHub-hosted runners are free.

## How it works

A **workflow** file defines one or more **jobs**. Each job runs on a **runner** — a virtual machine with Ubuntu, macOS, or Windows. Jobs contain **steps**: each step either runs a shell command or calls a reusable **action** published on the marketplace or defined locally.

Workflows are triggered by **events** declared in the `on:` block. GitHub injects secrets and environment variables at runtime; they are never exposed in logs. Jobs run in parallel by default; a `needs:` key creates explicit ordering when jobs depend on each other.

```
Workflow file (.github/workflows/ci.yml)
│
├── on: [push, pull_request]
│
└── jobs
    ├── test        (runs independently)
    └── deploy      (needs: test)
```

## Getting Started

No installation needed — GitHub Actions is available on every GitHub repository.

Create a workflow file:

```bash
mkdir -p .github/workflows
```

Add `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Hello from GitHub Actions"
```

Push to GitHub and open the **Actions** tab in your repository to see the run.

Official quickstart: [https://docs.github.com/en/actions/writing-workflows/quickstart](https://docs.github.com/en/actions/writing-workflows/quickstart)

## Examples

A minimal Go CI workflow:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - run: go test ./...
```

A workflow with a dependent deploy job:

```yaml
name: CI + Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - run: go test ./...

  deploy:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

## When to use

- Projects hosted on GitHub that want CI/CD without managing runners.
- Teams that want to reuse community-built actions from the marketplace.
- Open-source projects that benefit from free GitHub-hosted runner minutes.
- When tight integration with pull request checks, environments, and deployment protection rules is needed.

## When NOT to use

- Very complex pipelines requiring deep customization that YAML becomes unmanageable for — Dagger or Jenkins may be better fits.
- Regulated environments where source code cannot leave the organization's own infrastructure.
- Teams fully committed to GitLab, where running pipelines cross-platform introduces unnecessary mirroring friction.
- When the primary need is local pipeline execution — Act fills that role on top of GitHub Actions, but native alternatives exist.

## References

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
