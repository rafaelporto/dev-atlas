# SOLID

> Five design principles that, together, describe how to structure code so that it stays cheap to change as it grows.

---

## What is it?

SOLID is an acronym for five design principles aimed at producing software that is easier to maintain, extend, and reason about. The five principles are:

- **S** — [Single Responsibility Principle (SRP)](single-responsibility.md)
- **O** — [Open/Closed Principle (OCP)](open-closed.md)
- **L** — [Liskov Substitution Principle (LSP)](liskov-substitution.md)
- **I** — [Interface Segregation Principle (ISP)](interface-segregation.md)
- **D** — [Dependency Inversion Principle (DIP)](dependency-inversion.md)

The acronym was coined by Michael Feathers, but the principles themselves were collected and named by Robert C. Martin (Uncle Bob) in the late 1990s and early 2000s, building on earlier work by Bertrand Meyer (OCP), Barbara Liskov (LSP), and others. They were popularized in *Agile Software Development: Principles, Patterns, and Practices* (2002) and later restated in *Clean Architecture* (2017).

Although the principles were formulated in an object-oriented context, the underlying ideas — separating reasons to change, depending on abstractions, designing for substitution — are not tied to classes or inheritance. They survive translation to functional programming, dynamically typed languages, and modular procedural code.

---

## Why does it matter?

Software is read and modified far more often than it is written. The cost of a system, over its lifetime, is dominated by *change*, not by the initial implementation. SOLID exists to attack the structures that make change expensive:

- **Rigidity** — a small change ripples through many unrelated parts of the code. SRP and DIP attack this by isolating reasons to change and decoupling layers.
- **Fragility** — a change in one place breaks something seemingly unrelated. LSP attacks this by enforcing contracts between abstractions and their implementations.
- **Immobility** — useful parts of the system cannot be reused because they are entangled with the rest. ISP and DIP attack this by reducing surface area and reversing direction of dependencies.
- **Viscosity** — doing the right thing is harder than the quick hack. OCP attacks this by making extension the path of least resistance.

The five principles are mutually reinforcing. Code that violates one usually violates several. Code that respects all five tends to be small modules with narrow interfaces, depending on abstractions rather than concrete implementations, with behavior added by composition rather than modification.

---

## How it works

The principles can be grouped by what they constrain:

```
┌───────────────────────────────────────────────────────────────┐
│  SHAPE OF A MODULE                                            │
│                                                               │
│    SRP  — one reason to change                                │
│    OCP  — closed to modification, open to extension           │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│  RELATIONSHIPS BETWEEN MODULES                                │
│                                                               │
│    LSP  — subtype honors the contract of its supertype        │
│    ISP  — depend only on what you use                         │
│    DIP  — both sides depend on an abstraction in the middle   │
└───────────────────────────────────────────────────────────────┘
```

- **SRP and OCP** govern the *internal shape* of a module: what it does, and how it changes.
- **LSP, ISP, and DIP** govern *relationships between modules*: how they connect, what they expect from each other, and which direction the dependencies point.

A common path through the principles when refactoring is: notice an SRP violation (too many reasons to change in one place), split it apart, find that the new pieces need to talk through abstractions (DIP), find that those abstractions are too wide (ISP), and finally enforce the contracts so substitution is safe (LSP). OCP usually emerges as a consequence of having gotten the other four right.

---

## Stack-agnostic: SOLID is not just OOP

The principles are commonly taught with class diagrams and inheritance hierarchies, which gives the impression they apply only to "classical" OO languages like Java or C#. They do not. The underlying ideas appear in every paradigm — only the mechanism changes.

### In functional programming

- **SRP** — small, single-purpose functions; modules grouped by responsibility, not by data shape.
- **OCP** — open recursion, higher-order functions, and discriminated unions (with explicit pattern matches) let new cases be added without modifying existing logic. The "expression problem" is exactly this principle.
- **LSP** — type classes (Haskell), traits (Rust), protocols (Swift) all encode contracts that implementations must honor. A poorly behaved instance of `Monad` violates LSP just as a poorly behaved subclass does.
- **ISP** — small type classes / protocols composed via constraints, rather than one giant interface.
- **DIP** — pass functions as arguments (function injection), or parameterize modules over abstractions (functors in ML, type classes in Haskell). The reader monad is a generalization of dependency inversion.

### In dynamically typed languages

Duck typing makes interfaces implicit, but the principles still apply:

- An object that "quacks like a duck" must keep quacking the same way across substitutions — LSP under another name.
- A function that uses `obj.read()` and `obj.write()` depends on a narrow informal interface — ISP without the keyword.
- Injecting a dependency as a constructor argument or function parameter expresses DIP regardless of whether the language has interfaces.

### In Go and structural typing

Go has no inheritance and no explicit `implements`. Interfaces are satisfied implicitly by any type whose method set matches. This makes ISP and DIP particularly natural — interfaces tend to be small (often one or two methods), and they are defined by the *consumer*, not the producer. The principle "accept interfaces, return structs" is a direct application of DIP without ever using the word.

