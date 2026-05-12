# Packages and Modules in Go

> Go organizes code into packages for encapsulation and modules for versioned dependency management — the two systems work together to define what code exists and who can use it.

---

## What is it?

**Packages** are the unit of code organization in Go. Every `.go` file belongs to a package, declared with `package <name>` at the top. Packages enforce encapsulation: identifiers starting with uppercase are exported (public); lowercase identifiers are unexported (private to the package).

**Modules** are the unit of versioning and distribution. A module is a tree of Go packages with a `go.mod` file at its root. Modules replaced the older `GOPATH` workflow in Go 1.11 and became the default in Go 1.16.

---

## Why does it matter?

The package system is what makes Go programs readable at scale: you always know where a symbol comes from (the import path), what its visibility is (uppercase/lowercase), and who owns it (the package). The module system solves reproducible builds by pinning exact versions in `go.mod` and cryptographic checksums in `go.sum`.

---

## How it works

### Package basics

```go
// File: math/calculator.go
package math

// Exported — visible to other packages
func Add(a, b int) int {
    return a + b
}

// Unexported — visible only within the math package
func clamp(v, min, max int) int {
    if v < min {
        return min
    }
    if v > max {
        return max
    }
    return v
}
```

Importing and using a package:

```go
package main

import (
    "fmt"
    "myapp/math"     // local package
    "github.com/pkg/errors" // third-party
)

func main() {
    fmt.Println(math.Add(2, 3))
}
```

The import path is the **module path** + directory path. The last element of the import path is the package name by convention.

---

### go.mod

`go.mod` declares the module and its dependencies:

```
module github.com/example/myapp

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/pkg/errors v0.9.1
)
```

Key fields:
- `module` — the module's canonical import path
- `go` — the minimum Go version
- `require` — direct dependencies with pinned versions
- `replace` — redirect a module to a local path or fork
- `exclude` — prevent a specific version from being used

---

### go.sum

`go.sum` contains the cryptographic checksums of every dependency version. It is committed to version control. The Go toolchain verifies checksums on every build, preventing supply chain attacks from a silently modified module.

```
github.com/gin-gonic/gin v1.9.1 h1:4idEAncQnU5cB7BeOkPtxjfCSye0AAm1R0RVIqJ+Jmg=
github.com/gin-gonic/gin v1.9.1/go.mod h1:hPrL7YRdiu2afkpHzgpBSPFgb8fKXFg7or76bHQGfgQ=
```

---

### Common go mod commands

```bash
go mod init github.com/example/myapp   # initialize a new module
go mod tidy                             # add missing, remove unused dependencies
go mod download                         # download all dependencies to the local cache
go mod verify                           # verify checksums against go.sum
go get github.com/some/pkg@v1.2.3      # add or upgrade a dependency
go get github.com/some/pkg@latest      # upgrade to latest version
```

---

### Package naming conventions

| Convention | Example | Reason |
|---|---|---|
| Short, lowercase, no underscores | `http`, `json`, `sync` | Easy to type; matches directory name |
| Singular | `user` not `users` | Callers write `user.New()`, not `users.New()` |
| Avoid generic names | avoid `util`, `common`, `helpers` | These become catch-all packages with unclear ownership |
| Name after what it provides | `auth`, `storage`, `invoice` | The import path context makes it clear |

Avoid stutter: if the package is `http`, the type should be `Handler`, not `HttpHandler` — callers already write `http.Handler`.

---

### The internal/ directory

Placing packages under an `internal/` directory restricts their import to the parent module:

```
myapp/
├── go.mod
├── main.go
├── internal/
│   ├── config/    ← only importable by code inside myapp/
│   └── db/        ← only importable by code inside myapp/
└── api/
    └── handler.go
```

`myapp/internal/config` can be imported by `myapp/api`, `myapp/main.go`, etc., but **not** by any module outside `myapp`. Use `internal/` to enforce boundaries without making packages private.

---

### Workspace mode (go.work)

Go workspaces (Go 1.18+) allow working across multiple modules simultaneously without `replace` directives:

```bash
go work init ./myapp ./mylib
```

This creates `go.work`:
```
go 1.22

use (
    ./myapp
    ./mylib
)
```

Changes to `mylib` are immediately visible to `myapp` without publishing. Commit `go.work.sum` but typically `.gitignore` the `go.work` file in libraries — keep it only for local development.

---

### Package initialization

`init()` functions run automatically when a package is imported, after all variable initializations:

```go
var db *sql.DB

func init() {
    var err error
    db, err = sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatalf("init db: %v", err)
    }
}
```

A package can have multiple `init()` functions across multiple files. They run in the order files are presented to the compiler (alphabetical by filename). Use `init()` sparingly — prefer explicit initialization in `main()` or constructors.

---

## When to use

- Split packages along **domain boundaries**, not technical layers — `invoice/` not `models/`
- Use `internal/` to expose shared code within a module without making it a public API
- Use workspaces when actively developing two or more interdependent modules at the same time
- Run `go mod tidy` before every commit to keep `go.mod` and `go.sum` clean

## When NOT to use

- Do not create packages named `util`, `common`, or `helpers` — they accumulate unrelated code with no clear ownership
- Do not import internal packages from other modules — the compiler will reject it
- Do not commit `go.work` to shared repositories unless all contributors work with the same local layout
- Do not use `init()` for logic that should be explicit — it runs invisibly and makes initialization order hard to trace
- Do not ignore `go.sum` in version control — it is your supply chain protection

---

## References

- [Go Modules Reference](https://go.dev/ref/mod)
- [Go Blog — Using Go Modules](https://go.dev/blog/using-go-modules)
- [Go Blog — Go Workspaces](https://go.dev/blog/get-familiar-with-workspaces)
- [Effective Go — Package names](https://go.dev/doc/effective_go#package-names)
- [Go Wiki — Package names](https://go.dev/wiki/PackageNames)
- [pkg.go.dev — go command](https://pkg.go.dev/cmd/go)
