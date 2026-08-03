---
type: concept
tags:
  - tool
  - ide
  - csharp
  - dotnet
related:
  - tools/ides/overview
  - languages/csharp/overview
language: null
---
# Rider

> JetBrains' cross-platform IDE for C# and .NET, combining the IntelliJ platform with the ReSharper analysis engine.

---

## What is it?

Rider is a full IDE for [C# and the .NET ecosystem](../../languages/csharp/overview.md), built on the same IntelliJ platform as JetBrains' other IDEs and powered by **ReSharper**, JetBrains' long-established .NET code-analysis engine. It runs natively on Windows, macOS, and Linux — unlike the traditional [Visual Studio](visual-studio.md), which is Windows-first.

It covers C#, F#, and VB.NET, ASP.NET and Blazor web apps, Unity and Unreal game development, and the full build/debug/test cycle for .NET.

## Why does it matter?

For years the serious choice for .NET on macOS or Linux was limited. Rider changed that by bringing a first-class, cross-platform .NET IDE with the deep refactoring and inspections ReSharper users expected — without the performance cost of running ReSharper as a plugin inside Visual Studio.

It is especially popular in game development: its Unity and Unreal Engine integration (debugging, code insight into engine APIs) is a major draw. As of recent releases, Rider is **free for non-commercial use**, lowering the barrier for learning and personal projects.

## How it works

Rider runs a two-process architecture: the IntelliJ-based frontend for the UI and editing, and a separate backend process hosting the ReSharper engine that analyzes the solution. This keeps heavy analysis off the UI thread, so the editor stays responsive on large solutions.

```
Rider
├── Frontend (IntelliJ platform — editor, UI)
│        ▲  in-process protocol
│        ▼
├── Backend (ReSharper engine — analysis, refactorings)
├── .NET build (dotnet / MSBuild) + debugger
└── Test runner + integrations (Unity, Unreal, Docker)
```

It uses the standard .NET toolchain underneath (`dotnet` CLI / MSBuild), so projects and solutions built in Rider behave identically on the command line and in CI.

**Complexity level: Medium.** Approachable for .NET developers; the wealth of inspections and settings rewards deeper learning.

## Getting Started

Install via JetBrains Toolbox or directly, with the .NET SDK present:

```bash
# macOS
brew install --cask rider

# .NET SDK (if not already installed)
brew install --cask dotnet-sdk
```

Open a `.sln` solution or a project folder; Rider restores NuGet packages and builds its model. Select the target framework and run/debug configurations from the toolbar.

| Symptom | Likely cause | Fix |
|---|---|---|
| Solution won't load | Missing/incompatible .NET SDK | Install the SDK version the solution targets; check **Settings → Build → .NET CLI** |
| NuGet restore fails | Feed unreachable or auth missing | Verify NuGet sources; re-run restore |
| Analysis slow on a big solution | Backend indexing large codebase | Wait for indexing; raise memory in **Help → Change Memory Settings** |
| Unity code insight missing | Unity plugin/integration not enabled | Enable the Unity plugin and open the project from Unity |

## Examples

Like other JetBrains IDEs, Rider is configured through its UI and per-project files rather than one config file. Editor formatting can be driven by a committed **`.editorconfig`**, which Rider reads natively so formatting is consistent across the team and on the CLI:

```ini
# .editorconfig
root = true

[*.cs]
indent_style = space
indent_size = 4
dotnet_sort_system_directives_first = true
csharp_new_line_before_open_brace = all
```

Run configurations and inspection settings can be shared under the solution's `.idea/` directory. Framework- and engine-specific integrations (Unity, Unreal, ASP.NET) are covered in their own documentation.

## When to use

- .NET development on macOS or Linux, where a native cross-platform IDE matters.
- Game development with Unity or Unreal Engine.
- Teams that value ReSharper-grade refactoring and inspections.
- Personal or learning projects (free non-commercial license).

## When NOT to use

- Windows-only shops deeply invested in [Visual Studio](visual-studio.md)'s ecosystem (certain designers, enterprise integrations).
- Lightweight or occasional C# edits where the [VS Code](vscode.md) C# Dev Kit is sufficient.
- Machines that cannot spare the memory a full solution analysis requires.

## References

- [Rider documentation](https://www.jetbrains.com/help/rider/)
- [.NET SDK](https://dotnet.microsoft.com/)
