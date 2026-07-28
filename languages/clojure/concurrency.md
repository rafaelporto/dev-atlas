---
type: concept
tags:
  - language
  - clojure
  - backend
  - concurrency
  - state-management
related:
  - languages/clojure/data-structures-and-immutability
  - languages/clojure/paradigms
language: "clojure"
---
# Concurrency and State in Clojure

> Because Clojure's values are immutable, concurrency reduces to managing a few explicit reference types — atoms, refs, and agents — plus `core.async` channels for coordination.

---

## What is it?

Clojure separates **value** (an immutable piece of data) from **identity** (a stable name whose value changes over time). Immutable values are inherently thread-safe. All the concurrency machinery therefore concerns identities — the small set of mutable *reference types* that let a name point to a new immutable value over time:

- **Atom** — uncoordinated, synchronous state for a single independent value.
- **Ref** — coordinated, synchronous state changed together inside a transaction (Software Transactional Memory).
- **Agent** — asynchronous state updated by actions dispatched to a thread pool.
- **Var** — thread-local rebindable state (mostly for dynamic configuration).

`core.async` adds channels and lightweight processes (CSP-style) for coordinating concurrent workflows.

---

## Why does it matter?

In languages built on mutable objects, concurrency means locks, and locks mean deadlocks, race conditions, and code that is fiendishly hard to reason about. Clojure's bet is that if data cannot change, then the only thing you ever have to coordinate is the *swap* from one immutable value to the next — a much smaller problem. Each reference type gives you a different, well-defined semantics for that swap, so you pick the weakest tool that fits and get correctness by construction.

---

## How it works

### Atoms — independent synchronous state

An atom holds one value and updates it atomically with `swap!` (apply a function) or `reset!` (set directly). `swap!` uses a compare-and-set retry loop, so the update function must be **pure** (it may be retried).

```clojure
(def counter (atom 0))

(swap! counter inc)        ;; => 1
(swap! counter + 10)       ;; => 11
@counter                   ;; => 11   (deref reads the current value)
(reset! counter 0)         ;; => 0

;; A cache as an atom over a map
(def cache (atom {}))
(swap! cache assoc :user/1 {:name "Ada"})
```

Use an atom when a single value changes independently of everything else. It is the most common reference type by far.

### Refs and STM — coordinated synchronous state

When several identities must change **together, atomically**, use refs and wrap the changes in `dosync`. Clojure's Software Transactional Memory ensures the whole transaction commits or none of it does — the classic "transfer between two accounts" problem with no explicit locks.

```clojure
(def account-a (ref 100))
(def account-b (ref 0))

(defn transfer [from to amount]
  (dosync
    (alter from - amount)
    (alter to   + amount)))

(transfer account-a account-b 30)
[@account-a @account-b] ;; => [70 30]
```

Inside `dosync`: `alter` applies a function, `ref-set` sets a value, and `commute` allows commutative updates that need not retry. Transactions are automatically retried on conflict, so their bodies must be side-effect free.

### Agents — asynchronous state

An agent holds state updated by actions **sent** to it. `send`/`send-off` return immediately; the action runs later on a thread pool, serialized per agent. Reads with `@` are immediate and see the latest committed value.

```clojure
(def log-agent (agent []))

(send log-agent conj {:event :login :user 1})
(send log-agent conj {:event :logout :user 1})

(await log-agent)   ;; block until dispatched actions to this agent finish
@log-agent          ;; => [{:event :login ...} {:event :logout ...}]
```

Use `send` for CPU-bound actions (fixed thread pool) and `send-off` for blocking/IO actions (expandable pool). Agents are ideal for fire-and-forget state that is updated from many threads but read occasionally.

### core.async — channels and CSP

`core.async` brings Communicating Sequential Processes to Clojure: typed **channels** connect lightweight processes created with `go` blocks. `>!`/`<!` (inside `go`) and `>!!`/`<!!` (blocking) put and take values.

```clojure
(require '[clojure.core.async :as a :refer [chan go >! <! <!! close!]])

(defn pipeline []
  (let [in  (chan)
        out (chan)]
    ;; worker: read from in, transform, write to out
    (go (loop []
          (when-let [x (<! in)]
            (>! out (* x x))
            (recur))))
    ;; producer
    (go (doseq [n [1 2 3]] (>! in n))
        (close! in))
    out))

(let [out (pipeline)]
  [(<!! out) (<!! out) (<!! out)]) ;; => [1 4 9]
```

`go` blocks are multiplexed over a small thread pool via a state-machine transform, so you can run huge numbers of them. Channels can carry transducers to transform values in flight.

### Choosing a reference type

| Need | Tool | Sync? | Coordinated? |
|---|---|---|---|
| One independent value | **atom** | synchronous | no |
| Several values changed together | **ref** + `dosync` (STM) | synchronous | yes |
| Fire-and-forget async updates | **agent** | asynchronous | no |
| Per-thread dynamic config | **var** + `binding` | synchronous | no (thread-local) |
| Coordinating concurrent workflows | **core.async** channels | either | via channels |

### watches and validators

Atoms, refs, and agents support `add-watch` (react to changes) and validators (reject invalid values):

```clojure
(def temp (atom 20 :validator #(<= -50 % 60)))
(add-watch temp :log (fn [_ _ old new] (println old "->" new)))
(swap! temp + 5) ;; prints: 20 -> 25
```

---

## When to use

- Reach for an **atom** first — most mutable state is a single independent value.
- Use **refs + STM** only when multiple pieces of state must update atomically together.
- Use **agents** for asynchronous, serialized updates (logging, metrics, background accumulation).
- Use **core.async** to model pipelines, producer/consumer flows, and backpressure.
- Keep the functions you pass to `swap!`/`alter` **pure** — they may be retried.

## When NOT to use

- Do not use refs/STM when a single atom suffices — coordination has overhead and complexity you may not need.
- Do not perform side effects inside `swap!`, `alter`, or a transaction body — retries would repeat them.
- Do not use `core.async` blocking ops (`<!!`, `>!!`) inside a `go` block — it defeats the lightweight scheduler.
- Do not reach for Java locks or `synchronized` in normal Clojure code — the reference types exist to avoid exactly that.
- Do not store rapidly-changing high-contention state in a ref — heavy transaction retries will hurt throughput.

---

## References

- [Clojure — Values and Change: State and Identity](https://clojure.org/about/state)
- [Clojure Reference — Atoms](https://clojure.org/reference/atoms)
- [Clojure Reference — Refs and Transactions](https://clojure.org/reference/refs)
- [Clojure Reference — Agents](https://clojure.org/reference/agents)
- [core.async — GitHub](https://github.com/clojure/core.async)
- [Rich Hickey — The Value of Values](https://www.infoq.com/presentations/Value-Values/)
