# Classes and Mixins in Dart

> Dart uses class-based OOP with single inheritance, mixins for horizontal code sharing, and extension methods for adding behaviour to existing types.

---

## What is it?

A **class** in Dart defines a blueprint for objects — it bundles state (fields) and behaviour (methods). Dart supports single class inheritance (`extends`), interface satisfaction (`implements`), and **mixins** — a mechanism for composing behaviour across class hierarchies without forming a parent–child relationship. **Extension methods** let you add methods to existing types you cannot or should not modify.

---

## Why does it matter?

Understanding Dart's object model is required for almost every non-trivial program. Mixins and extensions solve problems that inheritance handles poorly: sharing behaviour between unrelated types and adding utility methods to existing types.

---

## How it works

### Classes and constructors

```dart
class Point {
  final double x;
  final double y;

  // Generative constructor with initialising formals
  Point(this.x, this.y);

  // Named constructor
  Point.origin() : x = 0, y = 0;

  // Factory constructor — can return a cached instance or a subtype
  factory Point.fromJson(Map<String, dynamic> json) {
    return Point(json['x'] as double, json['y'] as double);
  }

  double distanceTo(Point other) {
    final dx = x - other.x;
    final dy = y - other.y;
    return (dx * dx + dy * dy);
  }
}
```

### Inheritance

Dart supports single inheritance with `extends`. Use `super` to call the parent constructor or method:

```dart
class ColoredPoint extends Point {
  final String color;

  ColoredPoint(super.x, super.y, this.color);

  @override
  String toString() => 'ColoredPoint($x, $y, $color)';
}
```

### Abstract classes and interfaces

`abstract` prevents direct instantiation and enforces a contract on subclasses. Any class can also be used as an interface via `implements`:

```dart
abstract class Repository<T> {
  Future<T?> findById(String id);
  Future<void> save(T entity);
  Future<void> delete(String id);
}

class UserRepository implements Repository<User> {
  @override
  Future<User?> findById(String id) async { /* ... */ }

  @override
  Future<void> save(User entity) async { /* ... */ }

  @override
  Future<void> delete(String id) async { /* ... */ }
}
```

### Sealed classes (Dart 3+)

`sealed` restricts which classes can extend or implement a type to those declared in the same library. This enables exhaustive pattern matching at compile time:

```dart
sealed class Result<T> {}

class Ok<T> extends Result<T> {
  final T value;
  Ok(this.value);
}

class Err<T> extends Result<T> {
  final String message;
  Err(this.message);
}

String describe<T>(Result<T> result) => switch (result) {
  Ok(:final value)    => 'Success: $value',
  Err(:final message) => 'Error: $message',
};
```

If you add a new subtype of `Result` without updating the `switch`, the compiler emits an error.

### Mixins

Mixins inject behaviour into a class without forming a parent–child relationship. Declare with `mixin`; apply with `with`:

```dart
mixin Printable {
  void printInfo() => print(toString());
}

mixin Serializable {
  Map<String, dynamic> toJson();
}

class User with Printable, Serializable {
  final String name;
  User(this.name);

  @override
  Map<String, dynamic> toJson() => {'name': name};

  @override
  String toString() => 'User($name)';
}
```

The `on` clause restricts a mixin to apply only on classes that extend a specific supertype:

```dart
mixin Flyable on Animal {
  void fly() => print('$name is flying');
}
```

### Extension methods

Extensions add methods to an existing type without modifying it or subclassing it:

```dart
extension StringExtensions on String {
  String get capitalised =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';

  bool get isValidEmail =>
      RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(this);
}

print('hello'.capitalised);             // Hello
print('user@example.com'.isValidEmail); // true
```

---

## When to use

- Use `extends` for true IS-A relationships where the subtype is substitutable for the parent.
- Use `implements` for defining contracts that multiple unrelated types can satisfy.
- Use `mixin` for behaviour shared across types that do not share a parent.
- Use `sealed class` when you need exhaustive switching over a fixed set of subtypes (algebraic data types).
- Use `extension` to add utility methods to types you cannot or should not modify.

---

## When NOT to use

- Avoid deep inheritance hierarchies — they create tight coupling and fragile base class problems.
- Do not use mixins to share primary state between classes; mixins should carry behaviour, not data.
- Do not abuse extensions to add domain logic to primitive types — prefer a dedicated domain class.
- Do not use abstract classes as pure data bags; use records or plain classes instead.

---

## References

- [Classes — dart.dev](https://dart.dev/language/classes)
- [Mixins — dart.dev](https://dart.dev/language/mixins)
- [Sealed classes — dart.dev](https://dart.dev/language/class-modifiers#sealed)
- [Extension methods — dart.dev](https://dart.dev/language/extension-methods)
