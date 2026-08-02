# Go — CLI & Terminal

> Building command-line tools and terminal UIs in Go — from the stdlib `flag` package to Cobra, Bubble Tea, and terminal internals.

---

| Article | Description |
|---|---|
| [Overview](overview.md) | Why Go excels at CLIs (static binary, cross-compile, fast startup) and the ecosystem — flag, cobra, urfave/cli, Bubble Tea, tview |
| [Building CLIs](building-clis.md) | Hands-on: stdlib flag, cobra subcommands & Viper config, urfave/cli, shell completion, testable structure |
| [CLI Best Practices](best-practices.md) | CLI design guidelines — exit codes, stdout vs stderr, help, TTY detection, NO_COLOR, config layering, cancellation |
| [Terminal UIs (TUI)](tui.md) | Interactive full-screen apps with Bubble Tea (Elm architecture), Lip Gloss, Bubbles, and tview |
| [Terminal & Shell](terminal-and-shell.md) | Standard streams, TTY detection, ANSI escapes, raw mode, signals, and running subprocesses with os/exec |
