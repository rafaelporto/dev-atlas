---
type: concept
tags:
  - language
  - clojure
  - backend
related:
  - languages/clojure/namespaces-and-deps
  - languages/clojure/testing
  - languages/clojure/deploy
language: "clojure"
---
# Clojure Toolchain

> A tour of the tools Clojure developers use daily: the `clj`/`clojure` CLI, `tools.build` for artifacts, `clj-kondo` for linting, and `cljfmt` for formatting.

---

## What is it?

The Clojure toolchain is the set of command-line tools that build, run, lint, and format Clojure code. Unlike Go, Clojure does not ship a single monolithic `go`-style command; instead it provides the official **Clojure CLI** (`clj`/`clojure`) for running code and managing dependencies, plus a small ecosystem of focused, composable tools invoked through it: **tools.build** (building jars), **clj-kondo** (static analysis), and **cljfmt** (formatting).

---

## Why does it matter?

The CLI's design — dependencies and tasks described as EDN data, tools invoked in isolation via aliases — keeps build tooling lightweight and reproducible. Understanding which tool does what (run vs. build vs. lint vs. format) means you can assemble exactly the workflow a project needs without adopting a heavyweight, all-in-one build system.

---

## How it works

### The clj / clojure CLI

`clojure` is the driver; `clj` is the same driver wrapped in `rlwrap` for interactive use. Both read `deps.edn` and support four execution flavors distinguished by flag:

```bash
clj                         # start an interactive REPL
clj -M -m my.app.core       # -M: run with clojure.main (main-opts, -m namespace)
clj -X my.app/start         # -X: invoke a fn with a map of args (exec-fn/exec-args)
clj -T:build jar            # -T: run a tool in isolation (its own classpath)
clj -A:dev                  # activate an alias for the REPL
```

Useful classpath and dependency commands:

```bash
clj -Spath                  # print the computed classpath
clj -Stree                  # show the dependency tree
clj -Sforce -Spath          # recompute, ignoring caches
clj -Sdeps '{:deps {...}}'  # add deps ad hoc for one invocation
clj -P                      # prepare/download deps without running
```

The distinction between `-M`, `-X`, and `-T` matters:

| Flag | Purpose | Args style |
|---|---|---|
| `-M` | Run via `clojure.main` | command-line `:main-opts` (`-m ns`, args) |
| `-X` | Execute a function | a map of `:exec-args` (`:key val`) |
| `-T` | Run a build/tool in isolation | like `-X`, but with an isolated classpath |

### tools.build — building artifacts

`tools.build` is the official library for programmatic builds: compiling, making jars, and assembling uberjars. Builds are ordinary Clojure — you write a `build.clj` with functions and invoke them via a `:build` alias run with `-T`.

```clojure
;; build.clj
(ns build
  (:require [clojure.tools.build.api :as b]))

(def class-dir "target/classes")
(def uber-file "target/app-standalone.jar")
(def basis (b/create-basis {:project "deps.edn"}))

(defn clean [_]
  (b/delete {:path "target"}))

(defn uber [_]
  (clean nil)
  (b/copy-dir {:src-dirs ["src" "resources"] :target-dir class-dir})
  (b/compile-clj {:basis basis :src-dirs ["src"] :class-dir class-dir})
  (b/uber {:class-dir class-dir
           :uber-file uber-file
           :basis basis
           :main 'my.app.core}))
```

```bash
clj -T:build uber      # produces target/app-standalone.jar
clj -T:build clean
```

### clj-kondo — linting and static analysis

[clj-kondo](https://github.com/clj-kondo/clj-kondo) is a fast, standalone linter that catches unused bindings, arity errors, unresolved symbols, shadowed vars, and many other issues — without evaluating your code. It powers the diagnostics in most editors via `clojure-lsp`.

```bash
# Install (macOS)
brew install borkdude/brew/clj-kondo

# Lint the source tree
clj-kondo --lint src test
```

Configuration lives in `.clj-kondo/config.edn`:

```clojure
{:linters {:unused-namespace {:level :warning}
           :unresolved-symbol {:level :error}}}
```

### cljfmt — formatting

[cljfmt](https://github.com/weavejester/cljfmt) formats Clojure source to consistent indentation and whitespace. Run it via an alias:

```clojure
;; deps.edn alias
:cljfmt {:extra-deps {dev.weavejester/cljfmt {:mvn/version "0.13.0"}}
         :main-opts  ["-m" "cljfmt.main"]}
```

```bash
clj -M:cljfmt check      # report files needing formatting
clj -M:cljfmt fix        # rewrite files in place
```

Editors format on save through their own integrations (`cljfmt`, `zprint`, or `clojure-lsp`), so most formatting happens automatically.

### babashka — fast scripting

[babashka](https://babashka.org) (`bb`) is a native-compiled Clojure scripting runtime with near-instant startup. It runs Clojure scripts and shebang files where JVM warmup would be too slow — build glue, git hooks, CI steps.

```bash
bb -e '(println (* 6 7))'    # => 42
bb my-script.clj
```

---

## Examples

A typical `deps.edn` assembling the toolchain via aliases:

```clojure
{:paths ["src" "resources"]
 :deps  {org.clojure/clojure {:mvn/version "1.12.5"}}
 :aliases
 {:test  {:extra-paths ["test"]
          :extra-deps  {lambdaisland/kaocha {:mvn/version "1.91.1392"}}
          :main-opts   ["-m" "kaocha.runner"]}
  :build {:deps      {io.github.clojure/tools.build {:mvn/version "0.10.5"}}
          :ns-default build}
  :cljfmt {:extra-deps {dev.weavejester/cljfmt {:mvn/version "0.13.0"}}
           :main-opts  ["-m" "cljfmt.main"]}}}
```

A day's commands:

```bash
clj                    # REPL for interactive development
clj -X:test            # run tests
clj-kondo --lint src   # lint
clj -M:cljfmt fix      # format
clj -T:build uber      # build a standalone jar
```

---

## When to use

- Use `clj`/`clojure` for every run: REPL, running mains (`-M`), invoking functions (`-X`), and tools (`-T`).
- Use `tools.build` with a `build.clj` for jars and uberjars — it is the official, programmatic build path.
- Run `clj-kondo` locally and in CI; wire it into your editor for live diagnostics.
- Run `cljfmt` (or format-on-save) to keep diffs clean.
- Use `babashka` for scripts and automation where JVM startup latency would hurt.

## When NOT to use

- Do not confuse `-M`, `-X`, and `-T` — using the wrong one leads to "cannot find main" or classpath surprises.
- Do not hand-roll jar assembly with shell scripts — use `tools.build`.
- Do not skip `clj-kondo` in CI — it catches arity and unresolved-symbol errors that dynamic typing would otherwise defer to runtime.
- Do not use babashka for CPU-heavy, long-running services — it is optimized for fast-start scripts, not sustained JVM throughput.

---

## References

- [Clojure — Deps and CLI Reference](https://clojure.org/reference/deps_and_cli)
- [tools.build — official guide](https://clojure.org/guides/tools_build)
- [clj-kondo — GitHub](https://github.com/clj-kondo/clj-kondo)
- [cljfmt — GitHub](https://github.com/weavejester/cljfmt)
- [babashka — official site](https://babashka.org)
- [clojure-lsp — official site](https://clojure-lsp.io/)
