# Error Handling in Go

> In Go, errors are values returned from functions — not exceptions thrown and caught — making error handling explicit, local, and composable.

---

## What is it?

Go's error handling model treats errors as ordinary values of type `error`, a built-in interface with a single method: `Error() string`. Functions that can fail return an `error` as their last return value. The caller checks it immediately, handles it, or propagates it up the call stack.

There are no `try`/`catch`/`finally` blocks. Panics exist but are reserved for unrecoverable programmer errors, not expected failures.

---

## Why does it matter?

The choice to make errors values rather than exceptions has significant implications:

- **Errors are part of the function signature** — callers cannot ignore them without an explicit decision (`_`)
- **Error handling is local** — each function handles or annotates errors at the call site, not in a distant catch block
- **Control flow is explicit** — no invisible unwinding of the stack
- **Errors compose** — they can be wrapped, inspected, and transformed as they travel up the call stack

The common criticism is verbosity: `if err != nil` appears frequently. The Go team's position is that this visibility is a feature, not a bug.

---

## How it works

### The error interface

```go
type error interface {
    Error() string
}
```

Any type with an `Error() string` method satisfies `error`. The standard library provides `errors.New` and `fmt.Errorf` for creating error values.

```go
import "errors"

var ErrNotFound = errors.New("not found")

func findUser(id int) (*User, error) {
    if id <= 0 {
        return nil, errors.New("invalid id")
    }
    // ...
    return nil, ErrNotFound
}
```

---

### Checking errors

The idiomatic pattern is to check immediately after a call:

```go
user, err := findUser(42)
if err != nil {
    return nil, err  // propagate
}
// use user safely here
```

`err != nil` is the only check needed for most cases. Comparing to a specific error value (sentinel) or inspecting its type is done with `errors.Is` and `errors.As`.

---

### Sentinel errors

A sentinel error is a package-level variable that callers can compare against to identify a specific failure condition.

```go
// Define in the package that owns the error
var (
    ErrNotFound   = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
)

// Check at the call site
user, err := repo.FindUser(id)
if errors.Is(err, ErrNotFound) {
    http.NotFound(w, r)
    return
}
if err != nil {
    http.Error(w, "internal error", http.StatusInternalServerError)
    return
}
```

Use `errors.Is` instead of `==` because `errors.Is` traverses the error chain (see wrapping below).

---

### Wrapping errors with context

When propagating errors, add context with `fmt.Errorf` and the `%w` verb. This wraps the original error so callers can still inspect the root cause.

```go
func getUser(id int) (*User, error) {
    user, err := db.QueryUser(id)
    if err != nil {
        return nil, fmt.Errorf("getUser(%d): %w", id, err)
    }
    return user, nil
}
```

The resulting error message becomes:
```
getUser(42): not found
```

This builds a readable call chain automatically.

---

### errors.Is and errors.As

`errors.Is` checks whether any error in the chain matches a target value or type.

```go
err := getUser(42)
if errors.Is(err, ErrNotFound) {
    // true even if err is a wrapped ErrNotFound
}
```

`errors.As` extracts a specific error type from the chain:

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}

// At the call site
var ve *ValidationError
if errors.As(err, &ve) {
    fmt.Printf("Field %s failed: %s\n", ve.Field, ve.Message)
}
```

---

### Custom error types

Define a struct implementing `error` when you need to carry structured data alongside the error message.

```go
type HTTPError struct {
    StatusCode int
    Message    string
}

func (e *HTTPError) Error() string {
    return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Message)
}

func fetch(url string) error {
    resp, err := http.Get(url)
    if err != nil {
        return fmt.Errorf("fetch: %w", err)
    }
    if resp.StatusCode >= 400 {
        return &HTTPError{StatusCode: resp.StatusCode, Message: resp.Status}
    }
    return nil
}
```

---

### panic and recover

`panic` stops normal execution and unwinds the stack. It is reserved for:
- Unrecoverable programmer errors (nil dereference, index out of bounds)
- Initialization failures in `init()` or `main()`
- Situations where continuing would corrupt data

`recover` catches a panic inside a deferred function. Libraries sometimes use this internally but should never let panics escape to callers.

```go
func safeDiv(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("recovered: %v", r)
        }
    }()
    return a / b, nil
}
```

**Do not use panic/recover as a substitute for error handling in normal application code.**

---

## When to use

- Return `error` as the last value from any function that can fail
- Use `fmt.Errorf("context: %w", err)` to add context when propagating errors across package boundaries
- Define sentinel errors (`var ErrXxx = errors.New(...)`) for conditions callers must distinguish
- Define custom error types when callers need structured data beyond a message string
- Use `errors.Is` to match sentinel errors, `errors.As` to extract typed errors

## When NOT to use

- Do not use `panic` for expected failures — return an `error` instead
- Do not swallow errors with `_ = someFunc()` unless you have a documented reason
- Do not create sentinel errors for every possible failure — only for conditions callers act on differently
- Do not wrap errors more than once with the same context — it creates redundant messages
- Do not check `err.Error() == "some string"` — use sentinel errors or `errors.Is` instead

---

## References

- [Go Blog — Error handling and Go](https://go.dev/blog/error-handling-and-go)
- [Go Blog — Errors are values](https://go.dev/blog/errors-are-values)
- [Go Blog — Working with Errors in Go 1.13](https://go.dev/blog/go1.13-errors)
- [Go Specification — Errors](https://go.dev/ref/spec#Errors)
- [pkg.go.dev — errors package](https://pkg.go.dev/errors)
- *The Go Programming Language* — Donovan & Kernighan, Chapter 5.4
