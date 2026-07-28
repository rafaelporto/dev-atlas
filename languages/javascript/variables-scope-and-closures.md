---
type: concept
tags:
  - language
  - javascript
  - concept
related:
  - languages/javascript/functions
  - languages/javascript/async-and-event-loop
  - languages/javascript/best-practices
language: "javascript"
---
# Variables, Scope, and Closures

> How `var`, `let`, and `const` differ, how scope and hoisting work, and why closures — functions that remember their defining scope — are JavaScript's most powerful and most misunderstood feature.

---

## What is it?

**Scope** is the region of code where a variable is accessible. A **closure** is a function bundled with references to the variables from the scope where it was created, so it keeps access to them even after that scope has finished executing.

---

## Why does it matter?

Closures underpin data privacy, callbacks, event handlers, memoization, and module patterns. `var`'s function-scoping and hoisting quirks are a classic source of loop bugs. Choosing `const`/`let` correctly and understanding hoisting removes a whole category of "why is this variable `undefined`?" surprises.

---

## How it works

### `var` vs `let` vs `const`

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | function | block | block |
| Hoisting | hoisted, initialized `undefined` | hoisted, in TDZ | hoisted, in TDZ |
| Reassignable | yes | yes | no |
| Redeclarable in scope | yes | no | no |

```javascript
{
  var a = 1;   // leaks out of the block
  let b = 2;   // confined to the block
}
console.log(a); // 1
console.log(b); // ReferenceError
```

### Hoisting and the Temporal Dead Zone

Declarations are processed before code runs. `var` is initialized to `undefined` at the top of its function; `let`/`const` are hoisted but *uninitialized* — accessing them before their declaration throws (the **Temporal Dead Zone**).

```javascript
console.log(x); // undefined  (var hoisted + initialized)
var x = 1;

console.log(y); // ReferenceError — TDZ
let y = 1;
```

### Lexical scope

A function's scope is determined by *where it is written*, not where it is called (lexical, not dynamic). Inner functions can read outer variables; the reverse is not true.

### Closures

When a function is created, it captures a live reference to its surrounding variables — not a snapshot of their values.

```javascript
function counter() {
  let count = 0;                 // private to the returned function
  return {
    increment: () => ++count,
    value: () => count,
  };
}
const c = counter();
c.increment(); c.increment();
c.value();                       // 2
```

### The classic loop bug

Because `var` is function-scoped, every closure in the loop shares one variable. `let` creates a fresh binding per iteration.

```javascript
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)); // 3 3 3
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j)); // 0 1 2
```

---

## Examples

```javascript
// Data privacy via closure (module pattern)
const makeStore = () => {
  const data = new Map();        // not accessible from outside
  return {
    get: (k) => data.get(k),
    set: (k, v) => { data.set(k, v); },
  };
};

// Memoization keeps a private cache alive between calls
const memoize = (fn) => {
  const cache = new Map();
  return (arg) => cache.has(arg) ? cache.get(arg)
                                 : (cache.set(arg, fn(arg)), cache.get(arg));
};
```

---

## When to use

- Use `const` by default; use `let` only when you must reassign; avoid `var` entirely in new code.
- Use closures for private state, factory functions, memoization, and configuring callbacks.
- Use `let` in `for` loops when the body creates closures over the loop variable.

## When NOT to use

- Do not use `var` in modern code — its function scope and hoisting cause bugs `let`/`const` prevent.
- Do not create closures that unintentionally retain large objects — they keep captured variables alive, which can leak memory.
- Do not rely on hoisting to use a `let`/`const` before its declaration — it throws.

---

## References

- [MDN — Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [MDN — Grammar and types: Variable scope](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#variable_scope)
- [MDN — let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
- [MDN — Temporal dead zone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz)
