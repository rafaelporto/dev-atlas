# `useReducer`

> `useReducer` centralises complex state transitions into a single pure function. Prefer it when state has many fields that change together, or when transitions are non-trivial.

---

## What is it?

`useReducer` is a hook that manages state through **actions** — descriptions of what happened — and a **reducer** — a pure function that takes the current state and an action and returns the next state.

```tsx
const [state, dispatch] = useReducer(reducer, initialState);
```

It is the same model as Redux at the component level: state transitions are explicit, named, and easy to test in isolation.

---

## Why does it matter?

`useState` is great for one or two simple values. When state has many fields that change together — or when "how to update" logic is non-trivial — multiple `useState` calls become tangled: setters are scattered, related fields drift, and event handlers grow long branches.

A reducer centralises every possible transition in one function. UI code becomes a simple `dispatch({ type: "...", payload })` and the reducer is unit-testable as a pure function.

---

## How it works

### Anatomy

```tsx
type State = { count: number; step: number };
type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "setStep"; step: number }
  | { type: "reset" };

const initialState: State = { count: 0, step: 1 };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "increment": return { ...state, count: state.count + state.step };
    case "decrement": return { ...state, count: state.count - state.step };
    case "setStep":   return { ...state, step: action.step };
    case "reset":     return initialState;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: "increment" })}>+</button>
      <button onClick={() => dispatch({ type: "decrement" })}>-</button>
    </>
  );
}
```

### Reducers must be pure

A reducer must:

- Take `(state, action)` and return the next state.
- Never mutate `state` — always return a new object.
- Have no side effects (no `fetch`, no DOM access, no `setTimeout`).

Side effects belong outside the reducer — in event handlers or effects.

### Lazy initialization

If computing the initial state is expensive, pass an initialiser function as the third argument:

```tsx
useReducer(reducer, props.userId, (userId) => loadDraftFromStorage(userId) ?? emptyDraft);
```

### TypeScript pattern

A **discriminated union** of action types gives full type safety: the compiler narrows the action by `type` inside the reducer, and `dispatch` only accepts known actions.

```tsx
type Action =
  | { type: "add"; product: Product }
  | { type: "remove"; productId: string }
  | { type: "clear" };
```

### `useReducer` + context

For state that needs to be shared across the tree without prop drilling, pair `useReducer` with two contexts: one for the state, one for the dispatch function. This pattern is documented on react.dev as "Scaling Up with Reducer and Context".

---

## Examples

### A todo list

```tsx
type Todo = { id: string; text: string; done: boolean };
type State = Todo[];

type Action =
  | { type: "add"; text: string }
  | { type: "toggle"; id: string }
  | { type: "remove"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":    return [...state, { id: crypto.randomUUID(), text: action.text, done: false }];
    case "toggle": return state.map(t => t.id === action.id ? { ...t, done: !t.done } : t);
    case "remove": return state.filter(t => t.id !== action.id);
  }
}

function TodoApp() {
  const [todos, dispatch] = useReducer(reducer, []);
  // dispatch({ type: "add", text }), etc.
}
```

### When to switch from `useState` to `useReducer`

You probably want a reducer when:

- You have **3+ pieces of related state** that change together.
- The same setter is called from many places with similar logic.
- Bug reports often describe "the state got out of sync".
- You want to unit-test transitions independently of the UI.

---

## When to use

- Multi-field state with many possible transitions (wizards, editors, forms with derived states).
- State machines — clear set of states and named transitions.
- Shared state across the tree, in combination with context.
- Anywhere you want to read the full transition table at a glance.

---

## When NOT to use

- For a single boolean, counter, or string — `useState` is shorter and clearer.
- For server data — use TanStack Query / SWR.
- Do not put side effects in the reducer (fetch, logs, navigation). Trigger them from the event handler or an effect.
- Do not duplicate Redux: if you reach for middleware, devtools, and selectors, use Redux Toolkit instead.

---

## References

- [Extracting State Logic into a Reducer — react.dev](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- [Scaling Up with Reducer and Context — react.dev](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [`useReducer` reference — react.dev](https://react.dev/reference/react/useReducer)
