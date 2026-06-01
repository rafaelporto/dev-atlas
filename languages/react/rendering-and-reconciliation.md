---
type: concept
tags:
  - language
  - react
  - typescript
  - frontend
related: []
language: "react"
---
# Rendering and Reconciliation

> Rendering is the act of calling a component function to get UI; reconciliation is React deciding what changed and updating the DOM accordingly.

---

## What is it?

In React, **rendering** has a precise meaning: it is the act of *calling a component function* to produce a description of what should be on the screen. **Reconciliation** is the subsequent process of comparing that description with the previous one and applying the minimal DOM changes.

The cycle is:

```
trigger → render → reconcile → commit
```

A trigger is anything that schedules an update: initial mount, state change, parent re-render, context change.

---

## Why does it matter?

Understanding the render cycle prevents the most common React performance and correctness mistakes: unnecessary state, surprising re-renders, broken effects, list-key bugs, and reaching for memoisation before measuring whether it's needed.

---

## How it works

### Three phases

1. **Render phase** — React calls your component function. Your function must be **pure**: same inputs (props, state, context) → same JSX, no side effects.
2. **Reconciliation** — React compares the new element tree with the previous one. For each position, it asks: "is this the same type as before?"
   - **Same type** → reuse the DOM node, update its props.
   - **Different type** → unmount the old subtree, mount the new one.
3. **Commit phase** — React applies the diffs to the DOM and runs effects (`useLayoutEffect` synchronously, `useEffect` asynchronously after paint).

### Identity by position and key

By default, React identifies components by their **position in the tree**. If a `<Modal>` is in the same slot as before, its state is preserved. If you swap it with a `<Dialog>` (different type at the same position), the state is destroyed and re-created.

For list items, position alone is unreliable. The `key` prop tells React which item is which across renders — see [Lists and Keys](lists-and-keys.md).

### Why components must be pure

A component is called many times, often more than you expect (Strict Mode mounts twice in dev; concurrent rendering may discard work). Side effects in the render body cause inconsistent behaviour:

```tsx
// ❌ Side effect during render
function ProductList({ items }: { items: Product[] }) {
  analytics.track("rendered list"); // fires twice in Strict Mode, fires on every re-render
  return <ul>{items.map(...)}</ul>;
}

// ✅ Side effect in an effect or event handler
useEffect(() => {
  analytics.track("rendered list");
}, []);
```

### Re-render triggers

A component re-renders when:

- Its **state** changes (any `useState` / `useReducer` setter that produces a new value).
- Its **parent** re-renders (and React traverses into it).
- The **context** it consumes changes by reference.
- A **subscribed external store** changes (`useSyncExternalStore`).

Notably, props changing does **not** by itself trigger a re-render — the parent re-rendering does, and React re-renders children as part of that traversal. `React.memo` skips children whose props haven't changed.

### Bailing out

React bails out of re-rendering when:

- `useState` is set to a value `Object.is`-equal to the current one.
- A component is wrapped in `React.memo` and its props haven't changed.
- `useMemo` / `useCallback` return cached values with stable deps.

The [React Compiler](https://react.dev/learn/react-compiler), available in React 19+, performs these optimisations automatically — reducing the need to write memoisation by hand.

---

## Examples

### Same element type → state preserved

```tsx
function Tabs() {
  const [tab, setTab] = useState<"a" | "b">("a");
  return (
    <>
      {tab === "a"
        ? <Editor placeholder="Tab A" />
        : <Editor placeholder="Tab B" />}
    </>
  );
}
```

Both branches render `<Editor>`. React sees the same type at the same position and **reuses the editor's state** when `tab` flips — meaning user input persists across tabs. To reset, give them different keys:

```tsx
{tab === "a"
  ? <Editor key="a" placeholder="Tab A" />
  : <Editor key="b" placeholder="Tab B" />}
```

### Resetting state by changing keys

```tsx
function ProfileEditor({ userId }: { userId: string }) {
  // When userId changes, key changes, the subtree unmounts and remounts — state resets.
  return <Form key={userId} userId={userId} />;
}
```

---

## When to use

- Use this model to reason about why a component does or does not re-render.
- Lean on identity preservation when you *want* state to persist (a form across tab switches).
- Change `key` when you *want* state to reset (a profile editor when switching users).

---

## When NOT to use

- Do not put side effects in the render body — they will run more times than expected.
- Do not depend on a component rendering only once. Strict Mode and concurrent features mean it might render twice in dev, and discard a render mid-way.
- Do not assume a re-render is expensive without measuring. Most re-renders are cheap; premature memoisation usually adds more cost than it removes.

---

## References

- [Render and Commit — react.dev](https://react.dev/learn/render-and-commit)
- [Preserving and Resetting State — react.dev](https://react.dev/learn/preserving-and-resetting-state)
- [Keeping Components Pure — react.dev](https://react.dev/learn/keeping-components-pure)
- [React Compiler — react.dev](https://react.dev/learn/react-compiler)
