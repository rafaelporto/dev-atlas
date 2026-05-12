# Go Toolchain

> A practical guide to the tools that ship with Go — building, testing, formatting, and profiling without third-party dependencies.

---

## Prerequisites

- Go installed (`go version` prints the installed version)
- A Go module initialized (`go.mod` present in the project root)
- Basic familiarity with the terminal

---

## Steps

### 1. Build a binary

`go build` compiles the packages named by the import paths. With no arguments it builds the package in the current directory.

```bash
go build ./...                      # build all packages (check for compile errors)
go build -o bin/myapp ./cmd/myapp   # build a specific main package to a named binary
GOOS=linux GOARCH=amd64 go build -o bin/myapp-linux ./cmd/myapp  # cross-compile
```

The result is a **static binary** with no external runtime dependencies.

---

### 2. Run tests

`go test` compiles and runs test functions in `*_test.go` files.

```bash
go test ./...                    # run all tests in the module
go test -v ./...                 # verbose: print each test name and result
go test -run TestAdd ./math/     # run tests matching a pattern in a specific package
go test -count=1 ./...           # disable test result caching
go test -timeout 60s ./...       # set a per-package timeout
```

Run tests with the **race detector** to catch data races:

```bash
go test -race ./...
```

Always run `-race` in CI. The overhead is acceptable in a test environment.

---

### 3. Format code

`gofmt` formats Go source files according to the canonical Go style. There is no configuration — all Go code looks the same.

```bash
gofmt -w .                       # format all .go files in the current tree
gofmt -d .                       # show diff without writing files
```

`goimports` (a superset of `gofmt`) also adds missing and removes unused imports:

```bash
go install golang.org/x/tools/cmd/goimports@latest
goimports -w .
```

Most editors run `gofmt` or `goimports` on save. Do not submit unformatted code.

---

### 4. Vet — static analysis

`go vet` reports likely mistakes that the compiler does not catch: mismatched `Printf` format strings, unreachable code, incorrect mutex usage, etc.

```bash
go vet ./...
```

Run `go vet` in CI before tests. It is fast and catches real bugs.

---

### 5. Lint — extended static analysis

`golangci-lint` aggregates dozens of linters into one tool and is the community standard.

```bash
# Install
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run with default linters
golangci-lint run ./...

# Run with a config file (.golangci.yml)
golangci-lint run --config .golangci.yml ./...
```

A minimal `.golangci.yml`:

```yaml
linters:
  enable:
    - errcheck      # check that errors are not silently ignored
    - gosimple      # suggest code simplifications
    - staticcheck   # comprehensive static analysis
    - unused        # find unused code
    - govet         # shadow and other checks beyond go vet
```

---

### 6. Manage dependencies

```bash
go mod tidy                         # add missing, remove unused dependencies
go get github.com/some/pkg@v1.2.3  # add or upgrade a dependency
go get github.com/some/pkg@latest  # upgrade to latest version
go mod download                     # download all dependencies to the local cache
go mod verify                       # verify checksums against go.sum
go list -m all                      # list all dependencies
```

---

### 7. Generate code

`go generate` runs commands embedded in source comments. Commonly used to regenerate mocks, protobuf code, or embedded assets.

```go
//go:generate mockgen -source=store.go -destination=mock_store.go -package=mock
//go:generate protoc --go_out=. --go-grpc_out=. api.proto
```

Run all generators in the module:

```bash
go generate ./...
```

`go generate` does **not** run automatically on `go build` or `go test` — it must be run explicitly.

---

### 8. Detect data races

The race detector instruments memory accesses at runtime and reports when two goroutines access the same variable concurrently without synchronization.

```bash
go test -race ./...          # in tests
go run -race main.go         # in a running program
go build -race -o bin/myapp  # in a deployed binary (for staging environments)
```

The race detector adds ~5–10× CPU overhead and 5–10× memory overhead. Use it in tests and staging, not in production.

---

### 9. Profile with pprof

`pprof` profiles CPU usage, memory allocations, goroutines, and more. Enable the HTTP endpoint in your server:

```go
import _ "net/http/pprof" // registers handlers on /debug/pprof/

func main() {
    go http.ListenAndServe("localhost:6060", nil)
    // ...
}
```

Capture and analyze profiles:

```bash
# CPU profile for 30 seconds
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Heap profile
go tool pprof http://localhost:6060/debug/pprof/heap

# Goroutine dump
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Visualize in the browser (requires graphviz)
go tool pprof -http=:8081 cpu.prof
```

Inside the `pprof` interactive shell:
```
(pprof) top10       # top 10 functions by CPU
(pprof) list Func   # annotated source for a function
(pprof) web         # open flame graph in browser
```

---

## Verification

Confirm the core tools work correctly:

```bash
go version                  # prints: go version go1.22.x ...
go build ./...              # exits 0 if everything compiles
go test -race ./...         # exits 0 if all tests pass, no races detected
go vet ./...                # exits 0 if no issues found
gofmt -l .                  # prints files that are not correctly formatted (empty = all clean)
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `go: module not found` | Running outside a module | Run `go mod init <module-path>` |
| `go: updates to go.sum needed; to update it: go mod tidy` | `go.sum` out of sync | Run `go mod tidy` |
| `cannot find package` | Import path typo or missing `go get` | Run `go get <import-path>` |
| Test results cached when they should re-run | Go caches test results by default | Run with `-count=1` to disable caching |
| Race condition not detected | Test does not exercise the concurrent path | Add `t.Parallel()` and stress-test with `-count=100` |
| `pprof` profile shows no output | Profiling endpoint not registered | Import `_ "net/http/pprof"` and ensure the HTTP server is running |
| `golangci-lint` hangs on large codebase | Default timeout is too short | Pass `--timeout=5m` |

---

## References

- [Go Command Reference](https://pkg.go.dev/cmd/go)
- [Go Blog — Using the Go Race Detector](https://go.dev/blog/race-detector)
- [Go Blog — Profiling Go Programs](https://go.dev/blog/pprof)
- [golangci-lint documentation](https://golangci-lint.run)
- [pkg.go.dev — net/http/pprof](https://pkg.go.dev/net/http/pprof)
- [Go Modules Reference](https://go.dev/ref/mod)
