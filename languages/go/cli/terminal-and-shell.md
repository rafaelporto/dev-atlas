---
type: concept
tags:
  - language
  - go
  - cli
related:
  - languages/go/cli/overview
  - languages/go/cli/best-practices
  - languages/go/cli/tui
  - languages/go/context
  - languages/go/concurrency
language: "go"
---

# Terminal & Shell Interaction in Go

> How Go programs talk to the terminal and the shell — the standard streams, TTY detection, ANSI escape codes, raw vs cooked mode, reading keys, handling signals, and running subprocesses.

---

## What is it?

The **terminal** is the text device your program's input and output are connected to; the **shell** (bash, zsh, fish, PowerShell) is the program that reads your command line, launches your process, and wires up its streams. This article covers the mechanics underneath every CLI and [TUI](tui.md): the three standard streams, whether you're attached to a real terminal, how colors and cursor movement work, how to read keys, and how to react to signals and spawn other processes — all from Go's standard library plus one small extension package.

## Why does it matter?

Most CLI bugs live at this boundary. Colors leak into log files because the tool didn't check for a TTY; `Ctrl-C` leaves the terminal in a broken state because raw mode wasn't restored; a subprocess hangs because its output pipe was never drained. Understanding the terminal model — not just the framework on top of it — is what lets you debug these and build tools that behave correctly whether run interactively, in a pipe, or in CI. It's also the foundation the [best practices](best-practices.md) are built on.

## How it works

### The three standard streams

Every process starts with three open files, exposed in Go as `os.Stdin`, `os.Stdout`, and `os.Stderr`:

```
        ┌───────────────┐
stdin ──▶│               │──▶ stdout   (the program's real output)
 (fd 0)  │  your program │   (fd 1)
        │               │──▶ stderr   (diagnostics, logs, prompts)
        └───────────────┘   (fd 2)
```

The shell connects these to the terminal by default, but redirects them freely: `tool < in.txt > out.txt 2> err.log` swaps all three for files. Your code shouldn't care — it just reads/writes the streams. Keeping output on stdout and everything else on stderr (see [Best Practices](best-practices.md)) is what makes redirection work.

### TTY detection

A "TTY" (teletypewriter) is an interactive terminal. When your streams are redirected to a file or pipe, they are *not* a TTY. Check before doing anything terminal-only:

```go
import "golang.org/x/term"

if term.IsTerminal(int(os.Stdout.Fd())) {
	// interactive: colors, spinners, prompts are safe
} else {
	// piped/redirected: emit plain, parseable output
}
```

`golang.org/x/term` is the official extension package for terminal handling; add it with `go get golang.org/x/term`.

### ANSI escape codes

Terminals interpret **escape sequences** — bytes starting with `ESC` (`\x1b`) — as commands for color, style, and cursor movement, rather than text to print. A sequence looks like `\x1b[` (the *Control Sequence Introducer*) followed by parameters and a final letter.

```go
const (
	reset = "\x1b[0m"
	red   = "\x1b[31m"
	green = "\x1b[32m"
	bold  = "\x1b[1m"
)

fmt.Printf("%s%sPASS%s\n", bold, green, reset) // bold green "PASS"

// Cursor & screen control:
fmt.Print("\x1b[2J")   // clear screen
fmt.Print("\x1b[H")    // move cursor to top-left
fmt.Print("\x1b[K")    // clear to end of line (handy for progress updates)
```

Only emit these when attached to a TTY and when `NO_COLOR` is unset. In practice, use a library — Lip Gloss ([TUI](tui.md)) or `fatih/color` — which handles detection and Windows quirks for you. Raw codes are worth knowing for debugging and simple progress lines.

### Raw vs cooked mode

By default the terminal is in **cooked (canonical) mode**: it buffers a whole line, handles backspace, and only hands input to your program when the user presses Enter. It also echoes typed characters. **Raw mode** turns this off so your program receives each keystroke immediately, unbuffered and un-echoed — required for TUIs, key-at-a-time input, and hidden password entry.

```go
import "golang.org/x/term"

fd := int(os.Stdin.Fd())
oldState, err := term.MakeRaw(fd)  // switch to raw mode
if err != nil {
	return err
}
defer term.Restore(fd, oldState)   // ALWAYS restore, or the shell is left broken

buf := make([]byte, 1)
os.Stdin.Read(buf)                 // reads a single keystroke immediately
```

The critical rule: **always restore the terminal state** with a `defer`, and restore it on signals too — otherwise a crash or `Ctrl-C` leaves the user's shell with no echo and no line editing. Bubble Tea manages this for you; if you go raw by hand, you own the restore.

Reading a password without echo has a dedicated helper so you don't manage raw mode yourself:

```go
fmt.Print("Password: ")
pw, err := term.ReadPassword(int(os.Stdin.Fd())) // input hidden, not echoed
fmt.Println()
```

