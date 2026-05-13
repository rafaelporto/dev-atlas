# Error Handling in Dart

> Dart distinguishes between recoverable exceptions and unrecoverable errors, and encourages explicit handling at call sites rather than propagating unknown failures.

---

## What is it?

Dart has two categories of thrown objects: **`Exception`** (expected failures that callers should handle, such as a failed HTTP request or malformed input) and **`Error`** (programming mistakes that should never be caught in production, such as a null assertion failure or a range error). Unlike Java, Dart does not have checked exceptions — nothing in the type system forces you to catch a thrown exception.

---

## Why does it matter?

Silent failures are worse than crashes. Without checked exceptions, it is easy to miss an exception if you do not actively handle it. Knowing when to use `try/catch`, when to model failure as a return value, and when to let errors propagate gives you control over the resilience of your application.

---

## How it works

### try / catch / finally

```dart
Future<String> readFile(String path) async {
  try {
    final file = File(path);
    return await file.readAsString();
  } on FileSystemException catch (e) {
    throw DataException('Could not read file: ${e.message}');
  } finally {
    log('readFile($path) completed');
  }
}
```

- `on Type` — catch a specific type without binding the exception.
- `on Type catch (e)` — catch and bind the exception.
- `catch (e, s)` — bind both the exception (`e`) and the stack trace (`s`).
- `finally` — executes regardless of success or failure.

### Exception vs Error

| Category | Examples | Should catch? |
|---|---|---|
| `Exception` | `IOException`, `FormatException`, `HttpException` | Yes — handle or rethrow with added context |
| `Error` | `AssertionError`, `RangeError`, `LateInitializationError` | No — fix the code; do not swallow errors |

**Custom exception:**

```dart
class ValidationException implements Exception {
  final String message;
  ValidationException(this.message);

  @override
  String toString() => 'ValidationException: $message';
}
```

**Custom error (programming mistake, not for catching):**

```dart
class InvariantViolationError extends Error {
  final String description;
  InvariantViolationError(this.description);
}
```

### The Result pattern

When failure is a normal, predictable outcome (not exceptional), model it as an explicit return type. Dart 3's sealed classes make this clean and exhaustive:

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

Result<User> parseUser(Map<String, dynamic> json) {
  try {
    return Ok(User.fromJson(json));
  } on FormatException catch (e) {
    return Err('Invalid user data: ${e.message}');
  }
}

// The caller handles both cases explicitly — the compiler enforces exhaustiveness
switch (parseUser(data)) {
  case Ok(:final value)    => print('User: ${value.name}'),
  case Err(:final message) => print('Failed: $message'),
}
```

### Handling errors in async code

```dart
Future<void> processOrder(String id) async {
  try {
    final order = await fetchOrder(id);
    await submitOrder(order);
  } on NetworkException {
    // retry or show offline message
  } on ValidationException catch (e) {
    log('Invalid order $id: $e');
    rethrow; // propagate with the original stack trace intact
  }
}
```

Use `rethrow` — not `throw e` — to preserve the original stack trace when you want both to log and to propagate.

---

## When to use

- Use `try/catch` at system boundaries: I/O, network calls, JSON parsing, external APIs.
- Use the `Result` pattern when failure is a documented, predictable outcome of an operation (not an exceptional condition).
- Catch specific exception types with `on SpecificException` rather than a bare `catch` — catching everything hides bugs.
- Use `rethrow` when you want to add context logging before letting the exception propagate.

---

## When NOT to use

- Do not catch `Error` subclasses in production — they indicate bugs that need to be fixed, not swallowed.
- Do not use exceptions for normal control flow (e.g., returning early from a search) — use `Result` or nullable return types.
- Do not swallow exceptions silently with an empty `catch {}` block.
- Do not `throw` a plain `String` — always throw an `Exception` or `Error` subclass for meaningful stack traces.

---

## References

- [Error handling — dart.dev](https://dart.dev/language/error-handling)
- [Exceptions — dart.dev](https://dart.dev/language/error-handling#exceptions)
- [Effective Dart: Error handling — dart.dev](https://dart.dev/effective-dart/usage#error-handling)
