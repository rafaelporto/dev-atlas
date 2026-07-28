---
type: concept
tags:
  - language
  - javascript
  - concept
related:
  - languages/javascript/objects-and-prototypes
  - languages/javascript/functions
  - languages/javascript/immutability-and-data
language: "javascript"
---
# Collections and Iteration

> JavaScript offers arrays, `Map`, `Set`, and their weak variants, plus a uniform iteration protocol that powers `for...of`, spread, and generators.

---

## What is it?

Collections are the built-in data structures for holding groups of values: ordered lists (`Array`), keyed dictionaries (`Map`), unique-value sets (`Set`), and garbage-collection-friendly variants (`WeakMap`, `WeakSet`). The **iteration protocol** is the shared contract that lets all of them — and custom objects — be consumed by `for...of`, spread, and destructuring.

---

## Why does it matter?

Choosing the right collection avoids O(n) lookups and subtle bugs (e.g., object keys silently stringified). The iterator/generator protocol is how lazy sequences, infinite streams, and custom iterable APIs are built. Array methods (`map`/`filter`/`reduce`) are the backbone of the functional style.

---

## How it works

### Arrays

Ordered, index-based, with a rich method set. Prefer non-mutating methods when practical.

```javascript
const xs = [3, 1, 2];
xs.map((x) => x * 2);        // [6, 2, 4]   (new array)
xs.filter((x) => x > 1);     // [3, 2]
xs.reduce((a, x) => a + x, 0); // 6
xs.find((x) => x === 2);     // 2
xs.toSorted();               // [1, 2, 3]   (non-mutating; ES2023)
xs.at(-1);                   // 2           (negative index)
```

### Map and Set

`Map` keeps insertion order and allows any key type (including objects); `Set` stores unique values.

```javascript
const m = new Map([["a", 1]]);
m.set("b", 2); m.get("a"); m.has("b"); m.size;

const s = new Set([1, 2, 2, 3]);  // {1, 2, 3}
[...new Set(array)];              // deduplicate an array
```

### WeakMap and WeakSet

Keys are held weakly — entries vanish when the key object is garbage-collected. Not iterable. Use for per-object metadata/caches without leaking memory.

```javascript
const cache = new WeakMap();
cache.set(domNode, computeExpensive(domNode)); // freed when domNode is GC'd
```

### The iteration protocol

An object is *iterable* if it has a `[Symbol.iterator]()` method returning an *iterator* (`{ next(): { value, done } }`). Arrays, strings, `Map`, and `Set` are iterable; plain objects are not.

```javascript
for (const ch of "hi") { /* "h", "i" */ }
const [first, ...rest] = [1, 2, 3];       // destructuring
const merged = [...a, ...b];               // spread
```

### Generators

`function*` produces iterators lazily; `yield` pauses execution.

```javascript
function* naturals() {
  let n = 0;
  while (true) yield n++;      // infinite, lazy
}
const gen = naturals();
gen.next().value;              // 0
```

---

## Examples

```javascript
// Counting occurrences with a Map
const counts = new Map();
for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);

// Grouping (ES2024)
const byType = Object.groupBy(items, (i) => i.type);

// Lazy pipeline with a generator
function* take(iterable, n) {
  let i = 0;
  for (const x of iterable) {
    if (i++ >= n) return;
    yield x;
  }
}
[...take(naturals(), 3)];      // [0, 1, 2]
```

---

## When to use

- Use **arrays** for ordered sequences; prefer `map`/`filter`/`reduce` and non-mutating methods (`toSorted`, `toReversed`, `with`).
- Use **`Map`** when keys are non-strings, insertion order matters, or you add/remove entries frequently.
- Use **`Set`** for membership tests and deduplication.
- Use **`WeakMap`/`WeakSet`** for object-keyed caches/metadata that must not prevent garbage collection.
- Use **generators** for lazy or infinite sequences and custom iterables.

## When NOT to use

- Do not use a plain object as a map with dynamic keys — keys become strings and `__proto__` collides; use `Map`.
- Do not use `for...in` to iterate arrays — it iterates keys (as strings) and inherited enumerable props; use `for...of` or `forEach`.
- Do not mutate an array while iterating it — snapshot or build a new array.
- Do not expect `WeakMap`/`WeakSet` to be iterable or to report size — they intentionally are not.

---

## References

- [MDN — Indexed collections (Array)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections)
- [MDN — Keyed collections (Map, Set)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Keyed_collections)
- [MDN — Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
- [MDN — Generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator)
