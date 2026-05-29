---
type: concept
tags: []
related: []
language: "react"
---
# Lists and Keys

> Keys identify list items across renders so React can preserve state, animations, and DOM nodes correctly. Use stable, unique IDs — not array indices.

---

## What is it?

When you render a list of components — typically with `Array.prototype.map` — each item must have a stable `key` prop. The key tells React which item in the new render corresponds to which item in the previous render.

```tsx
{items.map(item => <Row key={item.id} item={item} />)}
```

---

## Why does it matter?

Without correct keys, React can't tell what changed in a list. The wrong key causes:

- **Wrong state on the wrong row** (e.g., text typed into row 2's input shows up on row 3 after a sort).
- **Broken animations** that fire on the wrong elements.
- **Unnecessary DOM teardown** that wipes input focus, scroll position, or component state.
- In the worst case: **silent data corruption** in form-heavy UIs.

---

## How it works

### What a key is

A key is a string or number, unique among **siblings** (not globally), stable across renders for the same logical item. React uses it to match elements across renders during reconciliation.

```tsx
{users.map(user => <UserCard key={user.id} user={user} />)}
```

### Why not array index

Using `key={index}` works only when the list is **append-only and never reordered, inserted into, or filtered**. Otherwise:

```tsx
// Before
[{ name: "Ana" }, { name: "Beto" }]        // keys: 0, 1
<input value="..." />                       // attached to index 1

// After removing the first item
[{ name: "Beto" }]                          // key: 0 (was 1)
<input value="..." />                       // still attached to index 0!
```

React thinks the second item is now the first item, reuses the DOM node, and the `<input>`'s state stays with the wrong row.

### Keys must be stable

A common bug: generating keys at render time.

```tsx
// ❌ A new key every render — every row unmounts and remounts
{items.map(item => <Row key={crypto.randomUUID()} item={item} />)}

// ✅ Stable ID owned by the data
{items.map(item => <Row key={item.id} item={item} />)}
```

### Keys are not props

A component cannot read its own `key`. If you need the same value inside, pass it as a separate prop:

```tsx
<Row key={item.id} id={item.id} item={item} />
```

### Keys on fragments

To key a fragment, use the long form:

```tsx
{items.map(item => (
  <Fragment key={item.id}>
    <dt>{item.name}</dt>
    <dd>{item.value}</dd>
  </Fragment>
))}
```

---

## Examples

### Stable keys from data

```tsx
type Comment = { id: string; author: string; text: string };

function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <ul>
      {comments.map(c => (
        <li key={c.id}>
          <strong>{c.author}:</strong> {c.text}
        </li>
      ))}
    </ul>
  );
}
```

### When you don't have IDs

If the source data lacks IDs, generate them once when the data enters your app (e.g., on fetch), not on each render:

```tsx
const withIds = useMemo(
  () => rawItems.map(item => ({ ...item, id: crypto.randomUUID() })),
  [rawItems],
);
```

Even better: ask the API to include stable IDs.

### Using keys to intentionally reset

You can leverage keys to force a component to reset its state — useful when navigating between entities:

```tsx
<ProfileEditor key={userId} userId={userId} />
```

When `userId` changes, the editor unmounts and remounts — clearing any in-progress form input.

---

## When to use

- Every time you render a list with `.map`, `.flatMap`, or any function that produces a JSX array.
- When you want to **intentionally reset** a component's state by changing its key.

---

## When NOT to use

- Do not use array index as the key in lists that can reorder, filter, sort, or insert in the middle.
- Do not use `Math.random()`, `Date.now()`, or `crypto.randomUUID()` in the key — they change each render.
- Do not use the same key for two siblings — React will warn and behaviour is undefined.
- Do not put `key` on a non-list element (it has no effect unless React is reconciling siblings).

---

## References

- [Rendering Lists — react.dev](https://react.dev/learn/rendering-lists)
- [Why does React need keys? — react.dev](https://react.dev/learn/rendering-lists#why-does-react-need-keys)
- [Preserving and Resetting State — react.dev](https://react.dev/learn/preserving-and-resetting-state)
