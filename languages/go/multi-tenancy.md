---
type: concept
tags:
  - language
  - go
  - multi-tenancy
  - backend
related:
  - software-engineering/architecture/multi-tenancy
  - software-engineering/databases/multi-tenancy/tenant-context
  - software-engineering/databases/multi-tenancy/testing-tenant-isolation
  - languages/go/context
  - languages/go/web-servers
language: "go"
---
# Multi-Tenancy in Go

> In Go, the tenant enters `context.Context` through `net/http` middleware and reaches PostgreSQL through a helper that opens a pgx transaction with the tenant scope set.

---

## What is it?

This article applies the [multi-tenant application pattern](../../software-engineering/architecture/multi-tenancy.md) with idiomatic Go: a middleware resolves and validates the tenant, stores an immutable `TenantContext` in the request's `context.Context`, and every database access runs inside a transaction that tells PostgreSQL which tenants it acts for, so [row-level security](../../software-engineering/databases/multi-tenancy/postgres-row-level-security.md) enforces isolation.

The building blocks are all small and explicit: `net/http`, `context`, [pgx v5](https://pkg.go.dev/github.com/jackc/pgx/v5) with `pgxpool`, and optionally [sqlc](https://docs.sqlc.dev/) for typed queries.

---

## Why does it matter?

Go has no dominant multi-tenant framework — no equivalent of Finbuckle in .NET. Every team assembles the pieces itself, and the pieces are easy to get subtly wrong: a query run on the pool instead of the transaction, a goroutine that outlives the transaction, a tenant id read from a header without checking memberships. This article is a reference design so each of those decisions is made once.

Go also makes the right design natural: `context.Context` already flows through every handler, database call, and outbound request, so the tenant travels with it at no extra cost.

---

## How it works

```
HTTP request
   │
   ▼
auth middleware ──► user in ctx
   │
   ▼
ResolveTenant ──► validates against memberships ──► TenantContext in ctx
   │
   ▼
handler ──► service ──► repository
                          │
                          ▼
                   WithTenants(ctx, pool, tc.TenantIDs, fn)
                     BEGIN
                     SELECT set_config('app.tenant_ids', $1, true)
                     fn(tx)  ── queries run under RLS
                     COMMIT  ── setting disappears; conn returns clean
```

### Routing and middleware

The standard library is enough. `ServeMux` with Go 1.22 patterns routes the request, and middleware is a plain `func(http.Handler) http.Handler` (see [Web Servers in Go](web-servers.md)). The same middleware works unchanged in chi, and adapts in a few lines to Echo or Gin.

### The tenant in `context.Context`

Following the rules from [Context in Go](context.md):

- The key is an **unexported type** (`type tenantKey struct{}`), so no other package can read or overwrite it by accident.
- The value is an **immutable struct**; the slice is copied on the way in so callers cannot mutate it later.
- The getter `TenantFrom(ctx)` returns an **error** when the tenant is missing — callers cannot forget to check, and a missing tenant fails closed instead of silently meaning "all tenants".

### The scoped transaction

`WithTenants` wraps [`pgx.BeginTxFunc`](https://pkg.go.dev/github.com/jackc/pgx/v5#BeginTxFunc): it begins a transaction, runs `set_config('app.tenant_ids', $1, true)` — the third argument `true` makes the setting transaction-local, the parameterisable form of `SET LOCAL` — calls the callback, and commits or rolls back. When the transaction ends, the setting disappears, so the connection goes back to the pool clean.

The helper rejects an empty tenant list before touching the database. The policy also fails closed on an empty scope (see [Passing the Tenant Context](../../software-engineering/databases/multi-tenancy/tenant-context.md)), but failing early gives a clear error instead of an empty result.

### sqlc

sqlc generates a `Queries` type over a `DBTX` interface that both the pool and a `pgx.Tx` satisfy. Inside the helper, build the queries from the transaction — `queries.WithTx(tx)` or `db.New(tx)` — never from the pool. A `Queries` built from the pool runs outside the transaction and outside the tenant scope.

### Pool safety net

`pgxpool.Config` has hooks that run around each connection's use:

```go
AfterRelease func(*pgx.Conn) bool                            // after a conn is returned
PrepareConn  func(context.Context, *pgx.Conn) (bool, error)  // before a conn is handed out
```

Transaction-local settings make these unnecessary for correctness, but an `AfterRelease` that runs `RESET ALL` is a cheap defence against someone, somewhere, running a session-level `SET`. Returning `false` destroys the connection instead of reusing it. Use `RESET ALL`, not `DISCARD ALL`: pgx caches prepared statements per connection, and `DISCARD ALL` deallocates them behind its back. (`BeforeAcquire` still exists but is deprecated in favour of `PrepareConn`.)

### Goroutines and the transaction

A `pgx.Tx` belongs to one connection and is not safe for concurrent use. Do not fan out goroutines that share the `tx`, and never let a goroutine keep using it after the callback returns — after commit, every call fails, and a goroutine that "falls back" to the pool runs unscoped. Collect results inside the callback; start background work after it, with its own `WithTenants` call. See [Pitfalls](../../software-engineering/databases/multi-tenancy/pitfalls.md).

### Workers

A queue consumer has no HTTP request. The message envelope carries the tenant id; the consumer restores the `TenantContext` into the `ctx` before calling the same service code, which then opens the same scoped transaction.

### Observability

Add `tenant.id` to the request's logger and span once, in the middleware:

- `slog`: `logger.With("tenant.id", id)` stored in the context, or a `slog.Handler` that reads the tenant from `ctx`.
- OpenTelemetry: `trace.SpanFromContext(ctx).SetAttributes(attribute.String("tenant.id", id))`.

---

## Examples

### The tenant context

```go
package tenant

import (
    "context"
    "errors"
    "slices"

    "github.com/google/uuid"
)

var ErrNoTenant = errors.New("tenant: no tenant in context")

// Context is immutable once built: fields are unexported and the slice is copied.
type Context struct {
    userID    uuid.UUID
    tenantIDs []uuid.UUID
}

func New(userID uuid.UUID, tenantIDs []uuid.UUID) Context {
    return Context{userID: userID, tenantIDs: slices.Clone(tenantIDs)}
}

func (c Context) UserID() uuid.UUID      { return c.userID }
func (c Context) TenantIDs() []uuid.UUID { return slices.Clone(c.tenantIDs) }

type tenantKey struct{}

func With(ctx context.Context, tc Context) context.Context {
    return context.WithValue(ctx, tenantKey{}, tc)
}

// From fails closed: a missing or empty tenant is an error, never "all tenants".
func From(ctx context.Context) (Context, error) {
    tc, ok := ctx.Value(tenantKey{}).(Context)
    if !ok || len(tc.tenantIDs) == 0 {
        return Context{}, ErrNoTenant
    }
    return tc, nil
}
```

Callers spell it `tenant.From(ctx)`; this is the `TenantFrom` getter described above, named for its package.

### The middleware

```go
// MembershipStore returns the tenants a user belongs to (memberships table).
type MembershipStore interface {
    TenantsOf(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error)
}

func ResolveTenant(members MembershipStore) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user, ok := auth.UserFrom(r.Context()) // set by the auth middleware
            if !ok {
                http.Error(w, "unauthenticated", http.StatusUnauthorized)
                return
            }

            allowed, err := members.TenantsOf(r.Context(), user.ID)
            if err != nil {
                http.Error(w, "internal error", http.StatusInternalServerError)
                return
            }

            // The header only narrows the user's own tenants; it never grants access.
            selected := allowed
            if h := r.Header.Get("X-Tenant-Id"); h != "" {
                id, err := uuid.Parse(h)
                if err != nil || !slices.Contains(allowed, id) {
                    http.Error(w, "forbidden", http.StatusForbidden)
                    return
                }
                selected = []uuid.UUID{id}
            }
            if len(selected) == 0 {
                http.Error(w, "forbidden", http.StatusForbidden)
                return
            }

            ctx := tenant.With(r.Context(), tenant.New(user.ID, selected))
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /projects", listProjects)

    handler := auth.Middleware(ResolveTenant(store)(mux))
    log.Fatal(http.ListenAndServe(":8080", handler))
}
```

### `WithTenants`

```go
package db

import (
    "context"
    "errors"

    "github.com/google/uuid"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

var ErrEmptyScope = errors.New("db: empty tenant scope")

// WithTenants runs fn in a transaction scoped to ids. The setting is
// transaction-local, so it disappears at COMMIT/ROLLBACK.
func WithTenants(ctx context.Context, pool *pgxpool.Pool, ids []uuid.UUID, fn func(pgx.Tx) error) error {
    if len(ids) == 0 {
        return ErrEmptyScope
    }

    // ids are already-parsed UUIDs; strings let pgx encode them as uuid[].
    scope := make([]string, len(ids))
    for i, id := range ids {
        scope[i] = id.String()
    }

    return pgx.BeginTxFunc(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
        // Parameterised, never concatenated. The cast validates every element as a UUID.
        if _, err := tx.Exec(ctx,
            "SELECT set_config('app.tenant_ids', $1::uuid[]::text, true)", scope,
        ); err != nil {
            return err
        }
        return fn(tx)
    })
}
```

### A repository with sqlc

```go
type ProjectRepo struct {
    pool    *pgxpool.Pool
    queries *sqlcdb.Queries
}

func (r *ProjectRepo) List(ctx context.Context) ([]sqlcdb.Project, error) {
    tc, err := tenant.From(ctx)
    if err != nil {
        return nil, err
    }

    var projects []sqlcdb.Project
    err = db.WithTenants(ctx, r.pool, tc.TenantIDs(), func(tx pgx.Tx) error {
        // Queries bound to tx — never r.queries directly, which would use the pool.
        var err error
        projects, err = r.queries.WithTx(tx).ListProjects(ctx)
        return err
    })
    return projects, err
}
```

The generated SQL has no `WHERE tenant_id = …`: `SELECT id, tenant_id, name FROM projects ORDER BY name` is enough, because the `tenant_isolation` policy filters the rows. Keeping an explicit filter as well is fine as defence in depth, but it must never be the only guard.

### Pool configuration

```go
func NewPool(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
    cfg, err := pgxpool.ParseConfig(dsn) // connects as app_user, never app_owner
    if err != nil {
        return nil, err
    }

    // Safety net: clear any session-level SET before the conn is reused.
    // Returning false destroys the connection instead of returning it to the pool.
    cfg.AfterRelease = func(conn *pgx.Conn) bool {
        ctx, cancel := context.WithTimeout(context.Background(), time.Second)
        defer cancel()
        _, err := conn.Exec(ctx, "RESET ALL")
        return err == nil
    }

    return pgxpool.NewWithConfig(ctx, cfg)
}
```

### A queue consumer

```go
type Envelope struct {
    TenantID uuid.UUID       `json:"tenant_id"`
    ActorID  uuid.UUID       `json:"actor_id"`
    Payload  json.RawMessage `json:"payload"`
}

func (c *Consumer) Handle(ctx context.Context, msg Envelope) error {
    ctx = tenant.With(ctx, tenant.New(msg.ActorID, []uuid.UUID{msg.TenantID}))

    logger := c.logger.With("tenant.id", msg.TenantID.String())
    trace.SpanFromContext(ctx).SetAttributes(attribute.String("tenant.id", msg.TenantID.String()))

    if err := c.service.Process(ctx, msg.Payload); err != nil {
        logger.ErrorContext(ctx, "process message", "err", err)
        return err
    }
    return nil
}
```

### Asserting isolation in a test

The full two-tenant suite is in [Testing Tenant Isolation](../../software-engineering/databases/multi-tenancy/testing-tenant-isolation.md). The Go-specific part is asserting on the SQLSTATE through `*pgconn.PgError`:

```go
func TestCrossTenantInsertIsRejected(t *testing.T) {
    tenantA := uuid.MustParse("00000000-0000-0000-0000-00000000000a")
    tenantB := uuid.MustParse("00000000-0000-0000-0000-00000000000b")

    err := db.WithTenants(ctx, appPool, []uuid.UUID{tenantA}, func(tx pgx.Tx) error {
        _, err := tx.Exec(ctx, "INSERT INTO projects (tenant_id, name) VALUES ($1, 'x')", tenantB.String())
        return err
    })

    var pgErr *pgconn.PgError
    if !errors.As(err, &pgErr) || pgErr.Code != "42501" {
        t.Fatalf("want SQLSTATE 42501 (insufficient_privilege), got %v", err)
    }
}
```

---

## When to use

- Go services on PostgreSQL with shared tables and row-level security.
- Code bases already using pgx (directly or through sqlc), where every query can take a `pgx.Tx`.
- HTTP, gRPC, and queue entry points that all need the same tenant rules — the `tenant` package and `WithTenants` serve all three.

---

## When NOT to use

- **An ORM that hides the connection** — GORM picks connections from its own pool per statement unless you work inside `db.Transaction(...)` or a dedicated `Session`; a scope set on one connection is not seen by a statement on another. If you stay on GORM, run `set_config` inside `db.Transaction` and use only the `tx` handle — or switch the tenant-scoped paths to pgx.
- **`context.Context` as the only carrier deep in the domain** — the context is right at the infrastructure edges (HTTP, database, telemetry); pure domain functions can take the tenant ids as an explicit parameter instead of fishing them out of `ctx`.
- **Schema- or database-per-tenant models** — the scoping helper here assumes shared tables with RLS; per-schema or per-database isolation needs a pool (or `search_path`) per tenant instead.
- **A session-level `SET app.tenant_ids` on a pooled connection** — it leaks to the next request that gets the connection. Always transaction-local.

---

## References

- [pgx v5 — package documentation (`BeginTxFunc`, `Tx`)](https://pkg.go.dev/github.com/jackc/pgx/v5)
- [pgxpool — package documentation (`Config` hooks)](https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool)
- [pkg.go.dev — context package](https://pkg.go.dev/context)
- [sqlc — Using transactions](https://docs.sqlc.dev/en/latest/howto/transactions.html)
- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
