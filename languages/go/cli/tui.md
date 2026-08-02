---
type: concept
tags:
  - language
  - go
  - cli
  - tui
related:
  - languages/go/cli/overview
  - languages/go/cli/terminal-and-shell
  - languages/go/cli/best-practices
  - languages/go/concurrency
language: "go"
---

# Terminal UIs (TUIs) in Go

> Building full-screen, interactive terminal apps in Go with Bubble Tea's Elm architecture, styled with Lip Gloss and composed from Bubbles widgets — plus when a TUI beats a plain CLI, and the tview alternative.

---

## What is it?

A **TUI (text-based user interface)** is a full-screen, interactive application that runs inside the terminal — it redraws the screen, responds to keystrokes in real time, and often shows panels, lists, and progress. Think `htop`, `vim`, `lazygit`, or an interactive branch picker. Unlike a plain [CLI](overview.md) that runs once and exits, a TUI holds the terminal and loops until you quit.

In Go, the dominant toolkit is the **Charm stack**: [Bubble Tea](https://github.com/charmbracelet/bubbletea) (the runtime/architecture), [Lip Gloss](https://github.com/charmbracelet/lipgloss) (styling), and [Bubbles](https://github.com/charmbracelet/bubbles) (ready-made widgets). [tview](https://github.com/rivo/tview) is a widget-oriented alternative.

## Why does it matter?

Some tasks are painful as a sequence of one-shot commands. Choosing one item from 200, resolving a merge, or watching several jobs progress at once all want *state on screen* and *immediate feedback*. A TUI gives you a GUI's interactivity without leaving the terminal — no browser, no window server, still a single Go binary you can run over SSH.

Bubble Tea matters specifically because it imposes a **predictable architecture**. Terminal event handling is otherwise a mess of raw input parsing and manual screen redraws; Bubble Tea reduces it to a pure state machine, which is far easier to reason about and test.

## How it works

Bubble Tea implements **The Elm Architecture (TEA)**: a single immutable-ish state (the *model*), a function that folds incoming events into a new state (*update*), and a function that renders the state to a string (*view*). The runtime owns the event loop.

```
        ┌──────────────────────────────────────────────┐
        │                  Bubble Tea runtime            │
        │                                                │
  event │   ┌────────┐   Msg    ┌────────┐   Model       │
 ───────┼──▶│  Init  │────────▶ │ Update │───────┐       │
 (key,  │   └────────┘          └────────┘       │       │
  tick, │        ▲                  │            ▼       │
  I/O)  │        │ Cmd (async)      │        ┌────────┐  │
        │        └──────────────────┘        │  View  │  │
        │                                     └────────┘  │
        │                                         │       │
        └─────────────────────────────────────────┼──────┘
                                                    ▼
                                          rendered to terminal
```

The four pieces:

- **Model** — your application state, any Go type (usually a struct).
- **Init** — returns an optional first `Cmd` (e.g., start a timer, kick off a fetch).
- **Update(msg, model) → (model, Cmd)** — given a message (a keypress, a window resize, a custom message from a `Cmd`), return the next model and optionally a `Cmd` to run.
- **View(model) → string** — render the current model to a string; the runtime diffs and paints it.

Two key types:

- **`tea.Msg`** — any value delivered to `Update` (e.g. `tea.KeyMsg`, `tea.WindowSizeMsg`, or your own).
- **`tea.Cmd`** — a function that does I/O off the main loop and returns a `tea.Msg` when done. This is how Bubble Tea keeps `Update`/`View` pure while still doing network calls, timers, and reads — leaning on Go's [concurrency](../concurrency.md) under the hood. You never block in `Update`; you return a `Cmd`.

**Lip Gloss** styles strings declaratively (colors, borders, padding, layout) and is TTY/`NO_COLOR`-aware. **Bubbles** provides pre-built models — text input, list, table, spinner, viewport, progress — that you embed in your own model.

## Examples

A minimal Bubble Tea program: a counter you change with the arrow keys and quit with `q`.

```go
package main

import (
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// 1. Model: the application state.
type model struct {
	count int
}

// 2. Init: no startup command needed.
func (m model) Init() tea.Cmd { return nil }

// 3. Update: fold each message into a new model.
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "up", "k":
			m.count++
		case "down", "j":
			m.count--
		case "q", "ctrl+c":
			return m, tea.Quit // tea.Quit tells the runtime to exit
		}
	}
	return m, nil
}

// 4. View: render the model to a string.
var style = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("205"))

func (m model) View() string {
	return fmt.Sprintf(
		"Count: %s\n\n↑/↓ to change · q to quit\n",
		style.Render(fmt.Sprintf("%d", m.count)),
	)
}

func main() {
	if _, err := tea.NewProgram(model{}).Run(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}
```

Doing async work is a `Cmd` that returns a `Msg`. For example, fetching data on startup:

```go
type dataMsg struct{ records []string }

func fetchCmd() tea.Cmd {
	return func() tea.Msg {
		records := loadFromAPI() // runs off the main loop
		return dataMsg{records}  // delivered to Update as a message
	}
}

func (m model) Init() tea.Cmd { return fetchCmd() }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case dataMsg:
		m.records = msg.records // update state when the fetch completes
	}
	return m, nil
}
```

Embedding a **Bubbles** widget — here a text input — follows the same fold pattern: delegate the message to the child model and store what it returns.

```go
import "github.com/charmbracelet/bubbles/textinput"

type model struct{ input textinput.Model }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg) // child handles its own keys
	return m, cmd
}

func (m model) View() string { return m.input.View() }
```

The **tview** alternative is more imperative and widget-first — you construct primitives (`Table`, `List`, `Flex`) and set callbacks, closer to a classic GUI toolkit:

```go
import "github.com/rivo/tview"

func main() {
	app := tview.NewApplication()
	list := tview.NewList().
		AddItem("Deploy", "Ship to production", 'd', nil).
		AddItem("Quit", "Exit", 'q', func() { app.Stop() })
	if err := app.SetRoot(list, true).Run(); err != nil {
		panic(err)
	}
}
```

## When to use

- Selecting from many options interactively (fuzzy pickers, list/table navigation).
- Dashboards and monitors that update live (logs, metrics, job progress).
- Multi-step interactive flows (wizards, forms) that are awkward as a chain of flags/prompts.
- Tools used over SSH or in environments with no GUI, where terminal-native interactivity wins.
- Anywhere real-time keyboard feedback materially improves the task.

## When NOT to use

- **Scriptable, non-interactive tasks** — a TUI can't be piped or run in CI. Keep a plain [CLI](overview.md) path for automation, even if you also offer a TUI.
- **Output that must be piped or redirected** — TUIs take over the screen and emit control codes, not clean stdout. See [Best Practices](best-practices.md) on stdout/stderr.
- **Trivial one-shot commands** — the extra dependency and event-loop complexity aren't worth it for `tool --version`.
- **Non-TTY environments** — always detect the terminal ([TTY detection](terminal-and-shell.md)) and refuse (or fall back) when there isn't one.

## References

- [Bubble Tea](https://github.com/charmbracelet/bubbletea) — the TUI framework and its tutorials.
- [The Elm Architecture](https://guide.elm-lang.org/architecture/) — the pattern Bubble Tea is built on.
- [Lip Gloss](https://github.com/charmbracelet/lipgloss) and [Bubbles](https://github.com/charmbracelet/bubbles).
- [tview](https://github.com/rivo/tview) — the widget-oriented alternative.
