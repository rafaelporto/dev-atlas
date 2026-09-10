---
type: concept
tags:
  - architecture
  - concept
  - cli
  - hexagonal
  - decision-support
  - error-handling
related:
  - software-engineering/architecture/cli/overview
  - software-engineering/architecture/cli/tui-architecture
  - software-engineering/architecture/cli/project-organization
  - software-engineering/architecture/hexagonal
  - software-engineering/design-patterns/behavioral/command
  - software-engineering/design-patterns/structural/adapter
  - software-engineering/design-patterns/structural/composite
  - languages/go/cli/best-practices
  - languages/go/cli/building-clis
language: null
---
# CLI Architecture

> A command line is an untrusted string that must become a validated call on a core that knows nothing about terminals — and almost everything a CLI is judged on lives on that boundary.

---

## What is it?

CLI architecture is how a command-line program is split up internally: which part reads the command line, which part does the work, and which part decides what the user sees.

The framing that makes the rest follow is that **the CLI is a delivery mechanism, not the application**. Argument parsing is an input format, the same way an HTTP request body is an input format. Almost every complaint about a mature CLI — it cannot be tested, it cannot be scripted, we cannot add a second front end, the last release broke everyone's pipeline — is a boundary violation, not a library choice.

This article covers non-interactive and enriched-output programs, quadrants 1 and 2 of the [overview](overview.md). Full-screen programs add an event loop and a renderer on top; see [TUI Architecture](tui-architecture.md).

---

## Why does it matter?

A CLI's surface is a contract other software depends on and that you cannot silently change. Flag names, subcommand names, exit codes, and output shape are consumed by shell scripts, `Makefile`s, CI pipelines, and agents that call the tool. None of those callers will tell you before they break.

Yet the default way CLIs get written makes that contract accidental. The parser hands control to a function; the work happens there; the results get printed there; the process exits there. Nothing is wrong until the day you want to test it without spawning a process, or reuse it from a TUI, or emit JSON.

Drawing the boundary explicitly costs very little up front and buys three things: the core is testable as a library, a second front end becomes additive rather than a rewrite, and the flag surface becomes something you designed instead of something you accumulated.

---

## How it works

### The pipeline: parse, validate, core, render

Four stages, and each one is allowed to know about exactly one thing.

```
  argv ──┐
   env ──┤                                          ┌── stdout (data)
config ──┼─► parse ─► resolve ─► VALIDATED ─► core ─┤
 stdin ──┘  (syntax)  (layers)   COMMAND    (pure)  └── error ─► exit code
                                     │                             ▲
                                     │           renderer ─────────┘
                                     └── invalid ─► usage ─► exit 2

           ──────── adapter ──────────┼──── domain ────┼──── adapter ────
```

The **validated command** is the load-bearing idea: a typed value in which every input is already resolved. No "maybe the flag was set", no unset optionals, no reaching back to the environment later. By the time the core is called, the question "where did this value come from?" has no answer left inside the program.

Three rules make it hold:

- The parser never touches the domain. It produces a value; it does not decide anything.
- The core never touches a stream. It returns data or an error, never bytes.
- The renderer never makes decisions. It formats what it is given.

Which source wins when they disagree — flag over environment over file over default — is a separate, well-settled question, covered in [Go — CLI best practices](../../../languages/go/cli/best-practices.md). The architectural claim here is narrower and stricter: **resolution finishes before the core starts.**

### The command tree

A CLI grows from one command into a tree of them. The shape of that tree is a design decision users live with forever.

```
  tool
  ├── image
  │   ├── build
  │   └── push
  └── config
      ├── get
      └── set
```

Stay single-command when the program is a filter with flags. Grow a tree when the tool covers distinct nouns. Budget two levels of subcommand — a third usually means the tree is modelling your internal packages rather than the user's tasks. A flag declared as inherited but honored by only some leaves is a bug, not a shortcut.

The naming axis matters more than it looks:

| Shape | Example | Scales to | Trade-off |
|---|---|---|---|
| Verb-noun | `tool build image` | ~2 nouns | Reads like English; verbs collide as nouns multiply |
| Noun-verb | `tool image build` | many nouns | `tool <noun> --help` becomes a self-organizing index |

Noun-verb is what `docker`, `kubectl`, and `aws` converged on, and the reason is discoverability: it gives every noun a namespace that both humans and agents can enumerate. `git` and `go` are verb-first for historical reasons, and both have felt the ceiling.

### The CLI as one adapter

The core exposes use cases. The CLI is one adapter over them; a TUI, an HTTP handler, a library binding, and an agent tool are peers, not descendants. This is [Hexagonal Architecture](../hexagonal.md) with the terminal as a driving port, and the [Adapter](../../design-patterns/structural/adapter.md) pattern at the seam.

The test is falsifiable, which is the point: **delete the CLI package — does the core still compile and do its tests still pass?** If not, the boundary is decorative.

Two more named patterns show up here honestly rather than decoratively. The validated command value is the [Command](../../design-patterns/behavioral/command.md) pattern — a request reified as data, which is exactly why it can be logged, replayed, and tested. The command tree is [Composite](../../design-patterns/structural/composite.md): groups and leaves answering the same interface.

### Error taxonomy and exit codes

Exit codes are usually treated as an afterthought, which is how a tool ends up returning `1` for everything and forcing callers to grep stderr.

