---
type: how-to
tags:
  - language
  - go
  - cli
related:
  - languages/go/cli/overview
  - languages/go/cli/best-practices
  - languages/go/cli/terminal-and-shell
  - languages/go/functional-options
  - languages/go/project-setup
language: "go"
---

# How to Build a CLI in Go

> A hands-on guide: start with the stdlib `flag` package, grow into a Cobra multi-command tool with layered config and shell completion, and see the lighter urfave/cli alternative.

---

## Prerequisites

- Go installed and a module initialized — see [Installation](../installation.md) and [Project Setup](../project-setup.md).
- Familiarity with Go basics: packages, structs, and [error handling](../error-handling.md).
- A terminal. Read [CLI Best Practices](best-practices.md) alongside this guide — it explains *why* the conventions below (exit codes, stdout vs stderr) matter.

## Steps

### 1. Start with the standard library (`flag`)

For a single-purpose tool with no subcommands, `flag` is all you need — zero dependencies. Define flags, call `Parse`, then read positional arguments with `flag.Args()`.

```go
package main

import (
	"flag"
	"fmt"
	"os"
)

func main() {
	verbose := flag.Bool("verbose", false, "enable verbose output")
	count := flag.Int("count", 1, "how many times to repeat")
	flag.Parse()

	args := flag.Args() // positional args after the flags
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "usage: repeat [--count N] [--verbose] TEXT")
		os.Exit(2) // 2 = usage error, by convention
	}

	if *verbose {
		fmt.Fprintf(os.Stderr, "repeating %q %d times\n", args[0], *count)
	}
	for i := 0; i < *count; i++ {
		fmt.Println(args[0])
	}
}
```

```console
$ go run . --count 3 hi
hi
hi
hi
```

`flag` supports `--flag`, `-flag`, `--flag=value`, and `--flag value`. It does **not** support combined short flags (`-abc`) or subcommands — that's your cue to move up a layer.

### 2. Add subcommands with the standard library (optional)

Before adding a dependency, know that `flag.NewFlagSet` gives you basic subcommands. This is enough for two or three commands:

```go
func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "expected 'add' or 'list' subcommand")
		os.Exit(2)
	}

	addCmd := flag.NewFlagSet("add", flag.ExitOnError)
	priority := addCmd.Int("priority", 1, "task priority")

	switch os.Args[1] {
	case "add":
		addCmd.Parse(os.Args[2:]) // parse args AFTER the subcommand
		fmt.Printf("adding task (priority %d): %v\n", *priority, addCmd.Args())
	case "list":
		fmt.Println("listing tasks")
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand %q\n", os.Args[1])
		os.Exit(2)
	}
}
```

When the number of commands grows, the boilerplate does too — that's when Cobra earns its place.

### 3. Scale up with Cobra

