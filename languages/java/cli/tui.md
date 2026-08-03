---
type: concept
tags:
  - language
  - java
  - cli
  - tui
related:
  - languages/java/cli/overview
  - languages/java/cli/building-clis
  - languages/java/concurrency
language: "java"
---

# Terminal UIs (TUIs) in Java

> Building full-screen, interactive terminal apps in Java with Lanterna — its low-level Screen/Terminal API and the high-level gui2 widget toolkit — plus when a TUI beats a plain CLI.

---

## What is it?

A **TUI (text-based user interface)** is a full-screen, interactive application that runs inside the terminal — it redraws the screen, responds to keystrokes in real time, and shows panels, lists, and dialogs. Think `htop`, `midnight commander`, or an interactive menu. Unlike a plain [CLI](overview.md) that runs once and exits, a TUI holds the terminal and loops until you quit.

In Java, the mature toolkit is **[Lanterna](https://github.com/mabe02/lanterna)** — a pure-Java library (no native dependencies) that works on Linux, macOS, and Windows. It offers two layers: a low-level `Terminal`/`Screen` API for direct control, and a high-level `gui2` widget toolkit with windows, panels, buttons, and layout managers.

## Why does it matter?

Some tasks are painful as a sequence of one-shot commands. Choosing one item from 200, navigating a tree, or filling a form all want *state on screen* and *immediate feedback*. A TUI gives you a GUI's interactivity without leaving the terminal — and still runs over SSH.

Lanterna matters because it is **pure Java with no native bindings**: it drops into any JVM project, degrades gracefully across terminals, and provides both raw screen control and a Swing-like widget layer. If your tool already runs on the JVM, you get a real TUI without adding a native toolkit.

## How it works

Lanterna is layered. You pick the layer that matches how much control you need.

```
┌───────────────────────────────────────────────┐
│ gui2      MultiWindowTextGUI, Window, Panel,    │  high-level widgets
│           Button, TextBox, layout managers      │  + event handling
├───────────────────────────────────────────────┤
│ Screen    double-buffered grid; setCharacter,   │  paint cells, diff, refresh
│           refresh(); reads KeyStroke input       │
├───────────────────────────────────────────────┤
│ Terminal  raw putCharacter/flush, cursor,        │  lowest level
│           private mode, resize events            │
└───────────────────────────────────────────────┘
```

- **`Terminal`** — the lowest level: move the cursor, put characters, switch to "private mode" (the alternate screen), and receive resize/`KeyStroke` events.
- **`Screen`** — a double-buffered character grid over the terminal. You draw into a back buffer and call `refresh()`; Lanterna diffs and repaints only what changed — the same idea as a retained TUI framework.
- **`gui2`** — the widget layer: a `MultiWindowTextGUI` runs the event loop and hosts `Window`s built from `Panel`s, `Button`s, `TextBox`es, `Table`s, and `LayoutManager`s, with focus traversal and callbacks.

The event loop reads keystrokes, dispatches them to the focused component, and repaints — driven on the calling thread (often the main thread), so long work belongs on a background thread (see [Concurrency](../concurrency.md)).

## Examples

A low-level `Screen` example: draw text and wait for a keypress.

```java
import com.googlecode.lanterna.TextColor;
import com.googlecode.lanterna.screen.Screen;
import com.googlecode.lanterna.terminal.DefaultTerminalFactory;

public class ScreenDemo {
    public static void main(String[] args) throws Exception {
        Screen screen = new DefaultTerminalFactory().createScreen();
        screen.startScreen(); // enters private/alternate mode
        try {
            screen.newTextGraphics()
                  .setForegroundColor(TextColor.ANSI.MAGENTA)
                  .putString(2, 1, "Hello, TUI!  (press any key)");
            screen.refresh();      // paint the back buffer
            screen.readInput();    // block until a KeyStroke
        } finally {
            screen.stopScreen();   // restore the terminal
        }
    }
}
```

A high-level `gui2` example: a window with a button that closes it.

```java
import com.googlecode.lanterna.gui2.*;
import com.googlecode.lanterna.screen.Screen;
import com.googlecode.lanterna.terminal.DefaultTerminalFactory;

public class GuiDemo {
    public static void main(String[] args) throws Exception {
        Screen screen = new DefaultTerminalFactory().createScreen();
        screen.startScreen();
        try {
            WindowBasedTextGUI gui = new MultiWindowTextGUI(screen);
            BasicWindow window = new BasicWindow("todo");

            Panel panel = new Panel(new LinearLayout(Direction.VERTICAL));
            panel.addComponent(new Label("Choose an action:"));
            panel.addComponent(new Button("Deploy", () ->
                MessageDialog.showMessageDialog(gui, "Deploy", "Shipping…")));
            panel.addComponent(new Button("Quit", window::close));

            window.setComponent(panel);
            gui.addWindowAndWait(window); // runs the event loop until the window closes
        } finally {
            screen.stopScreen();
        }
    }
}
```

`addWindowAndWait` runs the event loop; `window::close` ends it. `MessageDialog` and friends give you ready-made modal dialogs.

## When to use

- Selecting from many options interactively (menus, list/table navigation).
- Forms and multi-field input awkward as a chain of flags or prompts.
- Dashboards and monitors that update live (logs, job status).
- Tools that already run on the JVM and need terminal-native interactivity, including over SSH.

## When NOT to use

- **Scriptable, non-interactive tasks** — a TUI can't be piped or run in CI. Keep a plain [CLI](overview.md) path for automation.
- **Output that must be piped or redirected** — TUIs take over the screen and emit control codes, not clean stdout.
- **Trivial one-shot commands** — the event loop and dependency aren't worth it for `tool --version`.
- **Non-TTY environments** — detect the terminal (`System.console() == null`) and fall back to plain output when there's no TTY.

## References

- [Lanterna](https://github.com/mabe02/lanterna) — the library and its documentation.
- [Lanterna gui2 tutorials](https://github.com/mabe02/lanterna/blob/master/docs/contents.md)
- [The Elm Architecture](https://guide.elm-lang.org/architecture/) — a useful model for structuring any TUI's state/update/view.
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
