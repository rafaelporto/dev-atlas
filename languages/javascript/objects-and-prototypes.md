---
type: concept
tags:
  - language
  - javascript
  - concept
related:
  - languages/javascript/functions
  - languages/javascript/paradigms
  - languages/javascript/immutability-and-data
language: "javascript"
---
# Objects and Prototypes

> JavaScript objects inherit through a chain of prototype links rather than classes, and `class` syntax is a convenient layer over this prototypal model.

---

## What is it?

An **object** is a collection of key/value properties. Every object has an internal link to another object — its **prototype** — and property lookups that miss on the object itself continue up this **prototype chain**. Inheritance in JavaScript is delegation along that chain.

---

## Why does it matter?

`class` looks like Java or C#, but the semantics underneath are different: there are no rigid types, methods live on shared prototype objects, and inheritance is dynamic delegation. Knowing this explains how method resolution works, why adding to a prototype affects all instances, and how to avoid mutating shared prototypes by accident.

---

## How it works

### Object creation

```javascript
const literal = { name: "Ada", age: 36 };          // object literal
const made = Object.create(protoObj);              // explicit prototype
const shorthand = { name, greet() { /* ... */ } }; // property + method shorthand
```

### The prototype chain

```javascript
const animal = { breathe() { return "..."; } };
const dog = Object.create(animal);
dog.bark = () => "woof";

dog.bark();     // own property
dog.breathe();  // found on `animal` via the chain
Object.getPrototypeOf(dog) === animal; // true
```

Lookup order: own property → prototype → prototype's prototype → … → `Object.prototype` → `null`.

### Classes are sugar

```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}
class Dog extends Animal {
  speak() { return `${this.name} barks`; }   // override
  fetch() { return super.speak(); }           // call parent
}
```

`speak` lives on `Animal.prototype` / `Dog.prototype`, shared by all instances — not copied per object.

### Modern class features

```javascript
class Counter {
  #count = 0;                    // private field (truly private, enforced)
  static create() { return new Counter(); } // static method
  get value() { return this.#count; }        // getter
  increment = () => { this.#count++; };       // class field: arrow bound to instance
}
```

### Property descriptors

Properties have attributes (`writable`, `enumerable`, `configurable`).

```javascript
Object.defineProperty(obj, "id", { value: 1, writable: false, enumerable: false });
Object.freeze(obj);   // shallow immutability
```

---

## Examples

```javascript
// Copying and merging (shallow)
const merged = { ...defaults, ...overrides };
const copy = Object.assign({}, source);

// Iterating safely
for (const [key, value] of Object.entries(config)) { /* ... */ }
Object.keys(obj);      // own enumerable string keys
Object.hasOwn(obj, "x"); // preferred over hasOwnProperty

// Composition over inheritance — mix behaviors without a class hierarchy
const withTimestamps = (o) => ({ ...o, createdAt: Date.now() });
```

---

## When to use

- Use plain object literals for data bags, configuration, and DTOs.
- Use `class` when you have entities with identity, encapsulated state (private `#fields`), and shared behavior.
- Use `Object.create`/prototypes directly only for advanced delegation or library internals.
- Prefer **composition** (spreading/merging behavior) over deep inheritance chains.

## When NOT to use

- Do not extend built-in prototypes (`Array.prototype`, `Object.prototype`) — it pollutes every object globally.
- Do not use objects as maps with arbitrary/user keys — use `Map` (avoids prototype-key collisions like `__proto__`).
- Do not rely on inheritance more than two levels deep — it becomes fragile; compose instead.
- Do not assume `Object.freeze` is deep — nested objects remain mutable.

---

## References

- [MDN — Working with objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects)
- [MDN — Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
- [MDN — Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [MDN — Private class features](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields)
