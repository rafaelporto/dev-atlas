---
type: concept
tags:
  - tool
  - ide
related:
  - tools/ides/overview
  - tools/local-dev/dev-containers
language: null
---
# VS Code

> Microsoft's free, cross-platform code editor that becomes a full IDE through an enormous extension marketplace and built-in Language Server support.

---

## What is it?

Visual Studio Code (VS Code) is a code editor built on the Electron framework. Out of the box it is a fast, general-purpose editor with syntax highlighting, integrated Git, a terminal, and a debugger. Its real power comes from **extensions**: nearly every language, framework, linter, and tool has one, turning the same editor into a Go IDE, a Python IDE, or a Markdown authoring tool depending on what you install.

It is distinct from **Visual Studio**, Microsoft's older, heavyweight Windows IDE — the two share a name and little else.

## Why does it matter?

VS Code is, by a wide margin, the most widely used editor among professional developers. That ubiquity means almost any stack has a well-maintained extension, most documentation assumes it, and onboarding a teammate rarely requires explaining the tool.

Its balance of low complexity and high ceiling is the reason: you can be productive in minutes, then grow the setup as needed. For polyglot codebases — a web frontend, a Go service, and some infrastructure YAML in one repo — a single VS Code window handles all of it, where a language-specific IDE would not.

## How it works

VS Code's core is intentionally small; language intelligence is delegated. When you install a language extension, it typically bundles or downloads a **language server** and communicates with it over the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/). The server provides completion, diagnostics, go-to-definition, and rename, while the editor renders the results.

```
VS Code (UI + editing)
├── Extension Host (runs extensions in a separate process)
│   ├── Go extension  ──► gopls (language server)
│   ├── ESLint        ──► eslint
│   └── Debugger      ──► Debug Adapter (dlv, node, …)
└── Integrated terminal + Git
```

Configuration is JSON: `settings.json` for preferences, `keybindings.json` for shortcuts. Settings can be user-global or committed per project under `.vscode/`, so a repo can ship its own recommended extensions and formatting rules.

**Complexity level: Low.** Usable immediately; the setup grows with the extensions you choose.

## Getting Started

Install VS Code and (optionally) manage extensions from the command line:

```bash
# macOS
brew install --cask visual-studio-code

# install an extension by ID
code --install-extension golang.go
```

Open the Command Palette with `Cmd/Ctrl+Shift+P` — it is the entry point to nearly every action. Per-project settings live in `.vscode/settings.json`; recommended extensions in `.vscode/extensions.json`.

Common extensions are referenced per stack in the [overview matrix](overview.md) rather than listed here.

| Symptom | Likely cause | Fix |
|---|---|---|
| No autocomplete for a language | Language extension not installed, or server failed to start | Install the extension; check **Output → <language> Language Server** |
| Wrong formatter runs on save | Multiple formatter extensions installed | Set `editor.defaultFormatter` per language in `settings.json` |
| High memory/CPU use | Too many extensions, or a heavy one indexing | Use **Help → Open Process Explorer** to find the culprit; disable per-workspace |
| Settings differ across machines | Not using sync | Enable **Settings Sync** (built-in, via GitHub/Microsoft account) |

## Examples

**Per-project `settings.json`** — format on save with a specific formatter:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.trimTrailingWhitespace": true
}
```

**`.vscode/extensions.json`** — recommend extensions to anyone who opens the repo:

```json
{
  "recommendations": [
    "golang.go",
    "esbenp.prettier-vscode"
  ]
}
```

For a fully reproducible, containerized setup, VS Code pairs with [Dev Containers](../local-dev/dev-containers.md).

## When to use

- Polyglot projects, or when you want one editor across many languages.
- Web, TypeScript, Go, Python, and infrastructure work where the extension is first-class.
- Teams that want a low-friction default everyone already knows.
- When pairing an editor with Dev Containers or remote/SSH development.

## When NOT to use

- Heavy, single-language JVM or .NET work where a dedicated IDE (IntelliJ, Rider, Visual Studio) offers deeper refactoring — VS Code can do it, but with more setup and less depth.
- Apple-platform development that requires Interface Builder, Instruments, or App Store signing — that is [Xcode](xcode.md)'s domain.
- Environments where Electron's memory footprint is a hard constraint and a native editor like [Zed](zed.md) fits better.

## References

- [VS Code documentation](https://code.visualstudio.com/docs)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
