---
type: concept
tags:
  - language
  - clojure
  - design-pattern
  - creational
  - structural
  - behavioral
related:
  - languages/clojure/paradigms
  - languages/clojure/concurrency
  - languages/clojure/sequences-and-transducers
language: "clojure"
---
# Clojure Patterns

> Most Gang-of-Four patterns exist to work around limitations of class-based languages; in Clojure, first-class functions, immutable data, protocols, and multimethods make many of them vanish or shrink to a single line.

---

## What is it?

The classic Gang of Four (GoF) design patterns were catalogued for object-oriented, class-based languages. Clojure is functional and data-oriented, so most of those patterns either dissolve into ordinary language features or take a very different, smaller shape. This article maps the common GoF patterns to their Clojure reality and then covers the patterns that are genuinely idiomatic to Clojure.

---

## Why does it matter?

Writing Clojure by mechanically translating Java patterns produces awkward, over-engineered code — factory objects, singleton classes, and visitor hierarchies that fight the language. Recognizing that "the pattern here is just a function" (or "just a map", or "just a protocol") is what makes Clojure code small and idiomatic. Peter Norvig famously observed that many GoF patterns are "invisible or simpler" in languages with first-class functions; Clojure is a strong case in point.

---

## Why classic GoF mostly disappears

| GoF pattern | Clojure reality |
|---|---|
| **Factory / Abstract Factory** | Just a function that returns data or a record. No factory class. |
| **Builder** | A map, or `->` threading `assoc` calls; optional args via a trailing map. |
| **Singleton** | A top-level `def`, or a `defonce` atom for stateful resources. |
| **Strategy** | Pass a function as an argument — that *is* the strategy. |
| **Command** | A function (or a data map describing an action) is the command object. |
| **Template Method** | A higher-order function taking the varying step as a function argument. |
| **Observer** | `add-watch` on an atom/ref, or a `core.async` pub/sub. |
| **Iterator** | The seq abstraction — every collection is already iterable lazily. |
| **Decorator** | Function composition (`comp`) or middleware wrapping a handler function. |
| **Adapter** | A function or a protocol extension via `extend-protocol`. |
| **Visitor** | A multimethod dispatching on `:type`, open for new cases. |
| **State** | An immutable value swapped in an atom; transitions are pure functions. |
| **Chain of Responsibility** | `some-fn`, `or`, or a reduce over a list of handler functions. |

The recurring theme: **functions replace single-method objects, data replaces configuration objects, and protocols/multimethods replace type hierarchies.**

```clojure
;; Strategy is just a function argument
(defn checkout [items discount-fn]
  (discount-fn (reduce + (map :price items))))

(checkout items #(* % 0.9))     ;; 10% off strategy
(checkout items identity)       ;; no discount

;; Decorator is comp; middleware is a function wrapping a function
(def process (comp validate normalize enrich))

;; Singleton stateful resource
(defonce db-pool (atom nil))
```

---

## Idiomatic Clojure patterns

### Protocols — polymorphism by type

A protocol is a set of function signatures; types implement it without inheritance. Dispatch is on the first argument's type and is host-fast. This is Clojure's answer to interfaces and the Adapter/Strategy family when the variation is by type.

```clojure
(defprotocol Storage
  (put! [this k v])
  (fetch [this k]))

(defrecord InMemory [state]
  Storage
  (put!  [_ k v] (swap! state assoc k v))
  (fetch [_ k]   (get @state k)))

;; Extend a protocol to a type you don't own
(extend-protocol Storage
  java.util.Map
  (put!  [m k v] (.put m k v) m)
  (fetch [m k]   (.get m k)))

(let [s (->InMemory (atom {}))]
  (put! s :a 1)
  (fetch s :a))   ;; => 1
```

### Multimethods — open dispatch on any function

When the thing you dispatch on is not simply a type — a `:type` key, a pair of arguments, a computed value — use a multimethod. New cases can be added anywhere, so it stays open for extension (the Visitor/Strategy replacement).

