---
type: concept
tags:
  - language
  - clojure
  - functional
  - data-oriented
related:
  - languages/clojure/overview
  - languages/clojure/data-structures-and-immutability
  - languages/clojure/clojure-patterns
language: "clojure"
---
# Paradigms in Clojure

> Clojure is a functional, data-oriented Lisp: it favors pure functions over immutable data, treats code as data, and reaches for polymorphism through protocols and multimethods rather than class hierarchies.

---

## What is it?

A programming paradigm is a style of structuring and reasoning about code. Clojure is **multi-paradigm but strongly opinionated**: it is fundamentally a functional language, deeply data-oriented, and built on the Lisp property that code is itself data. It supports polymorphism and even some object-oriented interop, but its idioms steer you firmly away from mutable objects and inheritance.

Understanding which paradigms Clojure embraces — and which it deliberately discourages — is essential to writing idiomatic Clojure rather than "Java with parentheses".

---

## Why does it matter?

Clojure's designer, Rich Hickey, had strong, well-argued opinions about where object-oriented complexity comes from: identity conflated with state, behavior bundled with data, and mutation scattered across a program. Clojure's paradigm choices are direct responses to those problems. Knowing *why* the language pushes functional and data-oriented styles helps you structure programs that stay simple as they grow.

---

## How it works

Clojure's paradigms rest on a few core commitments rather than special syntax per style:

- **Everything is an expression over immutable data** — functions take values and return new values, which is what makes the functional and data-oriented styles the default.
- **The reader turns code into data** — source is parsed into lists, vectors, and maps before evaluation, enabling macros and metaprogramming.
- **Polymorphism is runtime dispatch** — protocols dispatch on the first argument's type, multimethods on any computed value, neither using inheritance.
- **The JVM host is reachable directly** — Java interop is available at the edges when you need it.

The sections below walk each paradigm, how strongly Clojure supports it, and its trade-offs.

---

## Paradigms supported

### 1. Functional (primary paradigm)

Clojure is functional first. Functions are first-class values, most code is built from pure functions, and data is immutable by default. There are no statements to speak of — everything is an expression that returns a value.

```clojure
;; Pure function: same inputs always produce the same output, no side effects
(defn total-with-tax [prices tax-rate]
  (* (reduce + prices) (+ 1 tax-rate)))

;; Higher-order functions and function composition
(def clean (comp clojure.string/trim clojure.string/lower-case))

;; Closures capture lexical scope
(defn adder [n]
  (fn [x] (+ x n)))

((adder 10) 5) ;; => 15
```

**What Clojure supports from FP:**
- First-class and higher-order functions (`map`, `filter`, `reduce`, `comp`, `partial`)
- Immutable values and persistent collections by default
- Pure functions and referential transparency as the norm
- Lazy evaluation via lazy sequences
- Recursion with explicit tail calls via `recur` (constant stack space)

**What Clojure omits or de-emphasizes:**
- Static types and algebraic data types (dynamic typing, with optional `spec`/`malli`)
- Automatic tail-call optimization across function boundaries (use `recur` or `trampoline`)
- Pattern matching in core (available via the `core.match` library)

**Pros:** pure functions are trivial to test and compose; immutability removes whole classes of concurrency bugs; lazy seqs express infinite and pipelined computations cleanly.

**Cons:** deep recursion needs `recur` or `loop`; laziness can defer errors and hold references longer than expected; no compile-time type checking without opting into `spec`.

---

### 2. Data-oriented (defining characteristic)

Clojure programs model the world as plain, immutable data — maps, vectors, sets, keywords — and transform it with generic functions. This is often called **data-oriented programming**: prefer generic data with generic operations over bespoke objects with bespoke methods.

```clojure
;; A domain entity is just a map — no class needed
(def user {:id 1 :name "Ada" :roles #{:admin :editor}})

;; Generic operations work on any map
(assoc user :active? true)          ;; add/replace a key
(update user :roles conj :owner)    ;; transform a value functionally
(get-in user [:roles])              ;; navigate nested data
(select-keys user [:id :name])      ;; project a subset

;; The same functions work on config, API payloads, DB rows — all just maps
```

Because data is uniform, the same handful of functions (`assoc`, `dissoc`, `merge`, `update`, `get-in`, `assoc-in`) covers most manipulation across the entire program. EDN (Extensible Data Notation) is the serialization format for this same data, so values move between memory, disk, and the wire unchanged.

**Pros:** minimal ceremony; data is inspectable, printable, and diffable; functions written for one map work for all maps.

**Cons:** no compile-time guarantee of a map's shape (mitigated by `spec`/`malli`); over-nesting maps can become hard to navigate.

---

### 3. Homoiconic / metaprogramming (Lisp heritage)

Clojure source is written as Clojure data structures. The reader parses text into lists, vectors, maps, and symbols *before* evaluation. Because code is data, **macros** can transform code at compile time — you extend the language rather than wait for the compiler.

