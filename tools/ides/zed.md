---
type: concept
tags:
  - tool
  - ide
related:
  - tools/ides/overview
  - tools/ides/vscode
language: null
---
# Zed

> A high-performance, GPU-accelerated code editor written in Rust, with real-time collaboration and AI features built into the core.

---

## What is it?

Zed is a code editor built from scratch in Rust with a custom, GPU-accelerated UI framework rather than the web-based stack most editors use. Its defining goal is speed: fast startup, low input latency, and responsive editing even in large files. It ships with LSP support, Tree-sitter syntax highlighting, a built-in terminal, Vim-mode emulation, real-time multiplayer collaboration, and integrated AI assistance.

It was created by the team behind the Atom editor and the Tree-sitter parsing library, which informs its focus on performance and code intelligence.

## Why does it matter?

Editors built on Electron trade native performance for cross-platform convenience. Zed challenges that by rendering its interface directly on the GPU, aiming for the responsiveness of a native application. For developers sensitive to input latency or working in large files, the difference is noticeable.

Its collaboration model is also first-class rather than an add-on: multiple developers can share a workspace, edit together, and follow each other's cursors in real time — useful for pairing and reviews. The trade-off is a younger ecosystem with fewer extensions than the incumbents.

## How it works

Zed uses its own UI framework (**GPUI**) to draw the interface on the GPU. Language intelligence comes from LSP servers and Tree-sitter, similar to other modern editors. Collaboration runs through Zed's service, which synchronizes the shared workspace state between participants.

```
Zed (Rust, GPUI on the GPU)
├── LSP client ──► language servers (rust-analyzer, gopls, tsserver, …)
├── Tree-sitter (parsing, highlighting, structural editing)
├── Collaboration ──► Zed service (shared workspaces, channels)
└── Assistant panel ──► LLM providers (configurable)
```

Configuration is JSON (`settings.json`), conceptually close to VS Code, which shortens the transition. Extensions exist and are growing, but the catalogue is smaller than VS Code's marketplace.

**Complexity level: Low.** Sensible defaults; minimal setup to be productive.

## Getting Started

Install Zed and open a project:

```bash
# macOS
brew install --cask zed

# open the current directory
zed .
```

Settings are edited as JSON via the Command Palette (`Cmd/Ctrl+Shift+P` → *zed: open settings*). Language servers are downloaded automatically for supported languages; extensions add more.

| Symptom | Likely cause | Fix |
|---|---|---|
| A language lacks intelligence | No built-in or installed language support | Install the language extension from the extensions view |
| Vim keybindings not active | Vim mode disabled | Set `"vim_mode": true` in `settings.json` |
| Collaboration unavailable | Not signed in | Sign in with a GitHub account to use channels/sharing |
| Platform not supported | Some platforms lag behind macOS | Check current OS availability on Zed's site |

## Examples

**`settings.json`** — format on save and enable Vim mode:

```json
{
  "vim_mode": true,
  "format_on_save": "on",
  "theme": "One Dark",
  "buffer_font_size": 14
}
```

**Per-language override** — set a specific formatter/tab width for one language:

```json
{
  "languages": {
    "Go": {
      "tab_size": 4,
      "hard_tabs": true
    }
  }
}
```

## When to use

- You want a fast, native-feeling editor with low input latency.
- Real-time pair programming or collaborative review is part of your workflow.
- You are comfortable with a JSON-configured, VS Code-like model and don't need a vast extension catalogue.

## When NOT to use

- Your workflow depends on niche extensions that only exist for VS Code or a full IDE.
- You need deep, language-specific refactoring best served by JetBrains IDEs, Xcode, or Visual Studio.
- You require a platform Zed does not yet fully support.

## References

- [Zed documentation](https://zed.dev/docs)
- [Zed on GitHub](https://github.com/zed-industries/zed)
