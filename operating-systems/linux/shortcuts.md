---
type: concept
tags:
  - operating-system
  - linux
related:
  - operating-systems/linux/overview
  - operating-systems/linux/shell
  - operating-systems/macos/shortcuts
language: null
---

# Linux Keyboard Shortcuts

> The keyboard shortcuts that matter most on Linux live in the **terminal** — the readline (emacs-style) bindings that work in bash, zsh, and countless other tools — plus a note on why desktop shortcuts vary.

---

## What is it?

On Linux, the shortcuts you can rely on everywhere are the **terminal** ones, because they come from the **GNU Readline** library that bash, zsh, and many REPLs use to handle line editing. These are largely **emacs-style** bindings built on the **Ctrl** and **Alt** modifiers.

Desktop shortcuts (window management, launching apps) are **not** standardized on Linux — they depend on the desktop environment (GNOME, KDE, XFCE, …) and are fully user-configurable. So this article focuses on the portable terminal set and treats the desktop as environment-specific.

---

## Why does it matter?

Terminal shortcuts are where the biggest productivity gains are for engineers, and they transfer across machines, distros, and even to macOS (whose shell uses the same readline bindings). Editing a long command by jumping words, recalling history, and clearing the line without the mouse keeps you fast and in flow. Because they're a library feature, they behave the same in bash on Ubuntu, zsh on Arch, and `psql`/`python` REPLs.

---

## How it works

**Cursor movement (readline / emacs mode)**

| Shortcut | Action |
|---|---|
| `Ctrl-A` / `Ctrl-E` | Move to start / end of line |
| `Alt-B` / `Alt-F` | Move back / forward one word |
| `Ctrl-B` / `Ctrl-F` | Move back / forward one character |
| `Ctrl-XX` | Toggle between line start and current position |

**Editing**

| Shortcut | Action |
|---|---|
| `Ctrl-W` | Delete the word before the cursor |
| `Ctrl-U` | Delete from cursor to start of line |
| `Ctrl-K` | Delete from cursor to end of line |
| `Ctrl-Y` | Paste (yank) the last deleted text |
| `Ctrl-T` | Swap the last two characters |
| `Alt-D` | Delete the word after the cursor |

**History**

| Shortcut | Action |
|---|---|
| `Ctrl-R` | Reverse-search command history (type to filter) |
| `Ctrl-G` | Cancel the current search |
| `↑` / `↓` or `Ctrl-P` / `Ctrl-N` | Previous / next command |
| `!!` / `!$` | Last command / last argument of it |

**Process & screen control** (these are terminal signals, universal)

| Shortcut | Action |
|---|---|
| `Ctrl-C` | Send SIGINT — interrupt the running program |
| `Ctrl-Z` | Suspend the current job (resume with `fg`) |
| `Ctrl-D` | End of input / logout (EOF) |
| `Ctrl-L` | Clear the screen (like `clear`) |
| `Ctrl-S` / `Ctrl-Q` | Freeze / resume terminal output |

> **Desktop shortcuts vary.** On GNOME `Super` (the Windows key) opens the Activities overview and `Alt-Tab` switches windows, but KDE, XFCE, and tiling window managers (i3, Sway) differ and are remappable. Check your desktop environment's keyboard settings rather than assuming a global standard.

---

## Examples

Recover from typing a long, wrong command without deleting char-by-char:

```text
You typed a huge command and want to start over:
  Ctrl-U            → wipes the whole line (kept in the kill-ring)
  ...type the right command...
  Ctrl-Y            → if you needed the old text back, paste it

Re-run a command from history:
  Ctrl-R  then type "docker"  → shows the last matching command
  Enter                        → run it, or  →  to edit it first

Jump to fix a flag near the start of a long line:
  Ctrl-A            → go to the beginning
  Alt-F             → step forward word by word to the flag
```

Switch readline to **vi** editing mode if you prefer modal editing:

```bash
# In ~/.inputrc (readline config) — affects all readline apps
set editing-mode vi
# ...or just for bash, in ~/.bashrc:
set -o vi
```

---

## When to use

- Editing and re-running shell commands quickly — `Ctrl-A/E`, `Alt-B/F`, `Ctrl-R`.
- Managing foreground programs — `Ctrl-C` to stop, `Ctrl-Z`/`fg` to suspend and resume.
- Any readline-based REPL (python, psql, node) — the same bindings apply.

## When NOT to use

- Don't assume a single desktop shortcut set — window/app shortcuts depend on GNOME/KDE/etc. and are remappable.
- Don't rely on `Ctrl-S` in a terminal without knowing it freezes output — `Ctrl-Q` unfreezes it (a classic "my terminal hung" trap).
- Don't mix up `Ctrl-C` (interrupt) with `Ctrl-Z` (suspend) — a suspended job keeps running resources until resumed or killed.

---

## References

- [GNU Readline — Command Line Editing (bash manual)](https://www.gnu.org/software/bash/manual/html_node/Command-Line-Editing.html)
- [GNU Readline Library documentation](https://tiswww.case.edu/php/chet/readline/rltop.html)
- [readline `~/.inputrc` init file](https://www.gnu.org/software/bash/manual/html_node/Readline-Init-File.html)
- [GNOME keyboard shortcuts](https://help.gnome.org/users/gnome-help/stable/keyboard-shortcuts-set.html.en)
