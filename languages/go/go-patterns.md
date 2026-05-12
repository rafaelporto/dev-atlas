# Go Patterns

> Go code converges on a set of recurring patterns — some adapted from GoF, others unique to the language — that experienced Go developers recognize on sight.

---

## What is it?

Go patterns are idiomatic solutions to recurring design problems in Go codebases. They fall into two categories:

1. **GoF pattern adaptations** — classic patterns from the Gang of Four book, expressed in Go's idioms instead of class hierarchies
2. **Go-idiomatic patterns** — patterns that emerged from Go's specific features (goroutines, interfaces, multiple return values) and have no direct GoF equivalent

Understanding these patterns is what separates Go code that "looks like Java translated to Go" from code that reads naturally.

---

## Why does it matter?

Most Go codebases — including the standard library, Kubernetes, Docker, and Prometheus — share the same set of patterns. Recognizing them reduces the cognitive load of reading unfamiliar code. Applying them correctly makes your own code reviewable and maintainable by the broader Go community.

---

## GoF Pattern Adaptations

### Factory Function (`New*`)

Replaces the Factory Method pattern. A plain function named `NewXxx` returns an interface or struct pointer. No factory class, no builder lifecycle.

```go
// Convention: return an interface when the type has multiple implementations
type Store interface {
    Get(key string) (string, error)
    Set(key, value string) error
}

func NewRedisStore(addr string) Store {
    return &redisStore{client: redis.NewClient(addr)}
}

func NewMemoryStore() Store {
    return &memoryStore{data: make(map[string]string)}
}
```

**Frequency:** Universal — every non-trivial type has a `New*` function.

---

### Singleton via `sync.Once`

Guarantees a value is initialized exactly once, even under concurrent access. Go has no language-level singleton — `sync.Once` is the idiomatic replacement.

```go
var (
    instance *DB
    once     sync.Once
)

func GetDB() *DB {
    once.Do(func() {
        instance = openDB(os.Getenv("DATABASE_URL"))
    })
    return instance
}
```

**Frequency:** Common for package-level resources (DB connections, config, logger).

---

### Decorator / Middleware

HTTP middleware is the canonical Go decorator. Each handler wraps the next, adding behavior (logging, auth, rate limiting) without modifying the wrapped handler.

```go
type Middleware func(http.Handler) http.Handler

func Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}

func Auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Header.Get("Authorization") == "" {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// Compose: request passes through Auth, then Logging, then the actual handler
handler := Logging(Auth(http.HandlerFunc(myHandler)))
```

**Frequency:** Universal in HTTP servers; also common for database query wrappers, gRPC interceptors, and CLI middleware.

---

### Strategy via Interface

Pass behavior as an interface instead of switching on type or configuration values.

```go
type Sorter interface {
    Sort(data []int) []int
}

type QuickSort struct{}
func (q QuickSort) Sort(data []int) []int { /* ... */ }

type MergeSort struct{}
func (m MergeSort) Sort(data []int) []int { /* ... */ }

type Processor struct {
    sorter Sorter
}

func (p *Processor) Process(data []int) []int {
    return p.sorter.Sort(data)
}

// Swap strategy at construction time
p := &Processor{sorter: QuickSort{}}
```

**Frequency:** Common — any time behavior varies at runtime (storage backends, auth strategies, notification channels).

---

### Observer via Channels or Callbacks

Go expresses the Observer pattern either through channels (for decoupled goroutines) or through function fields on a struct.

```go
// Callback-based observer
type EventBus struct {
    subscribers map[string][]func(Event)
    mu          sync.RWMutex
}

func (b *EventBus) Subscribe(event string, fn func(Event)) {
    b.mu.Lock()
    defer b.mu.Unlock()
    b.subscribers[event] = append(b.subscribers[event], fn)
}

func (b *EventBus) Publish(e Event) {
    b.mu.RLock()
    defer b.mu.RUnlock()
    for _, fn := range b.subscribers[e.Type] {
        go fn(e) // run each subscriber concurrently
    }
}
```

**Frequency:** Common in event-driven systems and plugin architectures.

---

### Adapter via Interface Wrapping

Wrap a third-party type to satisfy a local interface, keeping the domain layer decoupled from external dependencies.

```go
// Local interface owned by the domain
type Mailer interface {
    Send(to, subject, body string) error
}

// Adapter wraps the external SDK
type sendgridMailer struct {
    client *sendgrid.Client
}

func (m *sendgridMailer) Send(to, subject, body string) error {
    msg := mail.NewSingleEmail(
        mail.NewEmail("", m.from),
        subject,
        mail.NewEmail("", to),
        body, body,
    )
    _, err := m.client.Send(msg)
    return err
}

func NewSendgridMailer(apiKey, from string) Mailer {
    return &sendgridMailer{
        client: sendgrid.NewSendClient(apiKey),
        from:   from,
    }
}
```

