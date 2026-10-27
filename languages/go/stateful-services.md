---
type: concept
tags:
  - language
  - go
  - backend
  - concurrency
related:
  - software-engineering/architecture/stateful-and-stateless/overview
  - software-engineering/architecture/stateful-and-stateless/actor-model
  - software-engineering/architecture/stateful-and-stateless/stateful-patterns
  - languages/go/concurrency
  - languages/go/web-servers
  - languages/go/context
language: "go"
---
# Stateless and Stateful Services in Go

> Go's goroutines and channels make in-process stateful services cheap to write — the hard part is deciding when state should leave the process.

---

## What is it?

This article applies the [stateless vs stateful distinction](../../software-engineering/architecture/stateful-and-stateless/overview.md) to Go services. A Go service is usually a single static binary running `net/http` with no framework imposing a model, so the choice is entirely in your code: a handler that reads and writes Redis is stateless; a handler that touches a package-level `map` is stateful, whether you meant it or not.

Go offers four practical shapes, from simplest to most distributed:

1. **Stateless handlers** with state in Redis or a database.
2. **A goroutine that owns the state** and receives commands over a channel — an actor without a framework.
3. **An actor framework** (Proto.Actor, Ergo, Hollywood) when you need supervision, many actors, or clustering.
4. **Key-based sharding** — many owner goroutines in one process, and the same idea across replicas.

---

## Why does it matter?

The most common accidental stateful Go service looks like this:

```go
var (
	mu    sync.Mutex
	carts = map[string][]Item{} // works with 1 replica; wrong with 2
)
```

It passes every test and runs fine in production — until the deployment scales to two replicas and half the requests see an empty cart, or a rolling deploy wipes every cart. Go makes in-memory state so easy that it has to be a deliberate decision, not a default.

Done deliberately, in-process state is one of Go's strengths: a goroutine costs a few kilobytes, so one owner goroutine per entity is affordable for hundreds of thousands of entities.

---

## How it works

### 1. Stateless handler, external state

The handler holds no data between requests. State lives in Redis (via `github.com/redis/go-redis/v9`) or PostgreSQL, so any replica can serve any request and a rolling deploy loses nothing. Concurrent writes to the same key need the store's concurrency control: `WATCH`/`MULTI` or a Lua script in Redis, a transaction or version column in SQL.

### 2. A goroutine owns the state

Following "do not communicate by sharing memory; share memory by communicating", one goroutine holds the state and is the only code that touches it. Other goroutines send commands on a channel; each command carries a reply channel. This is the [Actor Model](../../software-engineering/architecture/stateful-and-stateless/actor-model.md) in plain Go: a mailbox (the channel), sequential processing (the `for`/`select` loop), and private state (local variables).

```
 handler ──cmd{reply: ch}──▶ ┌─────────────────────┐
 handler ──cmd{reply: ch}──▶ │ chan cmd (mailbox)  │──▶ owner goroutine: state, one cmd at a time
 ticker  ─────────────────▶  └─────────────────────┘          │
                                                             └──▶ periodic persist
```

Use `context.Context` both for the owner's lifetime (stop on shutdown, persist first) and for each caller's deadline, so a slow owner cannot hang a handler forever.

### 3. Actor frameworks

