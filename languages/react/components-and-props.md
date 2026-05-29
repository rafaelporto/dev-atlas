---
type: concept
tags: []
related: []
language: "react"
---
# Components and Props

> Components are functions that return UI; props are the inputs they receive from their parent. Composition is the primary way to reuse UI in React.

---

## What is it?

A **component** is a JavaScript/TypeScript function that returns a description of UI (JSX). It is the unit of reuse in React. Components receive inputs through **props** — a single object argument — and may produce UI that includes other components.

```tsx
function Greeting({ name }: { name: string }) {
  return <p>Hello, {name}</p>;
}
```

Components must start with an uppercase letter so JSX distinguishes them from native HTML tags.

---

## Why does it matter?

React's mental model is "small pieces, composed". Components let you:

- Encapsulate UI and behavior behind a clear contract (props).
- Reuse the same UI in many places without duplication.
- Reason about parts of the screen independently.

Class components still work but are legacy. **Function components with hooks** are how modern React is written.

---

## How it works

### Props are read-only

A component must not mutate its props. Props flow downward — from parent to child — and represent the *current value* the parent has passed in. To change something visible to a parent, lift state up (see [State and Events](state-and-events.md)).

```tsx
// ❌ Don't do this
function Bad({ items }: { items: string[] }) {
  items.push("new"); // mutating a prop — bug-prone
  return <ul>...</ul>;
}
```

### `children` and composition

`children` is the special prop that holds whatever JSX a parent puts between a component's opening and closing tags. It is the foundation of composition.

```tsx
type CardProps = {
  title: string;
  children: React.ReactNode;
};

function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

<Card title="Profile">
  <Avatar user={user} />
  <Bio user={user} />
</Card>
```

### Default values

```tsx
type ButtonProps = {
  label: string;
  variant?: "primary" | "secondary";
};

function Button({ label, variant = "primary" }: ButtonProps) {
  return <button data-variant={variant}>{label}</button>;
}
```

### Spreading and forwarding

Pass through unknown attributes to the underlying element:

```tsx
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

function Input({ label, id, ...rest }: InputProps) {
  return (
    <label htmlFor={id}>
      {label}
      <input id={id} {...rest} />
    </label>
  );
}
```

### Prop drilling

When a deeply nested component needs data from a top-level ancestor, props must be threaded through every intermediate layer. This is **prop drilling**:

```
App ──┐
      └── Layout ──┐
                   └── Sidebar ──┐
                                 └── UserMenu  ⟵ needs `user`
```

If only `UserMenu` actually uses `user`, threading it through `Layout` and `Sidebar` adds noise. The remedies are:

1. **Composition** — pass JSX as `children` so intermediate components don't need to know about the data.
2. **Context** — see [Context](context.md).

---

## Examples

### Composition over configuration

Prefer accepting `children` over many boolean flags:

```tsx
// ❌ Configuration explosion
<Dialog
  title="Delete?"
  body="Are you sure?"
  showCancel
  showConfirm
  confirmLabel="Delete"
  onConfirm={...}
/>

// ✅ Composition
<Dialog>
  <Dialog.Title>Delete?</Dialog.Title>
  <Dialog.Body>Are you sure?</Dialog.Body>
  <Dialog.Actions>
    <Button onClick={cancel}>Cancel</Button>
    <Button onClick={remove}>Delete</Button>
  </Dialog.Actions>
</Dialog>
```

### Multiple "slots" via props

When `children` is not enough, accept additional JSX-typed props:

```tsx
type PageProps = {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

function Page({ header, sidebar, children }: PageProps) {
  return (
    <div className="page">
      <aside>{sidebar}</aside>
      <main>
        <header>{header}</header>
        {children}
      </main>
    </div>
  );
}
```

---

## When to use

- Any reusable piece of UI — buttons, cards, layouts.
- Even one-off sections of a page, if extracting them clarifies the parent.
- When you need a clear, typed contract between a parent and its child UI.

---

## When NOT to use

- Don't create a component just because something looks repetitive — three similar JSX blocks are clearer than a premature abstraction with five conditional props.
- Don't mutate props or attempt to read sibling state through them.
- Don't pass freshly-created functions and objects as props in hot paths where it triggers expensive re-renders, unless you've measured the cost (see [Memoization](memoization.md)).

---

## References

- [Your First Component — react.dev](https://react.dev/learn/your-first-component)
- [Passing Props to a Component — react.dev](https://react.dev/learn/passing-props-to-a-component)
- [Passing Data Deeply with Context — react.dev](https://react.dev/learn/passing-data-deeply-with-context)
- [Thinking in React — react.dev](https://react.dev/learn/thinking-in-react)