Classify errors by **who has to act**, then map each class to one stable code:

| Error class | Who fixes it | Stream | Code | Retryable? |
|---|---|---|---|---|
| Usage | the caller, by changing the command | stderr + usage | stable, conventionally 2 | no |
| Input | the caller, by fixing the data | stderr | stable | no |
| Environment | the operator: config, permissions, network | stderr | stable | often |
| Internal | you, with a bug fix | stderr + how to report | stable | no |
| Cancelled | nobody; the user interrupted | stderr | stable | yes |

`sysexits.h` was the classic attempt at a shared taxonomy and is now discouraged as non-portable — but the durable half is the idea, not the numbers: one code per error class, chosen by the caller's remedy. The conventional values themselves are covered in [Go — CLI best practices](../../../languages/go/cli/best-practices.md).

### Output as a mode, and plugins as subprocesses

Both follow from "the CLI is an API".

**Machine-readable output is a mode, not a formatting flag.** Model it as a renderer port with a human implementation and a structured one, chosen once at the composition edge. The consequence is a contract asymmetry worth stating out loud: the human renderer may change freely, the structured one may not — it is versioned, and it is what CI jobs and agents consume.

**Plugins should be subprocesses.** The alternative — loading third-party code into your process — inherits its crashes, its dependencies, and its security surface. The subprocess convention discovers an executable named `tool-<name>` on `PATH` and invokes it as a child:

```
  $ tool deploy staging
        │
        ├─ no built-in "deploy" ──► look for `tool-deploy` on PATH
        │                                  │
        └──────────────────────────────────┴─► exec, pass argv + env,
                                               inherit stdio, propagate exit code
```

The contract is argv, streams, and an exit code — the contract you already have. Plugins can be written in any language, and a plugin crash is a non-zero exit rather than a corrupted process. `git` and `kubectl` are the reference implementations.

---

## Examples

The illustrative snippet (one language's syntax) shows a validated command, a core that returns data, and a renderer chosen by mode.

```go
// 1. The validated command: everything already resolved. No pointers, no "unset".
type ExportCmd struct {
	Project string
	Since   time.Time
	Format  Format // human | structured
}

// 2. The core: pure. No flags, no streams, no exit. Returns data or a classified error.
func Export(ctx context.Context, c ExportCmd) (Report, error) { /* ... */ }

// 3. The renderer: a port with one implementation per output mode.
type Renderer interface{ Report(io.Writer, Report) error }

// 4. The adapter: parse, call, render, classify. Nothing else.
func runExport(ctx context.Context, out, errOut io.Writer, argv []string) int {
	cmd, err := parseExport(argv) // syntax + layer resolution + validation
	if err != nil {
		fmt.Fprintln(errOut, "usage:", err)
		return codeUsage
	}
	rep, err := Export(ctx, cmd)
	if err != nil {
		fmt.Fprintln(errOut, "error:", err)
		return exitCodeFor(err) // the taxonomy, in exactly one place
	}
	return rendererFor(cmd.Format).Report(out, rep)
}
```

The language decides whether the validated command is a struct, a record, a case class, or a dictionary, and whether the renderer is an interface or a protocol. The invariant is that `Export` compiles with no terminal, no parser, and no exit code in scope. For the parsing and wiring side in a real toolkit, see [Go — building CLIs](../../../languages/go/cli/building-clis.md); for where these pieces sit on disk, [Project Organization](project-organization.md).

---

## When to use

- Tools that will grow past one command, where the tree shape and flag surface start to matter.
- Tools whose output is consumed by scripts, CI, or agents, which makes the contract real.
- Tools that may acquire a second front end — a TUI, a service, a library binding.
- Teams that need the logic covered by tests that do not spawn a process.

## When NOT to use

- **A CLI command tree for a two-flag script** — do not build a subcommand tree, a plugin loader, and a renderer port for a CLI that does one thing; one command with two flags is the right architecture for a small CLI.
- **Business logic inside the command handler** — a CLI handler that parses flags, queries the database, formats output and exits is untestable and unreusable; keep the command layer thin and put the work in a core the CLI merely adapts.
- **Decorated output as a CLI's only output** — never make tables, colors, or progress a CLI's primary contract when stdout may be a pipe; offer an explicit machine-readable mode instead of asking scripts to parse human-formatted CLI output.
- **One exit code for every failure** — a CLI that returns the same code for a usage error, a network error, and a validation error forces callers to grep stderr; map the error taxonomy to distinct, stable exit codes per command.
- **In-process plugins loaded from user-writable paths** — a CLI plugin architecture that dynamically loads third-party code inherits its crashes, its dependencies, and its security surface; prefer the subprocess convention with a documented CLI contract.
- **Renaming flags and subcommands between releases** — a CLI's flags, subcommand names, exit codes, and structured output schema are a public API; changing them silently breaks every script, Makefile, CI job, and agent that calls the CLI.

---

## References

- Free Software Foundation. [GNU Coding Standards — Command-Line Interfaces](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html). GNU Project.
- Cockburn, Alistair. [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/). alistair.cockburn.us.
- Kubernetes. [Extend kubectl with plugins](https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/). kubernetes.io.
- The FreeBSD Project. [sysexits(3) — preferable exit codes for programs](https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3). FreeBSD Manual Pages.