| Framework | Model | Strengths | Caveats |
|---|---|---|---|
| [Proto.Actor](https://proto.actor/) (`github.com/asynkron/protoactor-go`) | Classic actors, supervision, remoting, virtual actors via cluster | Same model as the .NET version; cluster grains | Go implementation is still pre-1.0; APIs can change |
| [Ergo](https://docs.ergo.services/) (`ergo.services/ergo`) | Erlang/OTP style: processes, `gen.Server`, supervisors, applications | Closest to OTP; can talk to Erlang/Elixir nodes | OTP vocabulary to learn |
| [Hollywood](https://github.com/anthdm/hollywood) (`github.com/anthdm/hollywood`) | Classic actors, remoting, cluster | Very high message throughput; small API | Smaller ecosystem |

Reach for one when you need restart-on-panic supervision, thousands of actors with lifecycles, or placement across nodes. For a single owner goroutine, the channel version is simpler.

### 4. Key-based sharding

One owner goroutine for everything serialises all work. Shard instead: `N` owner goroutines, each owning the keys where `hash(key) % N == i`. Every key still has a single writer, but different keys proceed in parallel.

Across replicas, the same idea needs a router that sends key `k` to the replica that owns it — a consistent hashing ring with membership, or a broker partition assignment (one Kafka consumer per partition). Building that by hand is where an actor cluster (Proto.Actor cluster, Ergo, Dapr Actors via its Go SDK) starts paying for itself. See [Stateful Patterns](../../software-engineering/architecture/stateful-and-stateless/stateful-patterns.md).

---

## Examples

### Stateless handler with Redis

```go
type CartHandler struct {
	rdb *redis.Client
}

func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userID")
	var item Item
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	key := "cart:" + userID
	raw, err := json.Marshal(item)
	if err != nil {
		http.Error(w, "encode", http.StatusInternalServerError)
		return
	}

	// RPUSH is atomic, so concurrent adds from different replicas do not lose items.
	pipe := h.rdb.TxPipeline()
	pipe.RPush(r.Context(), key, raw)
	pipe.Expire(r.Context(), key, 2*time.Hour)
	if _, err := pipe.Exec(r.Context()); err != nil {
		http.Error(w, "store unavailable", http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

### A goroutine-owned counter (actor without a framework)

```go
type cmd struct {
	key   string
	delta int
	reply chan int
}

type Counter struct {
	cmds chan cmd
}

func NewCounter() *Counter {
	return &Counter{cmds: make(chan cmd, 256)}
}

// Run owns the state. It is the only goroutine that reads or writes counts.
func (c *Counter) Run(ctx context.Context, persist func(map[string]int)) {
	counts := map[string]int{}
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case m := <-c.cmds:
			counts[m.key] += m.delta
			m.reply <- counts[m.key]
		case <-ticker.C:
			persist(maps.Clone(counts))
		case <-ctx.Done():
			persist(counts) // flush before shutdown
			return
		}
	}
}

// Add is safe to call from any goroutine.
func (c *Counter) Add(ctx context.Context, key string, delta int) (int, error) {
	reply := make(chan int, 1)
	select {
	case c.cmds <- cmd{key: key, delta: delta, reply: reply}:
	case <-ctx.Done():
		return 0, ctx.Err()
	}
	select {
	case v := <-reply:
		return v, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}
```

No mutex: the `select` loop processes one command at a time. The reply channel is buffered so the owner never blocks on a caller that gave up.

### An account actor with Proto.Actor

```go
type Deposit struct{ Amount int64 }
type Withdraw struct{ Amount int64 }
type Balance struct{ Value int64 }
type Rejected struct{ Reason string }

type Account struct {
	balance int64
}

func (a *Account) Receive(ctx actor.Context) {
	switch msg := ctx.Message().(type) {
	case *actor.Started:
		// load state from storage here
	case *Deposit:
		a.balance += msg.Amount
		ctx.Respond(&Balance{Value: a.balance})
	case *Withdraw:
		if msg.Amount > a.balance {
			ctx.Respond(&Rejected{Reason: "insufficient funds"})
			return
		}
		a.balance -= msg.Amount
		ctx.Respond(&Balance{Value: a.balance})
	}
}

func main() {
	system := actor.NewActorSystem()
	props := actor.PropsFromProducer(func() actor.Actor { return &Account{} })
	pid := system.Root.Spawn(props)

	res, err := system.Root.RequestFuture(pid, &Deposit{Amount: 100}, time.Second).Result()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(res.(*Balance).Value) // 100
}
```

`Receive` is never called concurrently for the same actor, so the balance check and subtraction in `Withdraw` are atomic. A panic in `Receive` is caught by the actor's supervisor, which restarts it by default.

### Sharded owners in one process

```go
type Sharded struct {
	shards []*Counter
}

func NewSharded(ctx context.Context, n int, persist func(map[string]int)) *Sharded {
	s := &Sharded{shards: make([]*Counter, n)}
	for i := range s.shards {
		s.shards[i] = NewCounter()
		go s.shards[i].Run(ctx, persist)
	}
	return s
}

func (s *Sharded) Add(ctx context.Context, key string, delta int) (int, error) {
	h := fnv.New32a()
	h.Write([]byte(key))
	return s.shards[h.Sum32()%uint32(len(s.shards))].Add(ctx, key, delta)
}
```

Each key always maps to the same shard, so it has one writer; different keys run in parallel on different shards.

---

## When to use

- **Stateless handlers** — the default for HTTP/gRPC APIs deployed with several replicas, autoscaling, or rolling deploys.
- **A goroutine-owned state** — one process holds a hot, frequently updated structure (rate-limit counters, an in-memory index, a game room) and you can persist or rebuild it on restart.
- **Sharded owners** — the single owner becomes a bottleneck and the work splits cleanly by key.
- **An actor framework** — you need supervision trees, many entities with their own lifecycles, or transparent placement across nodes; Ergo when you also need Erlang interop.

---

## When NOT to use

- **Package-level maps with a mutex** as a session or cart store in a service that runs more than one replica — use Redis or a database.
- **An owner goroutine without a shutdown path.** Without `ctx.Done()` handling and a final persist, `SIGTERM` during a deploy loses the state; without it, a forgotten owner is a goroutine leak.
- **Unbuffered command channels with no caller deadline.** One slow command blocks every handler waiting on the owner; always select on `ctx.Done()`.
- **An actor framework for a single counter** — the channel pattern is a dozen lines and has no dependency.
- **Hand-built cross-replica routing** when a broker's partitioning or an actor cluster already provides membership and rebalancing.

---

## References

- [The Go Blog — Share Memory By Communicating](https://go.dev/blog/codelab-share)
- [Effective Go — Concurrency](https://go.dev/doc/effective_go#concurrency)
- [Proto.Actor documentation](https://proto.actor/docs/)
- [Ergo Framework documentation](https://docs.ergo.services/)
- [Hollywood — GitHub](https://github.com/anthdm/hollywood)
- [go-redis documentation](https://redis.uptrace.dev/)
