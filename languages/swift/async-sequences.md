---
type: concept
tags: []
related: []
language: "swift"
---
# Async Sequences

> `AsyncSequence` brings `for-await-in` iteration to streams of values produced over time — the async analog of `Sequence`.

---

## What is it?

`AsyncSequence` is a protocol describing a sequence whose elements arrive asynchronously. You consume it with `for await` (or `for try await` for throwing variants):

```swift
for try await line in url.lines {
    print(line)
}
```

The standard library provides:

- **`AsyncSequence`** — the protocol every async stream conforms to
- **`AsyncStream<Element>`** — a concrete bridge for non-throwing producers (callbacks, notifications, delegates)
- **`AsyncThrowingStream<Element, Error>`** — same, but the stream may finish with an error
- Built-in async sequences on `URL`, `URLSession.AsyncBytes`, `FileHandle`, `NotificationCenter.Notifications`, and more

---

## Why does it matter?

Many real systems produce values over time, not all at once: file lines, WebSocket frames, location updates, notifications, key presses, timer ticks. Before `AsyncSequence`, modeling these meant Combine publishers, callback closures, or hand-rolled producer/consumer queues.

`AsyncSequence` gives you a single uniform shape: anything that yields values over time can be consumed with `for await`, composed with combinators from [swift-async-algorithms](https://github.com/apple/swift-async-algorithms), and cancelled by cancelling the consuming task.

---

## How it works

### The protocol

Simplified:

```swift
protocol AsyncSequence {
    associatedtype Element
    associatedtype AsyncIterator: AsyncIteratorProtocol where AsyncIterator.Element == Element
    func makeAsyncIterator() -> AsyncIterator
}

protocol AsyncIteratorProtocol {
    associatedtype Element
    mutating func next() async throws -> Element?
}
```

`next()` is async — it suspends until the next element is available, returns `nil` when the sequence ends, or throws when the sequence terminates with an error.

### Consuming with `for await`

```swift
for try await line in fileHandle.bytes.lines {
    process(line)
}
```

The loop ends when:
- The sequence returns `nil` from `next()` (graceful end)
- The sequence throws (error termination)
- The enclosing task is cancelled

### Cancellation

Cancellation flows naturally: cancelling the task suspends the iterator with a `CancellationError` on the next `await`. Most built-in async sequences honor cancellation; custom ones should check `Task.isCancelled` in their `next()` implementation.

### `AsyncStream` — bridging callbacks

When you need to expose a callback-based source as an async sequence:

```swift
let stream = AsyncStream<Tick> { continuation in
    let timer = startTimer { tick in
        continuation.yield(tick)
    }
    continuation.onTermination = { _ in
        timer.invalidate()
    }
}

for await tick in stream {
    use(tick)
}
```

`onTermination` is called when the stream finishes — either because the consumer stopped iterating or because the producer called `continuation.finish()`.

### `AsyncThrowingStream` — when the source can fail

```swift
let stream = AsyncThrowingStream<Frame, Error> { continuation in
    socket.onFrame = { continuation.yield($0) }
    socket.onError = { continuation.finish(throwing: $0) }
    socket.onClose = { continuation.finish() }
}
```

### Buffering policies

`AsyncStream(bufferingPolicy:)` controls what happens when the consumer is slower than the producer:

| Policy | Behavior |
|---|---|
| `.unbounded` (default) | Grow the buffer indefinitely |
| `.bufferingOldest(n)` | Keep the first `n`, drop new arrivals after that |
| `.bufferingNewest(n)` | Keep the last `n`, drop old |

Pick deliberately — `.unbounded` is a memory leak with a fast producer and a slow consumer.

---

## Examples

### Reading a file line by line

```swift
func processLog(at url: URL) async throws {
    for try await line in url.lines {
        if line.contains("ERROR") {
            print(line)
        }
    }
}
```

### Streaming bytes from a URL

```swift
let (bytes, _) = try await URLSession.shared.bytes(from: url)
var hasher = SHA256()
for try await byte in bytes {
    hasher.update(data: Data([byte]))
}
let digest = hasher.finalize()
```

### Observing `NotificationCenter`

```swift
let notifications = NotificationCenter.default.notifications(named: UIApplication.didBecomeActiveNotification)

Task {
    for await _ in notifications {
        await refreshAll()
    }
}
```

### Bridging a delegate-based API with `AsyncStream`

```swift
final class LocationStream {
    func updates() -> AsyncStream<CLLocation> {
        AsyncStream { continuation in
            let delegate = LocationDelegate { location in
                continuation.yield(location)
            }
            let manager = CLLocationManager()
            manager.delegate = delegate
            manager.startUpdatingLocation()
            continuation.onTermination = { _ in
                manager.stopUpdatingLocation()
            }
        }
    }
}

// Usage
for await location in LocationStream().updates() {
    map.center = location.coordinate
}
```

### Throwing stream from a WebSocket

```swift
extension WebSocketClient {
    func frames() -> AsyncThrowingStream<Frame, Error> {
        AsyncThrowingStream { continuation in
            self.onFrame = { continuation.yield($0) }
            self.onError = { continuation.finish(throwing: $0) }
            self.onClose = { continuation.finish() }
            self.start()
            continuation.onTermination = { _ in
                self.stop()
            }
        }
    }
}
```

### Composing with built-in operators

`AsyncSequence` ships with `map`, `filter`, `prefix`, `dropFirst`, etc.:

```swift
let firstThreeErrors = url.lines
    .filter { $0.contains("ERROR") }
    .prefix(3)

for try await line in firstThreeErrors {
    print(line)
}
```

For richer combinators (`zip`, `merge`, `chunked`, `debounce`, `throttle`), use [swift-async-algorithms](https://github.com/apple/swift-async-algorithms).

---

## When to use

- **Callback-based or delegate APIs** you want to consume linearly with `for await`.
- **Long-lived streams of events** — notifications, websocket frames, file watching, location updates.
- **Reading data incrementally** — line-by-line, byte-by-byte, frame-by-frame.
- **Replacing Combine `Publisher`** in pure Swift code where you don't need its operator richness.
- **Concurrent task fan-in** via `AsyncStream` as a thread-safe queue between producer tasks and a consumer task.

---

## When NOT to use

- **Single-value async work.** Use `async` functions directly — sequences are for multiple values.
- **Synchronous bursts of data.** If everything is already in memory, use a regular `Sequence` and skip the async machinery.
- **Heavy reactive composition.** Combine and third-party reactive libraries still have richer operators (multicast, share, replay subjects). Wait or wrap.
- **`AsyncStream(bufferingPolicy: .unbounded)` without thought** — backpressure problems become memory problems.
- **Replacing a tight inner loop.** Every `await` is a suspension point; an async sequence adds overhead compared to a `for` loop over an `Array`.

---

## References

- [The Swift Programming Language — Concurrency (`for await`)](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Asynchronous-Sequences)
- [`AsyncSequence` — Swift Standard Library](https://developer.apple.com/documentation/swift/asyncsequence)
- [`AsyncStream` — Swift Standard Library](https://developer.apple.com/documentation/swift/asyncstream)
- [Meet AsyncSequence — WWDC 2021](https://developer.apple.com/videos/play/wwdc2021/10058/)
- [swift-async-algorithms (Apple)](https://github.com/apple/swift-async-algorithms)
- [SE-0298 — async/await: Sequences](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0298-asyncsequence.md)
- [SE-0314 — AsyncStream and AsyncThrowingStream](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md)
