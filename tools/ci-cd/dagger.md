> Dagger is a programmable CI/CD engine that lets you write pipelines as typed functions in Go, Python, or TypeScript, and run them identically on your local machine and in any CI environment.

## What is it?

Dagger is a portable CI/CD engine that replaces YAML pipeline definitions with real code. You write a **Dagger module** — a set of functions in Go, Python, TypeScript, or PHP — using the Dagger SDK. Those functions run inside containers orchestrated by the Dagger Engine, and they execute identically whether you call them from your terminal with `dagger call` or from a GitHub Actions, GitLab CI, or Jenkins job.

## Why does it matter?

Dagger solves the most common pain point in CI/CD development: you cannot run or debug your pipeline locally. When a pipeline is a YAML file executed by a remote runner, the only way to test a change is to commit, push, and wait — often multiple times. With Dagger, the pipeline is a function you call locally, inspect with your debugger, and test in seconds. Because Dagger uses containers for every step, the execution environment is identical across local and CI runs. Pipelines written in a typed language are also composable and refactorable in ways that YAML files are not.

## How it works

The Dagger Engine exposes a **GraphQL API** that orchestrates container execution. The Dagger SDK (available for Go, Python, TypeScript, and PHP) generates typed bindings from this API so that every pipeline operation — mounting a directory, setting an environment variable, running a command — is a strongly-typed function call.

Dagger modules define functions that receive and return **Dagger types**: `Container`, `Directory`, `Secret`, `Service`, and others. These types are lazy — no execution happens until a terminal operation (like `.Stdout()`) is called, allowing Dagger to optimize and cache the execution graph.

Locally, the Dagger Engine runs as a Docker container. In CI, a setup step starts the engine and then calls the same module functions.

```
Your code (Go/Python/TypeScript)
│
└── Dagger SDK calls
    │
    └── Dagger Engine (GraphQL API)
        │
        └── Container runtime (Docker / containerd)
            ├── Step 1: golang:1.22 container — go test ./...
            └── Step 2: alpine container   — upload artifact
```

## Getting Started

Install the Dagger CLI:

```bash
# macOS
brew install dagger/tap/dagger

# Verify
dagger version
```

Initialize a new Dagger module in Go:

```bash
dagger init --sdk=go --source=./dagger my-pipeline
cd my-pipeline
dagger develop
```

Call a function from the generated module:

```bash
dagger call container-echo --string-arg="hello" stdout
```

Official quickstart: [https://docs.dagger.io/quickstart](https://docs.dagger.io/quickstart)

## Examples

A Go Dagger module that runs tests:

```go
func (m *CI) Test(ctx context.Context, source *dagger.Directory) (string, error) {
    return dag.Container().
        From("golang:1.22").
        WithDirectory("/src", source).
        WithWorkdir("/src").
        WithExec([]string{"go", "test", "./..."}).
        Stdout(ctx)
}
```

Calling the function locally:

```bash
dagger call test --source=.
```

Integrating with GitHub Actions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-for-github@v6
        with:
          verb: call
          args: test --source=.
```

A Python example that builds and pushes a Docker image:

```python
@function
async def publish(self, source: dagger.Directory, tag: str) -> str:
    return await (
        dag.container()
        .build(source)
        .publish(f"registry.example.com/myapp:{tag}")
    )
```

## When to use

- Teams that want to reproduce and debug CI failures locally without pushing to a remote runner.
- Polyglot or complex pipelines where YAML becomes difficult to maintain, test, or reuse.
- When you want a single pipeline codebase that runs across multiple CI providers (GitHub Actions, GitLab CI, Jenkins, etc.).
- When pipeline logic needs to be shared, versioned, and composed like application code.

## When NOT to use

- Simple pipelines that a 20-line YAML file handles well — the overhead of a Dagger module is not justified.
- Teams with no familiarity with Go, Python, or TypeScript who strongly prefer declarative YAML.
- Environments where local Docker access is unavailable or restricted, since the Dagger Engine requires a container runtime.
- When the organization's CI provider has deep native integrations that Dagger would bypass or complicate.

## References

- [Dagger documentation](https://docs.dagger.io)
- [Dagger GitHub repository](https://github.com/dagger/dagger)
