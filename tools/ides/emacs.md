---
type: concept
tags:
  - tool
  - ide
related:
  - tools/ides/overview
  - languages/clojure/overview
language: null
---
# Emacs

> A decades-old, endlessly extensible editor that is really a Lisp environment, capable of being a code IDE, a shell, an email client, and much more.

---

## What is it?

Emacs is a text editor whose behaviour is defined by a built-in Lisp interpreter (Emacs Lisp). Almost everything you see — every command, keybinding, and mode — is a Lisp function you can inspect, redefine, or replace while the editor is running. This makes Emacs less a fixed application and more a programmable environment that happens to ship configured as an editor.

For programming it offers **major modes** (language-specific behaviour) and, through LSP clients, IDE features like completion and diagnostics. It is particularly associated with Lisp-family languages — including [Clojure](../../languages/clojure/overview.md), where the CIDER package gives a deeply interactive REPL-driven workflow.

## Why does it matter?

Emacs's extensibility is unmatched: because configuration and features are all Lisp evaluated at runtime, users build entire workflows — project management, Git (Magit), notes and planning (Org mode), even email — inside one program. For some developers, Emacs is the single environment they never leave.

It matters most where interactive, REPL-driven development is the norm. Clojure and other Lisps pair naturally with Emacs's live evaluation, where you send a form to a running process and see the result without leaving the buffer. The trade-off is the steepest learning curve of any mainstream editor and idiosyncratic default keybindings.

## How it works

Configuration lives in `~/.emacs.d/init.el` (or `~/.config/emacs/`), written in Emacs Lisp. Packages are installed from archives like MELPA. Buffers hold text; **major modes** define per-language behaviour and **minor modes** layer optional features on top. Modern setups add an LSP client (`lsp-mode` or the built-in `eglot`) to talk to language servers.

```
Emacs (Emacs Lisp runtime)
├── init.el ──► package manager (package.el / straight.el)
│               ├── eglot / lsp-mode ──► language servers
│               ├── Magit (Git UI)
│               └── Org mode (notes, planning, literate config)
├── major modes (clojure-mode, python-mode, …)
└── buffers, windows, frames
```

Rather than starting from scratch, many users adopt a curated distribution — **Doom Emacs** or **Spacemacs** — which ships an opinionated, batteries-included configuration (and, in Spacemacs/Doom, Vim-style keybindings via Evil mode).

**Complexity level: High.** Powerful, but the learning curve and configuration effort are significant.

## Getting Started

Install Emacs and, unless you want to build a config from zero, start from a distribution:

```bash
# macOS — a common native build
brew install --cask emacs

# Doom Emacs (opinionated, fast starting config)
git clone --depth 1 https://github.com/doomemacs/doomemacs ~/.config/emacs
~/.config/emacs/bin/doom install
```

Run the built-in tutorial with `C-h t` (that is, `Ctrl+h` then `t`). Note Emacs's notation: `C-` means Ctrl, `M-` means Meta (Alt/Option).

| Symptom | Likely cause | Fix |
|---|---|---|
| Keybindings feel alien | Default Emacs bindings, no Vim layer | Try Doom/Spacemacs with Evil mode for modal editing |
| No LSP features | Language server not installed, or `eglot`/`lsp-mode` not enabled | Install the server; run `M-x eglot` in the buffer |
| Config change had no effect | Not evaluated/reloaded | Restart, or evaluate the region with `C-x C-e` |
| Package won't install | Archives not refreshed | `M-x package-refresh-contents`, then retry |

## Examples

**Minimal `init.el`** — enable MELPA and turn on the built-in LSP client for a language:

```elisp
;; ~/.emacs.d/init.el
(require 'package)
(add-to-list 'package-archives '("melpa" . "https://melpa.org/packages/") t)
(package-initialize)

;; Use the built-in LSP client (eglot) for supported major modes
(add-hook 'prog-mode-hook #'eglot-ensure)

;; Sensible defaults
(setq inhibit-startup-screen t)
(global-display-line-numbers-mode 1)
```

Specific packages (Magit, CIDER, Org, completion frameworks) are best adopted from a distribution's documentation and are referenced there rather than configured here.

## When to use

- Lisp-family development — especially Clojure with CIDER — where live, REPL-driven evaluation is central.
- Developers who want one programmable environment for editing, Git, notes, and more.
- Long-lived, personalized setups where deep customization pays off over years.

## When NOT to use

- When you need to be productive immediately with minimal setup — a GUI editor or full IDE is faster to start.
- Apple-platform or large .NET codebases that depend on a platform IDE's native tooling.
- Teams that want a shared, uniform editor experience without per-developer configuration.

## References

- [GNU Emacs manual](https://www.gnu.org/software/emacs/manual/)
- [Doom Emacs](https://github.com/doomemacs/doomemacs) — a popular starting configuration
