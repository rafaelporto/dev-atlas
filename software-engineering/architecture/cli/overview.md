---
type: concept
tags:
  - architecture
  - concept
  - cli
  - tui
  - overview
related:
  - software-engineering/architecture/cli/cli-architecture
  - software-engineering/architecture/cli/tui-architecture
  - software-engineering/architecture/cli/project-organization
  - software-engineering/architecture/cli/antipatterns
  - languages/go/cli/overview
  - languages/go/cli/best-practices
  - languages/csharp/cli/tui
language: null
---
# CLI and TUI Architecture — Overview

> Two independent axes — does the program own the screen, and does it wait for keystrokes — separate a plain CLI from a rich-output CLI from a full-screen TUI, and decide which architecture you owe the program.

---

## What is it?

A terminal program is software whose entire user interface is text written to, and keys read from, a terminal. That single sentence covers `ls`, `git`, `htop`, and `vim` — programs with almost nothing in common architecturally.

The field calls all of them "CLIs" and some of them "TUIs", inconsistently, and the inconsistency is not harmless: it hides the fact that these programs differ by an order of magnitude in what they cost to build. This section fixes the vocabulary first, then builds on it.

The taxonomy below is the map. The mechanisms live in [CLI Architecture](cli-architecture.md) and [TUI Architecture](tui-architecture.md), the source layout in [Project Organization](project-organization.md), and the recurring failures in [Antipatterns](antipatterns.md).

---

## Why does it matter?

**The architecture you owe a program is decided by its quadrant, not by its subject.** A tool that prints a table and a tool that navigates one differ by an event loop, a renderer, a diffing pipeline, terminal state restoration, and a non-interactive fallback. Picking the wrong quadrant early means either building all of that for nothing, or discovering halfway that you need it.

**A terminal program has two audiences.** People run it, and so do shells, `Makefile`s, CI jobs, and — increasingly — LLM agents invoking it as a tool. The second audience never sees your colors or your layout. It sees argv, stdin, stdout, stderr, and an exit code. That is a machine API wearing a text skin, and the quadrant decides whether that API exists at all.

---

## How it works

### The two axes

**Axis 1 — screen ownership.** An *inline* program writes into the shell's scrollback; its output survives after it exits and can be scrolled, copied, and piped. A *full-screen* program switches the terminal to its alternate buffer, owns every cell until it quits, and leaves nothing behind.

**Axis 2 — input model.** A *non-interactive* program reads argv and stdin, runs to completion, and exits. An *event-driven* program puts the terminal in raw mode and loops on keystrokes.

The axes are independent, which gives four quadrants:

```
                   non-interactive (argv + stdin)   event-driven (raw-mode keys)
                 ┌───────────────────────────────┬──────────────────────────────┐
  inline         │ 1  Plain CLI                  │ 2  Prompt-driven CLI         │
  (scrollback    │    ls, grep, curl, git log    │    wizards, inline pickers    │
   is preserved) │    + rich output: tables,     │    scrolls, then continues    │
                 │      progress, live regions   │                               │
                 ├───────────────────────────────┼──────────────────────────────┤
  full-screen    │ 3  One-shot frame  (rare)     │ 4  TUI                        │
  (alternate     │                               │    htop, vim, less, lazygit   │
   screen buffer)│                               │    holds the terminal         │
                 └───────────────────────────────┴──────────────────────────────┘
```

Quadrant 3 is nearly empty, and that is informative: taking over the screen is only worth it if you are going to keep it.

### Reconciling the two definitions of "TUI"

The word is used two ways, and both are defensible. The narrow definition — a TUI is full-screen and holds the terminal until you quit — is quadrant 4. The broad definition — a TUI is anything beyond plain line-by-line output — pulls in styled tables, spinners, and progress bars, which are quadrant 1.

The 2×2 dissolves the argument. **This section adopts the narrow definition: a TUI is full-screen and event-driven.** The other thing gets its own name — **enriched CLI output** — because architecturally it is a plain CLI with a capability-aware renderer, not a TUI at all. It has no event loop, no alternate screen, and no state to maintain between frames.

The distinction is worth the pedantry because the two need completely different things:

| You want | Quadrant | Architecture you owe |
|---|---|---|
| Tables, colors, spinners, live progress | 1 — enriched CLI | A renderer behind an interface, plus capability detection. No event loop. |
| One question, then continue | 2 — prompt-driven | Plain CLI, plus a prompt that **must** have a flag equivalent |
| Panels, focus, navigation, live keyboard | 4 — TUI | Event loop, model/update/view, frame diffing, terminal state restoration |

