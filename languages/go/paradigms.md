# Paradigms in Go

> Go is a multi-paradigm language that supports procedural, object-oriented, functional, and concurrent programming — each with different levels of idiomatic support and trade-offs.

---

## What is it?

A programming paradigm is a style or way of thinking about and structuring code. Most modern languages support more than one paradigm. Go is intentionally **multi-paradigm but opinionated**: it supports several styles, but its design clearly favors some over others.

Understanding which paradigms Go supports — and where each one fits or breaks down — is essential to writing idiomatic Go code.

---

## Why does it matter?

Go was designed by people who had strong opinions about what makes software maintainable. The language does not support certain paradigm features (like class inheritance or tail-call optimization) not by accident, but by deliberate choice. Knowing _why_ shapes how you reason about code structure in Go.

---

## Paradigms supported

### 1. Procedural (primary paradigm)

Go is fundamentally a **procedural language**. Code is organized as functions operating on data. This is the dominant paradigm in Go and the one the standard library is written in.

```go
func calculateTotal(prices []float64, taxRate float64) float64 {
    subtotal := 0.0
    for _, p := range prices {
        subtotal += p
    }
    return subtotal * (1 + taxRate)
}
```

**Pros with Go:**
- Straightforward to read and reason about — execution flows top to bottom
- No hidden state; functions are explicit about their inputs and outputs
- Easy to test: pure functions have no side effects to mock
- Aligns naturally with Go's `error` as return value convention

**Cons with Go:**
- Large programs can become hard to organize without additional structure
- Shared mutable state (e.g., global variables) requires discipline and explicit synchronization
- No built-in mechanism to enforce data encapsulation beyond package-level visibility

---

### 2. Object-Oriented (partial support)

Go does **not** have classes, inheritance, or constructors. However, it supports a form of object-oriented programming through **structs with methods**, **interfaces**, and **struct embedding**.

```go
type Animal struct {
    Name string
}

func (a Animal) Speak() string {
    return a.Name + " makes a sound"
}

type Dog struct {
    Animal        // embedding — not inheritance
    Breed string
}

func (d Dog) Speak() string {
    return d.Name + " barks"
}

// Interface satisfaction is implicit
type Speaker interface {
    Speak() string
}

func describe(s Speaker) {
    fmt.Println(s.Speak())
}
```

**What Go supports from OOP:**
- Encapsulation via exported/unexported identifiers
- Polymorphism via interfaces (structural typing / duck typing)
- Code reuse via struct embedding (not inheritance — no `super`, no method overriding chain)
- Methods on any named type, not just structs

**What Go intentionally omits:**
- Class hierarchies and inheritance
- Constructors (replaced by `NewXxx` factory functions by convention)
- Method overloading
- Abstract classes

**Pros with Go:**
- Interfaces are satisfied implicitly — no coupling between interface definition and implementation
- Composition over inheritance eliminates fragile base class problems
- Polymorphism without a class hierarchy is simpler to refactor
- Any type (including primitives) can have methods, enabling expressive APIs

**Cons with Go:**
- Cannot share behavior via inheritance — must duplicate or extract to a helper
- Embedding is not inheritance: an embedded type's methods do not "override" — they coexist and can shadow
- Verbose when many interface combinations are needed
- Developers from OOP backgrounds often fight the language by trying to replicate class hierarchies

---

### 3. Functional (partial support)

Go supports core functional programming concepts — **functions as first-class values**, **closures**, and **higher-order functions** — but it is not a functional language. It has mutable state, no tail-call optimization, no algebraic data types, and no built-in `map`/`filter`/`reduce` until generics arrived in Go 1.18.

```go
// First-class function
type Predicate func(int) bool

func filter(nums []int, pred Predicate) []int {
    result := []int{}
    for _, n := range nums {
        if pred(n) {
            result = append(result, n)
        }
    }
    return result
}

// Closure capturing state
func counter() func() int {
    n := 0
    return func() int {
        n++
        return n
    }
}

// With generics (Go 1.18+)
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}
```

**What Go supports from FP:**
- First-class and higher-order functions
- Closures with lexical scoping
- Immutability by convention (Go has no `const` for structs, but you can design for it)
- Pure functions (no language enforcement, but a common practice)
- Generic `Map`, `Filter`, `Reduce` since Go 1.18

