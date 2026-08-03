---
type: concept
tags:
  - language
  - nodejs
  - cli
  - tui
related:
  - languages/nodejs/cli/overview
  - languages/nodejs/cli/building-clis
  - languages/react/overview
  - languages/nodejs/async-patterns
language: "nodejs"
---

# Terminal UIs (TUIs) in Node.js

> Building full-screen, interactive terminal apps with Ink — React components, hooks, and Flexbox layout rendered to the terminal — plus when a TUI beats a plain CLI, and the blessed alternative.

---

## What is it?

A **TUI (text-based user interface)** is a full-screen, interactive application that runs inside the terminal — it redraws the screen, responds to keystrokes in real time, and shows panels, lists, and progress. Think `htop`, `lazygit`, or an interactive picker. Unlike a plain [CLI](overview.md) that runs once and exits, a TUI holds the terminal and loops until you quit.

In Node.js, the dominant toolkit is **[Ink](https://github.com/vadimdemedes/ink)** — you write **React** components and Ink renders them to the terminal instead of the DOM. It powers the UIs of tools like Gatsby, Prisma, and Shopify's CLI. **[blessed](https://github.com/chjj/blessed)** is the older, imperative, widget-oriented alternative.

## Why does it matter?

Some tasks are painful as a sequence of one-shot commands. Choosing one item from 200, watching several tasks progress at once, or stepping through an interactive wizard all want *state on screen* and *immediate feedback*. A TUI gives you a GUI's interactivity without leaving the terminal — and still runs over SSH.

Ink matters specifically because it reuses everything you already know from **React**: components, `props`, `useState`, `useEffect`, and composition. If your team writes React (see [React Overview](../../react/overview.md)), building a terminal UI carries almost no new conceptual cost — and layout uses **Flexbox** (via Yoga), the same model as the web.

## How it works

Ink renders a React component tree to the terminal. Instead of `<div>`/`<span>`, you compose `<Box>` (a Flexbox container) and `<Text>` (styled text). A reconciler diffs the tree on each render and repaints only what changed, just like React DOM.

```
   React component tree            Ink reconciler            terminal
   ┌─────────────────┐            ┌──────────────┐         ┌──────────┐
   │ <Box> <Text/> …  │  render──▶ │ diff + Yoga   │ paint──▶ │ cells +  │
   │  state via hooks │            │ Flexbox layout│         │ ANSI     │
   └─────────────────┘ ◀─re-render └──────────────┘         └──────────┘
        ▲   keypress (useInput) / async effect (useEffect)      │
        └───────────────────────────────────────────────────────┘
```

The core pieces:

- **`render(<App/>)`** — mounts the component tree and takes over the terminal.
- **`<Box>`** — a layout container with Flexbox props (`flexDirection`, `padding`, `borderStyle`, `width`).
- **`<Text>`** — styled text (`color`, `bold`, `dimColor`, `backgroundColor`).
- **Hooks** — `useState`/`useEffect` for state and side effects; **`useInput`** for keypresses; **`useApp`** to `exit()`.
- **Async** — a `useEffect` that awaits I/O and calls `setState` when done, leaning on Node's [async patterns](../async-patterns.md); the component re-renders automatically.

Ready-made components fill in the widgets: `ink-text-input`, `ink-select-input`, `ink-spinner`, and `ink-table`.

## Examples

A minimal Ink program: a counter you change with the arrow keys and quit with `q`.

```tsx
#!/usr/bin/env node
import React, { useState } from "react";
import { render, Box, Text, useInput, useApp } from "ink";

function Counter() {
  const { exit } = useApp();
  const [count, setCount] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setCount((c) => c + 1);
    if (key.downArrow) setCount((c) => c - 1);
    if (input === "q") exit();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text>
        Count: <Text color="magenta" bold>{count}</Text>
      </Text>
      <Text dimColor>↑/↓ to change · q to quit</Text>
    </Box>
  );
}

render(<Counter />);
```

Doing async work is an effect that updates state — the UI re-renders when it resolves:

```tsx
import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

function Records() {
  const [records, setRecords] = useState<string[] | null>(null);

  useEffect(() => {
    loadFromAPI().then(setRecords); // runs off the render path
  }, []);

  if (records === null) {
    return (
      <Text>
        <Spinner type="dots" /> Loading…
      </Text>
    );
  }
  return (
    <Box flexDirection="column">
      {records.map((r) => (
        <Text key={r}>• {r}</Text>
      ))}
    </Box>
  );
}
```

Embedding a ready-made widget — here a text input — is just another component:

```tsx
import TextInput from "ink-text-input";

function NameForm() {
  const [name, setName] = useState("");
  return (
    <Box>
      <Text>Name: </Text>
      <TextInput value={name} onChange={setName} />
    </Box>
  );
}
```

The **blessed** alternative is imperative and widget-first — you construct a `screen`, append boxes/lists, and wire event handlers, closer to a classic GUI toolkit:

```ts
import blessed from "blessed";

const screen = blessed.screen({ smartCSR: true });
const list = blessed.list({
  parent: screen,
  keys: true,
  items: ["Deploy", "Rollback", "Quit"],
  style: { selected: { bg: "blue" } },
});
list.on("select", (_item, index) => {
  if (index === 2) process.exit(0);
});
list.focus();
screen.key(["q", "C-c"], () => process.exit(0));
screen.render();
```

## When to use

- Selecting from many options interactively (fuzzy pickers, list/table navigation).
- Dashboards and monitors that update live (logs, metrics, task progress).
- Multi-step interactive flows (wizards, forms) awkward as a chain of prompts.
- Tools where your team already writes React and can reuse that model (Ink).
- Anywhere real-time keyboard feedback materially improves the task.

## When NOT to use

- **Scriptable, non-interactive tasks** — a TUI can't be piped or run in CI. Keep a plain [CLI](overview.md) path for automation, even alongside a TUI.
- **Output that must be piped or redirected** — TUIs take over the screen and emit control codes, not clean stdout.
- **Trivial one-shot commands** — the extra dependency and render loop aren't worth it for `tool --version`.
- **Non-TTY environments** — detect `process.stdout.isTTY` and fall back to plain output when there's no terminal.

## References

- [Ink — React for CLIs](https://github.com/vadimdemedes/ink)
- [Ink components: `ink-text-input`, `ink-select-input`, `ink-spinner`](https://github.com/vadimdemedes/ink#useful-components)
- [React documentation](https://react.dev/) — the component/hooks model Ink reuses.
- [blessed](https://github.com/chjj/blessed) — the imperative, widget-oriented alternative.
