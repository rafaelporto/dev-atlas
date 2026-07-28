---
type: concept
tags:
  - language
  - javascript
  - concept
related:
  - languages/javascript/overview
  - languages/javascript/immutability-and-data
language: "javascript"
---
# Types and Coercion

> JavaScript has a small set of dynamic types and a set of implicit conversion rules ("coercion") that are the source of many bugs — knowing them makes the language predictable.

---

## What is it?

Every JavaScript value has one of a fixed set of **types**. Variables are not typed; values are. **Coercion** is the automatic conversion of a value from one type to another when an operation expects a different type (e.g., `"5" * 2` coerces the string to a number).

---

## Why does it matter?

Coercion is where JavaScript surprises people: `[] == ![]` is `true`, `"" + 1` is `"1"`, `1 + "1"` is `"11"` but `1 - "1"` is `0`. These are not bugs in the engine — they follow precise rules. Understanding them lets you avoid the traps and write comparisons and conversions that mean what you intend.

---

## How it works

### The types

**Primitives** (immutable, compared by value):

| Type | Example | Notes |
|---|---|---|
| `undefined` | `undefined` | Declared but unassigned |
| `null` | `null` | Intentional "no value" |
| `boolean` | `true` | |
| `number` | `42`, `3.14`, `NaN`, `Infinity` | IEEE-754 double |
| `bigint` | `9007199254740993n` | Arbitrary-precision integers |
| `string` | `"hi"` | UTF-16 code units |
| `symbol` | `Symbol("id")` | Unique identifiers |

**Objects** (compared by reference): everything else — `{}`, `[]`, functions, `Date`, `Map`.

```javascript
typeof undefined;   // "undefined"
typeof null;        // "object"  ← historical bug, kept for compatibility
typeof 42;          // "number"
typeof "x";         // "string"
typeof (() => {});  // "function"  ← functions are callable objects
typeof [];          // "object"   ← use Array.isArray([]) instead
```

### Truthiness

Any value can be coerced to boolean. The **falsy** values are exactly: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. Everything else is truthy — including `"0"`, `[]`, and `{}`.

### Equality: `===` vs `==`

- `===` (strict) — no coercion; types must match. **Prefer this.**
- `==` (loose) — coerces operands before comparing, following the abstract equality algorithm.

```javascript
0 == "";        // false
0 == "0";       // true
"" == "0";      // false   ← not transitive!
null == undefined; // true (special-cased)
NaN === NaN;    // false   ← use Number.isNaN()
```

The one defensible use of `==` is `x == null` to check for `null` *or* `undefined` in a single expression.

### Numeric vs string coercion

`+` is overloaded: if either operand is a string, it concatenates; otherwise it adds. Other arithmetic operators always coerce to number.

```javascript
1 + "2";     // "12"   (string concatenation)
1 - "2";     // -1     (numeric)
"3" * "4";   // 12
+"5";        // 5      (unary + forces number)
`${42}`;     // "42"   (template forces string)
```

---

## Examples

```javascript
// Explicit conversion — say what you mean
Number("42");        // 42
Number("");          // 0     ← surprising; validate first
parseInt("42px", 10); // 42
String(42);          // "42"
Boolean(0);          // false

// Safe number parsing
const n = Number(input);
if (Number.isNaN(n)) throw new Error("not a number");

// Nullish coalescing distinguishes null/undefined from other falsy values
const port = config.port ?? 3000;   // 0 would be kept; only null/undefined fall through
```

---

## When to use

- Use `===` and `!==` by default for all comparisons.
- Use explicit `Number()`, `String()`, `Boolean()` when converting types.
- Use `??` (nullish coalescing) when `0`, `""`, or `false` are valid values you must preserve.
- Use `Number.isNaN` / `Number.isFinite` rather than the global `isNaN`.

## When NOT to use

- Do not rely on `==` for general comparisons — its coercion is non-transitive and error-prone.
- Do not use `||` for defaults when a falsy-but-valid value (`0`, `""`) should be kept — use `??`.
- Do not use `typeof x === "object"` to detect arrays or null — use `Array.isArray` and explicit `=== null`.
- Do not compare `NaN` with `===` — it is never equal to itself.

---

## References

- [MDN — Data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures)
- [MDN — Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness)
- [MDN — Type coercion](https://developer.mozilla.org/en-US/docs/Glossary/Type_coercion)
- [ECMA-262 — Abstract Equality Comparison](https://tc39.es/ecma262/#sec-islooselyequal)
