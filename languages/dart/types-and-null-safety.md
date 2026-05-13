# Types and Null Safety in Dart

> Dart's sound type system and built-in null safety eliminate entire categories of runtime errors at compile time.

---

## What is it?

Dart has a **static, sound type system** — the compiler can prove that a typed expression will never hold a value of the wrong type at runtime. Since Dart 2.12, this type system is also **null-safe**: non-nullable types (`String`, `int`) can never hold `null` unless explicitly declared nullable (`String?`, `int?`). This distinction is enforced at compile time, not at runtime.

---

## Why does it matter?

Null-related crashes are among the most common sources of bugs in application code. Dart's sound null safety eliminates them by making nullability a property of the type, not a runtime surprise. The compiler forces you to handle the nullable case explicitly before the code compiles.

---

## How it works

### Non-nullable and nullable types

By default, a type cannot hold `null`:

```dart
String name = 'Alice';
name = null; // compile error: a value of type 'Null' can't be assigned to 'String'
```

Append `?` to allow null:

```dart
String? maybeName;        // null by default
maybeName = 'Bob';        // valid
maybeName = null;         // valid
```

### Null-aware operators

```dart
String? name;

// ?. — null-aware access (short-circuits if receiver is null)
int? length = name?.length;

// ?? — null coalescing (returns the right-hand side if the left is null)
String display = name ?? 'Anonymous';

// ??= — assign only if null
name ??= 'Default';

// ! — null assertion operator (throws if null — use sparingly)
String guaranteed = name!;
```

### Late variables

`late` defers initialisation of a non-nullable variable to first access. Use it when the value is guaranteed to be set before use but cannot be set at declaration time:

```dart
late String config;

void init() {
  config = loadConfig();
}

void run() {
  print(config); // safe: init() was called first
}
```

Accessing a `late` variable before it is initialised throws a `LateInitializationError` at runtime.

### Type inference

Dart infers types from context — explicit annotations are optional where the type is obvious:

```dart
var count = 0;             // inferred: int
final greeting = 'Hello';  // inferred: String
const pi = 3.14159;        // inferred: double (compile-time constant)
```

### Generics

Dart generics are **reified** — type information is preserved at runtime. This matters for `is` checks and collection operations:

```dart
class Box<T> {
  final T value;
  Box(this.value);
}

final nameBox = Box('Alice');
print(nameBox is Box<String>); // true
print(nameBox is Box<int>);    // false
```

**Bounded generics** restrict the type parameter to a supertype:

```dart
T largest<T extends Comparable<T>>(T a, T b) => a.compareTo(b) >= 0 ? a : b;

print(largest(3, 7));         // 7
print(largest('apple', 'fig')); // fig
```

### Built-in types

| Type | Description |
|---|---|
| `int` | 64-bit integer on native; arbitrary precision on web |
| `double` | 64-bit IEEE 754 floating-point |
| `num` | supertype of `int` and `double` |
| `String` | UTF-16 encoded, immutable |
| `bool` | `true` or `false` — no truthy/falsy coercion |
| `List<T>` | ordered, growable sequence |
| `Map<K, V>` | hash map |
| `Set<T>` | unordered, unique-element collection |
| `dynamic` | opt-out of static typing — avoid in production code |
| `Object` | root of the non-nullable type hierarchy |
| `Object?` | root of the nullable type hierarchy |
| `Never` | a type with no values; used for functions that never return |

---

## When to use

- Prefer non-nullable types by default — add `?` only when `null` is a meaningful value in the domain.
- Use `late` for fields that are initialised once after construction (e.g., in `setUp` in tests or `initState` in Flutter widgets).
- Use bounded generics when a function requires a specific capability from its type parameter.
- Use `final` for values set once; use `const` for compile-time constants.

---

## When NOT to use

- Avoid `dynamic` unless integrating with untyped external APIs (e.g., raw decoded JSON before deserialisation).
- Avoid the null assertion operator (`!`) outside of contexts where you can prove the value is non-null — it converts compile-time safety into a runtime crash.
- Do not use `Object` as a parameter type when a generic or more specific type would better express intent.
- Do not mark a variable `late` if you can initialise it at declaration time.

---

## References

- [Sound null safety — dart.dev](https://dart.dev/null-safety)
- [Type system — dart.dev](https://dart.dev/language/type-system)
- [Generics — dart.dev](https://dart.dev/language/generics)
- [Built-in types — dart.dev](https://dart.dev/language/built-in-types)
