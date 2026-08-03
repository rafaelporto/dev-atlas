---
type: concept
tags:
  - language
  - clojure
  - cli
  - overview
related:
  - languages/clojure/cli/building-clis
  - languages/clojure/overview
  - languages/clojure/toolchain
  - languages/clojure/deploy
language: "clojure"
---

# Clojure for CLIs & Terminal Apps

> Why babashka transformed Clojure's command-line story — instant startup and shebang scripts, no JVM warm-up — and a map of the ecosystem from `tools.cli` to `babashka/cli` and `cli-matic`.

---

## What is it?

A **command-line interface (CLI)** is a program you drive by typing a command, flags, and arguments into a terminal. Clojure has two very different ways to build one: on the **JVM** (rich, but slow to start) and with **babashka** (`bb`) — a GraalVM-native Clojure interpreter with **instant startup**, purpose-built for scripts and CLIs. Babashka is the reason Clojure is now a practical scripting language.

This article is the entry point to the CLI & Terminal cluster. It explains *why* babashka matters, the JVM trade-off, and *which* library to reach for, then hands off to the deep dive: [Building CLIs](building-clis.md).

## Why does it matter?

The JVM's startup latency — hundreds of milliseconds to boot the runtime and load classes — is fine for a long-running server but ruinous for a CLI invoked constantly in shells and pipelines. For years this kept Clojure out of scripting.

**Babashka** removes that barrier. It is a single native binary that runs Clojure with **sub-millisecond startup**, supports `#!/usr/bin/env bb` **shebang scripts**, and bundles batteries (much of `clojure.core`, common libraries, shelling out) so a script needs no dependency resolution. You get Clojure's expressiveness — immutable data, the sequence library, destructuring — with the responsiveness of a shell script. For automation, glue code, and developer tools, this is Clojure's real CLI story.

## How it works

There are two execution models. Pick based on startup sensitivity and dependency needs.

```
babashka (bb):   bb script.clj  ──▶  native interpreter, instant start, shebang-friendly
                 bb.edn tasks    ──▶  project task runner

JVM Clojure:     clojure -M -m app.core  ──▶  full JVM, slow start, any Maven dep
                 uberjar / GraalVM native-image ──▶  ship a jar or a native binary
```

| Path | When it fits |
|---|---|
| **babashka** | Scripts, automation, git-style dev tools, anything invoked often — startup and shebangs win. |
| **JVM + uberjar** | Tools needing arbitrary Maven dependencies babashka doesn't bundle, or heavy compute. |
| **JVM + GraalVM native-image** | You want a fast-starting native binary *and* JVM-only libraries — at the cost of a more complex build. |

Either way you write ordinary Clojure with a `-main` (or a top-level script) and read arguments.

### The ecosystem: what to reach for

```
┌─────────────────────────────────────────────────────────────┐
│  Subcommand framework            cli-matic · babashka.cli    │
├─────────────────────────────────────────────────────────────┤
│  Argument parsing                clojure.tools.cli           │
│                                  (parse-opts) · babashka.cli │
├─────────────────────────────────────────────────────────────┤
│  Runtime                         babashka (bb) · JVM Clojure │
└─────────────────────────────────────────────────────────────┘
```

**`clojure.tools.cli`** — the classic, portable option parser. `parse-opts` takes an option spec and returns parsed options, remaining args, and a generated summary. Works on both the JVM and babashka.

**`babashka/cli`** — a modern, data-first parser and subcommand dispatcher designed for babashka (also usable on the JVM). It maps arguments straight to a Clojure map and can expose functions as subcommands with minimal ceremony.

**`cli-matic`** — a higher-level, declarative framework: you describe commands, subcommands, and options as data, and it handles parsing, help, and dispatch. Covered in [Building CLIs](building-clis.md).

### TUIs in Clojure

Clojure's **TUI ecosystem is thin**. There is no mature native framework comparable to Go's Bubble Tea or Node's Ink. On the JVM you can use **clojure-lanterna** (a wrapper over Java's [Lanterna](../../java/cli/tui.md) — see the Java TUI article), and **trikl** is an experimental option; babashka scripts can drive ANSI escape codes directly for simple styling.

For a **rich full-screen TUI**, either use clojure-lanterna on the JVM or reach for a more mature ecosystem. This cluster therefore has no dedicated TUI article for Clojure.

## Examples

A babashka script parses arguments with `tools.cli` and runs instantly:

```clojure
#!/usr/bin/env bb
(require '[clojure.tools.cli :refer [parse-opts]])

(def cli-options
  [["-u" "--upper" "uppercase the greeting"]
   ["-n" "--name NAME" "who to greet" :default "world"]])

(let [{:keys [options arguments]} (parse-opts *command-line-args* cli-options)
      {:keys [upper name]} options
      greeting (str "Hello, " name "!")]
  ;; Diagnostics to stderr; result to stdout.
  (when (seq arguments)
    (binding [*out* *err*] (println "warning: extra arguments ignored")))
  (println (if upper (clojure.string/upper-case greeting) greeting)))
```

```console
$ ./greet.clj --name Ada --upper
HELLO, ADA!
```

No compilation, no JVM wait — the script starts instantly. For subcommands and packaging, see [Building CLIs](building-clis.md).

## When to use

- Scripts and automation you'd otherwise write in Bash/Python, but want Clojure's data handling and immutability for (via babashka).
- Developer tooling and git-style multi-command tools invoked frequently, where startup latency matters.
- CLIs that live inside a Clojure codebase and want to reuse its functions and data model.

## When NOT to use

- **A tool needing heavy JVM-only libraries** babashka can't run, *and* fast startup — you're stuck choosing between JVM latency and a complex GraalVM build.
- **Rich interactive TUIs** — the ecosystem is thin; prefer clojure-lanterna on the JVM or another language.
- **Distributing to a non-Clojure audience** that would need to install babashka or a JVM, where a self-contained binary from Go/Rust is simpler.
- **CPU-bound numeric workloads** where the JVM warm-up and JIT don't pay off for a short-lived process.

## References

- [babashka](https://babashka.org/) — the native Clojure scripting runtime and its book.
- [`clojure.tools.cli`](https://github.com/clojure/tools.cli)
- [`babashka/cli`](https://github.com/babashka/cli)
- [`cli-matic`](https://github.com/l3nz/cli-matic)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
