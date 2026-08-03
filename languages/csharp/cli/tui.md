---
type: concept
tags:
  - language
  - csharp
  - dotnet
  - cli
  - tui
related:
  - languages/csharp/cli/overview
  - languages/csharp/cli/building-clis
  - languages/csharp/async-and-concurrency
language: "csharp"
---

# Terminal UIs (TUIs) in C#

> Two complementary tools for terminal UIs in C# — Spectre.Console for rich, non-full-screen output (tables, trees, live displays, prompts) and Terminal.Gui for full-screen widget apps — plus when to pick which.

---

## What is it?

A **TUI (text-based user interface)** is an application that draws to the terminal beyond plain line-by-line output — styled tables, progress bars, interactive prompts, or a full-screen layout of panels you navigate with the keyboard. Think a build tool's live progress, or a `midnight commander`-style file browser.

C# has two mature, distinct tools:

- **[Spectre.Console](https://spectreconsole.net/)** — *rich console output*: tables, trees, bar charts, status spinners, live-updating regions, and interactive prompts. It enhances an otherwise normal, scroll-along CLI; it does not take over the whole screen.
- **[Terminal.Gui](https://github.com/gui-cs/Terminal.Gui)** (aka `gui.cs`) — a *full-screen widget toolkit*: windows, menus, dialogs, text fields, list views, and an event loop, for a genuine full-screen TUI.

## Why does it matter?

The distinction is the whole point. Most tools don't need to seize the screen — they need **beautiful, legible output**: a summary table, a progress bar while work runs, a confirmation prompt. Spectre.Console delivers that with almost no structural change to a normal [CLI](overview.md), and it stays pipe-friendly (it degrades to plain text when output isn't a terminal).

When you *do* need a persistent, navigable interface — panels, focus, menus, dialogs — **Terminal.Gui** provides the retained-mode widget model and event loop, so you're not hand-managing cursor positions and redraws.

## How it works

```
Spectre.Console        AnsiConsole.Write(new Table()…)   → renders a region,
(rich, inline)         Progress / Status / Prompt         terminal keeps scrolling

Terminal.Gui           Application.Run(new Window…)        → alternate screen,
(full-screen)          Views + focus + MainLoop            event loop until quit
```

- **Spectre.Console** exposes an `AnsiConsole` you write renderables to (`Table`, `Tree`, `BarChart`, `Panel`), plus `Progress`/`Status` for live regions and `Prompt`/`SelectionPrompt` for input. It detects capabilities and honors `NO_COLOR`/non-TTY output automatically.
- **Terminal.Gui** runs an `Application` with a `MainLoop`: you build a tree of `View`s (a `Window` containing `Label`, `Button`, `TextField`, `ListView`), set an initial focus, and `Application.Run` drives events until you `RequestStop`. Long work goes on a background task (see [Async and Concurrency](../async-and-concurrency.md)) and marshals UI updates back to the main loop.

## Examples

**Spectre.Console** — a styled table and a live progress bar:

```csharp
using Spectre.Console;

var table = new Table().AddColumn("Task").AddColumn("Priority");
table.AddRow("buy milk", "2");
table.AddRow("write docs", "1");
AnsiConsole.Write(table);

AnsiConsole.Progress().Start(ctx =>
{
    var task = ctx.AddTask("Deploying");
    while (!ctx.IsFinished)
    {
        task.Increment(10);
        Thread.Sleep(100);
    }
});
```

An interactive prompt returns a typed result — no screen takeover:

```csharp
var choice = AnsiConsole.Prompt(
    new SelectionPrompt<string>()
        .Title("Pick an action:")
        .AddChoices("Deploy", "Rollback", "Quit"));
AnsiConsole.MarkupLine($"You chose [green]{choice}[/]");
```

**Terminal.Gui** — a full-screen window with a button:

```csharp
using Terminal.Gui;

Application.Init();
var win = new Window("todo") { X = 0, Y = 0, Width = Dim.Fill(), Height = Dim.Fill() };

var label = new Label("Choose an action:") { X = 1, Y = 1 };
var deploy = new Button("Deploy") { X = 1, Y = 3 };
deploy.Clicked += () => MessageBox.Query("Deploy", "Shipping…", "OK");
var quit = new Button("Quit") { X = 12, Y = 3 };
quit.Clicked += () => Application.RequestStop();

win.Add(label, deploy, quit);
Application.Top.Add(win);
Application.Run();     // event loop until RequestStop
Application.Shutdown(); // restore the terminal
```

## When to use

- **Spectre.Console** — you want polished output (tables, trees, progress, prompts) on a normal CLI that still pipes cleanly. This covers the majority of tools.
- **Terminal.Gui** — you need a persistent, navigable full-screen interface: menus, dialogs, focus traversal, multiple panels.
- Either — tools used interactively at a terminal, including over SSH.

## When NOT to use

- **Scriptable, non-interactive tasks** — full-screen TUIs (Terminal.Gui) can't be piped or run in CI. Keep a plain [CLI](overview.md) path; Spectre degrades gracefully but still avoid interactive prompts in automation.
- **Output that must be machine-parsed** — emit plain/JSON output, not decorated tables, when a script consumes it.
- **Trivial one-shot commands** — `tool --version` needs neither library.
- **Non-TTY environments** — check `Console.IsOutputRedirected`; Spectre auto-degrades, but don't launch a Terminal.Gui app without a terminal.

## References

- [Spectre.Console](https://spectreconsole.net/) — widgets, prompts, and live displays.
- [Terminal.Gui](https://github.com/gui-cs/Terminal.Gui) — the full-screen toolkit and its API docs.
- [Terminal.Gui documentation](https://gui-cs.github.io/Terminal.Gui/)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
