---
type: how-to
tags:
  - language
  - csharp
  - dotnet
  - cli
related:
  - languages/csharp/cli/overview
  - languages/csharp/cli/tui
  - languages/csharp/project-setup
  - languages/csharp/error-handling
language: "csharp"
---

# How to Build a CLI in C#

> A hands-on guide: parse arguments with System.CommandLine, add subcommands, return exit codes, see the Spectre.Console.Cli alternative, publish a Native AOT binary, and keep it testable.

---

## Prerequisites

- The .NET SDK and a console project (`dotnet new console`) — see [Project Setup](../project-setup.md).
- The `System.CommandLine` NuGet package added (`dotnet add package System.CommandLine`).
- Familiarity with `async`/`await` and [error handling](../error-handling.md).

This guide bakes in the CLI conventions that matter — **exit codes**, **stdout vs. stderr**, and **honoring `NO_COLOR`** — as it goes.

## Steps

### 1. Parse arguments with System.CommandLine

Build a `RootCommand` from typed `Argument`s and `Option`s, attach a handler, and `InvokeAsync` returns the exit code.

```csharp
using System.CommandLine;

var taskArg = new Argument<string>("task", "the task to add");
var priorityOpt = new Option<int>(new[] { "-p", "--priority" }, () => 1, "task priority");
var verboseOpt = new Option<bool>(new[] { "-v", "--verbose" }, "verbose output");

var root = new RootCommand("A tiny task manager") { taskArg, priorityOpt, verboseOpt };
root.SetHandler((string task, int priority, bool verbose) =>
{
    if (verbose) Console.Error.WriteLine($"adding with priority {priority}");
    Console.WriteLine($"added: {task}"); // stdout
}, taskArg, priorityOpt, verboseOpt);

return await root.InvokeAsync(args);
```

```console
$ dotnet run -- "buy milk" -p 2 -v
adding with priority 2
added: buy milk
```

Types drive parsing (`Option<int>` rejects non-numbers), `--help` is generated, and unknown options print an error to stderr with a non-zero exit code.

### 2. Add subcommands

Compose a tree: add child `Command`s to the root, each with its own handler.

```csharp
var addCmd = new Command("add", "Add a new task") { taskArg, priorityOpt };
addCmd.SetHandler((string task, int priority) =>
    Console.WriteLine($"added: {task} (priority {priority})"), taskArg, priorityOpt);

var listCmd = new Command("list", "List tasks");
listCmd.SetHandler(() => Console.WriteLine("listing tasks"));

var root = new RootCommand("A tiny task manager") { addCmd, listCmd };
return await root.InvokeAsync(args);
```

```console
$ dotnet run -- add "buy milk" -p 2
added: buy milk (priority 2)
```

### 3. Use exit codes and streams correctly

- **Results to `Console.Out`, diagnostics to `Console.Error`** so `tool > out.txt` captures only real output.
- **Return a non-zero exit code on failure.** Return an `int` from a handler/`Main`, or set `Environment.ExitCode`. By convention `0` success, `1` general error, `2` usage error (System.CommandLine uses non-zero for parse errors automatically).
- **Respect `NO_COLOR` and non-TTY output.**

```csharp
bool useColor = !Console.IsOutputRedirected               // false when piped/not a TTY
    && Environment.GetEnvironmentVariable("NO_COLOR") is null;
```

Return codes from a handler by using the `SetHandler` overload that returns `int`/`Task<int>`, or throw and let a parse/validation error map to a non-zero code.

### 4. Alternative — Spectre.Console.Cli

If you want typed commands with rich output, [Spectre.Console.Cli](https://spectreconsole.net/cli/) models each command as a class with a strongly-typed settings type:

```csharp
using Spectre.Console.Cli;
using System.ComponentModel;

public sealed class AddSettings : CommandSettings
{
    [CommandArgument(0, "<task>")]
    public string Task { get; init; } = "";

    [CommandOption("-p|--priority")]
    [DefaultValue(1)]
    public int Priority { get; init; }
}

public sealed class AddCommand : Command<AddSettings>
{
    public override int Execute(CommandContext context, AddSettings s)
    {
        AnsiConsole.MarkupLine($"[green]added:[/] {s.Task} (priority {s.Priority})");
        return 0; // exit code
    }
}

var app = new CommandApp();
app.Configure(c => c.AddCommand<AddCommand>("add"));
return app.Run(args);
```

### 5. Publish a Native AOT binary

For fast startup and a self-contained file, publish with Native AOT (see [Deploy](../deploy.md)). System.CommandLine and Spectre.Console both support AOT.

```bash
dotnet publish -c Release -p:PublishAot=true -r linux-x64
./bin/Release/net8.0/linux-x64/publish/todo add "buy milk"   # native, fast start
```

Alternatively distribute via NuGet as a global tool: pack with `<PackAsTool>true</PackAsTool>` and `dotnet tool install -g`.

### 6. Make it testable

Keep parsing separate from logic: put the real work in methods that return values (or write to an injected `TextWriter`), and keep handlers thin. You can invoke a `RootCommand` in a test with custom console streams and assert on output and exit code. See [Testing](../testing.md).

```csharp
using Xunit;

public class TodoTests
{
    [Fact]
    public void FormatsAddedTask()
    {
        string msg = Todo.FormatAdded("buy milk", 2); // pure method
        Assert.Equal("added: buy milk (priority 2)", msg);
    }
}
```

## Verification

Run in dev, then publish and exercise each path:

```bash
dotnet run -- add "buy milk" --priority 2   # expect: added: buy milk (priority 2)
dotnet run -- --help                         # expect: usage with subcommands
dotnet publish -c Release -p:PublishAot=true
echo $?                                       # expect: 0 on success, non-zero on error
```

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Slow first run | JIT + runtime start | Publish with `PublishAot=true` for a fast native binary |
| Handler parameter mismatch | `SetHandler` symbols out of order | Pass the same `Argument`/`Option` instances, in the handler's parameter order |
| Option value type error | `Option<int>` given a non-number | Fix input; the type drives validation intentionally |
| Exit code always `0` | Not returning/propagating the code | Return `await root.InvokeAsync(args)` from `Main`, or set `Environment.ExitCode` |
| Error text on stdout | Writing errors with `Console.WriteLine` | Use `Console.Error.WriteLine` for diagnostics |
| AOT trim warnings | Reflection in a dependency | Prefer AOT-friendly libraries; check `System.CommandLine`/Spectre AOT guidance |

## References

- [System.CommandLine documentation](https://learn.microsoft.com/dotnet/standard/commandline/)
- [Spectre.Console.Cli](https://spectreconsole.net/cli/)
- [.NET Native AOT deployment](https://learn.microsoft.com/dotnet/core/deploying/native-aot/)
- [.NET tools (`dotnet tool`)](https://learn.microsoft.com/dotnet/core/tools/global-tools)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
