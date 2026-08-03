---
type: concept
tags:
  - tool
  - ide
  - overview
  - comparison
  - decision-support
related:
  - tools/ides/vscode
  - tools/ides/cursor
  - tools/ides/neovim
  - tools/ides/emacs
  - tools/ides/zed
  - tools/ides/intellij-idea
  - tools/ides/rider
  - tools/ides/goland
  - tools/ides/webstorm
  - tools/ides/android-studio
  - tools/ides/xcode
  - tools/ides/visual-studio
language: null
---
# IDEs & Editors: Overview

> A map of the editors and IDEs developers use, how they differ in power and complexity, and which one to reach for depending on your stack.

---

## What is it?

An **editor** is a program for writing and modifying text files. A **code editor** adds programming-specific features on top: syntax highlighting, autocomplete, and integration with tools like linters and formatters. An **IDE** (Integrated Development Environment) bundles the editor together with everything else needed to build software — compiler/build integration, a debugger, refactoring tools, a test runner, and version-control support — in a single application.

The line between the two has blurred. A modern extensible editor like VS Code or Neovim, once configured with the right plugins and a **Language Server** (LSP), does most of what a dedicated IDE does. The practical distinction today is less "editor vs IDE" and more **how much works out of the box** versus **how much you assemble yourself**.

## Why does it matter?

The editor is where a developer spends the majority of their working hours, so the choice compounds. A tool that fits the stack pays off in fast navigation, reliable refactoring, and integrated debugging; a poor fit means fighting the tooling instead of the problem.

There is no single "best" editor — the right answer depends on the language, the platform, the size of the codebase, and personal taste. A .NET codebase on Windows leans toward Visual Studio or Rider; a quick edit over SSH calls for Neovim; a polyglot web project is most comfortable in VS Code. Knowing the trade-offs lets you pick deliberately instead of defaulting to whatever you used last.

## How it works

Editors and IDEs sit on a spectrum of **complexity vs power-out-of-the-box**:

```
 lighter / assemble-it-yourself                 heavier / batteries-included
 ┌──────────────┬───────────────────────────┬──────────────────────────────┐
 │ Plain editor │ Extensible editor          │ Full IDE                     │
 │              │ (editor + LSP + plugins)   │                              │
 ├──────────────┼───────────────────────────┼──────────────────────────────┤
 │ nano, TextEdit│ VS Code, Cursor, Zed,     │ IntelliJ IDEA, Rider,        │
 │              │ Neovim, Emacs              │ GoLand, WebStorm, Xcode,     │
 │              │                            │ Visual Studio, Android Studio│
 └──────────────┴───────────────────────────┴──────────────────────────────┘
```

The unifying technology across the middle and right is the **Language Server Protocol (LSP)**: a standard, introduced by Microsoft, that decouples language intelligence (completion, go-to-definition, diagnostics, rename) from the editor. A *language server* runs as a separate process and speaks LSP to any editor that supports it. This is why an editor like Neovim can offer IDE-grade Go support (via `gopls`) without being built for Go specifically.

Full IDEs like the JetBrains family or Xcode often ship their **own** language analysis rather than relying on LSP, which is why they tend to have deeper, more accurate refactoring for their target language — at the cost of being heavier and language-specific.

**Complexity level** in this section is rated **Low / Medium / High**, meaning how much effort it takes to reach a productive setup:

- **Low** — install and start working; sensible defaults.
- **Medium** — some extension installation or per-language configuration expected.
- **High** — significant upfront configuration, or a steep conceptual learning curve.

## Examples

### Per-stack recommendation matrix

Stacks are those documented elsewhere in this wiki (see [`languages/`](../../languages/README.md)). The first option in each row is the most common default; alternatives follow.