The point: **SOLID is about how code is structured, not about what keywords the language provides.** A poorly factored Haskell program can violate every principle; a well-factored shell script can respect them.

---

## Examples

The examples live in each principle's article — every article uses a single concrete scenario, shown both violating and respecting the principle, in TypeScript, Go, Swift, Dart (Flutter), and C#.

Start with the principle you find most often broken in your own code:

- If your classes are large and a small change ripples everywhere → [SRP](single-responsibility.md).
- If adding a new case requires editing a long `switch` → [OCP](open-closed.md).
- If a subclass surprises you by breaking something the base class promised → [LSP](liskov-substitution.md).
- If your interfaces have methods that some implementations throw on or no-op → [ISP](interface-segregation.md).
- If your business logic imports a database driver directly → [DIP](dependency-inversion.md).

---

## Criticism and alternatives

SOLID is widely taught, but it is not above criticism. Engineers who have worked with the principles for decades often disagree about how strictly to apply them, and a body of thoughtful pushback has grown alongside them.

### Common critiques

- **Vague at the edges.** "One reason to change" (SRP) is famously hard to pin down. What counts as a reason? What counts as one? Different teams reach different decompositions of the same problem and each can defend its choice with SRP.
- **Encourages over-engineering.** Mechanical application — extracting an interface for every class, splitting every module into the smallest possible piece — produces codebases that are hard to read because the *behavior* is fragmented across too many files. The principles are heuristics for *resisting decay*, not a generator of structure from scratch.
- **OOP-centric formulation.** The original statements assume classes, inheritance, and explicit interfaces. Translating them to FP or to small scripts requires interpretation, which means the principles can be stretched to "justify" almost any decision after the fact.
- **Misapplied to small problems.** A 200-line CLI tool does not need five layers of indirection. SOLID pays off when code *will* change repeatedly across years; it taxes code that will not.

### Alternatives and complements

- **CUPID** — Dan North proposes five properties (*Composable, Unix-philosophy, Predictable, Idiomatic, Domain-based*) framed as a positive vision rather than principles. CUPID describes what *joyful code* looks like, where SOLID describes how to avoid *painful code*. See [CUPID — for joyful coding](https://dannorth.net/cupid-for-joyful-coding/).
- **DRY, KISS, YAGNI** — older heuristics that still hold their ground. They overlap with SOLID but emphasize *not writing code* (KISS, YAGNI) where SOLID emphasizes *structuring code well*.
- **Tell, Don't Ask** and the **Law of Demeter** — narrower object-design rules that often surface the same problems SOLID catches, but at the call-site level.
- **Functional core, imperative shell** — a structural alternative for systems where state and IO can be clearly separated. Often satisfies DIP and SRP as a side effect.

The right disposition is to treat SOLID as a *vocabulary for reasoning about design*, not a *rulebook to be obeyed*. When a principle and the code disagree, the principle is often right — but not always.

---

## When to use

- When a codebase is expected to live and evolve for years, and design decisions made today will be paid for over that lifetime.
- When pair-reviewing or refactoring: the principles give you precise words for what feels wrong about a piece of code.
- When choosing between two designs that both "work": the one closer to SOLID will usually be cheaper to change six months from now.
- When teaching design: the five principles are a compact entry point into a much larger conversation about cohesion, coupling, and abstraction.

## When NOT to use

- As a checklist applied to small scripts, throwaway prototypes, or code that will plausibly not be touched again.
- As a substitute for understanding the domain. A SOLID violation in code that models the wrong thing is the smaller problem.
- To justify creating one interface per class "for testability" — mocks become trivial but the code becomes harder to read. Prefer testing through real collaborators when possible; see [TDD](../tdd.md).
- When the rule and the reality conflict. If your "violation" makes the code clearer to a human reader and the alternative is theatre, the principle is the one that should bend.

---

## References

- Robert C. Martin — *Clean Architecture: A Craftsman's Guide to Software Structure and Design* (2017), chapters 7–11.
- Robert C. Martin — *Agile Software Development: Principles, Patterns, and Practices* (2002).
- Robert C. Martin — [The Principles of OOD](http://butunclebob.com/ArticlesByUncleBob.PrinciplesOfOod), original collected articles.
- Sandi Metz — *Practical Object-Oriented Design in Ruby* (POODR), 2nd edition. A pragmatic re-reading of OO design with strong overlap with SOLID.
- Dan North — [CUPID — for joyful coding](https://dannorth.net/cupid-for-joyful-coding/). A modern alternative framing.
- Barbara Liskov, Jeannette Wing — [A Behavioral Notion of Subtyping](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf), ACM TOPLAS, 1994. Original formal statement of LSP.
- Bertrand Meyer — *Object-Oriented Software Construction*, 2nd edition (1997). Original source of OCP and Design by Contract.
