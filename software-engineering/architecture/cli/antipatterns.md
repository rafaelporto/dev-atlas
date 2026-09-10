---
type: concept
tags:
  - architecture
  - antipattern
  - cli
  - tui
related:
  - software-engineering/architecture/cli/overview
  - software-engineering/architecture/cli/cli-architecture
  - software-engineering/architecture/cli/tui-architecture
  - software-engineering/architecture/cli/project-organization
  - languages/go/cli/best-practices
language: null
---
# CLI and TUI Antipatterns

> The recurring failures of terminal programs, each with the symptom you can observe, the reason it fails, and the repair — most of them cheap to avoid and expensive to reverse, because they harden into a public contract.

---

## What is it?

An antipattern here is a structural choice that looks reasonable while you are writing a terminal program and becomes a wall later. Not a style preference, and not a missing feature — a decision about boundaries that forecloses something you will want.

The catalogue below is deliberately narrow. Each entry names a failure, states the observable symptom, explains the mechanism, and gives the repair. It assumes the vocabulary set out in the [Overview](overview.md). For the positive framing of the same boundaries, see [CLI Architecture](cli-architecture.md), [TUI Architecture](tui-architecture.md), and [Project Organization](project-organization.md).

---

## Why does it matter?

Terminal programs harden faster than most software. Flag names, exit codes, and output shape escape into shell scripts, `Makefile`s, CI pipelines, and agent tool definitions within days, and none of those callers announce themselves. What starts as an internal detail is a compatibility obligation by the second release.

That asymmetry is what makes these particular mistakes worth cataloguing. Each is a few minutes' work to avoid at the start, and a breaking change to fix afterwards.

---

## How it works

### The god handler

**Symptom.** The function the argument parser calls also queries the database, formats the output, and exits.

**Why it fails.** The domain now depends on the CLI framework. Tests must spawn a process. A second front end — a TUI, a service, a library binding — has nothing to call, because the logic only exists inside a handler signature owned by a parsing library.

**Fix.** The handler parses, delegates, renders, and returns a code. The work lives in a core that compiles without the parser in scope.

### Exit code one for everything

**Symptom.** Every failure path returns `1`, and callers distinguish causes by matching on stderr text.

**Why it fails.** Error text is not a contract — it gets rewritten, translated, and wrapped. Callers that grep it break silently on a cosmetic change, and there is no way for a script to tell "you typed it wrong" from "the network is down", which are opposite remedies.

**Fix.** Classify errors by who must act, map each class to one stable code, and do the mapping in exactly one place.

### Decorated output as the only output

**Symptom.** The tool prints a bordered table, and the only way to consume it programmatically is to parse the borders.

**Why it fails.** Human formatting is the layer you most want freedom to change, and parsing pressure freezes it. Meanwhile the actual consumers — CI, scripts, agents — are forced into brittle text extraction.

**Fix.** Treat machine-readable output as a mode chosen at the edge, with a versioned schema, alongside a human renderer that stays free to change.

### The prompt trap

**Symptom.** Some capability can only be reached by answering an interactive question.

**Why it fails.** The tool cannot run in CI, cannot be scripted, and cannot be tested without a pseudo-terminal. It also tends to hang rather than fail when stdin is not a terminal, which is the worst available behaviour.

**Fix.** Every prompt gets an equivalent flag, environment variable, or config key. The prompt is a convenience over the non-interactive path, never the only path.

### Configuration read at the point of use

**Symptom.** Environment lookups and config reads scattered through the codebase, wherever a value happens to be needed.

**Why it fails.** Precedence stops being a design and becomes an accident of call order. Nobody can answer "where did this value come from", tests must mutate global state, and the same setting ends up resolved two different ways in two code paths.

**Fix.** Resolve every source into one validated value at the edge, before the core runs, and pass it down. The precedence chain itself is covered in [Go — CLI best practices](../../../languages/go/cli/best-practices.md).

### The terminal left broken

**Symptom.** After a crash or an interrupt, the shell has no echo, no cursor, or the wrong colors, and the user types `reset`.

