---
type: concept
tags:
  - language
  - javascript
  - concept
related:
  - languages/javascript/variables-scope-and-closures
  - languages/javascript/paradigms
  - languages/javascript/objects-and-prototypes
language: "javascript"
---
# Functions

> Functions are first-class values in JavaScript, and the differences between arrow and regular functions — chiefly how they bind `this` — are essential to writing correct code.

---

## What is it?

A function is a reusable block of code that is also a **value**: it can be stored in variables, passed as an argument, and returned from other functions. JavaScript offers several function forms (declarations, expressions, arrow functions, methods) that differ in hoisting, `this` binding, and available features like `arguments`.

---

## Why does it matter?

The single most common `this`-related bug — a method losing its receiver when passed as a callback — comes from not understanding function binding. Choosing arrow vs regular functions deliberately fixes an entire class of these bugs. First-class functions are also the foundation of the functional style and of every callback-based API.

---

## How it works

### Function forms

```javascript
function declared() {}                 // hoisted; has its own `this`, `arguments`
const expr = function () {};           // not hoisted as a name
const arrow = () => {};                // lexical `this`, no `arguments`, not `new`-able
const obj = { method() {} };           // shorthand method
```

### `this` binding

`this` is determined by **how a function is called**, not where it is defined — *except* for arrow functions, which capture `this` lexically from their surrounding scope.

```javascript
const timer = {
  seconds: 0,
  startBroken() {
    setInterval(function () { this.seconds++; }, 1000); // `this` is not `timer`
  },
  startFixed() {
    setInterval(() => { this.seconds++; }, 1000);       // arrow captures `timer`
  },
};
```

Explicit binding: `call`, `apply`, and `bind`.

```javascript
function greet(greeting) { return `${greeting}, ${this.name}`; }
greet.call({ name: "Ada" }, "Hi");       // "Hi, Ada"
const bound = greet.bind({ name: "Ada" }); // permanently bound
```

### Parameters

```javascript
function f(a, b = 10, ...rest) {         // default + rest parameters
  return [a, b, rest];
}
f(1);           // [1, 10, []]
f(1, 2, 3, 4);  // [1, 2, [3, 4]]

const { x = 0, y = 0 } = point;          // destructuring with defaults
```

### Higher-order functions

Functions that take or return functions.

```javascript
const withLogging = (fn) => (...args) => {
  console.log("calling with", args);
  return fn(...args);
};
```

---

## Examples

```javascript
// Passing a method safely — arrow preserves receiver
button.addEventListener("click", () => this.handleClick());

// Currying via closures
const multiply = (a) => (b) => a * b;
const double = multiply(2);
double(21);                              // 42

// Immediately-invoked function expression (IIFE) for isolated scope
const config = (() => {
  const secret = loadSecret();
  return { public: derive(secret) };
})();
```

---

## When to use

- Use **arrow functions** for callbacks, and whenever you want `this` to come from the enclosing scope (React handlers, array methods, class field methods).
- Use **regular functions** for object methods that rely on the dynamic `this` of the caller, for constructors, and when you need `arguments` or generator/`function*` syntax.
- Use default and rest parameters instead of manually inspecting `arguments`.

## When NOT to use

- Do not use an arrow function as an object method that needs `this` to refer to the object — it will capture the outer scope instead.
- Do not use arrow functions as constructors (`new`) — they cannot be constructed.
- Do not rely on `arguments` in new code — use rest parameters (`...args`), which are real arrays.
- Do not pass an object method directly as a callback without binding — extract it as an arrow or use `.bind`.

---

## References

- [MDN — Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [MDN — Arrow function expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN — this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [MDN — Function.prototype.bind()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)