**Frequency:** Common at every integration boundary (databases, third-party APIs, message queues).

---

## Go-Idiomatic Patterns

### Accept Interfaces, Return Structs

The golden rule of Go API design. Function parameters should be interfaces (testable, decoupled); return values should be concrete types (full API accessible to callers, avoids premature abstraction).

```go
// Good: accepts an interface, returns a concrete type
func NewRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(ctx context.Context, id int) (*User, error) {
    // ...
}

// Bad: returns an interface, forcing callers to type-assert to use concrete methods
func NewRepository(db *sql.DB) Repository { ... }
```

**Frequency:** Universal — applies to every exported function.

---

### Error as Value with Wrapping

Propagate errors with context using `fmt.Errorf("context: %w", err)`. The chain of wrapped errors tells the story of what failed and where.

```go
func getUser(ctx context.Context, id int) (*User, error) {
    row, err := db.QueryRowContext(ctx, "SELECT * FROM users WHERE id = $1", id)
    if err != nil {
        return nil, fmt.Errorf("getUser(%d): query: %w", id, err)
    }
    // ...
}
```

See [Error Handling](error-handling.md) for the full treatment.

**Frequency:** Universal — every function that calls another fallible function.

---

### Table-Driven Tests

A slice of named test cases in a loop with `t.Run`. Adding a new case is a one-liner; the test framework handles naming and isolation automatically.

```go
tests := []struct {
    name  string
    input string
    want  int
}{
    {"empty", "", 0},
    {"single digit", "5", 5},
    {"negative", "-3", -3},
}
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        got := parse(tt.input)
        if got != tt.want {
            t.Errorf("parse(%q) = %d; want %d", tt.input, got, tt.want)
        }
    })
}
```

See [Testing](testing.md) for the full treatment.

**Frequency:** Universal in any well-tested Go codebase.

---

### Pipeline via Channels

Chain goroutines through channels where the output of one stage is the input of the next. Each stage is a goroutine, allowing stages to run concurrently.

```go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

// Usage: generate → square → print
for n := range square(generate(2, 3, 4, 5)) {
    fmt.Println(n) // 4, 9, 16, 25
}
```

**Frequency:** Common in data processing, ETL pipelines, and streaming systems.

---

### Graceful Shutdown

Listen for OS signals, trigger context cancellation, wait for in-flight work to drain.

```go
func main() {
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    srv := &http.Server{Addr: ":8080", Handler: router}

    go func() {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    <-ctx.Done()
    log.Println("shutting down...")

    shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(shutdownCtx); err != nil {
        log.Fatal("server shutdown:", err)
    }
}
```

**Frequency:** Required in every production HTTP server, worker, or daemon.

---

### Functional Options

Variadic option functions for flexible, backwards-compatible constructors.

See the dedicated [Functional Options](functional-options.md) article.

**Frequency:** Common in libraries and any type with more than two optional configuration fields.

---

## Quick Reference

| Pattern | Category | Frequency | Key mechanism |
|---|---|---|---|
| Factory Function (`New*`) | GoF: Factory | Universal | Plain function returning interface or pointer |
| Singleton via `sync.Once` | GoF: Singleton | Common | `once.Do(func() { ... })` |
| Decorator / Middleware | GoF: Decorator | Universal | `func(http.Handler) http.Handler` |
| Strategy via Interface | GoF: Strategy | Common | Interface parameter on a struct |
| Observer via Channel/Callback | GoF: Observer | Common | `chan Event` or `func(Event)` field |
| Adapter via Interface Wrap | GoF: Adapter | Common | Local interface, external type wrapped in struct |
| Accept Interfaces, Return Structs | Idiomatic | Universal | API design rule |
| Error as Value with Wrapping | Idiomatic | Universal | `fmt.Errorf("%w", err)` |
| Table-Driven Tests | Idiomatic | Universal | `[]struct{ name, input, want }` loop |
| Pipeline via Channels | Idiomatic | Common | Goroutine chain connected by channels |
| Graceful Shutdown | Idiomatic | Required | `signal.NotifyContext` + `server.Shutdown` |
| Functional Options | Idiomatic | Common | `type Option func(*T)` variadic parameter |

---

## References

- [Effective Go](https://go.dev/doc/effective_go)
- [Go Blog — Pipelines and cancellation](https://go.dev/blog/pipelines)
- [Rob Pike — Functional Options (2014)](https://commandcenter.blogspot.com/2014/01/self-referential-functions-and-design.html)
- [Go Wiki — CommonMistakes](https://go.dev/wiki/CommonMistakes)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)
- *The Go Programming Language* — Donovan & Kernighan (Addison-Wesley, 2015)
