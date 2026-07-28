---
type: concept
tags:
  - language
  - csharp
  - tool
related:
  - languages/csharp/installation
  - languages/csharp/project-setup
  - languages/csharp/toolchain
language: "csharp"
---
# IDEs and Editors

> C# has three mainstream development environments — Visual Studio, JetBrains Rider, and VS Code with the C# Dev Kit — each with a clear sweet spot.

---

## What is it?

C# development is dominated by rich tooling. Unlike languages where a plain text editor suffices, C# developers lean heavily on IDE features: IntelliSense, refactorings, integrated debugging, and test runners. The three tools that matter are:

- **Visual Studio** — Microsoft's flagship IDE (Windows; also a separate macOS product, now retired in favour of the others).
- **JetBrains Rider** — a cross-platform commercial IDE from JetBrains.
- **VS Code + C# Dev Kit** — the lightweight, cross-platform editor with Microsoft's official C# extension set.

All three build on the same underlying compiler platform (Roslyn), so language understanding is consistent; they differ in weight, features, and price.

---

## Why does it matter?

The IDE is where most C# productivity comes from — accurate autocompletion across large solutions, safe automated refactorings (rename, extract method, move type), and a first-class debugger. Choosing the one that fits your platform, project size, and budget materially affects day-to-day speed.

---

## How it works

Each tool loads the solution (`.sln`) and projects (`.csproj`), runs Roslyn for analysis, and integrates the `dotnet` CLI and MSBuild underneath. What differs is the surrounding experience.

### Visual Studio

The most feature-complete C# IDE. Deep tooling for ASP.NET Core, WPF/WinUI designers, advanced debugging and profiling (diagnostic tools, memory/CPU profilers), and IntelliCode AI assistance.

- **Platform:** Windows.
- **Editions:** free Community edition (for individuals, open source, small teams), paid Professional/Enterprise.
- **Best for:** Windows desktop development (WPF, WinUI), large enterprise solutions, and anyone wanting the richest out-of-the-box experience.

### JetBrains Rider

A cross-platform IDE combining ReSharper's renowned code analysis and refactorings with a full debugger and test runner.

- **Platform:** Windows, macOS, Linux.
- **Licensing:** commercial (with free options for non-commercial and open-source use).
- **Best for:** cross-platform teams, developers who value ReSharper-grade refactoring and inspections, and Unity game development (strong Unity integration).

### VS Code + C# Dev Kit

The lightweight option: the VS Code editor plus Microsoft's **C# Dev Kit** and **C#** extensions, which add solution management, IntelliSense (via Roslyn), debugging, and a test explorer.

- **Platform:** Windows, macOS, Linux.
- **Licensing:** VS Code is free; the C# Dev Kit is free for individuals, academia, and open source (a subscription may apply for some organizations).
- **Best for:** cross-platform work, smaller projects, remote/containerized development, and developers who prefer a fast, minimal editor.

---

## Examples

Comparison at a glance:

| | Visual Studio | Rider | VS Code + C# Dev Kit |
|---|---|---|---|
| Platforms | Windows | Win / macOS / Linux | Win / macOS / Linux |
| Weight | Heavy | Medium–heavy | Light |
| Price | Free–paid | Commercial | Free (editor) |
| Refactorings | Extensive | Extensive (ReSharper) | Good |
| Debugger/profiler | Best-in-class | Strong | Good |
| Designers (WPF/WinUI) | Yes | Limited | No |
| Unity support | Via tooling | Excellent | Good |
| Startup speed | Slow | Medium | Fast |

Opening a project is the same regardless of tool:

```bash
# VS Code
code .

# Rider / Visual Studio: open the .sln from the app, or
rider MyApp.sln
```

---

## When to use

- **Visual Studio** — Windows desktop apps, WPF/WinUI designers, large enterprise solutions, deep profiling.
- **Rider** — cross-platform teams, Unity development, and when top-tier refactoring/inspection is worth the license.
- **VS Code + C# Dev Kit** — cross-platform, lighter projects, remote/container dev, or when you already live in VS Code.

---

## When NOT to use

- **Do not use plain VS Code without the C# Dev Kit / C# extension** for real work — you lose IntelliSense, debugging, and solution understanding.
- **Do not default to Visual Studio on macOS/Linux** — it is Windows-only now; use Rider or VS Code there.
- **Do not run Visual Studio for a tiny console utility** — its startup and footprint are overkill; VS Code is faster.

---

## References

- [Visual Studio — official site](https://visualstudio.microsoft.com/)
- [C# Dev Kit for Visual Studio Code — Microsoft Learn](https://learn.microsoft.com/en-us/visualstudio/subscriptions/vs-c-sharp-dev-kit)
- [Get started with C# in VS Code — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/tutorials/with-visual-studio-code)
- [JetBrains Rider — official site](https://www.jetbrains.com/rider/)
