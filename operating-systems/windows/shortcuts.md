---
type: concept
tags:
  - operating-system
  - windows
related:
  - operating-systems/windows/overview
  - operating-systems/windows/shell
  - operating-systems/macos/shortcuts
language: null
---

# Windows Keyboard Shortcuts

> The essential Windows keyboard shortcuts, built around the **Ctrl** key for editing and the **⊞ Win** key for system and window management.

---

## What is it?

Keyboard shortcuts on Windows use **Ctrl** as the primary modifier for editing actions (copy, paste, save) and the **⊞ Windows key** for system-level actions (launching, window snapping, virtual desktops). The other modifiers are **Alt** and **Shift**.

For people coming from macOS, the main adjustment is `Ctrl` in place of `⌘` for the copy/paste/save family.

---

## Why does it matter?

These shortcuts are consistent across most Windows apps and versions, so learning the core set speeds up everyday work. The **⊞ Win** key shortcuts in particular (window snapping, virtual desktops, the emoji picker) are easy to miss but noticeably improve a multi-window workflow.

---

## How it works

**System & window management (⊞ Win key)**

| Shortcut | Action |
|---|---|
| `⊞ Win` | Open Start menu |
| `⊞ Win + E` | Open File Explorer |
| `⊞ Win + D` | Show/hide the desktop |
| `⊞ Win + L` | Lock the screen |
| `⊞ Win + ← / →` | Snap the window to the left/right half |
| `⊞ Win + Tab` | Task View (all windows + virtual desktops) |
| `⊞ Win + Ctrl + ← / →` | Switch virtual desktops |
| `⊞ Win + Shift + S` | Snip a screen region to the clipboard |
| `⊞ Win + .` | Emoji / symbol picker |
| `Alt + Tab` | Switch between open windows |
| `Alt + F4` | Close the current window |

**Editing (Ctrl-based, work in most apps)**

| Shortcut | Action |
|---|---|
| `Ctrl + C / X / V` | Copy / cut / paste |
| `Ctrl + Z / Y` | Undo / redo |
| `Ctrl + S` | Save |
| `Ctrl + A` | Select all |
| `Ctrl + F` | Find |
| `Ctrl + ← / →` | Move cursor one word |
| `Ctrl + Backspace` | Delete the previous word |

**Terminal note.** In Windows Terminal / PowerShell, `Ctrl + C` copies when text is selected but sends the interrupt signal otherwise; `Ctrl + V` pastes. WSL sessions follow Linux readline conventions instead.

---

## Examples

A quick multi-window workflow with no mouse:

```text
Arrange two apps side by side:
  ⊞ Win + ←   → snap current window to the left half
  Alt + Tab   → select the other window
  ⊞ Win + →   → snap it to the right half

Capture and paste a region:
  ⊞ Win + Shift + S  → drag to select (copied to clipboard)
  Ctrl + V           → paste into the target app
```

---

## When to use

- Window management on a single monitor — snapping (`⊞ Win + ←/→`) and virtual desktops.
- The universal editing set (`Ctrl + C/V/Z/S`) across virtually all apps.
- Fast region screenshots with `⊞ Win + Shift + S`.

## When NOT to use

- Don't carry macOS muscle memory — the modifier is `Ctrl`, not `⌘`.
- Don't assume `Ctrl + C` always copies in a terminal — with no selection it interrupts the running program.
- Don't rely on remapped or vendor-specific laptop keys in shared instructions — spell out the action too.

---

## References

- [Keyboard shortcuts in Windows (Microsoft Support)](https://support.microsoft.com/en-us/windows/keyboard-shortcuts-in-windows-dcc61a57-8ff0-cffe-9796-cb9706c75eec)
- [Windows keyboard shortcuts (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/apps/design/input/keyboard-accelerators)
- [Snap your windows (Microsoft Support)](https://support.microsoft.com/en-us/windows/snap-your-windows-885a9b1e-a983-a3b1-16cd-c531795e6241)
