# Dart Patterns

> Common design patterns adapted to Dart idioms, including Dart 3 sealed classes, pattern matching, and streams as the idiomatic observer.

---

## What is it?

Design patterns are reusable solutions to recurring design problems. In Dart, classical GoF patterns appear frequently — but Dart's specific features (mixins, sealed classes, extension methods, records, pattern matching, `Stream`) often yield idiomatic solutions that differ from the textbook Java or C++ implementation.

---

## Why does it matter?

Knowing how patterns translate to Dart prevents over-engineered solutions. A Singleton is simpler with a static final field. An Adapter is cleaner with an extension. An Observer is already built into the language via `Stream`. Understanding the idiomatic form saves boilerplate and keeps code readable.

---

## How it works

### Singleton

Use a static final field. The factory constructor form provides the classic OOP interface:

```dart
class AppConfig {
  static final AppConfig _instance = AppConfig._internal();

  factory AppConfig() => _instance;
  AppConfig._internal();

  String environment = 'production';
}

final config = AppConfig(); // always the same instance
```

### Factory method

Factory constructors in Dart can return subtypes, making them a natural home for the Factory Method pattern:

```dart
abstract class Button {
  void render();

  factory Button(String platform) => switch (platform) {
    'ios'     => _IOSButton(),
    'android' => _AndroidButton(),
    _         => throw ArgumentError('Unknown platform: $platform'),
  };
}

class _IOSButton implements Button {
  @override void render() => print('iOS button');
}

class _AndroidButton implements Button {
  @override void render() => print('Android button');
}

// Usage
Button('ios').render(); // iOS button
```

### Builder

```dart
class HttpRequest {
  final String url;
  final String method;
  final Map<String, String> headers;
  final String? body;

  HttpRequest._({
    required this.url,
    required this.method,
    required this.headers,
    this.body,
  });
}

class HttpRequestBuilder {
  final String _url;
  String _method = 'GET';
  final Map<String, String> _headers = {};
  String? _body;

  HttpRequestBuilder(this._url);

  HttpRequestBuilder method(String m)   { _method = m; return this; }
  HttpRequestBuilder header(String k, String v) { _headers[k] = v; return this; }
  HttpRequestBuilder body(String b)     { _body = b; return this; }

  HttpRequest build() => HttpRequest._(
    url: _url, method: _method, headers: _headers, body: _body,
  );
}

// Usage
final request = HttpRequestBuilder('https://api.example.com/users')
    .method('POST')
    .header('Content-Type', 'application/json')
    .body('{"name":"Alice"}')
    .build();
```

### Observer — via Stream

`Stream` and `StreamController` are the idiomatic Observer in Dart. Prefer them over a hand-rolled Subject/Observer class hierarchy:

```dart
class EventBus {
  final _controller = StreamController<Object>.broadcast();

  Stream<T> on<T>() => _controller.stream.whereType<T>();
  void emit(Object event) => _controller.add(event);
  void dispose() => _controller.close();
}

class UserLoggedIn { final String userId; UserLoggedIn(this.userId); }

// Usage
final bus = EventBus();
bus.on<UserLoggedIn>().listen((e) => print('Logged in: ${e.userId}'));
bus.emit(UserLoggedIn(userId: '42'));
```

### Strategy

First-class functions eliminate the need for a Strategy interface in most cases:

```dart
typedef Comparator<T> = int Function(T a, T b);

class Sorter<T> {
  Comparator<T> strategy;
  Sorter(this.strategy);

  List<T> sort(List<T> items) => [...items]..sort(strategy);
}

final sorter = Sorter<int>((a, b) => a.compareTo(b));
print(sorter.sort([3, 1, 4, 1, 5])); // [1, 1, 3, 4, 5]
```

### Algebraic data types — via sealed classes and pattern matching (Dart 3)

Sealed classes combined with `switch` expressions are the idiomatic replacement for the Visitor pattern when operating on a closed set of types:

```dart
sealed class Expr {}
class Num extends Expr { final double value; Num(this.value); }
class Add extends Expr { final Expr left, right; Add(this.left, this.right); }
class Mul extends Expr { final Expr left, right; Mul(this.left, this.right); }

double eval(Expr expr) => switch (expr) {
  Num(:final value)             => value,
  Add(:final left, :final right) => eval(left) + eval(right),
  Mul(:final left, :final right) => eval(left) * eval(right),
};

// The compiler enforces exhaustiveness — adding a new Expr subtype
// without updating eval() produces a compile error.
```

---

## When to use

- Use factory constructors when object creation logic is non-trivial or needs to return a subtype.
- Use `StreamController.broadcast()` for event buses; single-subscription streams for data pipelines.
- Use sealed classes + pattern matching instead of visitor or type-checking `if`/`is` chains.
- Use function-typed strategy fields instead of a `Strategy` interface class for simple cases.

---

## When NOT to use

- Do not implement Singleton with `late static` fields — a static final initialiser is simpler and initialised on first access.
- Do not create a `Subject`/`Observer` class hierarchy — use `Stream` and `StreamController` directly.
- Do not use pattern matching on open class hierarchies — patterns work best with `sealed` types where the compiler can verify exhaustiveness.

---

## References

- [Patterns — dart.dev](https://dart.dev/language/patterns)
- [Sealed classes — dart.dev](https://dart.dev/language/class-modifiers#sealed)
- [Design Patterns (GoF) — refactoring.guru](https://refactoring.guru/design-patterns)
- [Effective Dart — dart.dev](https://dart.dev/effective-dart)
