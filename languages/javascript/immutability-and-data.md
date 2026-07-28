---
type: concept
tags:
  - language
  - javascript
  - immutability
  - concept
related:
  - languages/javascript/types-and-coercion
  - languages/javascript/collections-and-iteration
  - languages/javascript/objects-and-prototypes
language: "javascript"
---
# Immutability and Data

> Treating data as immutable — copying instead of mutating — makes JavaScript code easier to reason about and is the default in modern front-end frameworks.

---

## What is it?

**Immutability** means never changing a value after it is created; instead you produce a new value with the change applied. JavaScript primitives are already immutable; objects and arrays are not, so immutability with them is a *discipline* supported by tools (`Object.freeze`, spread, non-mutating array methods, `structuredClone`).

---

## Why does it matter?

Shared mutable state is a top source of bugs: a function mutates an object its caller still holds, and behavior changes at a distance. Immutable updates make change explicit, enable cheap equality checks by reference (the basis of React's re-render and memoization), and simplify undo/history, caching, and concurrency reasoning.

---

## How it works

### Primitives vs references

```javascript
let a = 1; let b = a; b++;        // a is still 1 (copied by value)
const o = { n: 1 }; const p = o; p.n = 2; // o.n is now 2 (shared reference)
```

### Non-mutating updates

```javascript
// Objects — spread to copy then override
const updated = { ...user, name: "Ada" };

// Arrays — prefer methods that return new arrays
const added = [...list, item];
const removed = list.filter((x) => x.id !== id);
const changed = list.map((x) => x.id === id ? { ...x, done: true } : x);
const sorted = list.toSorted((a, b) => a - b);  // ES2023, non-mutating
```

### Enforcing immutability

`Object.freeze` prevents adding/removing/changing own properties — but it is **shallow**.

```javascript
const config = Object.freeze({ port: 3000, db: { host: "local" } });
config.port = 1;          // silently ignored (throws in strict mode)
config.db.host = "other"; // NOT prevented — nested object is still mutable
```

### Deep copying

```javascript
const deep = structuredClone(original); // handles nested objects, Maps, Dates, etc.
```

Avoid `JSON.parse(JSON.stringify(x))` — it loses `undefined`, functions, `Date` (→ string), `Map`/`Set`, and throws on cycles.

### Shallow copy caveat

Spread and `Object.assign` copy only one level deep; nested objects/arrays are shared.

```javascript
const copy = { ...state };
copy.items.push(x);       // mutates the ORIGINAL state.items too
```

---

## Examples

```javascript
// Immutable state update (React-style reducer)
function reducer(state, action) {
  switch (action.type) {
    case "increment":
      return { ...state, count: state.count + 1 };  // new object
    case "addTodo":
      return { ...state, todos: [...state.todos, action.todo] };
    default:
      return state;
  }
}

// Reference equality makes change detection O(1)
prevState === nextState;  // true if nothing changed → skip re-render
```

---

## When to use

- Use immutable updates for application/UI state (React, Redux, signals) — it enables cheap change detection.
- Use `Object.freeze` for constants and configuration you want protected.
- Use `structuredClone` when you genuinely need a deep, independent copy.
- Use non-mutating array methods (`map`, `filter`, `toSorted`, `with`) in transformation pipelines.

## When NOT to use

- Do not deep-clone large structures on every update for performance-critical hot paths — copy only the changed path.
- Do not assume spread/`Object.freeze` are deep — nested data stays mutable/shared.
- Do not use `JSON.parse(JSON.stringify(...))` for cloning data with `Date`, `Map`, `undefined`, or cycles.
- Do not enforce immutability so rigidly that a local, non-shared mutable accumulator (e.g., inside one function) becomes contorted — local mutation is fine.

---

## References

- [MDN — Object.freeze()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
- [MDN — structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
- [MDN — Copying objects (spread / Object.assign)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
- [MDN — Array (change-copying methods)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#copying_methods_and_mutating_methods)
