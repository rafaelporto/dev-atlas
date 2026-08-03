---
type: concept
tags:
  - tool
  - ide
  - java
related:
  - tools/ides/overview
  - languages/java/overview
language: null
---
# IntelliJ IDEA

> JetBrains' flagship IDE for Java and other JVM languages, known for the deepest code analysis and refactoring in its class.

---

## What is it?

IntelliJ IDEA is a full IDE for the JVM ecosystem — primarily [Java](../../languages/java/overview.md) and Kotlin, and, through plugins, Clojure, Scala, and Groovy. Unlike editors that delegate language intelligence to an external LSP server, IntelliJ builds its own semantic model of the whole project, which powers its highly accurate completion, error detection, and automated refactorings.

It ships in two editions: **Community** (free, open-source; Java/Kotlin and general development) and **Ultimate** (paid; adds web, database, and enterprise-framework support such as Spring).

## Why does it matter?

For JVM work, IntelliJ's depth of understanding is its defining advantage. Because it continuously analyzes the entire codebase, it can offer refactorings — rename, extract method, change signature, move class — that update every reference correctly, and it flags likely bugs as you type. This reliability is why it is the default choice across most Java teams.

The same engine is the foundation of the entire JetBrains IDE line: [Rider](rider.md), [GoLand](goland.md), [WebStorm](webstorm.md), and [Android Studio](android-studio.md) are IntelliJ with language-specific tooling bundled in.

## How it works

IntelliJ maintains a **project model** and a **program structure interface (PSI)** — an indexed, semantic representation of your code — kept up to date as you edit. Inspections run against this model to surface problems, and refactorings transform it safely. Build tools (Gradle, Maven) and the JDK are configured per project; the IDE integrates their output, the debugger, and the test runner.

```
IntelliJ IDEA
├── Project model + PSI (semantic index of all code)
│     ├── Inspections (real-time analysis)
│     └── Refactorings (rename, extract, move, …)
├── Build integration (Gradle / Maven)
├── JVM debugger + test runner (JUnit, TestNG)
└── Plugins (Clojure via Cursive, Scala, …)
```

Language support beyond Java/Kotlin comes from plugins — notably **Cursive** for Clojure, which adds structural editing and REPL integration.

**Complexity level: Medium.** Powerful defaults, but project/SDK/build setup and the breadth of features take time to master.

## Getting Started

Install via the JetBrains Toolbox App (which manages updates across all JetBrains IDEs) or directly:

```bash
# macOS — Community edition
brew install --cask intellij-idea-ce

# or Ultimate
brew install --cask intellij-idea
```

Open a project by pointing IntelliJ at its build file (`build.gradle` / `pom.xml`); it imports the model automatically. Configure the **Project SDK** (the JDK) under **File → Project Structure**.

| Symptom | Likely cause | Fix |
|---|---|---|
| Red errors everywhere on a valid project | Project not imported, or wrong/no JDK | Reimport the Gradle/Maven project; set the Project SDK |
| Changes not reflected when running | Stale build/output | **Build → Rebuild Project**; invalidate caches if it persists |
| IDE slow or unresponsive | Low heap, or large project indexing | Increase IDE heap; wait for indexing to finish |
| A language has no support | Plugin not installed | Install it (e.g. Cursive for Clojure) via **Settings → Plugins** |

## Examples

IntelliJ is configured through its UI and per-project files rather than a single config file. The most useful thing to commit is a shared **code style**:

```
Settings → Editor → Code Style
  → export/import scheme as an XML committed under .idea/
```

Run configurations, code style, and inspection profiles can be stored under the project's `.idea/` directory and shared with the team so everyone builds, runs, and formats consistently. Specific plugins (Cursive, Scala, framework support) are referenced in their own documentation rather than configured here.

## When to use

- Java and Kotlin development of any size — the primary use case.
- Clojure/Scala on the JVM, with the appropriate plugin.
- Projects that lean heavily on refactoring, static analysis, and step-debugging.
- Enterprise frameworks (Spring, Jakarta EE) with the Ultimate edition.

## When NOT to use

- Lightweight, polyglot, or quick-edit work where a fast extensible editor ([VS Code](vscode.md), [Zed](zed.md)) is enough.
- Non-JVM stacks that have a dedicated JetBrains IDE — use [GoLand](goland.md), [Rider](rider.md), or [WebStorm](webstorm.md) instead.
- Resource-constrained machines where the IDE's footprint is a problem.

## References

- [IntelliJ IDEA documentation](https://www.jetbrains.com/help/idea/)
- [Cursive (Clojure plugin)](https://cursive-ide.com/)
