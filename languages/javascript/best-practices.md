---
type: concept
tags:
  - language
  - javascript
  - best-practice
related:
  - languages/javascript/types-and-coercion
  - languages/javascript/error-handling
  - languages/javascript/immutability-and-data
language: "javascript"
---
# JavaScript Best Practices

> A consolidated set of everyday guidelines — prefer strict equality, `const`, modern syntax, immutable updates, and explicit error handling — that keep JavaScript predictable.

---

## What is it?

A curated list of idioms and defaults that experienced JavaScript engineers apply almost automatically. They are not rules of the language but conventions that avoid its known sharp edges (coercion, `this`, mutation) and lean on its strengths (first-class functions, expressive syntax).

---

## Why does it matter?

JavaScript is permissive: it will run almost anything, deferring failures to runtime. Consistent conventions convert would-be runtime surprises into predictable behavior and make code reviewable across a team. Most of these practices also map directly to ESLint rules, so they can be enforced automatically.

---

## How it works

### Variables and equality

```javascript
const x = 1;              // const by default; let only when reassigning; never var
if (a === b) { }          // strict equality; avoid ==
const port = env ?? 3000; // ?? for defaults when 0/""/false are valid
```

### Prefer modern, expressive syntax

```javascript
const { name, age = 0 } = user;         // destructuring with defaults
const merged = { ...base, ...patch };    // spread over Object.assign
const first = list?.[0] ?? fallback;     // optional chaining + nullish
const label = `${count} items`;          // template literals over concatenation
```

### Functions

- Use arrow functions for callbacks and to keep lexical `this`.
- Keep functions small and single-purpose; return early to reduce nesting.
- Avoid mutating parameters; return new values.

### Data

- Treat objects/arrays as immutable in shared state (spread, non-mutating methods).
- Use `Map`/`Set` over objects when keys are dynamic or non-string.
- Validate and convert external input explicitly at the boundary.

### Errors

- Throw `Error` (or subclasses), never strings; add `{ cause }` when wrapping.
- Handle at a boundary; never leave empty `catch` blocks or unhandled rejections.

### Async

- Prefer `async`/`await`; run independent work with `Promise.all`.
- Support cancellation with `AbortController` for fetches and long tasks.

### Tooling

- Enable ESLint + a formatter (Prettier or Biome) and run them in CI.
- Adopt TypeScript for anything beyond small scripts — see [typescript/overview](../typescript/overview.md).

---

## Examples

```javascript
// Guard clauses over deep nesting
function process(order) {
  if (!order) throw new Error("order required");
  if (order.items.length === 0) return { status: "empty" };
  return { status: "ok", total: computeTotal(order.items) };
}

// Explicit boundary validation
function toConfig(raw) {
  const port = Number(raw.port);
  if (!Number.isInteger(port)) throw new Error("port must be an integer");
  return Object.freeze({ port });
}
```

---

## When to use

- Apply these defaults in all new JavaScript code and enforce them with ESLint.
- Reach for TypeScript when a codebase grows beyond a few files or is maintained by more than one person.
- Revisit conventions when the language adds features that supersede older idioms (e.g., `??` over `||` defaults).

## When NOT to use

- Do not apply a rule dogmatically where it hurts clarity (e.g., forcing point-free functional style on simple imperative logic).
- Do not micro-optimize prematurely — write clear code first, then measure before optimizing.
- Do not add heavy tooling to a throwaway script — match the setup to the project's lifespan.

---

## References

- [MDN — JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [MDN — Nullish coalescing operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- [MDN — Optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- [ESLint — Rules reference](https://eslint.org/docs/latest/rules/)
