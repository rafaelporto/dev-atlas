---
type: concept
tags:
  - architecture
  - concept
  - tui
  - cli
  - state-management
  - decision-support
related:
  - software-engineering/architecture/cli/overview
  - software-engineering/architecture/cli/cli-architecture
  - software-engineering/architecture/frontend/state-management-architecture
  - languages/go/cli/tui
  - languages/csharp/cli/tui
language: null
---
# TUI Architecture

> Three architectural families answer the same question — where does a widget's state live — and the answer decides your render pipeline, your input handling, and whether a screen can be tested at all.

---

## What is it?

TUI architecture is how a full-screen terminal application is organized internally: where state lives, what triggers a redraw, how keystrokes reach the code that acts on them, and how any of it gets tested.

This article uses the narrow definition settled in the [overview](overview.md) — **a TUI is full-screen and event-driven**. Styled tables, spinners, and progress bars in a normal scrolling command are enriched CLI output, and belong to [CLI Architecture](cli-architecture.md).

The distinction from a framework tutorial matters here. Language articles teach *a* toolkit; this one names the **families** those toolkits belong to, and the pipeline all of them implement underneath.

---

## Why does it matter?

A TUI is a UI framework decision made in a place with no defaults. There is no DOM, no layout engine, no accessibility tree, no repaint scheduler — just a grid of cells and a byte stream. Whatever you do not choose deliberately, you will end up writing accidentally.

Choosing a family is choosing who owns state, and it is close to irreversible once the second screen exists. It also determines three failure modes that look like bugs but are consequences: terminal corruption after a crash, flicker over a slow SSH link, and UI code that can only be verified by a human looking at it.

---

## How it works

### Three architectural families

**Elm / TEA — unidirectional and message-driven.** One model holds all state. `update(msg, model)` returns a new model; `view(model)` returns a frame. The runtime owns the loop and executes side effects that `update` merely describes. Because state is a single value, replay, time travel, and framework-free tests come for free. The cost is that everything becomes a message, which makes deeply local state feel ceremonious.

**Retained-mode widget tree.** Long-lived widget objects each hold their own state, arranged in a tree with focus traversal and callbacks. This is classic GUI toolkit design, so it is immediately familiar and comes with dialogs, menus, and text fields already built. The cost is that state is scattered across the tree, "who owns this value" becomes a real question, and thread-safety becomes your problem.

**Immediate mode.** There are no widget objects at all. Every frame you *call* `button(...)` or `list(...)`, and the return value tells you what happened. The UI is a pure function of application state, recomputed each frame. The cost is inverted: anything a widget would have remembered — scroll offset, selection, expansion — you store yourself.

```
   Elm / TEA — the loop the runtime owns

        ┌──────────────┐
   Msg  │              │  Model
  ─────►│    update    ├────────► view ──► frame
        │   (pure)     │
        └──────┬───────┘
               │ Cmd — a description of an effect, not the effect
               ▼
        runtime performs it, off the loop
               │
               └──────► new Msg ──┐
                                  │
        ◄─────────────────────────┘
```

| Family | State lives in | Redraw trigger | Testability | Best fit |
|---|---|---|---|---|
| Elm / TEA | one model value | every message | high — call `update`, assert | one flow, whole screen derived from one state |
| Retained tree | each widget object | mutation + explicit refresh | low — needs a driver | many panels, dialogs, focus traversal |
| Immediate | your application state | every frame | high — frame is a function | live dashboards, monitors, visualizers |

Across ecosystems: Bubble Tea (Go) and Elm itself are TEA; Lanterna's `gui2` (Java), Terminal.Gui (C#), Textual (Python), and blessed are retained; Ratatui (Rust) and Dear ImGui outside terminals are immediate. Ink (Node) is a retained tree with an immediate-looking authoring model, which is why it feels like neither. The language sections show one family each in real code — see [Go — Terminal UIs](../../../languages/go/cli/tui.md) for TEA and [C# — Terminal UIs](../../../languages/csharp/cli/tui.md) for the retained tree.

State ownership here is the same problem the web solved by kind and locality, treated in [state management architecture](../frontend/state-management-architecture.md); the terminal just removes the framework that used to decide it for you.

### The render pipeline

Every family lands on the same pipeline, and it is the reason a TUI is usable at all over a slow link.

```
   app state ─► view() ─► back buffer  ┐
                          (cells: rune,│ diff ─► minimal ANSI ─► terminal
   front buffer ────────── fg, bg, attr)┘   (only changed cells)
        ▲                                          │
        └──────────────── swap ◄───────────────────┘

   enter: alternate screen ON, cursor hidden, raw mode ON
   exit : ALWAYS the inverse — on quit, on panic, on signal
```

A frame is rendered into a back buffer of styled cells, diffed against the previous frame, and only the changed cells are emitted as cursor moves and writes. Clearing and repainting the whole screen instead is what produces flicker and saturates a remote connection.

The **alternate screen** is what makes the takeover reversible: the user's scrollback is untouched and returns intact on exit. That makes restoration an architectural invariant rather than hygiene — raw mode off, cursor shown, alternate screen off, on *every* exit path including panics and signals. A program that gets this wrong leaves the user with a broken shell.

