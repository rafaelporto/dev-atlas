---
type: concept
tags:
  - language
  - java
  - backend
related:
  - languages/java/paradigms
  - languages/java/types-and-generics
language: "java"
---
# Collections and Streams

> The Collections Framework provides Java's core data structures, and the Stream API layers a declarative, functional pipeline over them for filtering, mapping, and aggregating data.

---

## What is it?

The **Java Collections Framework** is the standard library's set of interfaces and implementations for grouping objects — lists, sets, maps, queues — under a unified API rooted at `Collection` and `Map`.

The **Stream API** (Java 8+) is a separate abstraction for processing sequences of elements. A stream is not a data structure; it is a pipeline of operations (`filter`, `map`, `reduce`) that reads from a source, transforms elements lazily, and produces a result. Together they cover most in-memory data manipulation in Java.

---

## Why does it matter?

Nearly every Java program stores and transforms collections of data. Knowing which collection to reach for — `ArrayList` vs `LinkedList`, `HashMap` vs `TreeMap` — directly affects correctness and performance. Choosing wrong (e.g. calling `contains` repeatedly on a `List` instead of a `Set`) turns linear operations into quadratic ones.

Streams matter because they replace verbose, error-prone loops with readable pipelines. A three-stage loop with an accumulator becomes `stream().filter(...).map(...).collect(...)`, and the intent is obvious. Streams also unlock effortless parallelism for large datasets.

---

## How it works

### The collection hierarchy

```
Iterable
 └─ Collection
     ├─ List   (ordered, indexed, allows duplicates)   → ArrayList, LinkedList
     ├─ Set    (no duplicates)                          → HashSet, LinkedHashSet, TreeSet
     └─ Queue  (FIFO/LIFO)                              → ArrayDeque, PriorityQueue

Map (key → value, not a Collection)                     → HashMap, LinkedHashMap, TreeMap
```

Choosing the right implementation:

| Need | Use | Why |
|---|---|---|
| Indexed access, iteration | `ArrayList` | O(1) random access, cache-friendly |
| Frequent insert/remove at ends | `ArrayDeque` | Faster than `LinkedList` in practice |
| Unique elements, fast lookup | `HashSet` | O(1) `contains` |
| Unique elements, sorted | `TreeSet` | O(log n), maintains order |
| Key/value, fast lookup | `HashMap` | O(1) average get/put |
| Key/value, sorted keys | `TreeMap` | Sorted iteration, range queries |
| Insertion-order iteration | `LinkedHashMap` | Predictable iteration order |

### Immutable factory methods

Since Java 9, `List.of`, `Set.of`, and `Map.of` create compact, immutable collections.

```java
List<String> colors = List.of("red", "green", "blue"); // immutable
Map<String, Integer> ages = Map.of("Ann", 30, "Bob", 25);
```

### Streams — the pipeline model

A stream pipeline has three parts: a **source**, zero or more **intermediate operations** (lazy), and one **terminal operation** (triggers evaluation).

```java
List<String> names = List.of("Ann", "Bob", "Charlie", "Dan");

List<String> result = names.stream()   // source
    .filter(n -> n.length() > 3)        // intermediate (lazy)
    .map(String::toUpperCase)           // intermediate (lazy)
    .sorted()                           // intermediate (lazy)
    .collect(Collectors.toList());      // terminal (eager)
// [CHARLIE]
```

Intermediate operations do nothing until a terminal operation runs — the pipeline is evaluated in a single pass where possible.

Common operations:

| Operation | Kind | Purpose |
|---|---|---|
| `filter(Predicate)` | intermediate | Keep matching elements |
| `map(Function)` | intermediate | Transform each element |
| `flatMap(Function)` | intermediate | Flatten nested streams |
| `sorted` / `distinct` / `limit` | intermediate | Order, dedupe, truncate |
| `collect(Collector)` | terminal | Accumulate into a collection or summary |
| `reduce` | terminal | Fold to a single value |
| `forEach` | terminal | Side effect per element |
| `count` / `anyMatch` / `findFirst` | terminal | Aggregate / short-circuit |

### Collectors

`Collectors` provides ready-made accumulation strategies.

```java
// Group employees by department
Map<String, List<Employee>> byDept = employees.stream()
    .collect(Collectors.groupingBy(Employee::department));

// Average salary per department
Map<String, Double> avgSalary = employees.stream()
    .collect(Collectors.groupingBy(
        Employee::department,
        Collectors.averagingDouble(Employee::salary)));

// Join names into a single string
String names = employees.stream()
    .map(Employee::name)
    .collect(Collectors.joining(", ", "[", "]"));
```

---

## Examples

### Reduce vs specialized streams

```java
// Sum with a primitive stream (avoids boxing)
int total = orders.stream()
    .mapToInt(Order::quantity)
    .sum();

// General reduction
Optional<Order> largest = orders.stream()
    .reduce((a, b) -> a.total() > b.total() ? a : b);
```

### flatMap for nested structures

```java
List<Order> orders = customers.stream()
    .flatMap(customer -> customer.orders().stream())
    .toList();
```

### Parallel stream for large, CPU-bound work

```java
long count = hugeList.parallelStream()
    .filter(this::isExpensiveCheck)
    .count();
```

Use `parallelStream()` only for large datasets with independent, CPU-bound work — for small collections the overhead outweighs the benefit.

---

## When to use

- **Collections** — always; they are the backbone of in-memory data handling.
- **Streams** — for multi-step transformations (filter → map → aggregate) where a pipeline reads more clearly than a loop.
- **`Collectors.groupingBy` / `partitioningBy`** — for grouping and summarizing data in one pass.
- **Immutable `List.of` / `Map.of`** — for constants and defensive copies.
- **Primitive streams** (`IntStream`, `LongStream`) — in numeric hot paths to avoid boxing.

---

## When NOT to use

- **Do not use a stream where a simple loop is clearer** — a single `forEach` with a side effect is often just a `for` loop dressed up.
- **Avoid stateful lambdas in streams** — modifying external variables from a stream breaks with parallelism and hides intent.
- **Do not reuse a stream** — a stream can be consumed only once; a second terminal operation throws `IllegalStateException`.
- **Do not reach for `parallelStream()` by default** — it helps only large, CPU-bound, independent workloads.
- **Do not use `LinkedList` as a default list** — `ArrayList` is faster for almost every real workload.

---

## References

- [The Java Tutorials — Collections](https://docs.oracle.com/javase/tutorial/collections/index.html)
- [java.util.stream — package summary](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html)
- [Processing Data with Java Streams — dev.java](https://dev.java/learn/api/streams/)
- *Effective Java* — Joshua Bloch (3rd ed., Addison-Wesley, 2018), Chapter 7: Lambdas and Streams