### Reading input

For line-oriented input (prompts, reading piped data), `bufio.Scanner` is the idiomatic tool:

```go
scanner := bufio.NewScanner(os.Stdin)
for scanner.Scan() {          // one iteration per line; ends at EOF
	line := scanner.Text()
	process(line)
}
if err := scanner.Err(); err != nil {
	fmt.Fprintln(os.Stderr, "read error:", err)
}
```

This works identically for interactive typing and for `cat file | tool` — the program reads until EOF either way.

### Signals

The shell sends **signals** to your process: `Ctrl-C` sends `SIGINT`, `kill` sends `SIGTERM`, closing the terminal sends `SIGHUP`. The idiomatic way to react is to turn signals into a cancelled [`context.Context`](../context.md) and let your work observe it:

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

select {
case <-ctx.Done():
	fmt.Fprintln(os.Stderr, "\ninterrupted, cleaning up...")
	// restore terminal, remove temp files, flush, then exit 130
case result := <-work(ctx):
	fmt.Println(result)
}
```

`signal.NotifyContext` (Go 1.16+) is preferred over the older `signal.Notify` + channel for most cases because it composes with everything that already takes a `context`. Under the hood this relies on goroutines — see [Concurrency](../concurrency.md).

### Running subprocesses

CLIs often shell out to other programs. `os/exec` runs them with full control over streams and environment — and, crucially, without invoking a shell, so there's no shell-injection risk:

```go
cmd := exec.CommandContext(ctx, "git", "rev-parse", "HEAD") // args passed directly — no shell
cmd.Stderr = os.Stderr                                       // let git's errors through
out, err := cmd.Output()                                     // capture stdout
if err != nil {
	return fmt.Errorf("git rev-parse: %w", err)
}
fmt.Printf("HEAD is %s", out)
```

Pass arguments as separate strings (never build a command string and run it through `sh -c` with untrusted input). `CommandContext` ties the subprocess lifetime to the context, so cancellation kills it. To stream a child's output live, set `cmd.Stdout = os.Stdout` instead of capturing it.

### The environment

The shell passes environment variables into your process; read them with `os.Getenv`/`os.LookupEnv`. Beyond your own config, a few standard variables shape terminal behavior:

```go
os.Getenv("TERM")     // terminal type, e.g. "xterm-256color" (color capability)
os.Getenv("NO_COLOR") // if set, disable color (see best-practices)
os.Getenv("SHELL")    // the user's shell — useful for generating completion
os.Getenv("PAGER")    // program to page long output through, e.g. "less"
```

Use `os.LookupEnv` when "unset" and "empty" mean different things:

```go
if v, ok := os.LookupEnv("MYTOOL_DEBUG"); ok {
	// variable is present (even if empty)
	_ = v
}
```

## Examples

A pipe-safe status printer: colored and using in-place updates when interactive, plain and line-based when redirected.

```go
func printStatus(steps []string) {
	tty := term.IsTerminal(int(os.Stdout.Fd())) && os.Getenv("NO_COLOR") == ""
	for i, step := range steps {
		if tty {
			// overwrite the same line with a green check
			fmt.Printf("\r\x1b[K\x1b[32m✓\x1b[0m %s", step)
		} else {
			// one clean line per step — safe to grep or log
			fmt.Printf("done: %s\n", step)
		}
		_ = i
	}
	if tty {
		fmt.Println()
	}
}
```

Redirected (`tool > log.txt`), the log gets clean `done: ...` lines with no escape codes; run interactively, the user sees a single updating line with a green check.

## When to use

- Any time a tool needs to know *whether* it's interactive (colors, prompts, spinners).
- Building progress indicators, password prompts, or key-at-a-time input.
- Reacting to `Ctrl-C`/`SIGTERM` for graceful shutdown and cleanup.
- Orchestrating other command-line programs from Go via `os/exec`.

## When NOT to use

- **Manual raw mode / ANSI handling for a full app** — reach for a [TUI framework](tui.md); hand-rolling the event loop and redraw logic is error-prone.
- **Building shell command strings from untrusted input** — never `sh -c` user data; pass args to `os/exec` directly to avoid injection.
- **Assuming a TTY** — code that always emits colors or always prompts breaks in pipes and CI. Detect first.
- **Ignoring terminal restoration** — going raw without a guaranteed `Restore` (defer + signal handling) leaves the user's shell broken.

## References

- [`golang.org/x/term`](https://pkg.go.dev/golang.org/x/term) — TTY detection, raw mode, password reads.
- [Go: `os/exec`](https://pkg.go.dev/os/exec) and [`os/signal` — `NotifyContext`](https://pkg.go.dev/os/signal#NotifyContext).
- [ANSI escape code (Wikipedia)](https://en.wikipedia.org/wiki/ANSI_escape_code) — reference for colors and cursor control.
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