[Cobra](https://cobra.dev/) is the de-facto framework for Git-style CLIs. Add it to your module:

```bash
go get github.com/spf13/cobra@latest
```

A Cobra app is a tree of `*cobra.Command`. The root command is the program itself; children are subcommands.

```go
package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

func main() {
	var verbose bool

	root := &cobra.Command{
		Use:   "todo",
		Short: "A tiny task manager",
	}
	// PersistentFlags are inherited by all subcommands.
	root.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")

	var priority int
	addCmd := &cobra.Command{
		Use:   "add [task]",
		Short: "Add a new task",
		Args:  cobra.ExactArgs(1), // built-in arg validation
		RunE: func(cmd *cobra.Command, args []string) error {
			if verbose {
				fmt.Fprintln(os.Stderr, "adding with priority", priority)
			}
			fmt.Printf("added: %s\n", args[0])
			return nil // return an error to signal failure + non-zero exit
		},
	}
	addCmd.Flags().IntVarP(&priority, "priority", "p", 1, "task priority")

	root.AddCommand(addCmd)

	if err := root.Execute(); err != nil {
		os.Exit(1) // Cobra already printed the error to stderr
	}
}
```

```console
$ go run . add "buy milk" -p 2 -v
adding with priority 2
added: buy milk
```

Key wins over raw `flag`: nested subcommands, `--help`/usage generated automatically, `Args` validators (`ExactArgs`, `MinimumNArgs`, …), short+long flags, and — critically — `RunE` returning an `error` so failures flow through one exit path. Prefer `RunE` over `Run` so errors propagate instead of being ignored.

### 4. Layer configuration with Viper

Real tools read config from more than flags: environment variables, a config file, then defaults. [Viper](https://github.com/spf13/viper) merges these sources with a clear precedence (**flag > env > config file > default**). See [Best Practices](best-practices.md#configuration-precedence) for why that order.

```go
import "github.com/spf13/viper"

func initConfig() {
	viper.SetConfigName("config")     // config.yaml / config.json / ...
	viper.AddConfigPath(".")          // look in the working directory
	viper.SetEnvPrefix("TODO")        // env vars like TODO_PRIORITY
	viper.AutomaticEnv()
	_ = viper.ReadInConfig()          // ignore "not found"; other errors should be handled
}

// Bind a Cobra flag so a --priority flag overrides env and file:
viper.BindPFlag("priority", addCmd.Flags().Lookup("priority"))
priority := viper.GetInt("priority") // resolves flag > TODO_PRIORITY > file > default
```

### 5. Generate shell completion

Cobra generates completion scripts for bash, zsh, fish, and PowerShell for free. Expose them via a hidden-friendly command:

```go
completionCmd := &cobra.Command{
	Use:   "completion [bash|zsh|fish|powershell]",
	Short: "Generate shell completion script",
	Args:  cobra.ExactValidArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		switch args[0] {
		case "bash":
			return root.GenBashCompletionV2(os.Stdout, true)
		case "zsh":
			return root.GenZshCompletion(os.Stdout)
		case "fish":
			return root.GenFishCompletion(os.Stdout, true)
		case "powershell":
			return root.GenPowerShellCompletionWithDesc(os.Stdout)
		}
		return nil
	},
}
root.AddCommand(completionCmd)
```

```console
$ source <(todo completion zsh)   # enable for the current shell
```

### 6. Alternative — urfave/cli

If Cobra's style feels heavy, [urfave/cli](https://github.com/urfave/cli) offers the same subcommand power with a flatter, declarative API built from struct literals:

```go
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/urfave/cli/v3"
)

func main() {
	cmd := &cli.Command{
		Name:  "todo",
		Usage: "A tiny task manager",
		Commands: []*cli.Command{
			{
				Name:  "add",
				Usage: "Add a new task",
				Flags: []cli.Flag{
					&cli.IntFlag{Name: "priority", Aliases: []string{"p"}, Value: 1},
				},
				Action: func(ctx context.Context, c *cli.Command) error {
					fmt.Printf("added (priority %d): %s\n", c.Int("priority"), c.Args().First())
					return nil
				},
			},
		},
	}
	if err := cmd.Run(context.Background(), os.Args); err != nil {
		os.Exit(1)
	}
}
```

Both frameworks are solid; Cobra has the larger ecosystem (Viper, code generators), urfave/cli has less ceremony. For designing flexible internal APIs behind either, see [Functional Options](../functional-options.md).

### 7. Make it testable

Keep `main` thin. Put logic in functions that take an `io.Writer` for output and return an `error` — never call `os.Exit` deep in your code. This lets tests capture output and assert on it (see [Testing](../testing.md)).

```go
func run(out io.Writer, args []string) error {
	// ... all real work here, writing to out ...
	fmt.Fprintln(out, "done")
	return nil
}

func main() {
	if err := run(os.Stdout, os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}
```

## Verification

Build the binary and exercise each path:

```bash
go build -o todo .
./todo add "buy milk" --priority 2   # expect: added: buy milk
./todo --help                        # expect: usage with subcommands listed
echo $?                              # expect: 0 on success, non-zero on error
```

Confirm cross-compilation works (the reason you chose Go — see [Deploy](../deploy.md)):

```bash
GOOS=linux GOARCH=arm64 go build -o todo-linux-arm64 .
file todo-linux-arm64   # expect: ELF ... ARM aarch64
```

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `flag provided but not defined` | A flag placed after positional args, or a subcommand's flag parsed by the root set | Put flags before positional args; parse subcommand args with the right `FlagSet`/command |
| Flags ignored inside a Cobra subcommand | Flag registered on the wrong command (`Flags()` vs `PersistentFlags()`) | Use `PersistentFlags()` for inherited flags, `Flags()` for command-local ones |
| Errors don't set a non-zero exit code | Using `Run` instead of `RunE`, or swallowing the error | Use `RunE`, return the error, and `os.Exit(1)` when `Execute()` returns non-nil |
| `go get` fails to add Cobra | Module not initialized | Run `go mod init <module>` first (see [Project Setup](../project-setup.md)) |
| Completion doesn't work after install | Script not sourced by the shell | `source <(tool completion zsh)` or install it to the shell's completion dir |

## References

- [Cobra User Guide](https://github.com/spf13/cobra/blob/main/site/content/user_guide.md)
- [Viper](https://github.com/spf13/viper)
- [urfave/cli documentation](https://cli.urfave.org/)
- [Go: `flag` package](https://pkg.go.dev/flag)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
