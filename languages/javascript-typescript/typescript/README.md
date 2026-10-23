# TypeScript

> A study guide covering TypeScript's static type system: the basics, generics, narrowing, advanced type operators, modules, patterns, and best practices for production code.

---

## Overview & Setup

| Article | Description |
|---|---|
| [Overview](overview.md) | What TypeScript is, structural and gradual typing, compile-time erasure, why to use it |
| [Installation and Setup](installation-and-setup.md) | Installing TypeScript, a strict `tsconfig.json`, compiling and running |
| [Toolchain](toolchain.md) | Type-checking vs transpilation, bundling, linting, project references for scale |

---

## The Type System

| Article | Description |
|---|---|
| [Type System Basics](type-system-basics.md) | Primitives, arrays, tuples, objects, unions, literals, `any`/`unknown`/`never` |
| [Interfaces vs Type Aliases](interfaces-vs-types.md) | The real differences and a practical rule for choosing |
| [Functions and Signatures](functions-and-signatures.md) | Parameters, return types, overloads, `this`, typed callbacks |
| [Generics](generics.md) | Type parameters, constraints, `keyof`, generic types and defaults |
| [Narrowing and Type Guards](narrowing-and-type-guards.md) | Flow narrowing, discriminated unions, user guards, assertion functions |

---

## Advanced Types

| Article | Description |
|---|---|
| [Utility Types](utility-types.md) | `Partial`, `Pick`, `Omit`, `Record`, `ReturnType`, and composition |
| [Advanced Types](advanced-types.md) | Conditional, mapped, and template literal types, and `infer` |
| [Modules and Declarations](modules-and-declarations.md) | `.d.ts` files, `@types`, module resolution, path aliases, `import type` |
| [Classes and Decorators](classes-and-decorators.md) | Access modifiers, parameter properties, `abstract`, standardized decorators |

---

## Errors, Patterns, Testing, and Best Practices

| Article | Description |
|---|---|
| [Error Handling](error-handling.md) | `unknown` in catch, custom errors, the `Result` pattern, boundary validation |
| [TypeScript Patterns](typescript-patterns.md) | Discriminated unions, branded types, builder, dependency inversion, `satisfies` |
| [Testing](testing.md) | Running tests on TS, typed mocks, and type-level tests |
| [Best Practices](best-practices.md) | Strictness, avoiding `any`, precise modeling, runtime validation |
