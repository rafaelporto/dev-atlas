---
type: concept
tags:
  - language
  - dart
  - cli
  - overview
related:
  - languages/dart/cli/building-clis
  - languages/dart/overview
  - languages/dart/toolchain
  - languages/dart/packages-and-pub
language: "dart"
---

# Dart for CLIs & Terminal Apps

> Why Dart is a quietly strong CLI language — it compiles to a single self-contained native executable with fast startup — and a map of the ecosystem from the `args` package to `CommandRunner` and `mason`.

---

## What is it?

A **command-line interface (CLI)** is a program you drive by typing a command, flags, and arguments into a terminal. Dart can build them and, crucially, `dart compile exe` turns a Dart program into a **single native executable** with no separate runtime to install — the same distribution win that makes Go popular for tooling. The Flutter and `mason` CLIs are themselves Dart programs.

This article is the entry point to the CLI & Terminal cluster. It explains *why* Dart fits CLIs and *which* library to reach for, then hands off to the deep dive: [Building CLIs](building-clis.md).

## Why does it matter?

Dart is best known for Flutter, but the same toolchain that AOT-compiles Flutter apps also compiles standalone command-line programs. `dart compile exe` produces a self-contained binary that starts in milliseconds and ships as one file — no `dart` SDK, no VM, no package cache on the user's machine.

That makes Dart a natural choice for **tooling inside a Dart/Flutter project**: build scripts, code generators, and project scaffolders can share the same language, packages, and types as the app they serve. `mason` (a popular code-generation/scaffolding tool) is the canonical example.

## How it works

A Dart CLI is a program with a `main(List<String> args)` entry point. During development you run it with `dart run`; to ship, you AOT-compile it.

```
dart source  ──dart run──▶  JIT execution (fast dev loop)
     │
     └──dart compile exe──▶  single native binary  ──ship──▶  runs with no SDK
```

The pieces that shape the ecosystem:

| Property | What it means for CLIs |
|---|---|
| **`dart compile exe`** | One self-contained native binary, fast startup — ship a single file, no runtime install. |
| **`dart run`** | Fast JIT dev loop; run without compiling while iterating. |
| **`dart:io`** | Standard library for stdin/stdout/stderr, files, processes, and `exit`. |
| **Sound null safety** | Fewer runtime surprises in the argument-handling code. See [Types and Null Safety](../types-and-null-safety.md). |
| **Per-target compile** | Compile on each target OS/arch; there is no single-command cross-compile matrix like Go's `GOOS`/`GOARCH`. |
| **Async-first** | `Future`/`Stream` make parallel I/O natural. See [Async Programming](../async-programming.md). |

### The ecosystem: what to reach for

```
┌─────────────────────────────────────────────────────────────┐
│  Scaffolding / generators        mason                       │
├─────────────────────────────────────────────────────────────┤
│  Command framework (subcommands) CommandRunner (args)        │
├─────────────────────────────────────────────────────────────┤
│  Standard library                dart:io · args (ArgParser)  │
└─────────────────────────────────────────────────────────────┘
```

**`args` package (`ArgParser`)** — the official Dart argument parser. `ArgParser` handles flags, options, and defaults for a single-purpose tool.

**`CommandRunner` (also in `args`)** — for git-style multi-command CLIs (`tool add`, `tool list`), you subclass `Command` and register commands with a `CommandRunner`. It generates `--help` and dispatches subcommands. Covered in [Building CLIs](building-clis.md).

**`cli_completion`** — adds shell completion to a `CommandRunner`-based app. **`mason`** builds on this stack for scaffolding/code generation.

### TUIs in Dart

Dart's **TUI ecosystem is immature**. There is no mature, widely-adopted framework comparable to Go's Bubble Tea or Node's Ink. A few community packages exist — `dart_console` (cursor control, key reading), `mansion` (ANSI helpers), and small experimental `tui` packages — but they are niche and not a safe foundation for a large interactive app.

For simple styled output you can emit ANSI escape codes directly or use `dart_console`. If you need a **rich full-screen TUI**, prefer a mature ecosystem (see [Go — Terminal UIs](../../go/cli/tui.md) or [Node.js — Terminal UIs](../../nodejs/cli/tui.md)). This cluster therefore has no dedicated TUI article for Dart.

## Examples

The smallest useful CLI needs only `dart:io` and `args`:

```dart
import 'dart:io';
import 'package:args/args.dart';

void main(List<String> arguments) {
  final parser = ArgParser()
    ..addFlag('upper', defaultsTo: false, help: 'uppercase the greeting')
    ..addOption('name', defaultsTo: 'world', help: 'who to greet');

  final results = parser.parse(arguments);
  var greeting = 'Hello, ${results['name']}!';
  if (results['upper'] as bool) greeting = greeting.toUpperCase();

  // Diagnostics go to stderr; results go to stdout (see building-clis).
  if (results.rest.isNotEmpty) {
    stderr.writeln('warning: extra arguments ignored');
  }
  stdout.writeln(greeting);
}
```

```console
$ dart run bin/greet.dart --name Ada --upper
HELLO, ADA!
$ dart compile exe bin/greet.dart -o greet && ./greet --name Ada
Hello, Ada!
```

For anything larger — subcommands, completion — move up to `CommandRunner` ([Building CLIs](building-clis.md)).

## When to use

- Tooling that lives inside a Dart or Flutter project — build scripts, codegen, scaffolders that share the app's packages and types.
- CLIs you want to ship as a single native binary with fast startup.
- Teams already fluent in Dart who don't want to context-switch to another language for tooling.

## When NOT to use

- **When you need one-command cross-compilation** to many OS/arch targets — Go's toolchain is more turnkey here.
- **Rich interactive TUIs** — Dart's TUI libraries are immature; prefer Go or Node.
- **A trivial one-off script** on your own machine — a shell script needs no compile step.
- **Reaching a non-Dart audience with no Dart tooling** where another ecosystem's binaries are already the norm.

## References

- [Dart: Write command-line apps](https://dart.dev/tutorials/server/cmdline)
- [`args` package](https://pub.dev/packages/args)
- [`dart compile`](https://dart.dev/tools/dart-compile)
- [`mason` — scaffolding and code generation](https://pub.dev/packages/mason_cli)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
