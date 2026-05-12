# Go Project Setup

> How to initialise a Go module, structure a project, and add the first dependencies.

---

## Prerequisites

- Go installed (`go version` prints a result)
- Basic familiarity with the terminal

---

## Steps

### 1. Initialise a module

Every Go project starts with a module. A module is a collection of packages with a shared `go.mod` file at its root.

```bash
mkdir myapp && cd myapp
go mod init github.com/yourname/myapp
```

The module path (`github.com/yourname/myapp`) is how other code imports your packages. It does not need to match an actual repository URL for local development, but it should if you intend to publish.

The result is a `go.mod` file:

```
module github.com/yourname/myapp

go 1.22
```

---

### 2. Understand the recommended directory layout

Go has no enforced project structure, but the community has converged on a layout that scales well:

```
myapp/
├── go.mod
├── go.sum
├── main.go               # entry point for simple, single-binary projects
├── cmd/
│   └── myapp/
│       └── main.go       # entry point when the project has multiple binaries
├── internal/
│   ├── server/
│   │   └── server.go     # packages that must NOT be imported by external modules
│   └── store/
│       └── store.go
├── pkg/
│   └── middleware/
│       └── middleware.go  # packages intended to be importable by external modules
└── config/
    └── config.go
```

Key rules:
- **`cmd/`** — one subdirectory per binary. Each has its own `main` package.
- **`internal/`** — Go enforces that packages here cannot be imported from outside the module. Use it for implementation details you do not want to expose.
- **`pkg/`** — optional; only create it if you genuinely want to share packages. Many projects omit it entirely.
- Keep `main.go` at the root only for single-binary, small projects.

---

### 3. Write the entry point

```go
// cmd/myapp/main.go
package main

import "fmt"

func main() {
    fmt.Println("hello")
}
```

Run it without compiling:

```bash
go run ./cmd/myapp
```

---

### 4. Add a dependency

```bash
go get github.com/some/package@v1.2.3   # specific version
go get github.com/some/package@latest   # latest release
```

Go updates `go.mod` and `go.sum` automatically. Commit both files — `go.sum` contains cryptographic checksums that ensure reproducible builds.

Remove unused dependencies and tidy version constraints:

```bash
go mod tidy
```

---

### 5. Use internal packages

Packages inside `internal/` are only importable from within the same module. This is enforced by the compiler, not by convention.

```go
// internal/greeter/greeter.go
package greeter

func Hello(name string) string {
    return "Hello, " + name
}
```

```go
// cmd/myapp/main.go
package main

import (
    "fmt"
    "github.com/yourname/myapp/internal/greeter"
)

func main() {
    fmt.Println(greeter.Hello("world"))
}
```

An attempt to import `github.com/yourname/myapp/internal/greeter` from a different module will fail at compile time.

---

## Verification

```bash
go build ./...      # compiles everything — exits 0 if no errors
go test ./...       # runs all tests
go vet ./...        # static analysis — should print nothing
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `go: go.mod file not found` | Running `go` commands outside the module root | `cd` to the directory containing `go.mod` |
| `package X is not in std` | Wrong import path or missing `go get` | Run `go get <import-path>` |
| `use of internal package not allowed` | Importing `internal/` from outside the module | Move the package to `pkg/` or restructure the calling code |
| `go.sum` out of sync | Dependencies changed without running tidy | Run `go mod tidy` |
| Two binaries need different `main` | Single `main.go` at root | Move each entry point to `cmd/<name>/main.go` |

---

## References

- [How to Write Go Code — go.dev](https://go.dev/doc/code)
- [Go Modules Reference — go.dev](https://go.dev/ref/mod)
- [Standard Go Project Layout — GitHub](https://github.com/golang-standards/project-layout)
- [Organizing a Go module — go.dev](https://go.dev/doc/modules/gomod-ref)
