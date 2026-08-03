---
type: concept
tags:
  - language
  - swift
  - cli
  - overview
related:
  - languages/swift/cli/building-clis
  - languages/swift/overview
  - languages/swift/swift-package-manager
  - languages/swift/toolchain
language: "swift"
---

# Swift for CLIs & Terminal Apps

> Why Swift is a capable CLI language beyond apps — it compiles to a fast native binary and Apple ships an official argument parser — and a map of the ecosystem from swift-argument-parser to SwiftPM executables.

---

## What is it?

A **command-line interface (CLI)** is a program you drive by typing a command, flags, and arguments into a terminal. Swift compiles to a native binary and is a first-class language for command-line tools on macOS and Linux. Apple's own developer tooling (parts of `swift` itself, `swift-format`, and many internal tools) is built with **swift-argument-parser**, the official CLI library.

This article is the entry point to the CLI & Terminal cluster. It explains *why* Swift fits CLIs and *which* library to reach for, then hands off to the deep dive: [Building CLIs](building-clis.md).

## Why does it matter?

Swift is not just for iOS/macOS apps. `swift build` compiles a command-line tool to a native executable with fast startup and a small footprint — a genuine fit for developer tooling, especially on Apple platforms where Swift is already the primary language.

**swift-argument-parser** is what makes it pleasant: you declare your interface as a `struct` with property wrappers (`@Argument`, `@Option`, `@Flag`), and the library derives parsing, validation, `--help`, and error messages from the type. It reads like defining a data model, not writing a parser. For teams already in Swift, building a CLI carries almost no new conceptual cost.

## How it works

A Swift CLI is a SwiftPM package with an **executable target**. The `@main` entry point conforms to `ParsableCommand`; the property wrappers on its stored properties define the command-line interface.

```
Package.swift (executableTarget)
        │
        ▼
  swift build ──▶ native binary in .build/  ──swift build -c release──▶ ship
        │
        └── @main ParsableCommand: @Argument / @Option / @Flag → parsed, validated
```

The pieces that shape the ecosystem:

| Property | What it means for CLIs |
|---|---|
| **Native binary** | Compiles to a fast-starting executable; no interpreter to install on the target. |
| **swift-argument-parser** | Declarative, type-driven parsing with generated help and validation. |
| **SwiftPM `executableTarget`** | First-class build/run/test for command-line tools. |
| **Value types + optionals** | Sound handling of present/absent arguments. See [Types and Optionals](../types-and-optionals.md). |
| **Structured concurrency** | `async`/`await` for parallel I/O. See [Concurrency](../concurrency.md). |
| **Cross-compilation is manual** | Building for a different OS/arch needs an SDK/toolchain setup; less turnkey than Go. |

### The ecosystem: what to reach for

```
┌─────────────────────────────────────────────────────────────┐
│  Distribution                    Homebrew formula · SwiftPM  │
├─────────────────────────────────────────────────────────────┤
│  Command framework (subcommands) swift-argument-parser       │
│                                  (ParsableCommand)           │
├─────────────────────────────────────────────────────────────┤
│  Standard library                CommandLine.arguments       │
│                                  · Foundation (FileHandle)   │
└─────────────────────────────────────────────────────────────┘
```

**Standard library (`CommandLine.arguments`)** — the raw argument array. Fine for a trivial tool, but you parse everything by hand.

**swift-argument-parser (`ParsableCommand`)** — the idiomatic choice for anything real. A single command is one `struct`; a git-style tool declares subcommands via `CommandConfiguration(subcommands:)`. Async tools use `AsyncParsableCommand`. Covered in [Building CLIs](building-clis.md).

**Distribution** — build a release binary (`swift build -c release`) and ship it, or publish a Homebrew formula so users `brew install` it.

### TUIs in Swift

Swift's **TUI ecosystem is experimental**. There is no mature, widely-adopted framework comparable to Go's Bubble Tea or Node's Ink. Community projects like **SwiftTUI** (a SwiftUI-like API for the terminal) and **swift-tui** exist and are interesting, but they are young and not a safe foundation for a large production TUI.

For styled output you can emit ANSI escape codes directly. If you need a **rich full-screen TUI**, prefer a mature ecosystem (see [Go — Terminal UIs](../../go/cli/tui.md) or [Node.js — Terminal UIs](../../nodejs/cli/tui.md)). This cluster therefore has no dedicated TUI article for Swift.

## Examples

The smallest useful CLI with swift-argument-parser is one `struct`:

```swift
import ArgumentParser

@main
struct Greet: ParsableCommand {
    @Argument(help: "who to greet")
    var name: String = "world"

    @Flag(help: "uppercase the greeting")
    var upper = false

    func run() throws {
        var greeting = "Hello, \(name)!"
        if upper { greeting = greeting.uppercased() }
        print(greeting) // stdout
    }
}
```

```console
$ swift run greet Ada --upper
HELLO, ADA!
```

The library generated the parsing, the `--help`, and the error for an unknown flag — all from the property wrappers. For subcommands, validation, and async, move to the full guide ([Building CLIs](building-clis.md)).

## When to use

- Command-line tooling on macOS or Linux, especially inside an Apple-platform codebase already written in Swift.
- Build tools, code generators, and utilities that benefit from a fast native binary.
- Teams fluent in Swift who want type-safe, declarative argument parsing.

## When NOT to use

- **When you need turnkey cross-compilation** to many OS/arch targets — Go's toolchain is more convenient.
- **Rich interactive TUIs** — Swift's TUI libraries are experimental; prefer Go or Node.
- **A quick throwaway script** — a shell script needs no package or build step.
- **Reaching a non-Apple, non-Swift audience** where another ecosystem's binaries are the norm and Swift's presence on the target is uncertain.

## References

- [Swift Argument Parser](https://github.com/apple/swift-argument-parser) — Apple's official CLI library and its guides.
- [Swift Package Manager](https://www.swift.org/documentation/package-manager/)
- [`ArgumentParser` documentation](https://swiftpackageindex.com/apple/swift-argument-parser/documentation)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
