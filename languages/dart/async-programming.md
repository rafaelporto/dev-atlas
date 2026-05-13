# Async Programming in Dart

> Dart's `async`/`await`, `Future`, and `Stream` provide a structured, composable model for handling asynchronous operations without callback pyramids.

---

## What is it?

Asynchronous programming in Dart is built on three primitives: **`Future<T>`** (a single value that will be available later), **`Stream<T>`** (a sequence of values delivered over time), and **`async`/`await`** (syntax for writing async code that reads like synchronous code). All three are backed by Dart's single-threaded event loop.

---

## Why does it matter?

Dart runs in a single-threaded event loop — there is no blocking I/O. Every file read, HTTP request, and database query returns a `Future` or `Stream`. Understanding this model is mandatory for writing correct Dart applications; misuse leads to either blocking the event loop or silently missing errors.

---

## How it works

### The event loop

Dart's runtime processes two queues: the **microtask queue** (high-priority, empties completely between events) and the **event queue** (I/O callbacks, timers, user events). `Future.microtask` schedules on the microtask queue; most I/O and `Timer` callbacks schedule on the event queue.

```
Event loop cycle:
  1. Process ALL pending microtasks
  2. Process ONE event from the event queue
  3. Repeat
```

### Future

A `Future<T>` represents a value of type `T` that will complete at some point — either with a value or with an error.

```dart
Future<String> fetchGreeting() async {
  await Future.delayed(Duration(milliseconds: 100));
  return 'Hello, Dart!';
}
```

**Consuming a Future — preferred (async/await):**

```dart
Future<void> main() async {
  final greeting = await fetchGreeting();
  print(greeting);
}
```

**Consuming a Future — callback style (for integration with non-async code):**

```dart
fetchGreeting()
    .then((value) => print(value))
    .catchError((Object error) => print('Error: $error'));
```

**Running independent Futures in parallel:**

```dart
final results = await Future.wait([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3),
]);
```

### async / await

Any function marked `async` implicitly returns a `Future`. `await` suspends the function until the `Future` completes — without blocking the event loop thread.

```dart
Future<User> loadUser(int id) async {
  final response = await http.get(Uri.parse('/users/$id'));
  if (response.statusCode != 200) {
    throw HttpException('Failed to load user $id');
  }
  return User.fromJson(jsonDecode(response.body));
}
```

### Stream

A `Stream<T>` emits zero or more values of type `T` over time, then optionally completes or errors. Use `async*` and `yield` to produce streams lazily:

```dart
Stream<int> counter(int max) async* {
  for (int i = 0; i < max; i++) {
    await Future.delayed(Duration(seconds: 1));
    yield i;
  }
}

Future<void> main() async {
  await for (final value in counter(5)) {
    print(value); // 0, 1, 2, 3, 4
  }
}
```

**Stream transformations (lazy):**

```dart
final stream = counter(10)
    .where((n) => n.isEven)
    .map((n) => 'value: $n');

stream.listen(print);
```

**StreamController — create a stream programmatically:**

```dart
final controller = StreamController<String>.broadcast();

controller.sink.add('first');
controller.sink.add('second');

controller.stream.listen(print);

await controller.close();
```

Use `.broadcast()` when multiple listeners need to subscribe to the same stream.

### Error handling in async code

```dart
Future<User> getUser(int id) async {
  try {
    return await fetchUser(id);
  } on SocketException {
    throw NetworkException('No internet connection');
  } on HttpException catch (e) {
    throw DataException('Server error: ${e.message}');
  }
}
```

Use `rethrow` (not `throw e`) to preserve the original stack trace when re-throwing.

---

## When to use

- Use `Future` for operations that produce a single result asynchronously (HTTP requests, file reads, DB queries).
- Use `Stream` for operations that produce multiple values over time (WebSocket messages, file lines, UI events, sensors).
- Use `Future.wait` to run independent async operations in parallel and collect all results.
- Use `async*` / `yield` when generating a sequence of values lazily.
- Use `StreamController.broadcast()` when multiple listeners need to observe the same event source.

---

## When NOT to use

- Do not use `Future` when the computation is synchronous — a plain function is clearer.
- Do not use `Stream` for a single-value async operation — use `Future`.
- Do not use `Completer` unless integrating with a callback-based legacy API; `async`/`await` covers the vast majority of cases.
- Do not ignore errors from a `Future` — unhandled Future errors produce silent failures in production.

---

## References

- [Asynchronous programming: futures, async, await — dart.dev](https://dart.dev/libraries/async/async-await)
- [Creating streams in Dart — dart.dev](https://dart.dev/libraries/async/creating-streams)
- [Using streams — dart.dev](https://dart.dev/libraries/async/using-streams)
- [dart:async library — api.dart.dev](https://api.dart.dev/stable/dart-async/dart-async-library.html)
