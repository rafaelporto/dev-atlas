# C#

> A study guide covering C#'s core concepts, paradigms, idioms, and the .NET toolchain.

---

## Overview & Philosophy

| Article | Description |
|---|---|
| [Overview](overview.md) | What C# and .NET are, best uses, ecosystem highlights, versions, and key design decisions |
| [Paradigms](paradigms.md) | Which paradigms C# supports — object-oriented, functional, imperative — and when to use each |

---

## Core Language

| Article | Description |
|---|---|
| [Types and Nullability](types-and-nullability.md) | Value vs reference types, records, structs, and nullable reference types |
| [Error Handling](error-handling.md) | Exceptions, try/catch/finally, exception filters, `using`, and the Try pattern |
| [LINQ and Collections](linq-and-collections.md) | LINQ operators, deferred execution, and choosing the right collection type |

---

## Async & Data

| Article | Description |
|---|---|
| [Async and Concurrency](async-and-concurrency.md) | `async`/`await`, `Task`, TPL, cancellation, channels, and async streams |
| [Databases and ORMs](databases-and-orms.md) | EF Core, Dapper, and ADO.NET — full ORM vs micro-ORM vs raw |

---

## Patterns & Packages

| Article | Description |
|---|---|
| [C# Patterns](csharp-patterns.md) | GoF adaptations and .NET idioms — DI, Options, `IDisposable`, pattern matching |
| [Packages and NuGet](packages-and-nuget.md) | NuGet, `PackageReference`, central package management, and project references |
| [Testing](testing.md) | xUnit, NUnit, Moq, FluentAssertions, and integration testing |

---

## Getting Started

| Article | Description |
|---|---|
| [Installation](installation.md) | Install the .NET SDK, verify it, and manage multiple versions with `global.json` |
| [Project Setup](project-setup.md) | `dotnet new`, solution/project structure, references, and the `.csproj` file |
| [IDEs and Editors](ides.md) | Visual Studio, Rider, and VS Code + C# Dev Kit compared |

---

## Toolchain & Deploy

| Article | Description |
|---|---|
| [Toolchain](toolchain.md) | The `dotnet` CLI, MSBuild, `dotnet format`, and Roslyn analyzers |
| [Deploy](deploy.md) | Framework-dependent, self-contained, and Native AOT publishing plus container images |

---

## CLI & Terminal

| Article | Description |
|---|---|
| [CLI & Terminal](cli/README.md) | Building CLI tools and TUIs in C# — System.CommandLine, Spectre.Console, and Terminal.Gui |

---

## WebAssembly

| Article | Description |
|---|---|
| [C# and WebAssembly](webassembly.md) | Running C# in the browser with Blazor WebAssembly, JS interop, and AOT |

---

## Game Development

| Article | Description |
|---|---|
| [Game Development](games/README.md) | C# in games — engines (Unity, Godot, MonoGame), IDEs, getting started, strengths, and famous titles |
