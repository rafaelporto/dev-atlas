---
type: concept
tags:
  - tool
  - ide
  - tui
  - cli
related:
  - tools/ides/overview
  - languages/lua/overview
language: null
---
# Neovim

> A modern, extensible fork of Vim that runs in the terminal and, with Language Server support and plugins, becomes a fast, fully keyboard-driven IDE.

---

## What is it?

Neovim is a text editor that runs in a terminal and is controlled almost entirely from the keyboard through a **modal** interface: you switch between a *normal* mode for navigating and manipulating text, an *insert* mode for typing, and others. It is a fork of Vim that adds a built-in [Lua](../../languages/lua/overview.md) runtime, an embedded LSP client, and an asynchronous plugin architecture.

On its own, Neovim is a capable editor. Configured with a language server and a handful of plugins, it offers completion, diagnostics, go-to-definition, and refactoring comparable to a graphical IDE — inside a terminal.

## Why does it matter?

Because it runs in the terminal, Neovim works anywhere a shell does: over SSH on a remote server, inside a container, or on a machine with no graphical environment. The modal, keyboard-only workflow, once learned, keeps your hands on the home row and makes editing fast and precise.

It also treats configuration as a first-class programming task. Your editor is a Lua program you own and version-control — infinitely tailorable, portable across machines by copying a directory. The cost is a steep learning curve and the responsibility of assembling and maintaining that configuration.

## How it works

Neovim's configuration lives under `~/.config/nvim/`, with `init.lua` as the entry point. A **plugin manager** (such as `lazy.nvim`) downloads and loads plugins. Language intelligence comes from the built-in LSP client talking to external language servers; syntax highlighting and structural selection come from **Tree-sitter**.

```
Terminal
└── Neovim
    ├── init.lua ──► plugin manager (lazy.nvim)
    │                 ├── nvim-lspconfig ──► gopls / tsserver / … (LSP)
    │                 ├── nvim-treesitter (parsing & highlighting)
    │                 └── nvim-cmp (completion UI)
    └── modal editing core (normal / insert / visual)
```

Distributions like **LazyVim**, **NvChad**, or **kickstart.nvim** bundle a curated, working configuration so newcomers get an IDE-like experience without assembling everything from scratch — a middle ground between raw Neovim and a full config of your own.

**Complexity level: High.** Both the modal editing model and the configuration are a learning investment.

## Getting Started

Install Neovim and start from a distribution rather than an empty config:

```bash
# macOS
brew install neovim

# kickstart.nvim — a single, well-commented starting config
git clone https://github.com/nvim-lua/kickstart.nvim.git \
  "${XDG_CONFIG_HOME:-$HOME/.config}/nvim"

nvim
```

Learn the basics first: run `:Tutor` inside Neovim for the built-in tutorial. LSP servers are installed per language (often via the `mason.nvim` plugin, included in most distributions).

| Symptom | Likely cause | Fix |
|---|---|---|
| No completion/diagnostics for a language | No language server installed for it | Install the server (e.g. via `:Mason`) and confirm with `:LspInfo` |
| "I can't type / can't quit" | You are in normal mode | Press `i` to insert; `Esc` then `:q` to quit |
| Plugins not loading | Manager not bootstrapped, or Lua error in config | Run `:Lazy` / `:checkhealth` to inspect errors |
| Slow startup | Too many eagerly-loaded plugins | Lazy-load plugins on event/filetype; profile with `:Lazy profile` |

## Examples

**Minimal `init.lua`** — a few essential options (a real config layers plugins on top):

```lua
-- ~/.config/nvim/init.lua
vim.g.mapleader = " "          -- space as the leader key
vim.opt.number = true          -- absolute line numbers
vim.opt.relativenumber = true  -- + relative, for motions like 5j
vim.opt.expandtab = true       -- spaces, not tabs
vim.opt.shiftwidth = 2
vim.opt.ignorecase = true      -- case-insensitive search…
vim.opt.smartcase = true       -- …unless the query has uppercase
```

Plugin choices (managers, LSP config, completion, fuzzy finders) are best adopted from a distribution and are referenced there rather than reproduced here.

## When to use

- Editing over SSH, inside containers, or on headless servers.
- Workflows that value speed and a keyboard-only, mouse-free flow.
- Developers who want an editor they fully own and can carry between machines as a config directory.
- Lua, shell, and systems work where a terminal-native editor fits the environment.

## When NOT to use

- Under a deadline with no prior Vim experience — the learning curve will slow you down before it speeds you up.
- Apple-platform or heavy .NET work that depends on a platform IDE's GUI tools (Interface Builder, designers, profilers).
- When you want an editor that is fully productive out of the box with zero configuration — an extensible GUI editor or full IDE is a better fit.

## References

- [Neovim documentation](https://neovim.io/doc/)
- [kickstart.nvim](https://github.com/nvim-lua/kickstart.nvim) — an annotated starting configuration
