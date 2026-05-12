# Functional Options

> Functional Options is a Go pattern for building flexible, extensible constructors without breaking API compatibility or requiring large configuration structs.

---

## What is it?

Functional Options is a pattern popularized by Rob Pike in 2014. Instead of passing a configuration struct or a growing list of parameters to a constructor, you pass a variadic list of **option functions** — each one applies a single configuration change to an internal options struct.

The result is a constructor that accepts any combination of options, is readable at the call site, and can add new options without breaking existing callers.

---

## Why does it matter?

Go functions have no default parameter values and no keyword arguments. When a type needs many optional configuration fields, the naive solutions all have problems:

| Approach | Problem |
|---|---|
| Many parameters | `NewServer(host, port, timeout, maxConn, tlsCert, ...)` — unreadable, unextensible |
| Config struct | Adding a field changes the struct; callers using struct literals break |
| Builder | Requires a separate builder type and a terminal `Build()` call |
| Functional Options | Adding new options is backwards-compatible; call sites are self-documenting |

---

## How it works

```go
// The type being configured
type Server struct {
    host    string
    port    int
    timeout time.Duration
    maxConn int
    tls     bool
}

// An option is a function that mutates the server
type Option func(*Server)

// Each exported option is a function returning an Option
func WithHost(host string) Option {
    return func(s *Server) {
        s.host = host
    }
}

func WithPort(port int) Option {
    return func(s *Server) {
        s.port = port
    }
}

func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

func WithTLS() Option {
    return func(s *Server) {
        s.tls = true
    }
}

// Constructor applies defaults, then each option in order
func NewServer(opts ...Option) *Server {
    s := &Server{
        host:    "localhost",
        port:    8080,
        timeout: 30 * time.Second,
        maxConn: 100,
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

**Call site** — readable, any subset of options is valid:

```go
s1 := NewServer()                                    // all defaults
s2 := NewServer(WithPort(9090), WithTLS())           // port + TLS
s3 := NewServer(
    WithHost("0.0.0.0"),
    WithPort(443),
    WithTimeout(10*time.Second),
    WithTLS(),
)
```

---

### Validation inside options

Options can validate their input before applying it:

```go
func WithPort(port int) Option {
    return func(s *Server) {
        if port < 1 || port > 65535 {
            panic(fmt.Sprintf("invalid port: %d", port))
        }
        s.port = port
    }
}
```

For recoverable validation errors, return an error from the constructor instead of panicking:

```go
type Option func(*Server) error

func NewServer(opts ...Option) (*Server, error) {
    s := &Server{ /* defaults */ }
    for _, opt := range opts {
        if err := opt(s); err != nil {
            return nil, fmt.Errorf("NewServer: %w", err)
        }
    }
    return s, nil
}

func WithPort(port int) Option {
    return func(s *Server) error {
        if port < 1 || port > 65535 {
            return fmt.Errorf("invalid port %d", port)
        }
        s.port = port
        return nil
    }
}
```

---

### Comparison with a config struct

**Config struct approach:**

```go
type ServerConfig struct {
    Host    string
    Port    int
    Timeout time.Duration
}

func NewServer(cfg ServerConfig) *Server { ... }

// Caller:
s := NewServer(ServerConfig{Port: 9090})
```

Adding a new field to `ServerConfig` without a default breaks callers using positional struct literals (though named fields are safer). The Functional Options approach never breaks existing callers when new options are added.

Both approaches are valid. Functional Options is preferred when:
- The type is part of a public API
- The number of options is large or growing
- Options are frequently used with defaults (sparse configuration)

Config structs are simpler when callers always configure most fields.

---

## When to use

- When building a public API type with many optional configuration parameters
- When you need backwards compatibility as new options are introduced
- When defaults cover most use cases and callers only override one or two fields
- In libraries and SDKs where the caller context is unknown

## When NOT to use

- Do not use Functional Options for types with one or two required parameters — a plain constructor is simpler
- Do not apply this pattern internally to unexported types — a config struct is easier to read
- Do not mix required parameters with options — pass required arguments as regular parameters, options as `...Option`
- Do not use it when options depend on each other or must be validated as a group — a builder with a `Build()` step is clearer

---

## References

- [Rob Pike — Self-referential functions and the design of options (2014)](https://commandcenter.blogspot.com/2014/01/self-referential-functions-and-design.html)
- [Dave Cheney — Functional options for friendly APIs](https://dave.cheney.net/2014/10/17/functional-options-for-friendly-apis)
- [Go Blog — Uber Go Style Guide — Functional Options](https://github.com/uber-go/guide/blob/master/style.md#functional-options)
