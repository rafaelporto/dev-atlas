---
type: concept
tags:
  - language
  - clojure
  - backend
  - error-handling
related:
  - languages/clojure/paradigms
  - languages/clojure/testing
language: "clojure"
---
# Error Handling in Clojure

> Clojure handles failure with the JVM's exception mechanism (`try`/`catch`/`throw`), but idiomatic code favors carrying rich, structured context in data via `ex-info` and `ex-data`.

---

## What is it?

Clojure inherits Java's exception model: errors are thrown as `Throwable` objects, unwind the stack, and are caught with `try`/`catch`/`finally`. On top of that, Clojure adds a data-oriented convention — `ex-info` creates an exception that carries an arbitrary **map of context data**, and `ex-data` reads it back. This bridges the exception world with Clojure's preference for programming with plain data.

There is no checked-exception ceremony (the JVM's checked/unchecked distinction is not enforced by Clojure), and errors are not encoded in the type system.

---

## Why does it matter?

Most languages force a choice between exceptions (rich, but opaque control flow) and error values (explicit, but verbose). Clojure's `ex-info` gives you the middle path: exceptions that behave like normal Java exceptions for control flow, but carry a structured data payload you can inspect, log, and branch on — no need to parse error message strings.

This matters most at boundaries: an HTTP handler can throw `(ex-info "validation failed" {:type :validation :errors [...]})` deep in the call stack, and a single top-level `catch` can turn that data into the right HTTP status and body.

---

## How it works

### try / catch / finally / throw

```clojure
(defn parse-int [s]
  (try
    (Integer/parseInt s)
    (catch NumberFormatException e
      (println "not a number:" s)
      nil)
    (finally
      (println "parse attempt done"))))

(parse-int "42")   ;; => 42
(parse-int "oops") ;; prints message, => nil
```

`catch` clauses dispatch on the exception's Java class. `finally` always runs, for cleanup. `throw` raises any `Throwable`.

### ex-info and ex-data — exceptions carrying data

`ex-info` constructs a `clojure.lang.ExceptionInfo` with a message, a data map, and an optional cause. `ex-data` retrieves that map (returning `nil` for exceptions that carry none).

```clojure
(defn withdraw [account amount]
  (when (> amount (:balance account))
    (throw (ex-info "insufficient funds"
                    {:type    :insufficient-funds
                     :balance (:balance account)
                     :requested amount})))
  (update account :balance - amount))

(try
  (withdraw {:balance 100} 250)
  (catch clojure.lang.ExceptionInfo e
    (let [{:keys [type balance requested]} (ex-data e)]
      (println (format "Denied (%s): balance %d, requested %d"
                       (name type) balance requested)))))
;; prints: Denied (insufficient-funds): balance 100, requested 250
```

### Dispatching on error data

Because the context is data, you can branch on it cleanly instead of matching class hierarchies:

```clojure
(defn handle [f]
  (try
    {:status 200 :body (f)}
    (catch clojure.lang.ExceptionInfo e
      (case (:type (ex-data e))
        :validation      {:status 400 :body (ex-data e)}
        :not-found       {:status 404 :body {:error "not found"}}
        :unauthorized    {:status 401 :body {:error "unauthorized"}}
        {:status 500 :body {:error (ex-message e)}}))))
```

`ex-message` returns the exception's message string; `ex-cause` returns the wrapped cause, if any.

### Catching Java exceptions from interop

Interop can throw ordinary Java exceptions. Catch specific classes, or `Throwable`/`Exception` as a last resort:

```clojure
(try
  (slurp "/does/not/exist")
  (catch java.io.FileNotFoundException e
    (println "missing file:" (ex-message e)))
  (catch Exception e
    (println "unexpected:" (ex-message e))))
```

### with-open — deterministic resource cleanup

`with-open` closes anything implementing `java.io.Closeable` (or `AutoCloseable`) when its body finishes, even on exception — the idiomatic replacement for a manual `try`/`finally`:

```clojure
(with-open [rdr (clojure.java.io/reader "data.csv")]
  (doall (line-seq rdr)))
```

### Error handling philosophy

Idiomatic Clojure follows a few guidelines:

- **Throw exceptions for exceptional conditions**, not for ordinary control flow.
- **Attach data, not prose.** Prefer `(ex-info "msg" {:type ... , ...})` so callers branch on `:type`, never on the message text.
- **Handle at boundaries.** Let errors propagate to a layer that knows how to respond (HTTP handler, job runner) rather than catching everywhere.
- **Return `nil` or a value for expected "not found" cases**; reserve exceptions for genuine failures. Some teams adopt an explicit result map (`{:ok ...}` / `{:error ...}`) at boundaries, but core Clojure has no built-in `Result`/`Either` type.

---

## Examples

```clojure
;; Wrapping a lower-level failure with domain context (cause chaining)
(defn load-config [path]
  (try
    (edn/read-string (slurp path))
    (catch Exception e
      (throw (ex-info "failed to load config"
                      {:type :config-error :path path}
                      e)))))          ;; original exception preserved as the cause

;; A validation helper that accumulates errors as data
(defn validate-user [{:keys [name age] :as user}]
  (let [errors (cond-> []
                 (empty? name)      (conj {:field :name :msg "required"})
                 (or (nil? age)
                     (neg? age))    (conj {:field :age :msg "must be >= 0"}))]
    (if (seq errors)
      (throw (ex-info "invalid user" {:type :validation :errors errors}))
      user)))
```

---

## When to use

- Use `try`/`catch` at boundaries (request handlers, job entry points, resource I/O).
- Use `ex-info`/`ex-data` to raise domain errors that carry structured, inspectable context.
- Use `ex-info`'s third argument to chain the underlying cause when wrapping a lower-level exception.
- Use `with-open` for any `Closeable` resource so it is released deterministically.
- Branch on `(:type (ex-data e))` rather than parsing message strings.

## When NOT to use

- Do not use exceptions for ordinary control flow (e.g., signalling "no more items") — return `nil` or a value instead.
- Do not catch `Throwable` broadly and swallow it — you will hide real defects; catch the narrowest class you can handle.
- Do not encode error details only in the message string — put them in the data map.
- Do not re-throw without preserving the cause — you lose the original stack trace.
- Do not litter every function with `try`/`catch` — let errors flow to a boundary that can respond meaningfully.

---

## References

- [Clojure API — ex-info](https://clojuredocs.org/clojure.core/ex-info)
- [Clojure API — ex-data](https://clojuredocs.org/clojure.core/ex-data)
- [Clojure Reference — Special Forms (try/catch/throw)](https://clojure.org/reference/special_forms#try)
- [Clojure API — with-open](https://clojuredocs.org/clojure.core/with-open)
- *Programming Clojure* — Miller, Halloway & Bedra (Pragmatic Bookshelf, 3rd ed. 2018)
