---
type: concept
tags:
  - language
  - clojure
  - functional
  - immutability
related:
  - languages/clojure/paradigms
  - languages/clojure/sequences-and-transducers
  - languages/clojure/concurrency
language: "clojure"
---
# Data Structures and Immutability in Clojure

> Clojure's core collections — lists, vectors, maps, and sets — are immutable and persistent: "changing" one returns a new version that shares most of its memory with the original.

---

## What is it?

Clojure ships four core collection types — **list**, **vector**, **map**, and **set** — plus keywords and symbols. They are all **immutable**: once created, a collection never changes. Operations that appear to modify a collection (`conj`, `assoc`, `dissoc`) return a brand-new collection and leave the original untouched.

These are **persistent** data structures. "Persistent" here does not mean saved to disk; it means the previous version persists after an update. New versions are built by **structural sharing** — they reuse the unchanged parts of the old version instead of copying everything — so updates are efficient (typically O(log₃₂ n) for maps and vectors) rather than O(n).

---

## Why does it matter?

Immutability is the foundation of Clojure's entire model:

- **Concurrency becomes tractable.** If values never change, multiple threads can read the same data with no locks and no chance of seeing a half-updated value.
- **Reasoning is local.** A function that receives a map cannot secretly mutate its caller's data. What you pass in is what you keep.
- **Values are comparable and cacheable.** Equality is by value, not identity, so immutable collections make natural map keys, set members, and cache entries.

The classic objection is performance — surely copying on every change is slow? Structural sharing is the answer: an "updated" vector of a million elements shares almost all of its internal tree with the original.

---

## How it works

### Structural sharing

Persistent vectors and maps are implemented as **bit-partitioned hash array mapped tries** (a wide, shallow tree with a branching factor of 32). Updating one element creates a new path from the root to that element and shares every other branch with the original.

```
Original vector v            "Updated" vector v'  (assoc v 2 :x)
      root                          root'
     /  |  \                       /  |  \
    A   B   C        ───▶         A   B'  C     (A and C shared;
   /|\ /|\ /|\                       /|\        only B's path is new)
```

Both `v` and `v'` remain valid and fully usable. Only the nodes along the changed path are new; everything else is shared by reference.

### The core collections

```clojure
;; Vector — indexed, grows at the end, the everyday sequential collection
(def v [1 2 3])
(conj v 4)        ;; => [1 2 3 4]   (v is still [1 2 3])
(assoc v 0 :a)    ;; => [:a 2 3]
(nth v 1)         ;; => 2
(get v 5 :none)   ;; => :none       (safe indexed access with default)

;; Map — associative key/value, the workhorse for domain data
(def m {:name "Ada" :age 36})
(assoc m :active? true)   ;; => {:name "Ada", :age 36, :active? true}
(dissoc m :age)           ;; => {:name "Ada"}
(get m :name)             ;; => "Ada"
(:name m)                 ;; => "Ada"   (keywords are functions of maps)
(update m :age inc)       ;; => {:name "Ada", :age 37}

;; Set — unique membership, fast contains?
(def s #{:a :b :c})
(conj s :d)       ;; => #{:a :b :c :d}
(contains? s :a)  ;; => true
(disj s :a)       ;; => #{:b :c}

;; List — linked list, grows at the front, used mainly for code/quoting
(def l '(1 2 3))
(conj l 0)        ;; => (0 1 2 3)   (conj adds to the front for lists)
(first l)         ;; => 1
```

### Nested updates

`assoc-in`, `update-in`, and `get-in` operate on arbitrarily nested structures without manual unpacking:

```clojure
(def state {:user {:profile {:name "Ada" :visits 3}}})

(get-in state [:user :profile :name])           ;; => "Ada"
(assoc-in state [:user :profile :name] "Grace") ;; deep replace
(update-in state [:user :profile :visits] inc)  ;; deep transform
```

### Transients — controlled local mutability

When building a large collection in a tight loop, transients allow safe, thread-local mutation for speed, then return an immutable result:

```clojure
(defn build-vec [n]
  (persistent!
    (reduce conj! (transient []) (range n))))
```

Transients are an optimization detail — reach for them only when profiling shows a hot path.

### EDN — data as a serialization format

**EDN (Extensible Data Notation)** is Clojure's textual data format: the same literal syntax you write in source (maps, vectors, keywords, strings, numbers) is a language-agnostic data interchange format, like JSON but richer (keywords, sets, symbols, tagged literals).

```clojure
(require '[clojure.edn :as edn])

(edn/read-string "{:id 1 :tags #{:a :b} :ts #inst \"2026-01-01\"}")
;; => {:id 1, :tags #{:a :b}, :ts #inst "2026-01-01T00:00:00.000-00:00"}
```

Because in-memory values and their serialized form share one notation, configuration files (`deps.edn`), API payloads, and log entries are all just Clojure data.

---

## Examples

```clojure
;; Immutability in action: the original is never touched
(def account {:balance 100 :owner "Ada"})

(defn deposit [acct amount]
  (update acct :balance + amount))

(def acct-2 (deposit account 50))

account  ;; => {:balance 100, :owner "Ada"}   (unchanged)
acct-2   ;; => {:balance 150, :owner "Ada"}   (new value)

;; Building a report as pure data transformation
(def orders
  [{:id 1 :total 20 :status :paid}
   {:id 2 :total 35 :status :pending}
   {:id 3 :total 15 :status :paid}])

(->> orders
     (filter #(= :paid (:status %)))
     (map :total)
     (reduce +))
;; => 35
```

---

## When to use

- Model essentially all domain data as immutable maps and vectors — this is the default in Clojure.
- Use `assoc`/`update`/`merge` and their `-in` variants to transform nested state functionally.
- Use sets for membership and de-duplication; use vectors for ordered, indexed data.
- Use EDN for configuration and data interchange between Clojure processes.
- Use transients only in a proven hot loop that builds a large collection locally.

## When NOT to use

- Do not reach for Java mutable collections (`ArrayList`, `HashMap`) inside normal Clojure logic — you lose the immutability guarantees; keep them at interop boundaries only.
- Do not leak a transient out of the function that created it — transients are not for sharing across threads or long-lived state.
- Do not use lists for indexed access — `nth` on a list is O(n); use a vector.
- Do not model mutable, coordinated state with plain values — use atoms, refs, or agents (see [Concurrency](concurrency.md)).

---

## References

- [Clojure Reference — Data Structures](https://clojure.org/reference/data_structures)
- [Clojure — EDN specification](https://github.com/edn-format/edn)
- [Clojure Reference — Transients](https://clojure.org/reference/transients)
- [Bagwell — Ideal Hash Trees (HAMT paper)](https://lampwww.epfl.ch/papers/idealhashtrees.pdf)
- [Clojure — Values and Change (state and identity)](https://clojure.org/about/state)
