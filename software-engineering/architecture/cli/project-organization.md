---
type: concept
tags:
  - architecture
  - concept
  - cli
  - tui
  - testing
related:
  - software-engineering/architecture/cli/cli-architecture
  - software-engineering/architecture/cli/tui-architecture
  - software-engineering/architecture/frontend/layered-frontend-architecture
  - languages/go/project-setup
  - languages/go/cli/building-clis
language: null
---
# Project Organization for Terminal Programs

> Where the code of a terminal program goes — a thin entry point, a core that cannot see a terminal, one directory per boundary, and a flag surface treated as the public API it already is.

---

## What is it?

Project organization is the arrangement of a terminal program's source into directories and modules, plus the rules about what may import what.

The second half is the part that does the work. Layering is about **dependencies**, not folders — the same point made for the web in [layered frontend architecture](../frontend/layered-frontend-architecture.md). Directories are simply the cheapest way to make a dependency rule visible, and the cheapest place to notice when someone breaks it.

---

## Why does it matter?

Terminal programs decay in one specific, predictable way: `main` grows.

Nothing prevents it. There is no framework demanding a controller, no server lifecycle forcing a separation, no request boundary to hang layers off. The parser, the work, and the printing collapse into one function because that is the shortest path to a working program — and it works right up until you need to test the logic without spawning a process, add a second front end, or tell a caller which layer failed.

Layout is the earliest enforcement mechanism available, and it costs nothing on day one.

---

## How it works

### The entry point is a composition root

The entry point does four things and nothing else: read the environment, build the dependency graph, dispatch, and translate the returned error into an exit code.

No business logic. No I/O. And no exit anywhere else in the program — an exit call in a deep function skips every pending cleanup and makes the function impossible to test.

Everything below the entry point should be constructible in a test, which is dependency inversion applied at the only place a terminal program has a composition root. Whatever the ecosystem calls that entry point, the rule survives translation.

### Core first, front ends second

The layout falls directly out of the adapter argument in [CLI Architecture](cli-architecture.md): the core is the program, and each front end is one way in.

```
  <program>/
    entry/          composition root; the only place that exits
    core/           domain + use cases. No terminal, no argv, no printing.
    cli/            adapter: parse, validate, dispatch, render
      commands/     one leaf per user-facing subcommand
      render/       human + structured renderers behind one port
    tui/            adapter: model, update, view, keymap   (only if there is a TUI)
    config/         file/env loading -> a validated value handed to the core
    plugins/        discovery + subprocess invocation
    testdata/       golden frames and fixture inputs

    import rule:  entry -> {cli, tui, core}     cli -> core     tui -> core
                  core  -> nothing              cli -x- tui
```

The last edge is the load-bearing one. **The two front ends must not import each other.** The moment the CLI reaches into the TUI package for a helper, the TUI and its toolkit become a dependency of every script that calls the tool.

The directory names are illustrative; the import rule is not. Concrete realizations — including the compiler-enforced version some ecosystems offer — belong to the language sections, such as [Go — project setup](../../../languages/go/project-setup.md).

### Command-per-file versus feature slice

Two ways to arrange the command layer, with a threshold between them:

```
  command-per-file                    feature slice
  ────────────────                    ─────────────
  cli/commands/                       features/
    export.go                           export/
    import.go                             command.go
    status.go                             core.go
    config_get.go                         render.go
    config_set.go                         testdata/
                                        import/
  mirrors the command tree              groups by domain
  discoverable from `ls`                tree not visible in the listing
  fine to ~15-20 commands               scales past that
```

The rule that resolves it: **the command tree is the user's mental model, the module tree is the maintainer's.** They are allowed to diverge, and when they do, the mapping between them should be one small registration file rather than a naming convention people have to remember.

### The public surface, and where the rest lives

A terminal program's public API is larger than most teams realize:

- subcommand names
- flag names and their semantics
- exit codes
- structured output schema
- environment variables read
- config file location and keys
- the plugin naming convention

Everything else is internal. Two consequences follow. First, that list belongs somewhere executable — a contract test, or a golden snapshot of `--help` — so a change to it cannot be accidental. Second, it is what a version number means for a CLI: a major bump is a change to that list, not a rewrite of the internals.

Runtime state has a public surface too. Config, state, cache, and data have standard per-platform locations, and putting everything in a single dot-directory in the user's home should be a decision rather than a default nobody questioned.

Testing layout follows the import rule: unit tests beside `core/`, renderer golden files in `testdata/`, and process-level tests reserved for the things only a process can exercise — argument parsing, exit codes, and stream separation. The [TUI](tui-architecture.md) side adds golden frames at a pinned terminal size.

---

## Examples

The illustrative snippet (one language's syntax) shows a composition root: build the graph, dispatch, translate the error, exit once.

```go
// entry: no business logic, no printing, and the only exit in the program.
func main() {
	cfg := config.Load()                       // file -> env -> flags, resolved here
	core := release.New(cfg.Registry, cfg.Git) // the only place dependencies are wired

	var code int
	switch {
	case cli.WantsTUI(os.Args):
		code = tui.Run(core, os.Stdout)        // second adapter, same core
	default:
		code = cli.Run(core, os.Stdout, os.Stderr, os.Args[1:])
	}
	os.Exit(code)
}
```

Both front ends receive the same `core` value and neither can reach the other. The ecosystem decides whether these are packages, modules, assemblies, or workspace crates, and whether they live under `src/`, `cmd/`, or `lib/` — see [Go — building CLIs](../../../languages/go/cli/building-clis.md) for one concrete arrangement. The invariant is the import rule, not the directory names.

---

## When to use

- Programs expected to outlive one release or one author.
- Any tool with a second front end planned, or plausible within a year.
- Tools whose flags and output other teams script against.
- Tools whose domain logic is worth testing on its own, without a process boundary in the way.

## When NOT to use

- **All of a CLI's logic in main** — an entry point that parses flags, does the work, and prints results leaves no seam to test; keep main a thin composition root over a core package the CLI and the TUI both call.
- **Copying a large CLI's layout into a small one** — a three-command CLI needs no plugin directory, no package per verb, and no four module boundaries; grow the project structure of a CLI when a boundary starts to hurt, not before.
- **A shared utility package between the CLI and the TUI** — a grab-bag module both front ends import becomes a dependency magnet that quietly couples the CLI to the TUI; name modules after the capability they own, not after who uses them.
- **Duplicating the core behind the TUI** — writing a second implementation of the domain so the TUI can show progress means every fix and every bug lands twice; the TUI is one more adapter over the same core as the CLI.
- **A core package that writes to the terminal** — a core that imports a TUI toolkit, formats a table, or prints to stdout cannot be reused by another command, a server, or a test; return data from the core and keep rendering in the adapter.
- **Testing a CLI only through its built binary** — end-to-end tests that shell out to the CLI are slow and hide which layer failed; test the core directly and reserve process-level tests for argument parsing, exit codes, and golden output.

---

## References

- Parnas, D. L. [On the Criteria To Be Used in Decomposing Systems into Modules](https://dl.acm.org/doi/10.1145/361598.361623). Communications of the ACM, 15(12), 1972.
- Seemann, Mark. [Composition Root](https://blog.ploeh.dk/2011/07/28/CompositionRoot/). ploeh.dk, 2011.
- freedesktop.org. [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/). freedesktop.org.
- Preston-Werner, Tom. [Semantic Versioning 2.0.0](https://semver.org/). semver.org.
