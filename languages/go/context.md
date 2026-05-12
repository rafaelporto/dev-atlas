# Context in Go

> The `context` package provides a standard way to carry deadlines, cancellation signals, and request-scoped values across API boundaries and goroutines.

---

## What is it?

`context.Context` is an interface that represents the lifecycle of an operation. It carries three things:

1. **Cancellation signal** — a channel that closes when the operation should stop
2. **Deadline or timeout** — a point in time after which the operation expires
3. **Values** — key-value pairs scoped to a request, such as trace IDs or auth tokens

Contexts form a tree: a parent context can be cancelled, and all derived child contexts are automatically cancelled as well.

---

## Why does it matter?

Without context, a goroutine handling an HTTP request has no standard way to know that the client disconnected, the timeout elapsed, or the caller no longer needs the result. The `context` package solves this uniformly across the standard library and third-party packages — HTTP clients, database drivers, gRPC calls, and cloud SDKs all accept a `context.Context`.

Proper context propagation is the difference between a server that wastes CPU on abandoned requests and one that stops work as soon as it is no longer needed.

---

## How it works

### The Context interface

```go
type Context interface {
    Deadline() (deadline time.Time, ok bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
```

- `Done()` returns a channel that closes when the context is cancelled or its deadline passes
- `Err()` returns `context.Canceled` or `context.DeadlineExceeded` after `Done()` closes
- `Value(key)` retrieves a value associated with the context

---

### Root contexts

All context trees start from one of two root contexts:

```go
ctx := context.Background() // always non-nil, never cancelled — use at top level
ctx := context.TODO()       // placeholder when context should be added later
```

Never pass `nil` as a context. Pass `context.Background()` or `context.TODO()` if a real context is not yet available.

---

### Derived contexts

```go
// Cancellable context
ctx, cancel := context.WithCancel(parent)
defer cancel() // always defer cancel to release resources

// Context with timeout
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel()

// Context with explicit deadline
deadline := time.Now().Add(10 * time.Second)
ctx, cancel := context.WithDeadline(parent, deadline)
defer cancel()

// Context with a value
ctx = context.WithValue(parent, traceIDKey{}, "abc-123")
```

Always `defer cancel()` immediately after `WithCancel`, `WithTimeout`, or `WithDeadline`. Forgetting to cancel leaks the goroutine that monitors the parent for cancellation.

---

### Checking cancellation

```go
func doWork(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err() // context.Canceled or context.DeadlineExceeded
        default:
            // do a unit of work
            if err := step(ctx); err != nil {
                return err
            }
        }
    }
}
```

For blocking calls, pass the context down and let the called function handle it:

```go
func fetchData(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err // includes context cancellation errors
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

---

### Context values

Use `context.WithValue` for request-scoped data that crosses API boundaries but should not appear in every function signature: trace IDs, auth principals, request IDs.

```go
// Define a private key type to avoid collisions
type contextKey string

const traceIDKey contextKey = "trace_id"

func WithTraceID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, traceIDKey, id)
}

func TraceIDFrom(ctx context.Context) (string, bool) {
    id, ok := ctx.Value(traceIDKey).(string)
    return id, ok
}
```

**Use unexported key types** to prevent collisions between packages. Do not use built-in types (`string`, `int`) as context keys.

---

### Propagation in HTTP handlers

```go
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context() // already has cancellation tied to the connection

    result, err := fetchData(ctx, "https://api.example.com/data")
    if err != nil {
        if errors.Is(err, context.Canceled) {
            // client disconnected — no need to write a response
            return
        }
        http.Error(w, "upstream error", http.StatusBadGateway)
        return
    }

    w.Write(result)
}
```

---

### Flow diagram

```
context.Background()
       │
       ▼
context.WithTimeout(5s)   ← parent
       │
       ├── WithValue(traceID)   ← child: inherits timeout
       │        │
       │        └── passed to db.QueryContext(ctx, ...)
       │
       └── WithCancel()         ← another child: inherits timeout
                │
                └── passed to http.NewRequestWithContext(ctx, ...)
```

When the 5-second timeout fires, all derived contexts are cancelled simultaneously.

---

## When to use

- Pass a `context.Context` as the **first parameter** to any function that does I/O, calls another service, or runs for an indeterminate time
- Use `WithTimeout` for outbound HTTP and database calls
- Use `WithCancel` when you need to cancel a group of goroutines from a single point
- Use `WithValue` for request-scoped metadata (trace IDs, auth info) that must cross package boundaries
- In HTTP handlers, always derive from `r.Context()` to respect client disconnects

## When NOT to use

- Do not store contexts in structs — pass them explicitly as function parameters
- Do not use `context.WithValue` for optional function parameters or for passing business logic — only for cross-cutting concerns
- Do not use `context.TODO()` in production code and forget to replace it
- Do not ignore `ctx.Done()` in long-running loops — the operation will outlive its intended lifetime
- Do not pass a cancelled context to a new operation and expect it to proceed

---

## References

- [Go Blog — Contexts and structs](https://go.dev/blog/context-and-structs)
- [Go Blog — Go Concurrency Patterns: Context](https://go.dev/blog/context)
- [pkg.go.dev — context package](https://pkg.go.dev/context)
- [Go Specification — Context](https://pkg.go.dev/context#pkg-overview)
- *The Go Programming Language* — Donovan & Kernighan, Chapter 8