Ecosystems that ship an answer for both quadrants under one banner make this easy to miss — see [C# — Terminal UIs](../../../languages/csharp/cli/tui.md), where a rich-output library and a full-screen widget toolkit sit side by side.

### The two audiences

Every capability reachable interactively must also be reachable non-interactively. That is the single rule the second audience imposes, and it is the one most often broken.

The human contract is discoverability and feedback: help text, progress, sensible defaults. The machine contract is narrower and stricter — argv in, structured bytes on stdout, diagnostics on stderr, a stable exit code — and unlike the human contract, changing it silently breaks callers who are not in the room.

Quadrant 4 is the one quadrant with no machine contract at all. A full-screen program emits screen-painting control sequences, not output; nothing downstream can parse it. That is why a TUI is a *second* front end over a core, never the only one.

The mechanics of that contract — which stream carries what, exit-code values, TTY detection, `NO_COLOR` — are settled in [Go — CLI best practices](../../../languages/go/cli/best-practices.md). This article only claims that the two audiences are what make the quadrant choice consequential.

### Where each concern lives

| Concern | Article |
|---|---|
| Turning a command line into a validated call on a core | [CLI Architecture](cli-architecture.md) |
| Owning the screen: state, rendering, input, layout | [TUI Architecture](tui-architecture.md) |
| Where the source goes and what may import what | [Project Organization](project-organization.md) |
| The recurring failures, with symptom and repair | [Antipatterns](antipatterns.md) |
| Toolkits, parsers, and terminal libraries per ecosystem | [Go](../../../languages/go/cli/overview.md) and the other language sections |

---

## Examples

Three tools, three verdicts.

**A log tailer that follows a file and highlights matches.** Output must remain pipeable and must survive the program. Inline, non-interactive — quadrant 1, with a capability-aware renderer for the highlighting. Not a TUI.

**A release tool that shows six parallel uploads with progress bars.** Live, multi-line, redrawn output — but the user wants the final summary in their scrollback, and CI must be able to run it. Still quadrant 1: a live region that collapses to plain lines when stdout is not a terminal.

**A branch picker with fuzzy search, preview pane, and arrow-key navigation.** State on screen, immediate feedback, keys driving a loop. Quadrant 4 — and it needs a `--branch` flag so scripts never have to open it.

The illustrative snippet (one language's syntax) shows why the quadrant is a late decision: the same core drives both front ends.

```go
// Core: no terminal, no printing, no flags. Returns data.
func Branches(repo string) ([]Branch, error) { /* ... */ }

// Quadrant 1 — plain CLI: run to completion, write to stdout, exit.
func runList(out io.Writer, repo string) error {
	bs, err := Branches(repo)
	if err != nil {
		return err
	}
	for _, b := range bs {
		fmt.Fprintln(out, b.Name)
	}
	return nil
}

// Quadrant 4 — TUI: the same data becomes model state; the loop owns the screen.
func initialModel(repo string) model {
	bs, _ := Branches(repo)
	return model{branches: bs, cursor: 0}
}
```

A core that returns data and knows nothing about a terminal is what keeps the quadrant reversible. The language decides whether the second front end is a struct with an update method, a component, or a view subclass; it does not change the boundary.

---

## When to use

- Deciding whether a new tool needs an event loop at all, before committing to a framework.
- Settling a team disagreement about what "TUI" means, so the estimate matches the thing being built.
- Assessing a tool whose output is outgrowing plain lines, to tell enriched output from a genuine TUI.
- Adding a second front end to an existing tool, to check the core is actually separable.

## When NOT to use

- **A TUI where a CLI would do** — reaching for a full-screen TUI when the task is one shot with two arguments buys an event loop, a renderer, and terminal state restoration for nothing; the default terminal program is a plain CLI.
- **Calling rich output a TUI** — tables, colors, spinners, and live progress are a CLI with a capability-aware renderer, not a TUI; conflating the two drags a full-screen TUI framework into a CLI that only needed to print a table.
- **A CLI as the front door for a non-terminal audience** — a CLI serves people and programs already at a shell; multi-user workflows, long-lived shared state, and non-technical operators want a service or a GUI, not a CLI.
- **Interactive prompts as a CLI's only input path** — a CLI that can only be driven by answering prompts cannot be scripted, tested, or run in CI; every prompt in a terminal program needs an equivalent flag, environment variable, or config value.
- **Choosing a TUI architecture before the CLI is correct** — a terminal program with no correct non-interactive behaviour will not grow one later; get the CLI contract right, then add the TUI as a second front end over the same core.

---

## References

- Raymond, Eric S. [Interfaces: User-Interface Design Patterns in the Unix Environment](http://www.catb.org/~esr/writings/taoup/html/ch11s06.html). The Art of Unix Programming, Addison-Wesley, 2003.
- Kernighan, Brian W. and Pike, Rob. [Program Design in the UNIX Environment](https://harmful.cat-v.org/cat-v/unix_prog_design.pdf). AT&T Bell Laboratories, 1984.
- Prasad, Aanand; Firshman, Ben; Tashian, Carl; Parish, Eva. [Command Line Interface Guidelines](https://clig.dev/). clig.dev.
- The Open Group. [POSIX Utility Conventions](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html). The Open Group Base Specifications Issue 7.