### Input, focus, and keymap as data

Input arrives as raw bytes and has to become meaning: decode into events (key, resize, paste, mouse), route to a focus target, translate into an action.

The architectural rule is that **the keymap is data, not control flow** — a table from (context, key) to a named action, kept separate from the code that performs the action. Three things fall out of that at no extra cost: users can remap keys, the help screen can be generated from the table rather than maintained beside it, and tests can fire actions directly without synthesizing byte sequences.

Focus deserves the same treatment. Exactly one target has focus; focus is model state, not a flag hidden on a widget; and a modal or context stack decides who sees a key first. Getting this wrong is how a TUI ends up with keys that work on some screens and silently do nothing on others.

### Layout and testing

**Layout engines** come in three shapes: constraint or split layout, where a rectangle is recursively divided by ratios and fixed lengths; flexbox, borrowed wholesale from the web; and CSS-like, where rules select nodes in a widget tree. They all resolve a tree of intentions into integer cell rectangles — and *integer* is the entire difficulty. There are no fractional cells, so rounding, minimum sizes, and double-width or combining characters are where layout bugs actually live.

**Testing** has three levels, and which ones are available to you is decided by the family:

1. **Pure update tests** — send a synthetic message, assert on the resulting state. Free in TEA and immediate mode, painful in a retained tree.
2. **Golden-frame tests** — render the model at a fixed size and compare the frame text to a checked-in file. This is the level that catches layout regressions, and the trap is that goldens are size-dependent, so pin the terminal size in the test.
3. **Driver tests** — feed a scripted sequence of keys to the whole program. Slowest, and reserved for flows rather than screens.

---

## Examples

The illustrative snippet (one language's syntax) shows the Elm-family loop and a keymap held as data — written with plain types and no TUI framework, because the pattern is the point rather than the library.

```go
// Keymap as data: a table, not a switch buried in the view.
type Action string

var keymap = map[string]Action{
	"j": ActDown, "k": ActUp, "enter": ActOpen, "q": ActQuit,
}

type Model struct {
	items  []string
	cursor int
	quit   bool
}

// update: pure. A message in, a new model out. No terminal in scope.
func Update(m Model, key string) Model {
	switch keymap[key] {
	case ActDown:
		m.cursor = min(m.cursor+1, len(m.items)-1)
	case ActUp:
		m.cursor = max(m.cursor-1, 0)
	case ActQuit:
		m.quit = true
	}
	return m
}

// view: pure. A model in, a frame out. The runtime diffs it against the last frame.
func View(m Model) string { /* build the frame */ }

// The test needs no terminal and no framework:
//   got := View(Update(Model{items: names}, "j"))
//   compare(got, golden("cursor_moved_down.txt"))
```

In a retained toolkit the same keymap becomes a command table registered on the focused view; in an immediate-mode toolkit `View` and `Update` collapse into one per-frame function. In all three the keymap stays data and the frame stays comparable to a golden file.

---

## When to use

- **Elm / TEA** — when the whole screen derives from one state, when you want replayable tests that need no terminal, and when the app is essentially one flow.
- **Retained-mode widget tree** — when the UI is many independent panels with their own state, when you need dialogs, menus, and focus traversal, and when the team already thinks in GUI toolkits.
- **Immediate mode** — when the UI is a thin projection of state that changes every frame, and you are content owning persistent widget state yourself.
- **Any of them** — as soon as the interface must survive a resize and a slow link; all three need the diffing pipeline.

## When NOT to use

- **A TUI for a scriptable task** — a full-screen TUI holds the terminal, emits screen-painting control codes instead of parseable output, and cannot run in CI; ship a non-interactive path for every task the TUI exposes.
- **A TUI framework for rich inline output** — tables, spinners and live progress belong to a normal command with a capability-aware renderer; taking the alternate screen for output the user wants to keep destroys their terminal scrollback.
- **Blocking the TUI event loop with I/O** — a network call or directory walk inside update or view freezes every keystroke and every repaint; run the work off the loop and deliver the result back to the TUI as a message.
- **Mutating widget state from a background thread** — a retained-mode TUI widget tree is not thread-safe; marshal changes onto the terminal event loop rather than painting the screen from a worker.
- **Clearing and repainting the whole terminal every frame** — full-screen repaints flicker and saturate slow links such as SSH; diff the new frame against the previous buffer and emit only the cells that actually changed.
- **Keybindings hardcoded across the widget tree** — key handling buried inside each TUI widget cannot be remapped, documented, or tested; keep the keymap as data and dispatch named actions from it.

---

## References

- Czaplicki, Evan. [The Elm Architecture](https://guide.elm-lang.org/architecture/). An Introduction to Elm.
- Muratori, Casey. [Immediate-Mode Graphical User Interfaces](https://caseymuratori.com/blog_0001). caseymuratori.com, 2005.
- Ratatui. [Rendering — Immediate vs Retained Mode](https://ratatui.rs/concepts/rendering/). ratatui.rs.
- Dickey, Thomas. [XTerm Control Sequences](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html). invisible-island.net.
