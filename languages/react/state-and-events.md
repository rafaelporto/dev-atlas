---
type: concept
tags: []
related: []
language: "react"
---
# State and Events

> State is data a component remembers between renders; events are how the user interacts with the UI. `useState` connects the two.

---

## What is it?

**State** is data scoped to a component instance that persists across renders. Changing state tells React to re-render the component. The primary hook for state is `useState`.

**Events** in React are handled by attaching functions to JSX event attributes — `onClick`, `onChange`, `onSubmit`, etc. These are not raw DOM event listeners; React wraps them in a synthetic event system for cross-browser consistency.

```tsx
const [count, setCount] = useState(0);

<button onClick={() => setCount(count + 1)}>+</button>
```

---

## Why does it matter?

Components without state would be static. State is how a UI reacts: a counter increments, a dropdown opens, a form holds typed text. Understanding how state is *scheduled* and *batched* is the difference between code that works in simple cases and code that behaves correctly under concurrency, rapid events, or asynchronous flows.

---

## How it works

### `useState`

```tsx
const [value, setValue] = useState<Type>(initialValue);
```

- The first call uses `initialValue`. Subsequent renders ignore it.
- `setValue(next)` schedules a re-render. The new value is visible on the **next** render.
- Calls to `setValue` are batched within event handlers and async boundaries.

### State updates are asynchronous and *batched*

`setValue` does not change the variable in place — it schedules an update:

```tsx
function increment() {
  setCount(count + 1);
  console.log(count); // still the old value!
}
```

When you need to update state based on the previous state, pass an **updater function**:

```tsx
setCount(c => c + 1); // safe under batching, concurrent updates, and stale closures
```

### Events

```tsx
function SearchBox() {
  const [query, setQuery] = useState("");

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  return <input value={query} onChange={handleChange} />;
}
```

React's event system uses **synthetic events** that wrap the native browser event. They are normalised across browsers and integrate with React's scheduling.

### Controlled vs uncontrolled inputs

- **Controlled**: the input's `value` is bound to React state, and changes flow through `onChange`. This is the default recommendation.
- **Uncontrolled**: the DOM owns the value; you read it via a ref (see [Refs](refs.md)). Use for very large forms or when integrating with non-React libraries.

```tsx
// Controlled
const [name, setName] = useState("");
<input value={name} onChange={e => setName(e.target.value)} />

// Uncontrolled
const ref = useRef<HTMLInputElement>(null);
<input ref={ref} defaultValue="" />
// later: ref.current?.value
```

### State should be the minimum source of truth

If a value can be derived from existing state or props, **do not** store it in state. Derive it during render:

```tsx
// ❌ Redundant state
const [items, setItems] = useState<Item[]>([]);
const [count, setCount] = useState(0);

useEffect(() => {
  setCount(items.length); // extra render, can desync
}, [items]);

// ✅ Derived
const [items, setItems] = useState<Item[]>([]);
const count = items.length;
```

---

## Examples

### Form with multiple fields

```tsx
type Form = { name: string; email: string };

function SignupForm() {
  const [form, setForm] = useState<Form>({ name: "", email: "" });

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={e => { e.preventDefault(); submit(form); }}>
      <input value={form.name}  onChange={e => update("name",  e.target.value)} />
      <input value={form.email} onChange={e => update("email", e.target.value)} />
      <button>Sign up</button>
    </form>
  );
}
```

### Lifting state up

If two sibling components need to share state, move it to their common parent and pass it down:

```tsx
function App() {
  const [filter, setFilter] = useState("");
  return (
    <>
      <SearchInput value={filter} onChange={setFilter} />
      <ResultsList filter={filter} />
    </>
  );
}
```

---

## When to use

- Any value the user can change that affects what is rendered (input fields, toggles, selections).
- Local UI state: open/closed, hovered, expanded.
- Whenever the same value is needed by multiple sibling components — lift state to the common parent.

---

## When NOT to use

- Don't store derived data in state (compute it during render).
- Don't store the same value in state in two places — keep a single source of truth.
- Don't put **server data** in `useState`. Use a data-fetching library (TanStack Query, SWR) — they handle caching, revalidation, and loading states.
- Don't store refs to DOM nodes in state (use `useRef`).

---

## References

- [State: A Component's Memory — react.dev](https://react.dev/learn/state-a-components-memory)
- [Queueing a Series of State Updates — react.dev](https://react.dev/learn/queueing-a-series-of-state-updates)
- [Responding to Events — react.dev](https://react.dev/learn/responding-to-events)
- [Choosing the State Structure — react.dev](https://react.dev/learn/choosing-the-state-structure)
- [Sharing State Between Components — react.dev](https://react.dev/learn/sharing-state-between-components)
