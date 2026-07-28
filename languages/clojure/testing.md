---
type: concept
tags:
  - language
  - clojure
  - backend
  - testing
related:
  - languages/clojure/error-handling
  - languages/clojure/toolchain
language: "clojure"
---
# Testing in Clojure

> Clojure ships `clojure.test` in the standard library, and its REPL-driven workflow means most functions are exercised interactively long before a formal test is written.

---

## What is it?

`clojure.test` is the built-in testing framework. Tests are defined with `deftest`, assertions are made with `is`, and cases are grouped with `testing`. Because Clojure favors pure functions over immutable data, a test is usually just "call the function, assert on the returned value" — no elaborate setup, no mocking framework required for the common case.

Testing complements, rather than replaces, the **REPL-driven** workflow: developers continuously evaluate expressions against a live program while coding, so functions are validated interactively and then pinned down with `deftest`.

---

## Why does it matter?

Pure functions over immutable data are the easiest thing in software to test: the same input always yields the same output, and there is no hidden state to arrange or tear down. Clojure leans into that — its testing story is deliberately minimal because the language design removes most of what makes tests hard elsewhere. Where inputs are large or generative, `test.check` (property-based testing) explores the input space for you.

---

## How it works

### deftest, is, testing

```clojure
(ns my.app.math-test
  (:require [clojure.test :refer [deftest is testing]]
            [my.app.math :as math]))

(deftest add-test
  (testing "adds two numbers"
    (is (= 5 (math/add 2 3)))
    (is (= 0 (math/add -2 2))))
  (testing "identity element"
    (is (= 7 (math/add 7 0)))))
```

`is` accepts any expression; it passes when the expression is truthy. It also understands special forms:

```clojure
(is (= 5 (+ 2 3)))                        ;; equality
(is (thrown? ArithmeticException (/ 1 0)))         ;; expects an exception class
(is (thrown-with-msg? Exception #"funds" (withdraw acct 999))) ;; message match
(is (pos? (count coll)))                  ;; any predicate
```

### Running tests

```bash
clj -X:test                        # via a :test alias (e.g. kaocha runner)
lein test                          # Leiningen

# From the REPL
(require '[clojure.test :as t])
(t/run-tests 'my.app.math-test)    # one namespace
(t/run-all-tests #"my\.app\..*")   # all matching namespaces
```

### Fixtures — setup and teardown

Fixtures wrap tests to set up and tear down shared context. `:each` wraps every test; `:once` wraps the whole namespace once (ideal for a DB connection or embedded server).

```clojure
(def ^:dynamic *db* nil)

(defn with-db [test-fn]
  (let [db (open-test-db)]
    (try
      (binding [*db* db]
        (test-fn))
      (finally
        (close-test-db db)))))

(use-fixtures :once with-db)   ;; run once for the namespace
;; (use-fixtures :each with-db) ;; run around each deftest
```

### are — table-style assertions

`are` expands a template across multiple rows of data — Clojure's concise take on table-driven tests:

```clojure
(require '[clojure.test :refer [deftest are]])

(deftest add-cases
  (are [a b expected] (= expected (math/add a b))
    2  3   5
    -1 -2 -3
    0  0   0
    -5 5   0))
```

### Property-based testing with test.check

Instead of enumerating cases, describe a property that must hold for *all* inputs and let `test.check` generate hundreds of randomized examples, shrinking any failure to a minimal case.

```clojure
(require '[clojure.test.check.clojure-test :refer [defspec]]
         '[clojure.test.check.properties :as prop]
         '[clojure.test.check.generators :as gen])

(defspec reverse-twice-is-identity 1000
  (prop/for-all [v (gen/vector gen/int)]
    (= v (reverse (reverse v)))))
```

### REPL-driven testing

The tightest feedback loop is not a test runner at all — it is evaluating an expression in the REPL against live code, inspecting the returned data, and only then codifying the expectation as a `deftest`. Editors (CIDER, Calva, Cursive) run a single `deftest` or a whole namespace with a keystroke and show results inline.

### Mocking with with-redefs

When you must stub a side-effecting function (a network call, the clock), `with-redefs` temporarily rebinds a var for the dynamic extent of the body. Prefer designing pure functions so you rarely need this.

```clojure
(deftest fetches-and-parses
  (with-redefs [http/get (fn [_] {:status 200 :body "{\"ok\":true}"})]
    (is (= {:ok true} (my.app/fetch-json "http://x")))))
```

---

## Examples

```clojure
(ns my.app.orders-test
  (:require [clojure.test :refer [deftest is testing use-fixtures]]
            [my.app.orders :as orders]))

(deftest total-test
  (testing "sums paid orders only"
    (let [os [{:total 20 :status :paid}
              {:total 35 :status :pending}
              {:total 15 :status :paid}]]
      (is (= 35 (orders/paid-total os)))))

  (testing "empty input"
    (is (= 0 (orders/paid-total [])))))

(deftest withdraw-test
  (testing "rejects overdraw with structured error"
    (is (thrown-with-msg?
          clojure.lang.ExceptionInfo #"insufficient"
          (orders/withdraw {:balance 100} 250)))))
```

---

## When to use

- Write `deftest` for every pure function's behavior, especially edge cases.
- Use `are` for tabular cases and `testing` blocks to label groups.
- Use `:once` fixtures for expensive shared resources (DB, server), `:each` for isolation.
- Reach for `test.check` when a property should hold across a large input space (round-trips, invariants).
- Lean on the REPL for the first, fastest feedback loop; promote stable expectations into tests.

## When NOT to use

- Do not over-mock with `with-redefs` — if you are stubbing a lot, the function probably mixes logic and I/O; split them.
- Do not write one `deftest` per input value — use `are` or `test.check`.
- Do not depend on test execution order — tests should be independent.
- Do not test private implementation details when the public function's behavior covers them.

---

## References

- [Clojure API — clojure.test](https://clojuredocs.org/clojure.test)
- [Clojure — Guide: Programming at the REPL](https://clojure.org/guides/repl/introduction)
- [test.check — GitHub](https://github.com/clojure/test.check)
- [Kaocha test runner — GitHub](https://github.com/lambdaisland/kaocha)
- *Programming Clojure* — Miller, Halloway & Bedra (Pragmatic Bookshelf, 3rd ed. 2018)
