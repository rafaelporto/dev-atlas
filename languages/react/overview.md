# React

> React is a declarative JavaScript library for building user interfaces from composable, reusable components.

---

## What is it?

**React** is a JavaScript library, maintained by Meta, for building user interfaces. You describe what the UI should look like for a given state, and React handles the work of updating the DOM efficiently. The unit of composition is the **component**: a function that returns a description of the UI.

React is not a framework — it does not prescribe routing, data fetching, or state management. Those choices come from the broader ecosystem (Next.js, React Router, TanStack Query, etc.).

---

## Why does it matter?

Before React (and similar libraries), web UIs were updated imperatively: developers wrote code that mutated the DOM step by step in response to events. This scaled poorly — keeping the DOM in sync with application state became a primary source of bugs.

React inverted the model: you describe **what** the UI looks like for a given state, and the library figures out **how** to update the DOM. This is the declarative model, and it has become the dominant paradigm for building interactive web UIs.

---

## How it works

### The render cycle

1. A component is called as a function and returns a description of the UI (a tree of React elements, expressed as JSX).
2. React compares the new tree with the previous one (**reconciliation**).
3. The minimum set of DOM mutations is applied (**commit phase**).

```
state change → render (component function runs) → reconciliation → DOM commit
```

### Components and the tree

Every React app is a tree of components. Each component:

- Receives **props** (inputs from its parent)
- May hold **state** (locally with hooks)
- Returns a description of its UI

```
<App>
  <Header user={...} />
  <Main>
    <ProductList items={...} />
  </Main>
  <Footer />
</App>
```

### Hooks

Hooks are functions (prefixed with `use`) that let function components opt into React features: state (`useState`), side effects (`useEffect`), context (`useContext`), and more. They are the modern way to write React — class components are legacy.

### React 19 highlights

- **Server Components (RSC)**: components that render on the server and never ship to the client.
- **Server Actions**: functions tagged `"use server"` callable from client components.
- **`use()` hook**: read promises and context conditionally.
- **Actions and form state**: first-class support for form submissions and pending UI (`useActionState`, `useFormStatus`).
- **Automatic compiler memoization**: the [React Compiler](https://react.dev/learn/react-compiler) reduces the need for `useMemo` / `useCallback`.

---

## Examples

A minimal React component in TypeScript:

```tsx
import { useState } from "react";

type CounterProps = {
  initial?: number;
};

export function Counter({ initial = 0 }: CounterProps) {
  const [count, setCount] = useState(initial);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Clicked {count} times
    </button>
  );
}
```

`<Counter />` is composable, owns its state, and re-renders only when `count` changes.

---

## When to use

- Building interactive UIs that reflect changing application state (dashboards, forms, editors, web apps).
- Teams that benefit from a mature ecosystem (libraries, tooling, hiring pool).
- Projects where progressive enhancement to server rendering or streaming may be needed (Next.js, Remix, Server Components).

---

## When NOT to use

- Mostly static content with little interactivity — a static site generator (Astro, Eleventy) or plain HTML is simpler and faster.
- Very small widgets embedded in non-React pages — heavier than vanilla JS or Alpine/htmx.
- Hard real-time UIs with strict latency budgets where the reconciliation cost matters — consider Solid, Svelte, or imperative code.

---

## References

- [React — official site](https://react.dev)
- [Quick Start — react.dev](https://react.dev/learn)
- [Thinking in React — react.dev](https://react.dev/learn/thinking-in-react)
- [React 19 — release announcement](https://react.dev/blog/2024/12/05/react-19)
