# Testing in Go

> Go ships a complete testing framework in its standard library — no third-party test runner required — with a strong convention of table-driven tests that makes cases easy to add and maintain.

---

## What is it?

Go's `testing` package provides the primitives for writing and running tests, benchmarks, and fuzz tests. The `go test` command discovers and runs them automatically. Test files end in `_test.go`, live alongside the code they test, and are excluded from production builds.

---

## Why does it matter?

Testing in Go has a low barrier: no test framework to configure, no lifecycle annotations, no reflection magic. A test is a plain function. This simplicity encourages high test coverage and makes tests readable to anyone who knows Go. The table-driven pattern, nearly universal in the standard library, makes it easy to add edge cases without duplicating test scaffolding.

---

## How it works

### Test functions

A test function must start with `Test`, accept `*testing.T`, and live in a `_test.go` file:

```go
// File: math/add_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    if result != 5 {
        t.Errorf("Add(2, 3) = %d; want 5", result)
    }
}
```

Run with:
```bash
go test ./...           # run all tests in the module
go test ./math/...      # run tests in a specific package
go test -v ./...        # verbose output
go test -run TestAdd    # run tests matching a pattern
```

---

### Table-driven tests

The dominant Go testing pattern: define a slice of test cases as a struct, then loop over them.

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positive", 2, 3, 5},
        {"negative", -1, -2, -3},
        {"zero", 0, 0, 0},
        {"mixed", -5, 5, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.want {
                t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

Each `t.Run` call creates a **subtest** with its own pass/fail status. Run a specific subtest:
```bash
go test -run TestAdd/negative
```

---

### t.Helper()

Mark helper functions with `t.Helper()` so failure messages point to the call site, not inside the helper:

```go
func assertEqual(t *testing.T, got, want int) {
    t.Helper()
    if got != want {
        t.Errorf("got %d; want %d", got, want)
    }
}
```

---

### Testing HTTP handlers

The `net/http/httptest` package provides a test HTTP server and response recorder:

```go
func TestHealthHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/health", nil)
    w := httptest.NewRecorder()

    HealthHandler(w, req)

    resp := w.Result()
    if resp.StatusCode != http.StatusOK {
        t.Errorf("status = %d; want %d", resp.StatusCode, http.StatusOK)
    }
}
```

---

### Benchmarks

Benchmark functions start with `Benchmark` and accept `*testing.B`. The loop runs `b.N` times, adjusted automatically for stable timing:

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}
```

Run benchmarks:
```bash
go test -bench=. ./...
go test -bench=BenchmarkAdd -benchmem ./math/  # include memory allocations
```

---

### Fuzz testing (Go 1.18+)

Fuzz tests generate random inputs to find unexpected failures. They start with `Fuzz` and call `f.Add` to seed the corpus:

```go
func FuzzAdd(f *testing.F) {
    f.Add(2, 3)
    f.Add(-1, 100)

    f.Fuzz(func(t *testing.T, a, b int) {
        result := Add(a, b)
        if result != a+b {
            t.Errorf("Add(%d, %d) = %d; want %d", a, b, result, a+b)
        }
    })
}
```

Run fuzz tests:
```bash
go test -fuzz=FuzzAdd -fuzztime=30s ./math/
```

Found failing inputs are saved in `testdata/fuzz/` and replayed on every subsequent `go test` run.

---

### testify — common assertions library

The standard library has no assertion helpers. `github.com/stretchr/testify` fills this gap without replacing `go test`:

```go
import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestUser(t *testing.T) {
    user, err := NewUser(1, "Alice")

    require.NoError(t, err)         // stops the test on failure
    assert.Equal(t, "Alice", user.Name) // continues on failure
    assert.NotNil(t, user)
}
```

`require` stops the test immediately on failure; `assert` records the failure but continues.

---

### Test package naming

```go
// White-box test — same package, can access unexported identifiers
package math

// Black-box test — external package, tests only the public API
package math_test
```

Prefer `package math_test` for integration-style tests of the public API. Use `package math` only when testing unexported internals.

---

## When to use

- Write table-driven tests for any function with multiple input variations
- Use `t.Run` subtests to give each case a name for clear failure output
- Use `httptest` to test HTTP handlers without starting a real server
- Run benchmarks when optimizing hot paths — measure before and after
- Fuzz test any function that parses external input (strings, bytes, network data)
- Use `testify/require` for setup steps where a failure makes the rest of the test meaningless

## When NOT to use

- Do not write one test function per input case — use table-driven tests instead
- Do not test unexported functions directly unless the internal logic is genuinely complex and cannot be covered through the public API
- Do not use mocks when a real implementation is fast and deterministic — real implementations catch more bugs
- Do not write benchmarks for code that is never in the hot path — benchmark what actually matters
- Do not rely on test execution order — `go test` may run tests in parallel (`t.Parallel()`)

---

## References

- [pkg.go.dev — testing package](https://pkg.go.dev/testing)
- [Go Blog — Table-driven tests](https://go.dev/wiki/TableDrivenTests)
- [Go Blog — Fuzzing is Beta Ready](https://go.dev/blog/fuzz-beta)
- [pkg.go.dev — net/http/httptest](https://pkg.go.dev/net/http/httptest)
- [testify on GitHub](https://github.com/stretchr/testify)
- [Effective Go — Testing](https://go.dev/doc/code#Testing)
