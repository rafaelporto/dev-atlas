---
type: concept
tags:
  - language
  - go
  - backend
related:
  - languages/go/overview
  - languages/go/context
  - languages/go/server-side-rendering
  - languages/go/full-stack-monolith
language: "go"
---

# Web Servers in Go

> Building HTTP servers with the standard library — handlers, `ServeMux`, the Go 1.22 routing patterns, middleware, and graceful shutdown — before reaching for a framework.

---

## What is it?

A **web server in Go** is an ordinary program built on the `net/http` package from the standard library. `net/http` ships a production-grade HTTP/1.1 and HTTP/2 server, a request router (`ServeMux`), and a client — no external framework required. You describe how to respond to requests by registering **handlers** against **route patterns**, then call `ListenAndServe` to start accepting connections.

The whole model rests on one small interface:

```go
type Handler interface {
    ServeHTTP(w http.ResponseWriter, r *http.Request)
}
```

Anything implementing `ServeHTTP` is a handler. Everything else — routing, middleware, the file server — is built from that single method.

---

## Why does it matter?

In most languages a web server means picking a framework first. In Go the standard library is the framework: it is fast, batteries-included, and stable across releases, so a server written today keeps compiling for years. This is a large part of why Go became a default for backend services and APIs (see the [overview](overview.md)).

Understanding raw `net/http` pays off even if you later adopt a router like chi or a framework like Echo, because they all build on the same `Handler` interface. Learn the interface once and every library in the ecosystem becomes legible. It is also the foundation for serving a frontend from the same process — the subject of [Server-Side Rendering](server-side-rendering.md) and the [Full-Stack Monolith](full-stack-monolith.md) guide.

---

## How it works

### Handlers and the mux

A `ServeMux` maps route patterns to handlers and dispatches each incoming request to the best match:

```go
package main

import (
    "log"
    "net/http"
)

func main() {
    mux := http.NewServeMux()

    // HandlerFunc adapts a plain function to the Handler interface.
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("hello"))
    })

    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

`HandleFunc` wraps a `func(w, r)` in `http.HandlerFunc`, which satisfies `Handler`. Prefer creating your own `ServeMux` over the package-global default mux (`http.HandleFunc`) so routes are explicit and not shared across packages.

### Enhanced routing (Go 1.22+)

Before Go 1.22, `ServeMux` matched only path prefixes — method checks and path parameters were left to the handler or a third-party router. Since Go 1.22 the pattern syntax understands **HTTP methods** and **path wildcards**:

```go
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id") // wildcard captured by name
    w.Write([]byte("user " + id))
})

mux.HandleFunc("POST /users", createUser)      // method-specific
mux.HandleFunc("GET /files/{path...}", serve)  // trailing wildcard matches the rest
```

- `{id}` captures one path segment, read with `r.PathValue("id")`.
- `{path...}` is a trailing wildcard that matches everything after the prefix.
- A method prefix (`GET`, `POST`, …) restricts the route; a mismatched method returns `405 Method Not Allowed` automatically.
- More specific patterns win over less specific ones; conflicting patterns panic at registration (Fail Fast).

This covers the routing needs of many services without any dependency.

### Middleware

Cross-cutting concerns (logging, auth, recovery, compression) are expressed as **middleware**: a function that wraps one handler and returns another. This is the Decorator pattern applied to HTTP — see the Middleware section in [Go Patterns](go-patterns.md).

```go
// Middleware is a handler that wraps another handler.
type Middleware func(http.Handler) http.Handler

func logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        log.Printf("%s %s", r.Method, r.URL.Path)
        next.ServeHTTP(w, r) // call the wrapped handler
    })
}

// Compose middleware into a single wrapper, applied outermost-first.
func chain(h http.Handler, mws ...Middleware) http.Handler {
    for i := len(mws) - 1; i >= 0; i-- {
        h = mws[i](h)
    }
    return h
}
```

Because the signature is always `func(http.Handler) http.Handler`, middleware from any library composes with your own.

### Graceful shutdown

`ListenAndServe` blocks forever and kills in-flight requests when the process dies. For real deployments, drive an `http.Server` explicitly and call `Shutdown`, which stops accepting new connections and waits for active requests to finish within a deadline. This ties directly into [Context](context.md):

```go
srv := &http.Server{Addr: ":8080", Handler: mux}

go func() {
    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        log.Fatal(err)
    }
}()

// Block until an interrupt signal arrives.
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
<-ctx.Done()

// Give in-flight requests up to 10s to complete.
shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
if err := srv.Shutdown(shutdownCtx); err != nil {
    log.Printf("graceful shutdown failed: %v", err)
}
```

Setting `ReadTimeout`, `WriteTimeout`, and `IdleTimeout` on the `http.Server` is also good practice — the zero-value defaults have no timeouts, which leaves the server open to slow-client attacks.

---

## Examples

A small server combining routing, a path parameter, and a middleware chain:

```go
func main() {
    mux := http.NewServeMux()

    mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })
    mux.HandleFunc("GET /greet/{name}", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "hello, %s", r.PathValue("name"))
    })

    handler := chain(mux, logging) // wrap the whole mux
    srv := &http.Server{
        Addr:         ":8080",
        Handler:      handler,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
    }
    log.Fatal(srv.ListenAndServe())
}
```

`curl localhost:8080/greet/ada` prints `hello, ada`, and each request is logged by the middleware.

---

## When to use

- Any HTTP API or service — the standard library is the idiomatic default and handles most needs.
- When you want minimal dependencies and long-term stability, avoiding framework churn.
- As the base layer for serving a frontend from the same binary (see the [Full-Stack Monolith](full-stack-monolith.md) guide).
- Learning the ecosystem: every router and framework builds on the `Handler` interface shown here.

## When NOT to use

- Reach for a lightweight router (**chi**, **gorilla/mux**) when you need route groups, richer middleware ergonomics, or regex constraints beyond what `ServeMux` offers — they stay `Handler`-compatible.
- Consider a full framework (**Echo**, **Gin**, **Fiber**) when you want batteries like binding/validation, rendering helpers, and a large middleware catalog out of the box — at the cost of a heavier dependency and its own conventions.
- Don't hand-roll TLS, HTTP/2 tuning, or connection pooling that `net/http` and a reverse proxy already provide well.

## References

- Go Team. [`net/http` package](https://pkg.go.dev/net/http). pkg.go.dev.
- Go Team. [Routing Enhancements for Go 1.22](https://go.dev/blog/routing-enhancements). go.dev.
- Go Team. [`http.Server.Shutdown`](https://pkg.go.dev/net/http#Server.Shutdown). pkg.go.dev.