**Why it fails.** Raw mode, the alternate screen, and cursor visibility are process-global terminal state, not program state. Restoring them only on the happy path means every panic and every signal leaves the user's session damaged.

**Fix.** Restoration is an invariant on *every* exit path — normal quit, panic, and signal — installed at the same place the terminal was taken over.

### Blocking the event loop

**Symptom.** The TUI freezes during a network call; keys queue up and the screen stops repainting.

**Why it fails.** One thread owns input, state, and rendering. Any synchronous work on it stalls all three, and the interface stops responding to the very keystroke — the cancel key — the user now wants.

**Fix.** Work happens off the loop and reports back as a message or event. The update path stays fast and free of I/O.

### The silent contract break

**Symptom.** A release renames a flag, reorders positional arguments, or changes an exit code, and the changelog calls it a cleanup.

**Why it fails.** Every observable behaviour of a CLI has a caller, whether or not it was documented — Hyrum's Law applies with unusual force here because the interface is trivially easy to depend on. There is no deprecation channel: a script does not get a compiler warning.

**Fix.** Write down what is public, keep it under a contract test, and treat a change to it as a major version with an overlap period where both spellings work.

---

## Examples

The illustrative snippet (one language's syntax) shows the god handler and its repair.

```go
// BEFORE — parsing, work, formatting, and exit all in the handler.
func exportCmd(cmd *cobra.Command, args []string) {
	rows, err := db.Query("SELECT ...", args[0])
	if err != nil {
		fmt.Println("error:", err) // wrong stream, and no classification
		os.Exit(1)                 // exit buried in a leaf
	}
	for _, r := range rows {
		fmt.Printf("| %-20s | %6d |\n", r.Name, r.Count) // only one output shape
	}
}

// AFTER — the handler adapts; the core is reusable and testable.
func Export(ctx context.Context, c ExportCmd) (Report, error) { /* ... */ }

func exportCmd(ctx context.Context, out io.Writer, c ExportCmd, r Renderer) error {
	rep, err := Export(ctx, c)
	if err != nil {
		return err // classified upward; one place maps errors to codes
	}
	return r.Report(out, rep)
}
```

The repair is not more code, it is the same code with three seams: a value in, data out, and rendering separated from computing. Every other entry in this catalogue becomes easier to avoid once those seams exist.

---

## When to use

- In code review of a terminal program, as a checklist of the failures worth blocking on.
- Before adding a second front end, to find which boundaries are decorative.
- When a CLI starts accumulating "we can't change that, something depends on it" — usually several of these at once.
- As an audit target for an agent working over an existing CLI codebase.

## When NOT to use

- **A throwaway script is allowed to be a god handler** — a fifty-line personal CLI with no second caller does not need a core package, a renderer port, or an error taxonomy; apply these repairs in proportion to the audience.
- **A CLI with no machine consumers can skip structured output** — if nothing scripts the tool and nothing ever will, a versioned output schema is a contract with no counterparty.
- **A pre-1.0 CLI may break its own surface freely** — before anyone depends on the flags, renaming a subcommand is design, not a contract break; the discipline starts when the first caller arrives.
- **An internal TUI can hardcode its keymap** — if nobody will remap keys and the help screen is three lines, keymap-as-data buys indirection you will not use.
- **Treating this catalogue as a gate for every terminal program** — a CLI that is small, internal, and short-lived pays real cost for each of these boundaries and recovers none of it.

---

## References

- Prasad, Aanand; Firshman, Ben; Tashian, Carl; Parish, Eva. [Command Line Interface Guidelines](https://clig.dev/). clig.dev.
- Wright, Hyrum. [Hyrum's Law](https://www.hyrumslaw.com/). hyrumslaw.com.
- Raymond, Eric S. [Basics of the Unix Philosophy](http://www.catb.org/~esr/writings/taoup/html/ch01s06.html). The Art of Unix Programming, Addison-Wesley, 2003.
- Fowler, Martin. [TestPyramid](https://martinfowler.com/bliki/TestPyramid.html). martinfowler.com.
