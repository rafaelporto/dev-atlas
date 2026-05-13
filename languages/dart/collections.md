# Collections in Dart

> Dart's core collection types — `List`, `Set`, and `Map` — are generics-first, iterable, and support expressive functional-style operations out of the box.

---

## What is it?

Dart's `dart:core` library provides three primary collection types: **`List<T>`** (ordered, indexed sequence), **`Set<T>`** (unordered collection of unique elements), and **`Map<K, V>`** (key–value pairs). All three implement the `Iterable<T>` interface, making them composable through a shared set of higher-order methods.

---

## Why does it matter?

Collections are the backbone of most application code. Understanding when to use `List` vs `Set` vs `Map`, how to transform them without mutating shared state, and how to leverage Dart's collection literals, spreads, and control-flow operators prevents both performance issues and subtle bugs.

---

## How it works

### List

An ordered, indexable collection. Growable by default.

```dart
final fruits = <String>['apple', 'banana', 'cherry'];
fruits.add('date');
fruits.insert(1, 'avocado');

print(fruits[0]);             // apple
print(fruits.length);         // 5
print(fruits.contains('banana')); // true
```

**Fixed-length list:**

```dart
final fixed = List<int>.filled(3, 0);  // [0, 0, 0]
// fixed.add(1); — UnsupportedError: cannot add to a fixed-length list
```

### Set

An unordered collection with no duplicate elements. Membership tests are O(1).

```dart
final ids = <int>{1, 2, 3, 2, 1};  // {1, 2, 3} — duplicates removed
ids.add(4);
ids.remove(2);

print(ids.contains(3));  // true

// Set operations
final a = {1, 2, 3};
final b = {2, 3, 4};
print(a.intersection(b));  // {2, 3}
print(a.union(b));         // {1, 2, 3, 4}
print(a.difference(b));    // {1}
```

### Map

A key–value store. Keys must be unique; values need not be.

```dart
final scores = <String, int>{'Alice': 95, 'Bob': 80};
scores['Charlie'] = 90;

print(scores['Alice']);               // 95
print(scores['Unknown']);             // null (absent key)
print(scores.containsKey('Bob'));     // true

for (final MapEntry(:key, :value) in scores.entries) {
  print('$key: $value');
}
```

### Spread operator

The spread (`...`) and null-aware spread (`...?`) compose collections without mutating originals:

```dart
final first = [1, 2, 3];
final second = [4, 5];
final combined = [...first, ...second]; // [1, 2, 3, 4, 5]

List<int>? extra;
final safe = [...first, ...?extra]; // [1, 2, 3] — no null error
```

### Collection-if and collection-for

Conditionally or repeatedly include elements directly inside a literal:

```dart
final isAdmin = true;
final menu = [
  'Home',
  'Profile',
  if (isAdmin) 'Admin Panel',
];

final numbers = [1, 2, 3];
final doubled = [for (final n in numbers) n * 2]; // [2, 4, 6]
```

This is especially common in Flutter widget trees.

### Higher-order operations (Iterable API)

```dart
final numbers = [1, 2, 3, 4, 5, 6];

final evens   = numbers.where((n) => n.isEven);          // lazy Iterable
final squares = numbers.map((n) => n * n);               // lazy Iterable
final total   = numbers.reduce((a, b) => a + b);         // 21
final sum     = numbers.fold(0, (acc, n) => acc + n);    // 21
final anyOdd  = numbers.any((n) => n.isOdd);             // true
final allPos  = numbers.every((n) => n > 0);             // true
final first3  = numbers.take(3).toList();                // [1, 2, 3]
final flat    = [[1, 2], [3, 4]].expand((l) => l).toList(); // [1, 2, 3, 4]
```

`where` and `map` return **lazy** iterables — they compute values on demand. Call `.toList()` or `.toSet()` to materialise.

---

## When to use

- Use `List` when order matters or you need indexed access.
- Use `Set` when you need fast membership tests or need to deduplicate elements.
- Use `Map` for key-based lookup.
- Use collection-if / collection-for for building collections declaratively (particularly in Flutter widget trees).
- Use spread operators to merge or compose collections without mutating the originals.

---

## When NOT to use

- Do not use `List.contains` for repeated membership checks on large collections — use a `Set` or `Map` for O(1) lookup.
- Do not materialise large lazy iterables with `.toList()` unless you need random access — keep them lazy.
- Do not use `Map<String, dynamic>` as a substitute for a typed model; define a class or record instead.

---

## References

- [Collections — dart.dev](https://dart.dev/libraries/dart-core#collections)
- [Iterable API — api.dart.dev](https://api.dart.dev/stable/dart-core/Iterable-class.html)
- [Spread operators — dart.dev](https://dart.dev/language/collections#spread-operators)
- [Collection control-flow operators — dart.dev](https://dart.dev/language/collections#control-flow-operators)