**What Go intentionally omits:**
- Tail-call optimization (recursive algorithms can overflow the stack)
- Pattern matching (use `switch` instead)
- Monads and algebraic data types
- Immutable data structures (all values are mutable by default)
- Lazy evaluation

**Pros with Go:**
- First-class functions enable clean callback patterns, middleware chains, and Functional Options
- Closures make stateful iterators and deferred computations easy to express
- Higher-order functions reduce boilerplate without requiring a framework
- Generics (1.18+) enable reusable functional utilities without sacrificing type safety

**Cons with Go:**
- No TCO means deep recursion causes stack overflow — iterative solutions are preferred
- Without pattern matching, branching on sum types requires verbose `switch` or type assertions
- Functional pipelines are more verbose than in Haskell or Scala
- Immutability requires discipline — the language does not enforce it

---

### 4. Concurrent (first-class paradigm)

Concurrency is where Go is most distinctive. It implements **CSP (Communicating Sequential Processes)**, a formal model by Tony Hoare where concurrent entities communicate by passing messages through channels rather than sharing memory.

```go
func producer(ch chan<- int, n int) {
    for i := 0; i < n; i++ {
        ch <- i
    }
    close(ch)
}

func consumer(ch <-chan int, results chan<- int) {
    sum := 0
    for v := range ch {
        sum += v
    }
    results <- sum
}

func main() {
    ch := make(chan int, 10)
    results := make(chan int, 1)

    go producer(ch, 100)
    go consumer(ch, results)

    fmt.Println("Sum:", <-results)
}
```

**What Go provides for concurrency:**
- Goroutines: lightweight threads (2–8 KB stack, multiplexed over OS threads)
- Channels: typed message-passing pipes, buffered or unbuffered
- `select`: non-deterministic multi-channel wait
- `sync.Mutex`, `sync.RWMutex`: explicit locking when shared state is unavoidable
- `sync.WaitGroup`: barrier for waiting on a group of goroutines
- `sync.Once`: guaranteed single execution (singleton initialization)
- `sync/atomic`: lock-free atomic operations on integers and pointers
- `context.Context`: cancellation and deadline propagation across goroutines

**Pros with Go:**
- Goroutines are cheap enough to use for every incoming HTTP request
- Channel-based communication eliminates data races without explicit locking
- The Go race detector (`go test -race`) catches race conditions at test time
- `select` makes timeout and cancellation patterns simple and readable
- Concurrency is a language feature, not a library — no callback hell, no promise chains

**Cons with Go:**
- Channel-based design can lead to complex goroutine graphs that are hard to trace
- Goroutine leaks (a goroutine blocked forever on a channel) are a common production issue
- The scheduler is cooperative at safe points — CPU-bound loops can starve other goroutines
- `context` cancellation requires manual propagation — there is no automatic scope-based cancellation
- `select` with many cases can become difficult to reason about

---

## Summary

| Paradigm | Support level | Idiomatic in Go? |
|---|---|---|
| Procedural | Full | Yes — the default style |
| Object-Oriented | Partial (no inheritance) | Yes — via structs + interfaces |
| Functional | Partial (no TCO, no ADTs) | Situational — good for callbacks and options |
| Concurrent (CSP) | First-class | Yes — Go's defining feature |

The idiomatic Go approach is to **default to procedural**, **reach for interfaces when polymorphism is needed**, **use closures and higher-order functions selectively**, and **embrace goroutines and channels for concurrency**.

---

## References

- [Effective Go — Concurrency](https://go.dev/doc/effective_go#concurrency)
- [Go Blog — Share Memory By Communicating](https://go.dev/blog/codelab-share)
- [Go Specification — Interface types](https://go.dev/ref/spec#Interface_types)
- [Go Specification — Function types](https://go.dev/ref/spec#Function_types)
- [Communicating Sequential Processes — C.A.R. Hoare](https://www.cs.cmu.edu/~crary/819-f09/Hoare78.pdf)
- *The Go Programming Language* — Donovan & Kernighan (Addison-Wesley, 2015), Chapter 8