| Stack | Recommended | Solid alternatives |
|---|---|---|
| Go | [GoLand](goland.md) | [VS Code](vscode.md), [Neovim](neovim.md) |
| Java | [IntelliJ IDEA](intellij-idea.md) | [VS Code](vscode.md), [Eclipse](https://eclipseide.org) |
| Clojure | [IntelliJ IDEA](intellij-idea.md) + Cursive | [Emacs](emacs.md) (CIDER), [VS Code](vscode.md) (Calva), [Neovim](neovim.md) (Conjure) |
| C# / .NET | [Rider](rider.md) | [Visual Studio](visual-studio.md), [VS Code](vscode.md) (C# Dev Kit) |
| JavaScript / TypeScript | [VS Code](vscode.md) | [WebStorm](webstorm.md), [Cursor](cursor.md), [Neovim](neovim.md) |
| React / Next.js / Angular / Vue / Svelte | [VS Code](vscode.md) | [WebStorm](webstorm.md), [Cursor](cursor.md) |
| Node.js | [VS Code](vscode.md) | [WebStorm](webstorm.md) |
| Swift (Apple platforms) | [Xcode](xcode.md) | [VS Code](vscode.md) (Swift extension) |
| Dart / Flutter | [Android Studio](android-studio.md) | [VS Code](vscode.md) |
| Lua | [Neovim](neovim.md) | [VS Code](vscode.md) |

### Pros/cons and complexity summary

| Editor / IDE | Complexity | Strengths | Trade-offs |
|---|---|---|---|
| [VS Code](vscode.md) | Low | Huge extension ecosystem, polyglot, free | Electron memory use; power depends on extensions |
| [Cursor](cursor.md) | Low | Deep AI integration on a familiar VS Code base | Paid tiers; AI features send code to a service |
| [Neovim](neovim.md) | High | Fast, keyboard-driven, runs in a terminal/over SSH | Steep learning curve; config is a project |
| [Emacs](emacs.md) | High | Endlessly extensible; one environment for many tasks | Steepest curve; idiosyncratic keybindings |
| [Zed](zed.md) | Low | Very fast (GPU-accelerated), built-in collaboration | Younger ecosystem; fewer extensions |
| [IntelliJ IDEA](intellij-idea.md) | Medium | Best-in-class JVM refactoring and analysis | Heavy; paid Ultimate for full stack |
| [Rider](rider.md) | Medium | Fast cross-platform .NET IDE | Paid; resource-hungry on large solutions |
| [GoLand](goland.md) | Medium | Deep, Go-specific tooling out of the box | Paid; single-language focus |
| [WebStorm](webstorm.md) | Medium | Powerful JS/TS analysis with zero setup | Paid (though now free for non-commercial use) |
| [Android Studio](android-studio.md) | Medium | Official Android/Flutter tooling, emulator, profilers | Heavy; slow initial Gradle syncs |
| [Xcode](xcode.md) | Medium | Only full toolchain for Apple platforms | macOS-only; large; occasional instability |
| [Visual Studio](visual-studio.md) | High | The most complete .NET/C++ IDE on Windows | Windows-first; very large install |

## When to use

- **Reach for a full IDE** when the codebase is large, the language has one dominant IDE (Java→IntelliJ, .NET→Rider/Visual Studio, Apple→Xcode), or you rely heavily on refactoring and step-debugging.
- **Reach for an extensible editor** (VS Code, Cursor, Zed) when you work across several languages, want a light footprint, or value a large extension marketplace.
- **Reach for a terminal editor** (Neovim, Emacs) when you work over SSH, live in the keyboard, or want a highly personalized, portable setup.

## When NOT to use

- Do not force a heavyweight IDE for quick, one-off edits to config or docs — a lightweight editor starts instantly.
- Do not adopt Neovim or Emacs mid-deadline expecting immediate productivity; the configuration curve is real and best climbed deliberately.
- Do not pick a single-language IDE (GoLand, Xcode) for a genuinely polyglot repository — you will end up running several IDEs when one extensible editor would cover all of it.

## References

- [Language Server Protocol specification](https://microsoft.github.io/language-server-protocol/)
- [Stack Overflow Developer Survey — Integrated development environment](https://survey.stackoverflow.co/2024/technology#most-popular-technologies-new-collab-tools)
