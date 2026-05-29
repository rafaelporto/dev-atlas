---
type: concept
tags: []
related: []
language: "react"
---
# Memoization

> `memo`, `useMemo`, and `useCallback` skip work when inputs haven't changed. They are *optimisations*, not correctness fixes — apply them when you've measured a problem, not preemptively.

---

## What is it?

React offers three memoisation primitives:

- **`React.memo(Component)`** — wraps a component to skip re-renders when props are shallow-equal to the previous ones.
- **`useMemo(fn, deps)`** — caches the *result* of a computation across renders unless deps change.
- **`useCallback(fn, deps)`** — caches the *function identity* across renders unless deps change. Equivalent to `useMemo(() => fn, deps)`.

```tsx
const sorted   = useMemo(() => sort(items), [items]);
const onSelect = useCallback((id: string) => setSelected(id), []);
const Row      = memo(function Row(props: RowProps) { /* ... */ });
```

---

## Why does it matter?

Memoisation is heavily over-used. Sprinkling `useCallback` and `useMemo` everywhere makes code harder to read, adds overhead (storing memoised values has a cost), and rarely speeds anything up unless used precisely where the bottleneck is.

The React docs are explicit: **memoise based on measurements, not on intuition**. The [React Compiler](https://react.dev/learn/react-compiler) in React 19+ aims to handle most cases automatically.

---

## How it works

### `React.memo`

```tsx
const Row = memo(function Row({ item }: { item: Item }) {
  return <li>{item.name}</li>;
});
```

React compares the new props with the previous props using `Object.is` per key. If all are equal, the function is **not** called and the previous output is reused.

The trap: object/array/function props create a new reference every render of the parent, defeating `memo`:

```tsx
function Parent() {
  return <Row item={{ name: "X" }} onClick={() => {}} />;
  // new object, new function — Row re-renders despite memo
}
```

The fix is to stabilise those references with `useMemo` / `useCallback` — but only if `Row` itself is genuinely expensive.

### `useMemo`

```tsx
const expensiveResult = useMemo(() => compute(input), [input]);
```

Use when:

- The computation is genuinely expensive (sorting/filtering large lists, parsing).
- The result is passed to a `React.memo` child whose props identity matters.
- The result is used as a dependency of an effect that should not run unnecessarily.

Do **not** use to "cache a value just in case". The memo machinery itself has a cost.

### `useCallback`

```tsx
const handleSelect = useCallback((id: string) => setSelected(id), []);
```

`useCallback(fn, deps)` is sugar for `useMemo(() => fn, deps)`. It produces a stable function identity across renders, useful when the function is:

- Passed as a prop to a `React.memo` child.
- A dependency of `useEffect` / `useMemo` / `useCallback` (avoiding unnecessary re-runs).

Without one of those reasons, `useCallback` adds overhead and no benefit.

### Measure before you memoise

The right workflow:

1. Use the **React DevTools Profiler** to find slow renders.
2. Identify the component or computation that's actually expensive.
3. Apply memoisation surgically to that one place.
4. Profile again to confirm the improvement.

Most renders cost microseconds. Optimising them is noise.

---

## Examples

### Stable callback for a memoised list row

```tsx
const Row = memo(function Row({ item, onSelect }: {
  item: Item;
  onSelect: (id: string) => void;
}) {
  return <li onClick={() => onSelect(item.id)}>{item.name}</li>;
});

function List({ items }: { items: Item[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  return (
    <ul>
      {items.map(item => <Row key={item.id} item={item} onSelect={onSelect} />)}
    </ul>
  );
}
```

Without `useCallback`, `onSelect` would be a new function every render, defeating `memo` on `Row`.

### Memoising an expensive derivation

```tsx
const visible = useMemo(
  () => items.filter(i => matches(i, query)).sort(byName),
  [items, query],
);
```

If `items` has hundreds of thousands of rows, `useMemo` is justified. For a list of 20, just compute it inline.

### The React Compiler

React 19's experimental compiler auto-memoises components and hook return values:

```tsx
// You write
function Profile({ user }: { user: User }) {
  const fullName = `${user.first} ${user.last}`;
  return <h1>{fullName}</h1>;
}

// The compiler emits memoised equivalents — no hand-written useMemo needed.
```

Where the compiler is available, hand-written memoisation is largely unnecessary.

---

## When to use

- A `React.memo` child with stable props, where the child's render is genuinely expensive.
- A computation whose cost shows up in profiling.
- A dependency of `useEffect` whose identity would otherwise cause re-runs.
- Building a custom hook where consumers expect a stable return identity.

---

## When NOT to use

- Don't memoise everything by default — it makes code noisier and slower (memo machinery isn't free).
- Don't `useCallback` a function that has no `React.memo` or hook-dep consumer.
- Don't expect `memo` to help if the parent re-renders for unrelated reasons and passes new prop objects.
- Don't rely on memoisation for *correctness*. Memoised state is still state; if your component's correctness depends on something running again, memoisation is the wrong tool.

---

## References

- [`memo` reference — react.dev](https://react.dev/reference/react/memo)
- [`useMemo` reference — react.dev](https://react.dev/reference/react/useMemo)
- [`useCallback` reference — react.dev](https://react.dev/reference/react/useCallback)
- [React Compiler — react.dev](https://react.dev/learn/react-compiler)
