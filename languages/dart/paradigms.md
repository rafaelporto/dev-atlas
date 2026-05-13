# Dart Paradigms

> Dart is a multi-paradigm language — primarily object-oriented, with strong support for functional style and reactive/async programming.

---

## What is it?

A programming paradigm is a model for thinking about and structuring code. Dart does not enforce a single paradigm: it supports object-oriented programming (OOP) as its primary model, borrows functional ideas (immutability, higher-order functions, pattern matching), and bakes asynchronous reactive programming into the language via `async`/`await` and `Stream`.

---

## Why does it matter?

Understanding which paradigm fits which problem avoids over-engineering. A list transformation does not need a class hierarchy. A UI event stream does not need polling. Knowing Dart's paradigm support lets you choose the right tool at the right level of abstraction.

---

## How it works

### Object-Oriented Programming

Dart is class-based with single inheritance. Every value is an object (including `int` and `bool`). OOP is the default paradigm for organising application code.

```dart
abstract class Shape {
  double area();
}

class Circle extends Shape {
  final double radius;
  Circle(this.radius);

  @override
  double area() => 3.14159 * radius * radius;
}
```

Dart does not have an `interface` keyword — any class can be used as an interface via `implements`:

```dart
class Logger {
  void log(String message) => print(message);
}

class Service implements Logger {
  @override
  void log(String message) => print('[Service] $message');
}
```

### Mixins

Mixins allow reusing behaviour across multiple class hierarchies without inheritance. They are Dart's primary tool for horizontal code sharing:

```dart
mixin Serializable {
  Map<String, dynamic> toJson();
}

mixin Loggable {
  void log(String msg) => print('${runtimeType}: $msg');
}

class User with Serializable, Loggable {
  final String name;
  User(this.name);

  @override
  Map<String, dynamic> toJson() => {'name': name};
}
```

### Functional Style

Dart supports first-class functions, closures, higher-order functions, and — since Dart 3 — pattern matching and records. Functional style works best for data transformations and collection pipelines.

```dart
final numbers = [1, 2, 3, 4, 5];

final result = numbers
    .where((n) => n.isOdd)
    .map((n) => n * n)
    .toList(); // [1, 9, 25]
```

**Records** (Dart 3+) allow returning multiple values without a dedicated class:

```dart
(String, int) userInfo() => ('Alice', 30);

final (name, age) = userInfo();
```

**Pattern matching** (Dart 3+) enables exhaustive, type-safe branching on data shape:

```dart
sealed class Shape {}
class Circle extends Shape { final double radius; Circle(this.radius); }
class Rectangle extends Shape { final double w, h; Rectangle(this.w, this.h); }

double area(Shape s) => switch (s) {
  Circle(:final radius)          => 3.14159 * radius * radius,
  Rectangle(:final w, :final h)  => w * h,
};
```

### Reactive / Async Programming

Dart's event loop, `Future`, and `Stream` make asynchronous programming a first-class citizen.

```dart
// Future: a single async value
Future<String> fetchUser(int id) async {
  final response = await http.get(Uri.parse('https://api.example.com/users/$id'));
  return response.body;
}

// Stream: a sequence of async values over time
Stream<int> countUp(int max) async* {
  for (int i = 0; i < max; i++) {
    await Future.delayed(Duration(seconds: 1));
    yield i;
  }
}
```

---

## When to use

- **OOP**: modelling domain entities, defining contracts with abstract classes, building class hierarchies.
- **Mixins**: sharing behaviour across unrelated types (serialisation, logging, equality).
- **Functional style**: collection transformations, data pipelines, stateless pure computations.
- **Records and pattern matching**: returning composite results, exhaustive branching on sealed type variants.
- **Async / Stream**: I/O operations, UI event handling, real-time data feeds.

---

## When NOT to use

- Do not reach for OOP when a simple function or record is enough.
- Do not build deep inheritance hierarchies — Dart's `sealed class` + pattern matching is often cleaner.
- Do not model a single-value async operation as a `Stream` — use `Future` instead.
- Do not mix paradigms arbitrarily within a single module; pick the one that matches the domain and stay consistent.

---

## References

- [Dart language tour — dart.dev](https://dart.dev/language)
- [Mixins — dart.dev](https://dart.dev/language/mixins)
- [Records — dart.dev](https://dart.dev/language/records)
- [Patterns — dart.dev](https://dart.dev/language/patterns)
- [Asynchronous programming — dart.dev](https://dart.dev/libraries/async/async-await)
