# React

> A study guide covering React's component model, hooks, server components, ecosystem, and best practices for production-grade applications.

---

## Overview

| Article | Description |
|---|---|
| [Overview](overview.md) | What React is, the declarative model, virtual DOM and reconciliation, ecosystem, and React 19 highlights |

---

## Core Concepts

| Article | Description |
|---|---|
| [JSX](jsx.md) | JSX syntax, expressions, fragments, and typing in TypeScript |
| [Components and Props](components-and-props.md) | Function components, composition, `children`, and avoiding prop drilling |
| [State and Events](state-and-events.md) | `useState`, event handling, controlled inputs, and state batching |
| [Effects](effects.md) | `useEffect`, dependencies, cleanup, and "You Might Not Need an Effect" |
| [Refs](refs.md) | `useRef`, `forwardRef`, `useImperativeHandle`, and escape hatches |
| [Context](context.md) | `useContext`, when it solves prop drilling, and performance pitfalls |
| [`useReducer`](reducer.md) | Centralised state transitions, when to prefer it over `useState` |
| [Rules of Hooks and Custom Hooks](rules-of-hooks-and-custom-hooks.md) | Hook rules, why they exist, and how to extract custom hooks |

---

## Rendering and Lists

| Article | Description |
|---|---|
| [Rendering and Reconciliation](rendering-and-reconciliation.md) | Render/commit phases, reconciliation, identity, and Strict Mode |
| [Lists and Keys](lists-and-keys.md) | Stable keys, why index-as-key breaks lists, and using keys to reset state |
| [Conditional Rendering](conditional-rendering.md) | Ternaries, `&&` pitfalls, early returns, and rendering nothing |

---

## Forms and Errors

| Article | Description |
|---|---|
| [Forms](forms.md) | Controlled vs uncontrolled inputs, React Hook Form, Zod, and React 19 actions |
| [Error Boundaries](error-boundaries.md) | Class boundaries, `react-error-boundary`, what they don't catch, and Suspense pairing |

---

## Advanced

| Article | Description |
|---|---|
| [Memoization](memoization.md) | `memo`, `useMemo`, `useCallback` — when they help, when they don't, the React Compiler |
| [Composition Patterns](composition-patterns.md) | `children`, slots, compound components, render props, and the `as` prop |
| [Server Components](server-components.md) | RSC model, client/server boundary, Server Actions, `use()` |
| [Suspense and Concurrent](suspense-and-concurrent.md) | `<Suspense>`, `lazy()`, `useTransition`, `useDeferredValue`, streaming |

---

## TypeScript

| Article | Description |
|---|---|
| [TypeScript with React](typescript-with-react.md) | Typing props, hooks, events, refs, reducers, generics, and discriminated unions |
