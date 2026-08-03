---
type: concept
tags:
  - operating-system
  - macos
related:
  - operating-systems/macos/overview
  - operating-systems/macos/commands
  - operating-systems/linux/shortcuts
language: null
---

# macOS Keyboard Shortcuts

> The keyboard-driven workflow of macOS, built around the **⌘ (Command)** key — for the system, Finder, windows, screenshots, and text editing.

---

## What is it?

Keyboard shortcuts are key combinations that trigger actions without the mouse. macOS centres its shortcuts on the **⌘ (Command)** key, where Windows and Linux use **Ctrl**. The other modifiers are **⌥ Option (Alt)**, **⌃ Control**, and **⇧ Shift**.

The mental shift for people coming from Windows/Linux: the copy/paste/save/quit family uses **⌘**, not Ctrl. **Ctrl** on a Mac is reserved mostly for terminal/emacs-style text navigation.

---

## Why does it matter?

A keyboard-first workflow is faster and keeps you in flow. macOS shortcuts are also **consistent across apps** because they come from the system's `NSResponder`/menu conventions — once you learn ⌘C/⌘V/⌘Z/⌘S, they work almost everywhere. Text-editing shortcuts in particular carry the Unix/emacs lineage (`⌃A`, `⌃E`, `⌃K`), which is why they also work in the terminal and in native text fields.

---

## How it works

**Modifier symbols** you'll see in menus:

| Symbol | Key |
|---|---|
| ⌘ | Command |
| ⌥ | Option (Alt) |
| ⌃ | Control |
| ⇧ | Shift |
| ⇪ | Caps Lock |
| fn | Function |

**System & app management**

| Shortcut | Action |
|---|---|
| `⌘ Space` | Spotlight search (launch apps, find files, calculate) |
| `⌘ Tab` | Switch between open apps |
| `⌘ \`` | Switch between windows of the current app |
| `⌘ Q` | Quit the current app |
| `⌘ W` | Close the current window/tab |
| `⌘ H` | Hide the current app |
| `⌘ M` | Minimize the window |
| `⌃ ↑` | Mission Control (all windows) |
| `⌃ ←` / `⌃ →` | Move between desktops / full-screen spaces |

**Finder**

| Shortcut | Action |
|---|---|
| `⌘ N` | New Finder window |
| `⌘ ⇧ N` | New folder |
| `⌘ ↑` / `⌘ ↓` | Go to parent folder / open selected |
| `⌘ ⇧ .` | Toggle hidden files |
| `⌘ Delete` | Move to Trash |
| `Space` | Quick Look (preview without opening) |
| `⌘ ⇧ G` | Go to folder (type a path) |

**Screenshots & screen recording**

| Shortcut | Action |
|---|---|
| `⌘ ⇧ 3` | Capture the whole screen |
| `⌘ ⇧ 4` | Capture a selected region |
| `⌘ ⇧ 4` then `Space` | Capture a specific window |
| `⌘ ⇧ 5` | Screenshot/recording toolbar |

**Text editing** (these work in most native text fields — and mirror the terminal):

| Shortcut | Action |
|---|---|
| `⌘ ←` / `⌘ →` | Jump to start / end of line |
| `⌥ ←` / `⌥ →` | Move one word left / right |
| `⌘ ↑` / `⌘ ↓` | Jump to start / end of document |
| `⌃ A` / `⌃ E` | Start / end of line (emacs-style) |
| `⌃ K` | Delete from cursor to end of line |
| `⌘ ⇧ Z` | Redo |

---

## Examples

Two workflows that show the value of chaining shortcuts:

```text
Snap a region of the screen into a document:
  ⌘⇧4  →  drag to select  →  (screenshot saved to Desktop)
  ⌘⇧4 while holding ⌃  →  region copied to CLIPBOARD instead
  ⌘V   →  paste into the target app

Quickly move a word and fix a typo, no mouse:
  ⌥←   →  jump back one word
  ⌥⇧←  →  extend selection one word
  type replacement  →  ⌘S to save
```

You can view and customize almost every shortcut in **System Settings → Keyboard → Keyboard Shortcuts**, and add per-app shortcuts for any existing menu item.

---

## When to use

- High-frequency actions: switching apps (`⌘Tab`), searching (`⌘Space`), saving (`⌘S`).
- Screenshots and screen capture for docs, bug reports, and reviews.
- Text navigation — the emacs-style `⌃A`/`⌃E`/`⌃K` set transfers straight to the terminal.

## When NOT to use

- Don't assume Windows/Linux muscle memory — `Ctrl` is **not** the primary modifier here; it's `⌘`.
- Don't rebind system shortcuts to something an app already uses — conflicts silently break one of them.
- Don't rely on obscure combos in shared docs; spell out the action too, since custom remaps vary per machine.

---

## References

- [Mac keyboard shortcuts (Apple Support)](https://support.apple.com/en-us/102650)
- [Take a screenshot on your Mac (Apple Support)](https://support.apple.com/en-us/102646)
- [Use Spotlight on your Mac (Apple Support)](https://support.apple.com/en-us/105056)
- [ss64 — macOS keyboard shortcuts](https://ss64.com/mac/syntax-keyboard.html)
