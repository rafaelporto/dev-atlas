---
type: concept
tags:
  - language
  - javascript
  - concept
related:
  - languages/javascript/overview
  - languages/javascript/functions
  - languages/javascript/objects-and-prototypes
language: "javascript"
---
# JavaScript Paradigms

> JavaScript is genuinely multi-paradigm: it supports imperative, prototype-based object-oriented, and functional programming, and idiomatic code mixes them deliberately.

---

## What is it?

A programming paradigm is a style of structuring code. JavaScript does not force one: the same program can use imperative loops, objects with methods, and pure functions composed together. This flexibility is a feature — but it means the team must choose conventions, because the language will not.

---

## Why does it matter?

Knowing which paradigm fits a problem prevents fighting the language. Modeling a UI as immutable data transformed by pure functions (functional) leads to different, often simpler, code than modeling it as mutable objects reacting to events (OOP). Most real codebases blend styles; the skill is knowing when each is clearest.

---

## How it works

### Imperative and structured

The baseline: statements that mutate state and control flow with loops and conditionals.

```javascript
function sumEven(nums) {
  let total = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] % 2 === 0) total += nums[i];
  }
  return total;
}
```

### Object-oriented (prototype-based)

JavaScript's OOP is **prototypal**, not class-based at its core — `class` is syntax sugar over prototypes. Objects delegate to a prototype chain rather than instantiating from rigid class definitions.

```javascript
class Account {
  #balance = 0;                 // private field
  deposit(amount) { this.#balance += amount; return this; }
  get balance() { return this.#balance; }
}
```

See [objects-and-prototypes](objects-and-prototypes.md) for the underlying mechanism.

### Functional

Functions are first-class values, enabling higher-order functions, closures, and composition. `map`/`filter`/`reduce`, immutability, and avoiding side effects characterize the style.

```javascript
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
const clean = pipe(
  (s) => s.trim(),
  (s) => s.toLowerCase(),
);
clean("  HELLO ");             // "hello"
```

### Event-driven / asynchronous

Host environments push an event-driven style: register callbacks/promises, react to I/O and user events. This is orthogonal to the three above and pervasive in JS.

---

## Examples

```javascript
// Same task, functional style — no mutation, composable
const sumEven = (nums) =>
  nums.filter((n) => n % 2 === 0).reduce((a, n) => a + n, 0);

// OOP style — behavior attached to data
class Cart {
  #items = [];
  add(item) { this.#items.push(item); return this; }
  get total() { return this.#items.reduce((s, i) => s + i.price, 0); }
}
```

---

## When to use

- **Functional** — data transformations, pipelines, React render logic, anything easier to reason about without shared mutable state.
- **OOP** — modeling entities with identity and encapsulated behavior (a `Connection`, a `Cart`), especially with clear lifecycles.
- **Imperative** — tight performance-sensitive loops, or when a straightforward sequence of steps is genuinely the clearest expression.

## When NOT to use

- Do not force deep class hierarchies where a plain object or a function would do — JavaScript favors composition over inheritance.
- Do not chase "pure functional" purity at the cost of readability (e.g., point-free code that obscures intent).
- Do not scatter mutation across an otherwise functional pipeline — it defeats the reasoning benefits.

---

## References

- [MDN — Object-oriented programming](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects)
- [MDN — Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [MDN — Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
