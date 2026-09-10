# CLI and TUI Architecture

Architectural concepts and patterns for programs whose interface is the terminal — how a command line becomes a validated call on a core, how a command tree is shaped, how a full-screen interface holds and repaints its state, and how the source of a terminal program is organized as it grows. Language- and framework-agnostic: for the toolkits, parsers, and terminal libraries of a specific ecosystem, each article links into the [Languages](../../../languages/README.md) section.

Start with the [Overview](overview.md) for the taxonomy — the two axes that separate a plain CLI from a rich-output CLI from a full-screen TUI, and the definition this section uses for each.

---

## Articles

| Article | Description |
|---|---|
| [Overview](overview.md) | The terminal-program taxonomy: inline vs full-screen, non-interactive vs event-driven, and the two audiences every terminal program serves |
| [CLI Architecture](cli-architecture.md) | Parse to validated command to pure core to renderer; command trees, error-to-exit-code taxonomy, machine-readable output, and subprocess plugins |
| [TUI Architecture](tui-architecture.md) | The three architectural families — Elm/TEA, retained-mode widget tree, immediate mode — plus the render pipeline, input and focus, layout, and testing |
| [Project Organization](project-organization.md) | Module boundaries for terminal programs: the thin entry point, the core-first layout, command-per-file vs feature slice, and the public API surface |
| [Antipatterns](antipatterns.md) | The recurring failures, each with symptom, mechanism, and repair — and when each one is actually the right call |

---

## Language-specific depth

These articles stop at the concept. The toolkits, the argument parsers, and the terminal libraries live here:

| Language | Section |
|---|---|
| [Go](../../../languages/go/cli/README.md) | `flag`, Cobra, Viper, Bubble Tea, Lip Gloss, tview, terminal internals |
| [Node.js](../../../languages/nodejs/cli/README.md) | `parseArgs`, Commander, oclif, Ink, blessed |
| [Java](../../../languages/java/cli/README.md) | picocli, GraalVM native-image, Lanterna |
| [C#](../../../languages/csharp/cli/README.md) | System.CommandLine, Spectre.Console, Terminal.Gui, Native AOT |
| [Swift](../../../languages/swift/cli/README.md) | swift-argument-parser, SwiftPM executables |
| [Dart](../../../languages/dart/cli/README.md) | `args`, `CommandRunner`, compiled executables |
| [Clojure](../../../languages/clojure/cli/README.md) | `tools.cli`, babashka, cli-matic |

---

> The two axes are independent. A program can be non-interactive and still render tables and progress; it can be full-screen and still expose every one of its actions as a scriptable subcommand. The common mistake is coupling them — see the [Overview](overview.md) for why "rich output" and "TUI" are not the same choice.
