---
type: concept
tags:
  - language
  - clojure
  - backend
related:
  - languages/clojure/project-setup
  - languages/clojure/toolchain
language: "clojure"
---
# Namespaces and Dependencies in Clojure

> Namespaces organize Clojure code into named scopes for vars, and `deps.edn` (tools.deps) or Leiningen declares the libraries a project pulls in.

---

## What is it?

A **namespace** is a named container for vars (definitions created with `def`, `defn`, etc.). Every piece of Clojure code lives in a namespace, declared at the top of the file with `ns`. Namespaces map one-to-one to files: the namespace `my.app.core` lives at `src/my/app/core.clj` (dots become directories, dashes become underscores on disk).

**Dependencies** are external libraries your project uses. Clojure has two dominant project/dependency tools: **tools.deps** (the official CLI tool, driven by a `deps.edn` file) and **Leiningen** (the long-standing community build tool, driven by `project.clj`).

---

## Why does it matter?

Namespaces are how Clojure avoids name collisions and expresses module boundaries — they are the unit of code organization, load order, and the REPL's working context. Getting `require`/`import` right is the difference between a REPL that reloads cleanly and one that fights you.

Dependency management determines reproducibility and how you consume the JVM's vast library ecosystem. `deps.edn` is data (EDN) describing exactly which coordinates and versions to put on the classpath; Leiningen wraps dependencies plus a full build lifecycle.

---

## How it works

### The `ns` form

Every file opens with an `ns` declaration that names the namespace and pulls in what it needs:

```clojure
(ns my.app.orders
  (:require [clojure.string :as str]
            [clojure.set :as set]
            [my.app.db :as db])
  (:import (java.time Instant LocalDate)
           (java.util UUID)))
```

- `:require` loads other **Clojure** namespaces.
- `:import` loads **Java** classes (so you can write `Instant` instead of `java.time.Instant`).

### require: alias, refer, refer-all

```clojure
;; Alias (idiomatic default) — call as str/upper-case
(require '[clojure.string :as str])
(str/upper-case "hi")           ;; => "HI"

;; Refer specific vars — call unqualified
(require '[clojure.set :refer [union intersection]])
(union #{1 2} #{2 3})           ;; => #{1 2 3}

;; Refer all (discouraged — pollutes the namespace, hides origins)
(require '[clojure.string :refer :all])
```

Prefer `:as` aliases: they keep every call site clear about where a function comes from. Reserve `:refer` for a small set of frequently-used names.

### Java interop imports

```clojure
(:import (java.util UUID)
         (java.time Instant))

(UUID/randomUUID)     ;; static method
(Instant/now)         ;; static method
(.toString (UUID/randomUUID))
```

Classes in `java.lang` (String, Integer, Math, …) are imported automatically.

### Namespace ↔ file mapping

| Namespace | File on disk |
|---|---|
| `my.app.core` | `src/my/app/core.clj` |
| `my.app.data-store` | `src/my/app/data_store.clj` (dash → underscore) |
| `my.app.core` (cljc) | `src/my/app/core.cljc` (Clojure + ClojureScript) |

### deps.edn (tools.deps)

`deps.edn` is a pure-data description of dependencies and aliases. The official Clojure CLI (`clj`/`clojure`) reads it to build the classpath.

```clojure
{:paths ["src" "resources"]

 :deps {org.clojure/clojure       {:mvn/version "1.12.5"}
        com.github.seancorfield/next.jdbc {:mvn/version "1.3.1118"}
        metosin/reitit            {:mvn/version "0.7.2"}}

 :aliases
 {;; extra deps + paths only when this alias is active
  :test {:extra-paths ["test"]
         :extra-deps  {lambdaisland/kaocha {:mvn/version "1.91.1392"}}
         :main-opts   ["-m" "kaocha.runner"]}

  ;; run a build script
  :build {:deps {io.github.clojure/tools.build {:mvn/version "0.10.5"}}
          :ns-default build}}}
```

Dependency coordinate types:

- `:mvn/version` — a Maven artifact from a Maven repository (the common case).
- `:git/url` + `:git/sha` (or `:git/tag`) — depend directly on a Git repository, no publishing step needed.
- `:local/root` — depend on a sibling project by filesystem path.

Run code and manage the classpath with the CLI:

```bash
clj                        # start a REPL with deps on the classpath
clj -M:test                # run with the :test alias's main-opts
clj -X my.app/start        # invoke a function with a data map of args
clj -T:build jar           # run a tool (build) in isolation
```

### Leiningen

Leiningen predates tools.deps and bundles dependencies with a full build lifecycle in `project.clj`:

```clojure
(defproject my-app "0.1.0-SNAPSHOT"
  :dependencies [[org.clojure/clojure "1.12.5"]
                 [ring/ring-core "1.13.0"]]
  :main ^:skip-aot my-app.core
  :profiles {:uberjar {:aot :all}})
```

```bash
lein deps       # fetch dependencies
lein repl       # start a REPL
lein test       # run tests
lein uberjar    # build a standalone jar
```

### deps.edn vs Leiningen

| | tools.deps (`deps.edn`) | Leiningen (`project.clj`) |
|---|---|---|
| Config format | EDN data | Clojure code (macro) |
| Scope | Dependencies + classpath | Dependencies + full build lifecycle |
| Build tasks | Delegated to `tools.build` / aliases | Rich built-in plugin ecosystem |
| Git deps | First-class (`:git/url`) | Via plugin |
| Official? | Yes (Clojure core team) | No (community, very mature) |

Both are widely used. New projects increasingly default to `deps.edn` + `tools.build`; many established codebases and plugins remain on Leiningen.

---

## Examples

```clojure
;; A well-formed application namespace
(ns my.app.report
  (:require [clojure.string :as str]
            [next.jdbc :as jdbc]
            [my.app.db :as db])
  (:import (java.time LocalDate)))

(defn daily-summary [ds day]
  (jdbc/execute! ds ["select * from orders where day = ?" day]))
```

```bash
# Add a dependency ad hoc for a REPL session (no file edit)
clj -Sdeps '{:deps {hiccup/hiccup {:mvn/version "2.0.0-RC3"}}}'

# Print the computed classpath
clj -Spath
```

---

## When to use

- Give every file exactly one `ns` form and match the namespace to the file path.
- Prefer `:as` aliases in `:require`; use `:refer` sparingly for a few hot names.
- Use `deps.edn` for new projects, with aliases to isolate test, build, and dev tooling.
- Use `:git/url` or `:local/root` deps to consume unpublished libraries during development.
- Keep using Leiningen when a project already relies on its plugins and lifecycle.

## When NOT to use

- Do not use `:refer :all` — it hides where names come from and causes shadowing bugs.
- Do not create circular namespace dependencies — Clojure loads namespaces top-down and will fail.
- Do not mix `deps.edn` and `project.clj` as sources of truth in the same project — pick one.
- Do not hardcode library versions in many places — centralize them in one `deps.edn`/`project.clj`.

---

## References

- [Clojure Reference — Namespaces](https://clojure.org/reference/namespaces)
- [Clojure — Deps and CLI Reference](https://clojure.org/reference/deps_and_cli)
- [tools.deps — GitHub](https://github.com/clojure/tools.deps)
- [Clojure — Guide: Deps and CLI](https://clojure.org/guides/deps_and_cli)
- [Leiningen — official site](https://leiningen.org)
