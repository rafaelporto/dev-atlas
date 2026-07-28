---
type: concept
tags:
  - language
  - csharp
  - dotnet
  - backend
  - overview
related:
  - languages/csharp/paradigms
  - languages/csharp/types-and-nullability
  - languages/csharp/packages-and-nuget
language: "csharp"
---
# C# and .NET Overview

> C# is a statically typed, object-oriented and functional language from Microsoft, running on the cross-platform .NET runtime to build web services, desktop apps, games, and cloud back ends.

---

## What is it?

C# (pronounced "C sharp") is a general-purpose programming language created by Microsoft, first released in 2002 and led in its design by Anders Hejlsberg. It runs on **.NET**, a managed runtime and class library that compiles C# to an intermediate language (IL), which the runtime's just-in-time (JIT) or ahead-of-time (AOT) compiler turns into native code.

C# is statically typed with garbage collection, a rich type system, and first-class support for both object-oriented and functional styles. Since the 2016 arrival of **.NET Core**, the language and its runtime are open source and run on Windows, Linux, and macOS.

---

## Why does it matter?

C# occupies the same niche as Java — a managed, general-purpose language for large systems — but has evolved far faster over the last decade. It brings together a mature standard library, one of the strongest tooling stories in the industry (Visual Studio, Rider), and a runtime that is consistently near the top of web-framework performance benchmarks.

The pivotal shift was the **.NET Framework → .NET Core → .NET 5+** transition. The legacy .NET Framework was Windows-only and closed. Modern .NET is cross-platform, open source, and released on a predictable yearly cadence. This turned C# from "the Windows enterprise language" into a credible default for cloud back ends and containers on Linux.

C# is also the language of **Unity**, making it one of the most widely used languages in game development.

---

## What can you build with C#?

| Domain | Fit | Notes |
|---|---|---|
| Backend / web APIs | ⭐ Strong | ASP.NET Core |
| Desktop (Windows) | ⭐ Strong | WPF, WinUI |
| Cross-platform mobile | 🟢 Solid | .NET MAUI |
| Games | ⭐ Strong | Unity |
| Frontend (web UI) | 🟡 Evolving | Blazor maturing |
| IoT / embedded | 🟡 Promising | .NET IoT, nanoFramework |
| CLI / scripting | 🟠 Limited | heavier than Go/Python |

> Not the best fit for: quick shell-style scripting (Python or Bash are lighter), data science and ML modelling (Python dominates the ecosystem), and native cross-platform desktop where a single tiny binary matters more than framework depth (Go, Rust).

---

## Key highlights

**Rich, evolving type system**
Records for value-semantic data, structs and `readonly struct` for stack-friendly value types, nullable reference types for compile-time null-safety, and generics with variance. See [Types and Nullability](types-and-nullability.md).

**async/await built into the language**
C# introduced `async`/`await` in 2012, and the pattern became a model copied by JavaScript, Python, Rust, and others. `Task`-based concurrency is a first-class citizen. See [Async and Concurrency](async-and-concurrency.md).

**LINQ**
Language-Integrated Query lets you write declarative, composable queries over in-memory collections, databases, and XML with the same syntax. See [LINQ and Collections](linq-and-collections.md).

**Both OOP and functional**
Classes, interfaces, and inheritance sit alongside immutability, pattern matching, expression-bodied members, and higher-order functions. See [Paradigms](paradigms.md).

**High-performance runtime**
Tiered JIT compilation, `Span<T>` for zero-allocation slicing, and Native AOT for startup-sensitive workloads. ASP.NET Core routinely tops independent web benchmarks.

**Unified tooling**
The `dotnet` CLI, MSBuild, and NuGet ship together and work identically across platforms. See [Toolchain](toolchain.md) and [Packages and NuGet](packages-and-nuget.md).

---

## Ecosystem highlights

| Area | Notable libraries / frameworks |
|---|---|
| Web / APIs | ASP.NET Core, Minimal APIs, gRPC |
| ORM / data | Entity Framework Core, Dapper, ADO.NET |
| Desktop | WPF, WinUI 3, Windows Forms |
| Cross-platform UI | .NET MAUI, Avalonia, Uno Platform |
| Web UI | Blazor (Server and WebAssembly) |
| Games | Unity, Godot (C# support), MonoGame |
| Testing | xUnit, NUnit, MSTest, Moq, FluentAssertions |
| DI / config | `Microsoft.Extensions.DependencyInjection`, Options pattern |
| Serialization | `System.Text.Json`, Newtonsoft.Json |
| Observability | OpenTelemetry .NET, Serilog |

---

## Versions worth knowing

**.NET Framework (2002–)** — the original, Windows-only, closed-source runtime. Version 4.8 is the last; it is still supported for legacy apps but receives no new features. Do not start new projects on it.

**.NET Core (2016–2019)** — the cross-platform, open-source rewrite. Versions 1.x–3.1.

**.NET 5+ (2020–)** — the unification. Microsoft dropped "Core" from the name to signal that this is now the single .NET going forward. There is no ".NET 4" to avoid confusion with .NET Framework 4.x.

Release cadence: one major version every November. **Even-numbered releases are LTS (3 years of support); odd-numbered are STS (2 years).**

| Version | Released | Type | C# version |
|---|---|---|---|
| .NET 10 | Nov 2025 | **LTS (current)** | C# 14 |
| .NET 9 | Nov 2024 | STS | C# 13 |
| .NET 8 | Nov 2023 | LTS | C# 12 |

For new production work, target the current LTS (**.NET 10**) unless you specifically need something newer. All releases before .NET 8 are out of support.

---

## Design decisions worth knowing

**Managed memory** — a tracing garbage collector reclaims memory automatically. You rarely allocate or free manually; deterministic cleanup of unmanaged resources uses `IDisposable` and `using`.

**Reference vs value types** — classes are reference types (heap, passed by reference); structs are value types (copied). Choosing correctly matters for performance and semantics.

**Nullable reference types are opt-in** — enabling `<Nullable>enable</Nullable>` turns null-related warnings on so the compiler tracks possible `null`. New templates enable it by default.

**Exceptions, not error values** — unlike Go, C# signals failure by throwing exceptions. Idiomatic code reserves them for exceptional conditions, not control flow. See [Error Handling](error-handling.md).

**Everything is a project + solution** — code is organized into `.csproj` project files (SDK-style, MSBuild-based) grouped by `.sln` solutions. See [Project Setup](project-setup.md).

---

## References

- [C# documentation — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/)
- [.NET documentation — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/)
- [The history of C# — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-version-history)
- [.NET and .NET Core support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
- [A tour of the C# language — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/)
