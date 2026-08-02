---
type: concept
tags:
  - language
  - go
  - cli
  - best-practice
related:
  - languages/go/cli/overview
  - languages/go/cli/building-clis
  - languages/go/cli/terminal-and-shell
  - languages/go/context
  - languages/go/error-handling
language: "go"
---

# CLI Best Practices in Go

> Design guidelines for command-line tools — exit codes, stdout vs stderr, help text, honoring pipes and `NO_COLOR`, layered configuration, and graceful cancellation — with the Go idioms that implement them.

---

## What is it?

A set of conventions that make a command-line tool behave the way experienced users and other programs expect. Most predate Go — they come from Unix and are codified in the [Command Line Interface Guidelines (clig.dev)](https://clig.dev/) — but Go's standard library makes them easy to implement correctly. This article maps each convention to the Go code that satisfies it.

## Why does it matter?

A CLI is an API for humans *and* for other programs. Someone will pipe your tool into `grep`, run it in a `Makefile`, wrap it in a script, and call it from CI. If your tool prints errors to stdout, ignores exit codes, or spews ANSI colors into a log file, it breaks every one of those workflows silently.

Following the conventions costs almost nothing at build time and makes the difference between a tool that composes cleanly into the shell and one that fights it. Get these right and your tool feels native; get them wrong and users reach for something else.

## How it works

Each guideline below is independent — adopt them incrementally.

### Exit codes

Return `0` for success and a non-zero code for failure. The shell, `&&`/`||`, `set -e`, and CI all depend on this. By convention, `1` is a generic failure and `2` signals a usage/argument error.

```go
func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
	// implicit exit 0
}
```

Call `os.Exit` only from `main` (or one place near it). `os.Exit` skips deferred functions, so calling it deep in your code leaks resources and defeats testing. Let functions return errors; decide the exit code at the top. See [Error Handling](../error-handling.md).

### stdout vs stderr

**stdout is for the program's output; stderr is for everything else** — diagnostics, progress, logs, prompts. This is what lets a user pipe results while still seeing errors:

```console
$ mytool export > data.json     # only real output lands in the file
$ mytool export 2> errors.log   # diagnostics captured separately
```

```go
fmt.Fprintln(os.Stdout, jsonResult)          // the data
fmt.Fprintln(os.Stderr, "fetched 42 records") // the chatter
log.SetOutput(os.Stderr)                       // log defaults to stderr — good
```

Printing progress or logs to stdout is the single most common CLI bug: it corrupts piped output.

### Help and usage

Support `--help`/`-h` and print a concise usage summary. With [Cobra](building-clis.md) this is automatic; with the stdlib you override `flag.Usage`:

```go
flag.Usage = func() {
	fmt.Fprintf(os.Stderr, "usage: mytool [flags] FILE\n\n")
	flag.PrintDefaults() // lists every flag with its default and usage
}
```

Print usage to **stderr** and exit `2` when the user invokes the tool wrong; print help to **stdout** and exit `0` when they explicitly ask for `--help`.

### TTY detection — colors and interactivity

Detect whether output is a terminal before doing anything terminal-specific (colors, spinners, progress bars, interactive prompts). When the output is a pipe or file, disable them.

```go
import "golang.org/x/term"

isTTY := term.IsTerminal(int(os.Stdout.Fd()))
if isTTY {
	// safe to use colors, spinners, progress bars
}
```

Also honor the [`NO_COLOR`](https://no-color.org/) convention — if that variable is set (to anything), suppress color regardless of the TTY:

```go
useColor := isTTY && os.Getenv("NO_COLOR") == ""
```

More on TTYs, ANSI codes, and raw mode in [Terminal & Shell](terminal-and-shell.md).

### Configuration precedence

When a value can come from several places, resolve them in this order — most specific wins:

```
command-line flag  >  environment variable  >  config file  >  built-in default
```

A flag is the user's explicit, one-off intent, so it always wins; a default is the fallback when nothing else is set. [Viper](building-clis.md#4-layer-configuration-with-viper) implements this precedence for you, but the order is the same even if you wire it by hand:

```go
port := 8080                       // default
if v := os.Getenv("MYTOOL_PORT"); v != "" {
	port, _ = strconv.Atoi(v)      // env overrides default
}
if *portFlag != 0 {
	port = *portFlag               // flag overrides everything
}
```

### `--version` and build metadata

Users and bug reports need to know which build they have. Expose `--version` and stamp the version at build time with `-ldflags` rather than hardcoding it (see [Deploy](../deploy.md)):

```go
var version = "dev" // overridden at build: -ldflags "-X main.version=1.4.0"

// go build -ldflags "-X main.version=$(git describe --tags)" .
```

### Graceful cancellation

A long-running command must stop cleanly when the user hits `Ctrl-C`. Turn `SIGINT`/`SIGTERM` into a cancelled [`context.Context`](../context.md) and thread it through your work:

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

if err := doLongJob(ctx); err != nil {
	if errors.Is(err, context.Canceled) {
		fmt.Fprintln(os.Stderr, "cancelled")
		os.Exit(130) // 128 + SIGINT(2), by convention
	}
	// handle real error
}
```

`signal.NotifyContext` (Go 1.16+) is the idiomatic bridge from OS signals to context cancellation.

### Testability

Write logic as functions that take an `io.Writer` and return an `error`, so tests can capture output and assert on exit conditions without spawning a process:

```go
func run(out io.Writer, args []string) error { /* ... */ }
// test: run(&bytes.Buffer{}, []string{"--dry-run"})
```

See [Testing](../testing.md) for table-driven tests over CLI inputs.

### Reading from stdin

Support reading from stdin (and the `-` convention for "read from stdin") so your tool composes in pipes:

```go
$ cat file.txt | mytool         # read piped input
$ mytool -                      # explicit stdin
```

```go
if len(args) == 0 || args[0] == "-" {
	process(os.Stdin)
}
```

## Examples

A small tool that respects the core conventions at once — correct streams, TTY-aware color, and a clean exit code:

```go
func run(args []string) error {
	useColor := term.IsTerminal(int(os.Stdout.Fd())) && os.Getenv("NO_COLOR") == ""

	records, err := fetch(args)
	if err != nil {
		return fmt.Errorf("fetch: %w", err) // wrapped error, surfaced by main
	}

	fmt.Fprintf(os.Stderr, "fetched %d records\n", len(records)) // progress -> stderr
	for _, r := range records {
		if useColor {
			fmt.Fprintf(os.Stdout, "\x1b[32m%s\x1b[0m\n", r) // green, only on a TTY
		} else {
			fmt.Fprintln(os.Stdout, r)                        // plain, pipe-safe
		}
	}
	return nil
}
```

## When to use

- Any tool you expect others to run, script around, or pipe into.
- Tools that run in CI, where exit codes and clean stdout/stderr separation are load-bearing.
- Tools that emit colors, progress, or prompts — TTY detection and `NO_COLOR` keep them pipe-safe.
- Long-running commands that should respond to `Ctrl-C`.

## When NOT to use

- **Over-engineering a throwaway script** — a five-line personal helper doesn't need `--version`, config layering, or completion. Apply the conventions proportional to the audience.
- **Forcing interactivity into a non-TTY context** — never prompt or animate when output isn't a terminal; detect and fall back to non-interactive behavior instead.
- **Inventing your own precedence order** — don't put config-file values above explicit flags; it violates user expectations and the convention above.

## References

- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/) — the definitive, language-agnostic reference.
- [The Twelve-Factor App — Config](https://12factor.net/config) — env-based configuration rationale.
- [NO_COLOR standard](https://no-color.org/)
- [Go: `os/signal` — `NotifyContext`](https://pkg.go.dev/os/signal#NotifyContext)
- [POSIX Utility Conventions](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html)
