---
type: concept
tags:
  - language
  - java
  - concurrency
  - async
  - backend
related:
  - languages/java/error-handling
  - languages/java/collections-and-streams
language: "java"
---
# Concurrency

> Java offers a full stack of concurrency tools — from raw threads and locks to high-level executors, futures, and, since Java 21, lightweight virtual threads that make blocking code scale.

---

## What is it?

Concurrency is running multiple tasks so they make progress in overlapping time periods. Java has supported threads since version 1.0, and its concurrency model has three layers:

1. **Threads and synchronization** — `Thread`, `synchronized`, `volatile`, and the `java.util.concurrent.locks` package.
2. **High-level utilities** — the `java.util.concurrent` package: executors, thread pools, concurrent collections, `CompletableFuture`.
3. **Virtual threads (Project Loom)** — finalized in Java 21; millions of cheap threads that let you write simple blocking code that scales like asynchronous code.

---

## Why does it matter?

Servers handle many requests at once. The traditional model — one OS thread per request — hits a wall: OS threads are expensive (roughly 1 MB of stack each), so a machine can host only a few thousand. To scale further, teams adopted asynchronous, reactive, callback-heavy code that is fast but hard to read, debug, and profile.

Virtual threads change the equation. A virtual thread costs a few hundred bytes; a JVM can run millions. When a virtual thread blocks on I/O, the runtime unmounts it from its carrier OS thread, freeing that thread for other work. You write straightforward blocking code, and it scales like reactive code — with readable stack traces and normal debugging.

---

## How it works

### Threads and the memory model

The lowest level is the platform thread, a thin wrapper over an OS thread. Shared mutable state between threads needs synchronization to avoid data races.

```java
Thread t = new Thread(() -> System.out.println("running in " + Thread.currentThread()));
t.start();
t.join();
```

`synchronized` provides mutual exclusion and establishes happens-before ordering; `volatile` guarantees visibility of a field across threads without mutual exclusion.

```java
class Counter {
    private int count = 0;
    synchronized void increment() { count++; }   // atomic under the lock
    synchronized int get() { return count; }
}
```

Prefer the classes in `java.util.concurrent.atomic` over manual locking for simple counters:

```java
var count = new java.util.concurrent.atomic.AtomicInteger();
count.incrementAndGet();
```

### Executors — do not manage threads by hand

An `ExecutorService` decouples task submission from thread management. This is the standard way to run background work.

```java
try (var executor = Executors.newFixedThreadPool(4)) {
    Future<Integer> future = executor.submit(() -> expensiveComputation());
    int result = future.get();   // blocks until done
}
// try-with-resources shuts the executor down (Java 19+)
```

### CompletableFuture — composing async work

`CompletableFuture` represents a value that will arrive later and lets you chain transformations without blocking.

```java
CompletableFuture
    .supplyAsync(() -> fetchUser(id))
    .thenApply(User::email)
    .thenCompose(email -> sendWelcomeAsync(email))
    .exceptionally(ex -> {
        log.error("welcome flow failed", ex);
        return null;
    });
```

| Method | Purpose |
|---|---|
| `supplyAsync` | Start async work producing a value |
| `thenApply` | Transform the result (sync function) |
| `thenCompose` | Chain another async call (flat-map) |
| `thenCombine` | Combine two independent futures |
| `exceptionally` / `handle` | Recover from failures |

### Virtual threads (Java 21)

A virtual thread is a `java.lang.Thread` that is scheduled by the JVM, not the OS. Create one per task — do not pool them.

```java
// One virtual thread per task; blocking I/O inside is cheap
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (var request : requests) {
        executor.submit(() -> handle(request)); // may block on I/O freely
    }
}
```

```java
// Direct creation
Thread.ofVirtual().name("worker-1").start(() -> doWork());
```

The mental shift: **virtual threads represent tasks, not resources to be pooled.** Blocking a virtual thread is fine — the runtime unmounts it. Pooling them defeats the purpose.

---

## Examples

### Fan-out and gather with virtual threads

```java
List<String> urls = List.of("https://a", "https://b", "https://c");

try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = urls.stream()
            .map(url -> executor.submit(() -> httpClient.get(url)))
            .toList();

    List<String> bodies = new ArrayList<>();
    for (var f : futures) {
        bodies.add(f.get()); // gather results
    }
}
```

### Concurrent collections

For shared state accessed by many threads, use the purpose-built collections instead of synchronizing a plain `HashMap`.

```java
var cache = new ConcurrentHashMap<String, Integer>();
cache.merge("hits", 1, Integer::sum); // atomic increment, no explicit lock
```

### Coordinating with a CountDownLatch

```java
var latch = new CountDownLatch(3);
for (int i = 0; i < 3; i++) {
    new Thread(() -> {
        doWork();
        latch.countDown();
    }).start();
}
latch.await(); // blocks until all three finish
```

---

## When to use

- **Executors** — for any background or parallel task; never spawn raw threads in application code.
- **`CompletableFuture`** — for composing dependent asynchronous operations (call A, then B with A's result).
- **Virtual threads** — for high-concurrency, I/O-bound workloads (web servers, API aggregators) where you want simple blocking code that scales.
- **Concurrent collections and atomics** — whenever shared state is read and written by multiple threads.

---

## When NOT to use

- **Do not pool virtual threads** — create one per task; pooling reintroduces the limits they were designed to remove.
- **Virtual threads do not speed up CPU-bound work** — they help I/O-bound throughput, not raw computation; use a sized pool sized to CPU cores for CPU-bound tasks.
- **Avoid `synchronized` blocks that hold a lock across long blocking calls on virtual threads** — this can pin the carrier thread; prefer `ReentrantLock` in those spots.
- **Do not share mutable state without synchronization** — data races produce nondeterministic, hard-to-reproduce bugs.
- **Avoid manual `Thread` management** when an executor expresses the intent more safely.

---

## References

- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [Virtual Threads — Oracle Core Libraries guide](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html)
- [java.util.concurrent — API docs](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)
- [The Java Tutorials — Concurrency](https://docs.oracle.com/javase/tutorial/essential/concurrency/index.html)
- *Java Concurrency in Practice* — Brian Goetz et al. (Addison-Wesley, 2006)
