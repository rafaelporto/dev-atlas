---
type: concept
tags:
  - language
  - clojure
  - functional
  - data-oriented
related:
  - languages/clojure/data-structures-and-immutability
  - languages/clojure/paradigms
language: "clojure"
---
# Sequences and Transducers in Clojure

> The seq abstraction gives every Clojure collection one uniform, lazy interface for iteration; transducers take the transformation logic out of that abstraction so the same pipeline works over collections, channels, and streams.

---

## What is it?

A **seq** (sequence) is Clojure's universal abstraction for an ordered walk over elements. Vectors, lists, maps, sets, strings, and even Java collections can all produce a seq, and every sequence function — `map`, `filter`, `reduce`, `take`, and dozens more — operates on that one abstraction. Most seqs are **lazy**: elements are computed only as they are consumed.

A **transducer** is a composable transformation that is *independent of its input and output source*. The very same `map`, `filter`, and `take` functions produce a transducer when you omit their collection argument, and you can compose those transducers with `comp` and apply them to a collection, a `core.async` channel, or a stream.

---

## Why does it matter?

The seq abstraction means you learn one vocabulary and it works everywhere — there is no separate API for iterating a vector versus a map versus a lazy line reader. Laziness lets you express infinite series and pipeline huge datasets without materializing intermediate collections.

Transducers solve a subtler problem. A normal `(->> coll (map f) (filter p))` allocates an intermediate sequence between each step. Transducers fuse the steps into a single pass with no intermediate collections, and because they are decoupled from the source, one transformation definition can be reused across in-memory data, async channels, and I/O.

---

## How it works

### The seq abstraction

`seq` returns a sequence view of any collection (or `nil` if empty). Sequence functions consume and return seqs, so they chain uniformly:

```clojure
(seq [1 2 3])        ;; => (1 2 3)
(seq {:a 1 :b 2})    ;; => ([:a 1] [:b 2])   (map entries as pairs)
(seq "abc")          ;; => (\a \b \c)
(seq [])             ;; => nil                (empty ⇒ nil, hence `(when (seq coll) ...)`)

(->> [1 2 3 4 5]
     (map inc)       ;; (2 3 4 5 6)
     (filter even?)  ;; (2 4 6)
     (reduce +))     ;; => 12
```

### Laziness

`map`, `filter`, `range`, `iterate`, and friends return **lazy sequences** — nothing is computed until something consumes them. This makes infinite sequences practical:

```clojure
(take 5 (range))                 ;; => (0 1 2 3 4)         (range with no args is infinite)
(take 5 (iterate #(* 2 %) 1))    ;; => (1 2 4 8 16)
(->> (range) (map #(* % %)) (filter odd?) (take 3)) ;; => (1 9 25)
```

Force realization when you need side effects to happen now: `doall` (realize and keep) or `dorun` (realize and discard). `doseq` is the idiomatic form for iterating purely for side effects.

```clojure
(doseq [x [1 2 3]]
  (println x))
```

### Transducers

Call a sequence function *without* a collection to get a transducer — a transformation recipe. Compose them with `comp` (note: composition reads left-to-right, unlike function `comp`), then apply with `transduce`, `into`, `sequence`, or `eduction`.

```clojure
;; A reusable transformation, decoupled from any source
(def xf
  (comp (map inc)
        (filter even?)
        (take 3)))

;; Apply it to a vector, producing a vector — single pass, no intermediates
(into [] xf (range 100))      ;; => [2 4 6]

;; Apply it with an explicit reducing function
(transduce xf + 0 (range 100)) ;; => 12

;; Apply it lazily as a sequence
(sequence xf (range 100))      ;; => (2 4 6)
```

The key difference from `->>`: the classic threaded pipeline builds a new lazy seq at each stage, whereas the transducer version fuses every stage into one traversal with no per-stage allocation.

### Same transducer, different context

Because a transducer knows nothing about its source or sink, the identical `xf` above can transform values flowing through a `core.async` channel:

```clojure
(require '[clojure.core.async :as a])
(def ch (a/chan 10 xf))   ;; the channel transforms every value it carries
```

### reduce, transduce, and reducing functions

`reduce` folds a seq into a single value. `transduce` is `reduce` with a transducer applied first. A **reducing function** takes an accumulator and an item and returns the next accumulator — the shared shape underneath both.

```clojure
(reduce + 0 [1 2 3 4])                 ;; => 10
(reduce (fn [acc x] (assoc acc x (* x x)))
        {} [1 2 3])                    ;; => {1 1, 2 4, 3 9}
(transduce (map inc) + 0 [1 2 3])      ;; => 9
```

---

## Examples

```clojure
;; Streaming a large file line-by-line, lazily, transforming as we go
(require '[clojure.java.io :as io])

(with-open [rdr (io/reader "access.log")]
  (transduce (comp (filter #(clojure.string/includes? % "ERROR"))
                   (map clojure.string/trim))
             conj
             []
             (line-seq rdr)))

;; Word frequency count as a data transformation
(defn word-freqs [text]
  (->> (clojure.string/split text #"\s+")
       (map clojure.string/lower-case)
       (frequencies)))

(word-freqs "the cat the dog the bird")
;; => {"the" 3, "cat" 1, "dog" 1, "bird" 1}
```

---

## When to use

- Use the seq functions (`map`/`filter`/`reduce`/`take`/`drop`) as your default for transforming any collection.
- Use lazy sequences for infinite series and for pipelines where you consume only part of the result.
- Use **transducers** when the same transformation is reused across sources, or when a hot pipeline should avoid intermediate allocations.
- Attach a transducer to a `core.async` channel to transform values in flight.
- Use `doseq`/`dorun`/`doall` to control when a lazy computation actually runs, especially around side effects.

## When NOT to use

- Do not hold the head of a large or infinite lazy seq in a binding — you will retain every realized element and risk running out of memory.
- Do not rely on side effects inside `map`/`filter` — laziness means they may run late, out of order, or never; use `doseq`.
- Do not reach for transducers when a simple `->>` pipeline is clear and not performance-critical — they add cognitive overhead.
- Do not `reduce` when you only need a boolean — `some`/`every?` short-circuit and read better.

---

## References

- [Clojure Reference — Sequences](https://clojure.org/reference/sequences)
- [Clojure Reference — Transducers](https://clojure.org/reference/transducers)
- [Clojure — Programming at the REPL: Sequences](https://clojure.org/guides/learn/sequential_collections)
- [Rich Hickey — Transducers (talk)](https://www.youtube.com/watch?v=6mTbuzafcII)
- [Clojure API — reduce / transduce](https://clojuredocs.org/clojure.core/transduce)
