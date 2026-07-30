---
type: concept
tags:
  - language
  - clojure
  - backend
  - overview
related:
  - languages/clojure/paradigms
  - languages/clojure/concurrency
  - languages/clojure/data-structures-and-immutability
language: "clojure"
---
# Clojure Overview

> Clojure is a dynamic, functional Lisp that runs on the JVM and treats immutable data as the default way to model a program.

---

## What is it?

Clojure is a programming language in the Lisp family, created by Rich Hickey and released in 2007. It is dynamically typed, functional-first, and hosted — it compiles to Java bytecode and runs on the Java Virtual Machine (JVM), with sibling compilers targeting JavaScript (ClojureScript) and the .NET CLR (ClojureCLR).

Its defining traits are **immutable, persistent data structures**, **code-as-data (homoiconicity)** with macros, and a pragmatic focus on managing state and concurrency safely. Programs are written as expressions — there are almost no statements — and data is manipulated with a small, composable set of functions over a handful of core collection types.

---

## Why does it matter?

Clojure answers a specific question: how do you write concurrent, long-lived programs without the accidental complexity that mutable state introduces? Its answer is to make **immutability the default** and to give mutable state a small number of well-defined, coordinated reference types (atoms, refs, agents).

Two design commitments shape everything else:

- **Data orientation.** Programs are mostly plain maps, vectors, sets, and keywords flowing through pure functions. There is no ceremony of classes and getters — you manipulate generic data with generic functions. Hickey's talk "The Value of Values" and "Simple Made Easy" articulate why this reduces incidental complexity.
- **Hosted pragmatism.** Clojure does not reinvent the runtime. It runs on the JVM, calls Java directly with zero-overhead interop, and inherits its garbage collector, JIT, threads, and enormous library ecosystem.

The result is a language that is expressive and terse like a scripting language, yet deploys and scales like a JVM service.

---

## How it works

Clojure's character comes from a few interlocking mechanisms:

- **Persistent data structures** — maps, vectors, sets, and lists are immutable; "changing" one returns a new version that shares structure with the original, so copies are cheap and safe to share across threads.
- **The reader and evaluation** — source text is parsed into Clojure data (lists, vectors, symbols) *before* evaluation, which is what makes macros and homoiconicity possible.
- **Hosted on the JVM** — code compiles to Java bytecode and calls Java directly, inheriting the JVM's GC, JIT, threads, and libraries with no FFI cost.
- **Managed references** — mutation is confined to a few reference types (atoms, refs, agents) with well-defined semantics, so immutable values flow through pure functions and state change stays explicit.

---

## What can you build with Clojure?

| Domain | Fit | Notes |
|---|---|---|
| Backend services & APIs | ⭐ Strong | Ring/reitit HTTP stack, mature JVM runtime, excellent for long-running services |
| Data processing & transformation | ⭐ Strong | Immutable data + transducers + seq abstraction make ETL and stream work natural |
| Web APIs (Ring / reitit / Pedestal) | 🟢 Solid | Composable middleware model; no single dominant framework, which is a feature and a cost |
| Data engineering on the JVM | 🟢 Solid | First-class interop with Apache Spark, Kafka, and Hadoop libraries |
| Frontend (ClojureScript + re-frame) | 🟢 Solid | re-frame is a battle-tested SPA framework; smaller ecosystem than React proper |
| Scripting & automation (babashka) | 🟢 Solid / 🟡 Promising | babashka gives instant startup and shebang scripts without JVM warmup |
| Interactive data science (notebooks) | 🟡 Evolving | Libraries like Clerk and the SciCloj stack are maturing but trail Python |
| Mainstream-team adoption / hiring | 🟠 Limited | Small talent pool; Lisp syntax and REPL workflow have a real learning curve |
| Hard-realtime / low-latency GC-sensitive | 🟠 Limited | JVM GC pauses and boxing make it a poor fit for tight latency budgets |

> Not the best fit for: systems programming, mobile apps, tight-latency or GC-sensitive real-time code, or teams that need a large, easily hired talent pool.

---

## Key highlights

**Immutable, persistent data structures**
Maps, vectors, sets, and lists are immutable. "Modifying" one returns a new version that structurally shares memory with the old one, so copies are cheap. This is the foundation of Clojure's concurrency story.

**Homoiconicity and macros**
Clojure code is written as Clojure data — lists, vectors, maps, symbols. Because code *is* data, macros can transform code at compile time, letting you extend the language itself rather than waiting for the compiler to add features.

**REPL-driven development**
The Read-Eval-Print Loop is not an afterthought; it is the primary workflow. Developers connect an editor to a live REPL and evaluate expressions inside a running program, reshaping it incrementally without restarts.

**Managed state and concurrency**
Rather than locks everywhere, Clojure offers atoms (uncoordinated synchronous state), refs with Software Transactional Memory (coordinated synchronous state), agents (asynchronous state), and `core.async` channels (CSP-style coordination).

