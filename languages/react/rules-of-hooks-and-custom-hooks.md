---
type: concept
tags: []
related: []
language: "react"
---
# Rules of Hooks and Custom Hooks

> Hooks must be called in the same order on every render, and only from React functions. Custom hooks are how you reuse stateful logic across components.

---

## What is it?

**Hooks** are functions whose names start with `use` (`useState`, `useEffect`, etc.) that let function components opt into React features. Hooks come with two non-negotiable rules:

1. **Only call hooks at the top level** of a function. Never inside loops, conditions, or nested functions.
2. **Only call hooks from React functions** — components or other hooks. Never from regular JavaScript functions.

A **custom hook** is any function whose name starts with `use` and that calls other hooks. It is React's primary mechanism for reusing stateful logic.

---

## Why does it matter?

React identifies which `useState` call corresponds to which state value by **call order**. If hooks could be called conditionally, the order would change between renders and React could not match state to its hook. The rules are not stylistic — they are required for React to work.

Custom hooks let you extract complex logic (data fetching, subscriptions, form handling) into a reusable, testable unit without resorting to higher-order components or render props.

---

## How it works

### The rules

```tsx
// ❌ Conditional — state may be lost or mismatched between renders
function BadGreeting({ name }: { name?: string }) {
  if (name) {
    const [greeting, setGreeting] = useState(`Hi, ${name}`);
  }
  return null;
}

// ❌ In a loop — the count of hooks changes per render
function BadList({ items }: { items: string[] }) {
  for (const item of items) {
    useState(item); // not allowed
  }
  return null;
}

// ✅ Top level
function Greeting({ name }: { name?: string }) {
  const [greeting, setGreeting] = useState("");
  return <p>{name ? `Hi, ${name}` : greeting}</p>;
}
```

Early returns are allowed **as long as no hooks are called after the return**:

```tsx
// ❌ Hook called after a conditional return
function User({ user }: { user?: User }) {
  if (!user) return null;
  const [editing, setEditing] = useState(false);
  // ...
}

// ✅ Hooks first, then early return
function User({ user }: { user?: User }) {
  const [editing, setEditing] = useState(false);
  if (!user) return null;
  // ...
}
```

### The ESLint plugin

[`eslint-plugin-react-hooks`](https://www.npmjs.com/package/eslint-plugin-react-hooks) enforces the rules and warns on missing dependencies. Treat its warnings as errors — do not disable them locally without a strong reason.

### Custom hooks

A custom hook is a JavaScript function whose name starts with `use` and that calls other hooks. The naming signals to both React and the ESLint plugin that the rules of hooks apply.

```tsx
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    function on()  { setOnline(true); }
    function off() { setOnline(false); }
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}

// Used like any other hook
function StatusBadge() {
  const online = useOnlineStatus();
  return <span>{online ? "online" : "offline"}</span>;
}
```

### Custom hooks share *logic*, not *state*

Each call to a custom hook creates its **own** state. Two components calling `useOnlineStatus()` do not share state — they each run the same logic independently.

---

## Examples

### `useToggle`

```tsx
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle] as const;
}

function Disclosure() {
  const [open, toggle] = useToggle();
  return (
    <>
      <button onClick={toggle}>{open ? "Hide" : "Show"}</button>
      {open && <p>Details</p>}
    </>
  );
}
```

### `useDebounced`

```tsx
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
```

### Naming convention

A `use*` name is a contract. If a function calls hooks, it must be prefixed `use`. If it doesn't, it must **not** be prefixed `use`. The linter and the React team treat the prefix as a signal.

---

## When to use

- Extract a custom hook when the same stateful logic appears in two or more places.
- When the logic is non-trivial and you want to unit-test it independently of any component.
- When you need a clean boundary between framework integration code (e.g., wiring up a WebSocket) and UI code.

---

## When NOT to use

- Do not prefix `use` on a function that doesn't call hooks — it misleads the reader and the linter.
- Do not create a custom hook for a one-liner that's clearer inline.
- Do not call hooks from event handlers, async functions, class components, or regular utilities.
- Do not bypass the rules with conditional imports, try/catch around hook calls, or dynamic hook lookups — there is no safe way around them.

---

## References

- [Rules of Hooks — react.dev](https://react.dev/reference/rules/rules-of-hooks)
- [Reusing Logic with Custom Hooks — react.dev](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [`eslint-plugin-react-hooks`](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [Built-in Hooks reference — react.dev](https://react.dev/reference/react/hooks)
