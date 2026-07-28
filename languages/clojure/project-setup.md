---
type: how-to
tags:
  - language
  - clojure
  - backend
related:
  - languages/clojure/installation
  - languages/clojure/namespaces-and-deps
  - languages/clojure/toolchain
language: "clojure"
---
# Clojure Project Setup

> How to create a new Clojure project with either `deps.edn` (tools.deps) or Leiningen, structure its source, and start a REPL against it.

---

## Prerequisites

- A JDK and the Clojure CLI installed (`clj --version` prints a result) — see [Installing Clojure](installation.md)
- (Optional) Leiningen installed if you prefer it (`lein version`)
- Basic familiarity with the terminal

---

## Steps

### 1. Create a deps.edn project by hand

A minimal tools.deps project is just a directory, a `deps.edn`, and a source tree. There is no scaffolding required.

```bash
mkdir myapp && cd myapp
mkdir -p src/my/app test/my/app
```

Create `deps.edn`:

```clojure
{:paths ["src" "resources"]

 :deps {org.clojure/clojure {:mvn/version "1.12.5"}}

 :aliases
 {:test {:extra-paths ["test"]
         :extra-deps  {lambdaisland/kaocha {:mvn/version "1.91.1392"}}
         :main-opts   ["-m" "kaocha.runner"]}}}
```

Create the entry namespace `src/my/app/core.clj`:

```clojure
(ns my.app.core
  (:gen-class))

(defn greet [name]
  (str "Hello, " name "!"))

(defn -main [& args]
  (println (greet (or (first args) "world"))))
```

Recall the namespace-to-path rule: `my.app.core` lives at `src/my/app/core.clj` (dots become directories; dashes in a name become underscores on disk).

---

### 2. Or scaffold with a template

`deps-new` generates a conventional project layout (app or library) from a template:

```bash
# One-off invocation of the deps-new tool
clojure -Sdeps '{:deps {io.github.seancorfield/deps-new {:git/tag "v0.7.0" :git/sha "..."}}}' \
  -Tnew create :template app :name my/app
```

The equivalent with Leiningen:

```bash
lein new app my-app
```

Both produce `src/`, `test/`, a build config, and a runnable entry point.

---

### 3. Run and start a REPL

```bash
# Run the -main entry point (deps.edn)
clj -M -m my.app.core Ada          # prints: Hello, Ada!

# Start a REPL with the project's classpath
clj

# With Leiningen
lein run Ada
lein repl
```

Inside the REPL, load and use your namespace:

```clojure
user=> (require '[my.app.core :as core])
user=> (core/greet "Grace")
"Hello, Grace!"
```

---

### 4. Add dependencies

**deps.edn** — add a coordinate under `:deps`:

```clojure
{:deps {org.clojure/clojure {:mvn/version "1.12.5"}
        metosin/reitit      {:mvn/version "0.7.2"}
        ring/ring-jetty-adapter {:mvn/version "1.13.0"}}}
```

The next `clj` invocation downloads and puts them on the classpath. Depend on unpublished code directly:

```clojure
{:deps {some/lib {:git/url "https://github.com/user/lib" :git/sha "abc123..."}
        sibling  {:local/root "../sibling"}}}
```

**Leiningen** — add to the `:dependencies` vector in `project.clj`:

```clojure
:dependencies [[org.clojure/clojure "1.12.5"]
               [metosin/reitit "0.7.2"]]
```

---

### 5. Recommended directory layout

```
myapp/
├── deps.edn                 # or project.clj for Leiningen
├── src/
│   └── my/
│       └── app/
│           ├── core.clj     # entry point / -main
│           ├── db.clj
│           └── http.clj
├── test/
│   └── my/
│       └── app/
│           └── core_test.clj
├── resources/               # config, static assets, migrations
│   └── config.edn
└── dev/                     # dev-only REPL helpers (user.clj), on a :dev alias
```

Key conventions:
- **`src/`** — production namespaces, mirroring the package path.
- **`test/`** — test namespaces, typically added via a `:test` alias (`:extra-paths`), not the default `:paths`.
- **`resources/`** — non-code assets on the classpath (EDN config, SQL, templates).
- **`dev/`** — a `user` namespace with REPL conveniences, loaded only under a dev alias.

---

## Verification

```bash
clj -M -m my.app.core        # runs -main, prints greeting
clj -X:test                  # runs the test suite (with the :test alias)
clj -Spath                   # prints the computed classpath (sanity check)
```

From a REPL:

```clojure
user=> (require 'my.app.core)   ;; returns nil with no error ⇒ namespace loads cleanly
nil
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Could not locate my/app/core__init.class ...` | Namespace/file path mismatch | Ensure `my.app.core` maps to `src/my/app/core.clj` (dash → underscore) |
| `Execution error ... :test` alias not found | Alias missing from `deps.edn` | Add the `:test` alias, or run without `:test` |
| Tests not found | `test/` not on the classpath | Add `:extra-paths ["test"]` under the `:test` alias |
| Dependency not downloaded | Typo in coordinate or version | Check the exact group/artifact/version; run `clj -Sforce -Spath` |
| `-main` not invoked | Missing `-m` or `(:gen-class)` when AOT-compiling | Use `clj -M -m my.app.core`; add `(:gen-class)` for uberjar entry points |

---

## References

- [Clojure — Deps and CLI Guide](https://clojure.org/guides/deps_and_cli)
- [Clojure — Deps and CLI Reference](https://clojure.org/reference/deps_and_cli)
- [deps-new — GitHub](https://github.com/seancorfield/deps-new)
- [Leiningen — official site](https://leiningen.org)
- [Clojure — Programming at the REPL](https://clojure.org/guides/repl/introduction)
