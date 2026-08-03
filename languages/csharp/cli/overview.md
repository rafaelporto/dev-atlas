---
type: concept
tags:
  - language
  - csharp
  - dotnet
  - cli
  - overview
related:
  - languages/csharp/cli/building-clis
  - languages/csharp/cli/tui
  - languages/csharp/overview
  - languages/csharp/toolchain
  - languages/csharp/deploy
language: "csharp"
---

# C# for CLIs & Terminal Apps

> Why .NET is now a strong CLI platform — Native AOT compiles to a fast, self-contained binary and the tooling is excellent — and a map of the ecosystem from System.CommandLine to Spectre.Console.

---

## What is it?

A **command-line interface (CLI)** is a program you drive by typing a command, flags, and arguments into a terminal. C# on .NET builds them well: the `dotnet` SDK itself is a CLI, as are the EF Core tools and many `dotnet tool` packages. Historically .NET needed a runtime installed and paid a startup cost, but **Native AOT** (.NET 7+) now produces a self-contained native binary with fast startup.

This article is the entry point to the CLI & Terminal cluster. It explains *when* C# fits CLIs and *which* library to reach for, then hands off to the deep dives: [Building CLIs](building-clis.md) and [Terminal UIs](tui.md).

## Why does it matter?

Two changes made .NET a serious CLI platform. **Single-file, self-contained publish** bundles the runtime so users don't install .NET separately. **Native AOT** goes further: it ahead-of-time-compiles to a native executable that starts in milliseconds with a small footprint — closing the gap with Go for tools invoked constantly.

On top of that, the tooling is first-class. **`dotnet tool install -g`** distributes a CLI through NuGet the way `npm i -g` does for Node. And when the tool lives inside an existing .NET codebase, building its CLI in C# reuses the same libraries and types. For teams already on .NET, there's little reason to leave the platform for tooling.

## How it works

A C# CLI is a program with a `Main` (or top-level statements). You parse arguments with a library, and publish either as a framework-dependent app, a self-contained single file, or a Native AOT binary.

```
Program.cs (top-level statements)
        │
        ├── dotnet run                              ──▶ dev loop
        ├── dotnet publish --self-contained         ──▶ bundles the runtime (one folder/file)
        └── dotnet publish -p:PublishAot=true       ──▶ native binary, fast start
```

| Property | What it means for CLIs |
|---|---|
| **Native AOT** | Fast-starting, self-contained native binary — no runtime install, small startup. |
| **`dotnet tool`** | Install/distribute CLIs via NuGet globally or per-project. |
| **System.CommandLine** | Microsoft's official parser — commands, options, arguments, help, completion. |
| **Rich ecosystem** | Spectre.Console for beautiful output; the whole NuGet ecosystem is available. |
| **`async` Main** | First-class async for I/O-bound tools. See [Async and Concurrency](../async-and-concurrency.md). |
| **Exit code from `Main`** | Return an `int`/`Task<int>` to set the process status. |

### The ecosystem: what to reach for

```
┌─────────────────────────────────────────────────────────────┐
│  Rich output / TUI               Spectre.Console ·           │
│                                  Terminal.Gui                │
├─────────────────────────────────────────────────────────────┤
│  Command framework (subcommands) System.CommandLine ·        │
│                                  Spectre.Console.Cli         │
├─────────────────────────────────────────────────────────────┤
│  Standard library                string[] args ·            │
│                                  CommandLineParser           │
└─────────────────────────────────────────────────────────────┘
```

**Standard library (`string[] args`)** — the raw arguments; fine for a trivial tool. **CommandLineParser** is a popular attribute-based NuGet parser if you want a lightweight option without Microsoft's library.

**System.CommandLine** — Microsoft's official, modern parser: a tree of `Command`s with typed `Option`s and `Argument`s, generated help, tab completion, and a hosting integration. The idiomatic choice for a general CLI. Covered in [Building CLIs](building-clis.md).

**Spectre.Console.Cli** — a declarative, typed command framework (part of Spectre.Console) where each command has a settings class; it pairs naturally with Spectre's rich rendering.

**Spectre.Console** and **Terminal.Gui** — for rich and full-screen terminal UIs respectively. Covered in [Terminal UIs](tui.md).

## Examples

A minimal System.CommandLine app wires options to a handler and returns an exit code:

```csharp
using System.CommandLine;

var nameArg = new Argument<string>("name", () => "world", "who to greet");
var upperOpt = new Option<bool>("--upper", "uppercase the greeting");

var root = new RootCommand("Greet someone") { nameArg, upperOpt };
root.SetHandler((string name, bool upper) =>
{
    var greeting = $"Hello, {name}!";
    Console.WriteLine(upper ? greeting.ToUpperInvariant() : greeting); // stdout
}, nameArg, upperOpt);

return await root.InvokeAsync(args); // returns the exit code
```

```console
$ dotnet run -- Ada --upper
HELLO, ADA!
```

`InvokeAsync` parses, runs the handler, prints errors and `--help` to the right streams, and yields an exit code. For subcommands, AOT publishing, and the Spectre alternative, see [Building CLIs](building-clis.md).

## When to use

- CLIs inside an existing .NET codebase that reuse its libraries and domain types.
- Tools you want to distribute via `dotnet tool` (NuGet) or as a Native AOT binary with fast startup.
- Rich, polished console output or full-screen TUIs (Spectre.Console / Terminal.Gui).
- Teams already fluent in C# who don't want to switch languages for tooling.

## When NOT to use

- **Tiny scripts** where even a self-contained .NET app is heavier than a shell script, and you don't want an AOT build.
- **When you need effortless cross-compilation** to many targets — Go's toolchain is more turnkey; AOT builds are per-platform.
- **Reaching an audience with neither .NET nor your binary** where another ecosystem's tools are already standard.
- **A quick one-off on your machine** — a shell or [Clojure/babashka](../../clojure/cli/overview.md) script is faster to write.

## References

- [System.CommandLine](https://learn.microsoft.com/dotnet/standard/commandline/) — Microsoft's official docs.
- [.NET Native AOT deployment](https://learn.microsoft.com/dotnet/core/deploying/native-aot/)
- [.NET Global and local tools](https://learn.microsoft.com/dotnet/core/tools/global-tools)
- [Spectre.Console](https://spectreconsole.net/)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
