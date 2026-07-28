# Clojure

> A study guide covering Clojure's functional, data-oriented core, its concurrency model, idiomatic patterns, and the REPL-driven toolchain.

---

## Overview & Philosophy

| Article | Description |
|---|---|
| [Overview](overview.md) | What Clojure is — a Lisp on the JVM — its best uses, ecosystem, and key design decisions |
| [Paradigms](paradigms.md) | Functional, data-oriented, and homoiconic styles; polymorphism via protocols and multimethods |

---

## Core Language

| Article | Description |
|---|---|
| [Data Structures and Immutability](data-structures-and-immutability.md) | Persistent collections, structural sharing, nested updates, transients, and EDN |
| [Sequences and Transducers](sequences-and-transducers.md) | The lazy seq abstraction and composable, source-independent transducers |
| [Error Handling](error-handling.md) | `try`/`catch`/`throw`, `ex-info`/`ex-data`, and the data-oriented error philosophy |
| [Namespaces and Dependencies](namespaces-and-deps.md) | `ns`, `require`/`import`, and dependencies via `deps.edn` (tools.deps) or Leiningen |

---

## Concurrency & State

| Article | Description |
|---|---|
| [Concurrency and State](concurrency.md) | Atoms, refs and STM, agents, and `core.async` channels for managing state |

---

## Patterns & Data

| Article | Description |
|---|---|
| [Clojure Patterns](clojure-patterns.md) | How GoF patterns dissolve into functions, data, protocols, and multimethods |
| [Databases and the "No ORM" Philosophy](databases-and-orms.md) | `next.jdbc`, HoneySQL, and Datomic — and why Clojure needs no ORM |

---

## Getting Started

| Article | Description |
|---|---|
| [Installation](installation.md) | Install a JDK and the official Clojure CLI (and optionally Leiningen) |
| [Project Setup](project-setup.md) | Create a `deps.edn` or Leiningen project, structure source, and start a REPL |
| [IDEs and REPL-Driven Development](ides.md) | Emacs/CIDER, VS Code/Calva, and IntelliJ/Cursive compared |
| [Testing](testing.md) | `clojure.test`, fixtures, `are`, `test.check`, and REPL-driven testing |

---

## Toolchain & Deploy

| Article | Description |
|---|---|
| [Toolchain](toolchain.md) | The `clj`/`clojure` CLI, `tools.build`, `clj-kondo`, `cljfmt`, and babashka |
| [Deploy](deploy.md) | Building an uberjar with `tools.build`, containerising with Docker, env config |