```clojure
;; `when` is itself a macro that expands to (if test (do body...))
(when (seq items)
  (println "processing")
  (process items))

;; A custom macro: run body only when a feature flag is on
(defmacro when-enabled [flag & body]
  `(when (get @feature-flags ~flag)
     ~@body))

(when-enabled :beta-search
  (run-beta-search query))
```

**Pros:** macros let you remove boilerplate and build DSLs; threading macros (`->`, `->>`) restructure call syntax for readability.

**Cons:** macros run at compile time and do not compose like functions — overusing them harms readability; prefer functions unless you genuinely need to control evaluation.

---

### 4. Polymorphism without inheritance

Clojure gets polymorphism from **protocols** (dispatch on the type of the first argument, like interfaces) and **multimethods** (dispatch on an arbitrary function of the arguments). Neither uses class inheritance.

```clojure
;; Protocol: type-based dispatch, host-fast
(defprotocol Shape
  (area [s]))

(defrecord Circle [r]
  Shape
  (area [_] (* Math/PI r r)))

(defrecord Rect [w h]
  Shape
  (area [_] (* w h)))

(area (->Circle 2)) ;; => 12.566...

;; Multimethod: dispatch on any computed value
(defmulti describe :type)
(defmethod describe :admin [_] "has full access")
(defmethod describe :guest [_] "read-only")
(defmethod describe :default [_] "unknown role")

(describe {:type :admin}) ;; => "has full access"
```

**Pros:** open for extension — new types can implement existing protocols and new methods can be added to existing multimethods without editing the original code; avoids fragile base-class hierarchies.

**Cons:** protocols dispatch only on the first argument's type; multimethods are more flexible but slower; neither offers implementation inheritance.

---

### 5. Object-oriented interop (as needed)

Clojure is hosted, so it speaks the JVM's object-oriented dialect when interoperating with Java. You call methods, construct objects, and implement interfaces — but this is a boundary concern, not how you structure Clojure logic.

```clojure
(def sb (StringBuilder.))          ;; construct a Java object
(.append sb "hello")               ;; call an instance method
(.toString sb)                     ;; => "hello"

(Math/sqrt 16)                     ;; static method => 4.0
```

**Pros:** zero-friction access to the entire JVM ecosystem.
**Cons:** interop code is imperative and mutable — keep it at the edges and wrap it in pure functions.

---

## Summary

| Paradigm | Support level | Idiomatic in Clojure? |
|---|---|---|
| Functional | Full | Yes — the default style |
| Data-oriented | Full | Yes — the defining characteristic |
| Homoiconic / macros | Full (Lisp) | Yes, but use sparingly |
| Polymorphism (protocols/multimethods) | Full, no inheritance | Yes — the OO replacement |
| Object-oriented interop | Partial (host only) | Only at the Java boundary |

The idiomatic Clojure approach is to **model data as immutable maps and vectors**, **transform it with pure functions**, **reach for protocols/multimethods when behavior must vary by type**, and **confine mutation and Java interop to the edges**.

---

## Examples

A short program blending Clojure's main paradigms: data-oriented maps, protocol-based polymorphism, and a pure functional pipeline.

```clojure
(ns catalog.core)

;; Data-oriented: entities are plain maps.
(def products
  [{:name "book" :type :media :price 20}
   {:name "mug"  :type :goods :price 8}])

;; Polymorphism without inheritance: dispatch on :type.
(defmulti shipping :type)
(defmethod shipping :media [_] 2)
(defmethod shipping :goods [_] 5)

;; Functional: pure pipeline over immutable data.
(defn order-total [products]
  (->> products
       (map (fn [p] (+ (:price p) (shipping p))))
       (reduce + 0)))

(order-total products) ;; => 35
```

---

## When to use

- Default to the **functional** style — pure functions over immutable data — for essentially all logic.
- Model domains as **plain data** (maps/vectors) and transform them with generic functions.
- Reach for **protocols/multimethods** when behavior must vary by type or by an arbitrary value.
- Use **macros** only to remove genuine boilerplate or build a DSL that functions cannot express.

## When NOT to use

- Do not replicate object-oriented class hierarchies or bundle mutable state with behavior.
- Do not rely on deep cross-function recursion without `recur`/`loop` — there is no automatic tail-call optimization.
- Do not scatter Java interop and mutation through the code — keep it at the edges, wrapped in pure functions.
- Do not overuse macros where a function would do; macros do not compose and hurt readability.

---

## References

- [Clojure — Rationale](https://clojure.org/about/rationale)
- [Clojure — Functional Programming](https://clojure.org/about/functional_programming)
- [Clojure Reference — Protocols](https://clojure.org/reference/protocols)
- [Clojure Reference — Multimethods](https://clojure.org/reference/multimethods)
- [Clojure Reference — Macros](https://clojure.org/reference/macros)
- [Rich Hickey — Simple Made Easy](https://www.infoq.com/presentations/Simple-Made-Easy/)