**Seamless Java interop**
Any Java class or method is callable directly with `(.method obj args)` and `(Constructor. args)` syntax. Clojure functions are `IFn` objects usable from Java. There is no bridge layer or FFI cost.

**The seq abstraction and transducers**
A single lazy sequence abstraction unifies iteration over every collection. Transducers decouple that transformation logic from the source and the output, so the same `map`/`filter` pipeline works over collections, channels, and streams.

---

## Ecosystem highlights

| Area | Notable libraries |
|---|---|
| HTTP servers & routing | `ring`, `reitit`, `pedestal`, `http-kit` |
| Database access | `next.jdbc`, `honeysql`, `datomic`, `xtdb` |
| Frontend (ClojureScript) | `reagent`, `re-frame`, `shadow-cljs` |
| System lifecycle | `component`, `integrant`, `mount` |
| Async / concurrency | `core.async` |
| Testing | `clojure.test` (stdlib), `test.check`, `kaocha` |
| Data & specs | `clojure.spec`, `malli` |
| Scripting | `babashka` |
| Build & deps | `tools.deps` / `deps.edn`, `tools.build`, Leiningen |

---

## Versions worth knowing

| Version | Released | Why it matters |
|---|---|---|
| Clojure 1.12.5 | May 2026 | Latest stable; improved Java interop (functional interfaces, qualified method syntax) |
| Clojure 1.11 | 2022 | Added `clojure.math`, keyword-argument function calls with trailing maps |
| Clojure 1.9 | 2017 | Introduced `clojure.spec` and split core into `clojure.core.specs` |
| Clojure 1.7 | 2015 | Introduced transducers and reader conditionals (`.cljc`) |
| Clojure 1.5 | 2013 | Introduced reducers and the `->>`/`as->` threading family maturity |

Clojure officially supports Java LTS releases (currently Java 8, 11, 17, 21, and 25).

---

## Design decisions worth knowing

**Immutability by default** — collections cannot be mutated in place. State change is confined to explicit reference types, which makes concurrent code tractable.

**Data over objects** — prefer plain maps and vectors to bespoke classes. Generic functions (`assoc`, `get`, `update`, `merge`) operate on all of them.

**Code is data** — the reader turns source text into data structures before evaluation, enabling macros and structural editing.

**Dynamic typing with optional specs** — types are checked at runtime, but `clojure.spec` and `malli` add opt-in, data-driven validation at boundaries.

**Hosted, not sandboxed** — Clojure embraces its host platform's strengths (JVM threads, GC, libraries) instead of abstracting them away.

**Stability as a value** — the language deliberately avoids breaking changes; code written a decade ago typically still runs.

---

## Examples

A small, idiomatic slice of Clojure: immutable data flowing through pure functions with a threading macro, plus one managed reference for state.

```clojure
(ns shop.core)

;; Domain data is just immutable maps and vectors.
(def orders
  [{:id 1 :status :paid :total 42}
   {:id 2 :status :open :total 10}
   {:id 3 :status :paid :total 58}])

;; Pure transformation pipeline (thread-last).
(defn revenue [orders]
  (->> orders
       (filter (comp #{:paid} :status))
       (map :total)
       (reduce + 0)))

(revenue orders) ;; => 100

;; The only mutable state is an explicit atom.
(def total (atom 0))
(swap! total + (revenue orders))
@total ;; => 100
```

---

## When to use

- Long-running backend services and APIs on the JVM (Ring/reitit/Pedestal stacks).
- Data processing, transformation, and ETL, where immutable data and transducers shine.
- Interactive, REPL-driven development where you grow a program inside a live process.
- Frontend SPAs via ClojureScript and re-frame, or fast scripting with babashka.

## When NOT to use

- Systems programming, mobile apps, or desktop GUIs — there is no first-class support.
- Hard-realtime or latency-sensitive code where JVM GC pauses and boxing are unacceptable.
- Teams that need a large, easily hired talent pool — the Lisp/REPL learning curve is real.
- Situations demanding compile-time type guarantees out of the box (only mitigated, not replaced, by spec/malli).

---

## References

- [Clojure — official site](https://clojure.org)
- [Clojure — Rationale](https://clojure.org/about/rationale)
- [Rich Hickey — Simple Made Easy (InfoQ)](https://www.infoq.com/presentations/Simple-Made-Easy/)
- [Rich Hickey — The Value of Values (InfoQ)](https://www.infoq.com/presentations/Value-Values/)
- [Clojure Reference Documentation](https://clojure.org/reference/documentation)
- [Clojure Downloads & Releases](https://clojure.org/releases/downloads)
- *Programming Clojure* — Miller, Halloway & Bedra (Pragmatic Bookshelf, 3rd ed. 2018)
