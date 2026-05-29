---
type: concept
tags: []
related: []
language: "react"
---
# JSX

> JSX is a syntax extension to JavaScript that lets you write HTML-like markup inside JS/TS code; it compiles to plain function calls that produce React elements.

---

## What is it?

**JSX** is a syntactic extension to JavaScript. It lets you write tags like `<div>` inside JS/TS files, and a compiler (Babel, SWC, esbuild) transforms each tag into a function call — typically `jsx("div", { ... })` under the new automatic runtime, or `React.createElement("div", ...)` under the legacy one.

JSX is not HTML. It's JavaScript that *looks* like HTML, with a few differences (e.g., `className` instead of `class`, `htmlFor` instead of `for`).

---

## Why does it matter?

JSX makes component code readable. Without it, the same tree would have to be expressed as nested function calls:

```ts
// Without JSX
createElement("div", { className: "card" },
  createElement("h2", null, title),
  createElement("p", null, body),
);

// With JSX
<div className="card">
  <h2>{title}</h2>
  <p>{body}</p>
</div>
```

JSX preserves the structural clarity of HTML while remaining a first-class JavaScript expression — you can store JSX in variables, pass it as props, return it from functions, and compose it freely.

---

## How it works

### Compilation

A bundler (Vite, Next.js, esbuild) configured for React turns each JSX expression into a call to the JSX runtime:

```tsx
const node = <h1 className="title">Hello</h1>;

// becomes (with the automatic runtime):
import { jsx as _jsx } from "react/jsx-runtime";
const node = _jsx("h1", { className: "title", children: "Hello" });
```

### Rules

- **One root element** per expression. Wrap siblings in a fragment: `<>...</>` or `<Fragment>`.
- **Expressions** go inside `{}`: `<p>{user.name}</p>`, `<button disabled={isLoading}>`.
- **Attribute names are camelCase**: `onClick`, `tabIndex`, `aria-label` (kebab-case only for `aria-*` and `data-*`).
- **`class` → `className`**, **`for` → `htmlFor`** (reserved JavaScript keywords).
- **Self-close** void elements: `<img />`, `<br />`, `<input />`.
- **Comments** use `{/* ... */}`.

### Typing JSX

In TypeScript, JSX is type-checked through the `JSX` namespace. Component props are validated, and intrinsic element attributes (like `<button>`'s `disabled`) are validated against their HTML element types:

```tsx
type ButtonProps = {
  label: string;
  onClick: () => void;
};

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

<Button label="Save" onClick={() => save()} />; // ✅
<Button label="Save" />;                        // ❌ missing onClick
```

---

## Examples

### Conditional rendering

```tsx
function Greeting({ user }: { user?: User }) {
  return (
    <header>
      {user ? <p>Welcome, {user.name}</p> : <p>Please sign in</p>}
    </header>
  );
}
```

### Lists

```tsx
function ProductList({ items }: { items: Product[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### Fragments

```tsx
function Row() {
  return (
    <>
      <td>Name</td>
      <td>Email</td>
    </>
  );
}
```

### JSX as a value

```tsx
const icon = <span aria-hidden>★</span>;

function Card({ title }: { title: string }) {
  return <h3>{icon} {title}</h3>;
}
```

---

## When to use

- All React component code — JSX is the idiomatic way to describe UI in React.
- Compose UI by passing JSX as `children`, as a prop, or as a return value.
- Mix JavaScript expressions and markup freely when it improves clarity.

---

## When NOT to use

- Do not embed complex logic inside JSX. Extract it to a variable or function above the `return`. Heavily nested ternaries hurt readability.
- Do not use JSX outside React/Preact code without a compiler configured for it — raw `.tsx` won't run.
- Do not pass strings to attributes that expect objects (e.g., `style={{ color: "red" }}`, not `style="color: red"`).

---

## References

- [Writing Markup with JSX — react.dev](https://react.dev/learn/writing-markup-with-jsx)
- [JavaScript in JSX with Curly Braces — react.dev](https://react.dev/learn/javascript-in-jsx-with-curly-braces)
- [Introducing the New JSX Transform — react.dev blog](https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html)
