> Act is a command-line tool that runs GitHub Actions workflows locally using Docker, giving you immediate feedback without pushing to GitHub.

## What is it?

Act is an open-source CLI tool that reads `.github/workflows/*.yml` files and executes them on your local machine inside Docker containers. It emulates the GitHub Actions runner environment, allowing you to test and debug workflow changes locally before committing them to the repository.

## Why does it matter?

The standard GitHub Actions development loop is slow: write a change, commit, push, wait for a runner to start, read the logs. Act collapses that loop to a single local command. Workflow syntax errors, misconfigured environment variables, and failing steps are caught immediately without consuming runner minutes or polluting the commit history with "fix CI" commits. For teams that invest heavily in GitHub Actions, Act is the equivalent of a local test runner for the CI layer.

## How it works

Act parses the GitHub Actions workflow YAML, resolves the event being simulated (e.g. `push`, `pull_request`), and maps each job to a Docker container using a runner image that approximates the GitHub-hosted runner environment.

Secrets can be supplied through a `.secrets` file (same format as a `.env` file). Environment variables and inputs can also be passed on the command line. The default runner image is a slimmed-down version of `ubuntu-latest` that covers most common actions; a full-size image is available for broader compatibility.

```
.github/workflows/ci.yml
│
└── act (CLI)
    │
    ├── resolves event: push
    ├── reads job: test
    └── runs job in Docker container
        ├── step: actions/checkout@v4
        ├── step: actions/setup-go@v5
        └── step: go test ./...
```

## Getting Started

Install Act:

```bash
# macOS
brew install act

# Verify
act --version
```

Run Act from the root of a repository that has GitHub Actions workflows:

```bash
# List all available jobs
act --list

# Run the default push event (uses Docker for runner containers)
act
```

On the first run, Act prompts you to choose a runner image size (Micro is the fastest for simple workflows).

Official quickstart: [https://nektosact.com/introduction.html](https://nektosact.com/introduction.html)

## Examples

Key commands:

```bash
# List all workflows and their jobs
act --list

# Run the default push event
act

# Run a specific event
act pull_request

# Run a specific job
act -j test

# Pass secrets from a file
act --secret-file .secrets

# Use the full GitHub runner image (larger download, broader compatibility)
act -P ubuntu-latest=catthehacker/ubuntu:full-latest

# Dry run — show what would execute without running it
act --dryrun

# Run with verbose output for debugging
act -v
```

A minimal `.secrets` file for local runs:

```
DEPLOY_TOKEN=my-local-test-token
DATABASE_URL=postgres://localhost:5432/testdb
```

Running Act in a project with multiple workflows:

```bash
# Target a specific workflow file
act -W .github/workflows/ci.yml

# Target a specific event defined in a workflow
act workflow_dispatch
```

## When to use

- Iterating on GitHub Actions workflow files — especially when adding new jobs, steps, or actions.
- Debugging CI failures that are hard to reproduce without pushing: Act lets you inspect container state, try fixes, and re-run instantly.
- Validating new or updated actions before they touch the main branch.
- Reducing runner minute consumption during active CI development.

## When NOT to use

- As a replacement for real CI: Act's runner images differ from GitHub's hosted runners in meaningful ways, and some actions rely on GitHub infrastructure that is not available locally (OIDC tokens, deployment environments, GitHub App tokens).
- For production pipeline execution: Act is a development and debugging tool, not a runtime.
- Workflows that depend on GitHub-specific context not reproducible locally — for example, workflows triggered by GitHub App webhooks or that call the GitHub API with installation tokens.
- On machines without Docker: Act requires a container runtime to function.

## References

- [Act GitHub repository](https://github.com/nektos/act)
- [Act documentation](https://nektosact.com)