```clojure
(defmulti area :shape)
(defmethod area :circle [{:keys [r]}]   (* Math/PI r r))
(defmethod area :rect   [{:keys [w h]}] (* w h))
(defmethod area :default [_] (throw (ex-info "unknown shape" {})))

(area {:shape :circle :r 2}) ;; => 12.566...
```

### Records and maps as ADTs

Model domain entities as plain maps for maximum flexibility, or as `defrecord` when you want a named type, protocol implementations, and slightly faster field access. Records are still immutable and still behave like maps.

```clojure
;; Map: totally generic, all core functions apply
(def order {:id 1 :status :paid :total 42})

;; Record: named type that can implement protocols, still map-like
(defrecord Money [amount currency])
(def price (->Money 42 :USD))
(:amount price)               ;; => 42
(assoc price :amount 50)      ;; => #Money{:amount 50, :currency :USD}
```

"Sum types" (a value that is one of several shapes) are typically modeled as a map with a discriminator key (`:type`) plus a multimethod, or via a library such as `core.match`.

### Component / Mount — lifecycle and dependency injection

Long-running systems (servers, DB pools, message consumers) need ordered startup/shutdown and wiring between stateful parts. Three libraries formalize this — the Clojure take on dependency injection:

- **Component** (Stuart Sierra) — a system is a map of components with declared dependencies; `start`/`stop` walk them in order.
- **Integrant** — the system is described as *data* (an EDN map of keys and refs); multimethods build and halt each key.
- **Mount** — stateful vars declared with `defstate`, started/stopped in namespace load order.

```clojure
;; Integrant: the whole system is data, then realized
(require '[integrant.core :as ig])

(def config
  {:db/pool  {:url "jdbc:postgresql://localhost/app"}
   :app/http {:port 8080 :db (ig/ref :db/pool)}})

(defmethod ig/init-key :db/pool [_ {:keys [url]}] (open-pool url))
(defmethod ig/init-key :app/http [_ {:keys [port db]}] (start-server port db))
(defmethod ig/halt-key! :db/pool [_ pool] (close-pool pool))

(def system (ig/init config))
;; ... later ...
(ig/halt! system)
```

### Transducers — reusable, composable transformation

Decouple a transformation pipeline from its source and sink so the same logic applies to collections, channels, and streams (see [Sequences and Transducers](sequences-and-transducers.md)).

```clojure
(def clean-and-take
  (comp (map clojure.string/trim)
        (remove clojure.string/blank?)
        (take 100)))

(into [] clean-and-take raw-lines)     ;; over a collection
;; or attach to a core.async channel: (chan 32 clean-and-take)
```

### Threading macros for pipelines

`->` (thread-first) and `->>` (thread-last) turn nested calls into readable top-to-bottom pipelines — a syntactic pattern you will see constantly.

```clojure
;; thread-last: each step receives the previous result as the LAST arg
(->> orders
     (filter :paid?)
     (map :total)
     (reduce +))

;; thread-first: previous result as the FIRST arg — great for maps
(-> user
    (assoc :active? true)
    (update :login-count inc)
    (dissoc :password))
```

---

## Quick reference

| Need | Clojure tool |
|---|---|
| Vary behavior at runtime | Pass a function (Strategy/Command) |
| Vary behavior by type | Protocol |
| Vary behavior by arbitrary value | Multimethod |
| Compose transformations | `comp` / transducers |
| Wrap/extend behavior | Function composition / middleware |
| Model an entity | Map (or `defrecord`) |
| Model a sum type | Map with `:type` + multimethod |
| Manage stateful lifecycle & wiring | Component / Integrant / Mount |
| React to state change | `add-watch` / `core.async` pub-sub |
| Single shared resource | `def` / `defonce` |

---

## References

- [Clojure Reference — Protocols](https://clojure.org/reference/protocols)
- [Clojure Reference — Multimethods and Hierarchies](https://clojure.org/reference/multimethods)
- [Stuart Sierra — Component](https://github.com/stuartsierra/component)
- [Integrant — GitHub](https://github.com/weavejester/integrant)
- [Mount — GitHub](https://github.com/tolitius/mount)
- [Peter Norvig — Design Patterns in Dynamic Languages](https://norvig.com/design-patterns/)
