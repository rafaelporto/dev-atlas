# Concurrency in Go

> Go makes concurrent programming accessible through goroutines and channels, following the CSP model: "Don't communicate by sharing memory; share memory by communicating."

---

## What is it?

Go's concurrency model is built on two primitives: **goroutines** (lightweight concurrent functions) and **channels** (typed communication pipes between goroutines). Together they implement **CSP (Communicating Sequential Processes)**, a formal model where concurrent processes are coordinated by passing messages rather than by locking shared state.

The `sync` package provides lower-level tools (mutexes, wait groups) for cases where shared memory is unavoidable.

---

## Why does it matter?

Concurrency is one of Go's defining features. A single Go server routinely handles tens of thousands of simultaneous requests, each in its own goroutine, at a fraction of the memory cost of OS threads. Understanding how to write correct concurrent code — and how to avoid goroutine leaks, data races, and deadlocks — is essential for any production Go program.

---

## How it works

### Goroutines

A goroutine is a function executing concurrently with other functions in the same address space. It starts with `go`:

```go
func fetch(url string) {
    resp, err := http.Get(url)
    if err != nil {
        log.Println(err)
        return
    }
    defer resp.Body.Close()
    fmt.Println(url, resp.Status)
}

func main() {
    go fetch("https://go.dev")
    go fetch("https://pkg.go.dev")
    time.Sleep(2 * time.Second) // crude — use WaitGroup in production
}
```

Goroutines are multiplexed over OS threads by the Go scheduler (GOMAXPROCS threads by default). Their initial stack is 2–8 KB and grows as needed — unlike OS threads at ~1 MB fixed.

---

### Channels

Channels are typed conduits for passing values between goroutines.

```go
// Unbuffered channel — sender blocks until receiver is ready
ch := make(chan int)

// Buffered channel — sender blocks only when buffer is full
ch := make(chan int, 10)

// Send
ch <- 42

// Receive
v := <-ch

// Close — signals no more values will be sent
close(ch)

// Range over channel until closed
for v := range ch {
    fmt.Println(v)
}
```

**Directional channel types** restrict how a channel can be used, making intent explicit:

```go
func producer(out chan<- int) { // send-only
    for i := 0; i < 5; i++ {
        out <- i
    }
    close(out)
}

func consumer(in <-chan int) { // receive-only
    for v := range in {
        fmt.Println(v)
    }
}
```

---

### Select

`select` waits on multiple channel operations simultaneously, choosing one that is ready. If multiple are ready, it picks one at random.

```go
func merge(ch1, ch2 <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for {
            select {
            case v, ok := <-ch1:
                if !ok {
                    ch1 = nil
                }
                out <- v
            case v, ok := <-ch2:
                if !ok {
                    ch2 = nil
                }
                out <- v
            }
            if ch1 == nil && ch2 == nil {
                return
            }
        }
    }()
    return out
}

// Timeout pattern
select {
case result := <-ch:
    fmt.Println(result)
case <-time.After(5 * time.Second):
    fmt.Println("timed out")
}
```

---

### sync.WaitGroup

Use `WaitGroup` to wait for a collection of goroutines to finish.

```go
func processAll(items []string) {
    var wg sync.WaitGroup

    for _, item := range items {
        wg.Add(1)
        go func(s string) {
            defer wg.Done()
            process(s)
        }(item) // pass item as argument to avoid closure capture bug
    }

    wg.Wait()
}
```

---

### sync.Mutex and sync.RWMutex

Use a mutex when goroutines must share mutable state and channels are not appropriate.

```go
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

func (c *SafeCounter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}

// RWMutex allows multiple concurrent readers, one writer
type Cache struct {
    mu    sync.RWMutex
    store map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.store[key]
    return v, ok
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.store[key] = value
}
```

---

### Fan-out / Fan-in

Fan-out distributes work across multiple goroutines. Fan-in collects their results into a single channel.

```go
func fanOut(input <-chan int, workers int) []<-chan int {
    channels := make([]<-chan int, workers)
    for i := 0; i < workers; i++ {
        channels[i] = worker(input)
    }
    return channels
}

func worker(input <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for v := range input {
            out <- v * v // example: square each value
        }
    }()
    return out
}

func fanIn(channels ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    merged := make(chan int)

    output := func(ch <-chan int) {
        defer wg.Done()
        for v := range ch {
            merged <- v
        }
    }

    wg.Add(len(channels))
    for _, ch := range channels {
        go output(ch)
    }

    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}
```

---

### The race detector

Run tests or the binary with `-race` to detect data races at runtime:

```bash
go test -race ./...
go run -race main.go
```

The race detector adds ~5–10× overhead in CPU and memory but catches races that would be nearly impossible to find by code review.

---

## When to use

- Use goroutines for any work that can proceed independently: I/O operations, request handling, background tasks
- Use channels to communicate results between goroutines and for pipeline stages
- Use `WaitGroup` when you need to wait for a fixed set of goroutines to complete
- Use `Mutex` / `RWMutex` when goroutines share a data structure that channels would make awkward (e.g., a cache)
- Use `select` + `time.After` or `context.Done()` to implement timeouts and cancellation
- Always run `go test -race` in CI

## When NOT to use

- Do not start goroutines without a clear way to stop them — goroutine leaks accumulate silently
- Do not use channels as a general replacement for mutexes when shared state is simpler
- Do not close a channel from the receiver side — only the sender should close
- Do not send to or receive from a nil channel in production code — it blocks forever
- Do not use `time.Sleep` to synchronize goroutines — use channels or `WaitGroup`
- Do not share variables across goroutines without synchronization — even `bool` reads/writes are not atomic

---

## References

- [Go Blog — Share Memory By Communicating](https://go.dev/blog/codelab-share)
- [Go Blog — Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines)
- [Go Blog — Advanced Go Concurrency Patterns](https://go.dev/blog/advanced-go-concurrency-patterns)
- [pkg.go.dev — sync package](https://pkg.go.dev/sync)
- [Go Race Detector](https://go.dev/doc/articles/race_detector)
- *The Go Programming Language* — Donovan & Kernighan, Chapters 8 and 9
