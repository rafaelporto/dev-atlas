---
type: concept
tags: []
related: []
language: null
---
# Pragmatic Principles — Overview

> Four heuristics that broadly aim in the same direction — code that survives change — but disagree, sharply, on *how* to get there.

---

## What are they?

- **[DRY](dry.md)** — *Don't Repeat Yourself*. Coined by Andy Hunt and Dave Thomas in *The Pragmatic Programmer* (1999). The original statement is more careful than the bumper-sticker version: *"Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."* DRY is about **knowledge**, not lines of code.
- **[KISS](kiss.md)** — *Keep It Simple, Stupid*. Attributed to Kelly Johnson, head of Lockheed's Skunk Works, in the 1960s. The original context was aerospace engineering: a jet fighter had to be repairable by an average mechanic in a combat zone with simple tools. The principle migrated to software with the same intent: **the simpler design is almost always the better one**.
- **[YAGNI](yagni.md)** — *You Aren't Gonna Need It*. From Extreme Programming, popularized by Ron Jeffries and Kent Beck in the late 1990s. The claim: **don't build a feature, abstraction, or extension point until a real, current need demands it.** Speculative generality is a tax.
- **[Fail Fast](fail-fast.md)** — *Crash Early, Crash Loud*. From Hunt and Thomas, *The Pragmatic Programmer* (1999), Tip 32 *"Crash Early"*, and Jim Shore's standalone article *Fail Fast* (IEEE Software, 2004). The claim: **when something is wrong, halt as close to the cause as possible — don't propagate, don't recover, don't guess a default**. A dead program does much less damage than a crippled one.

The four sit together because they share a posture — *honesty in code* — but they attack different sources of dishonesty. DRY attacks duplicated knowledge. KISS attacks gratuitous complexity. YAGNI attacks speculative work. Fail Fast attacks failure that travels.

---

## How they relate

The four principles overlap in the kind of code they discourage, but they have distinct centers of gravity.

```
        ┌─────────────────────────────────────┐
        │            What to avoid            │
        └─────────────────────────────────────┘

        DRY        ──►   duplicated knowledge
                          (the same rule
                           encoded in two places)

        KISS       ──►   gratuitous complexity
                          (clever where dull
                           would do)

        YAGNI      ──►   speculative work
                          (code for needs that
                           haven't arrived yet)

        FAIL FAST  ──►   propagated failure
                          (silent state corruption
                           that survives across
                           module boundaries)
```

A piece of code can violate any one, several, or all four at once. A premature plugin architecture for a 50-line script violates KISS (too complex) *and* YAGNI (extension was speculative). A `BaseService` class abstracting three superficially-similar methods violates DRY (badly applied) by creating a wrong abstraction, while *also* violating YAGNI (the generality was hypothetical). A `try { ... } catch { return null; }` around the whole module violates Fail Fast (the bug is hidden) *and* KISS (the catch-all is more complex than letting the call fail) — and almost always *also* violates YAGNI (the "recovery" is for a failure mode nobody asked for).

The principles are friends much more often than they are enemies. The interesting case is when they disagree.

---

## Tensions between them

This is the part that matters in practice — and the part rarely covered in introductory material.

### DRY vs KISS

Removing duplication often *adds* indirection: a new abstraction, a new module, a new parameter. When the original code was three nearly-identical six-line functions, the "DRY" version may be a single function with four boolean flags, a strategy interface, and a registry. The deduplicated code is *more complex* than what it replaced.

Sandi Metz's well-known summary applies: **duplication is far cheaper than the wrong abstraction**. A tiny amount of repetition is almost always easier to read and easier to change than a premature shared abstraction. DRY is right about *real* duplicated knowledge; KISS is right that not all surface similarity is duplicated knowledge.

### YAGNI vs DIP / OCP

[SOLID](../solid/README.md) — particularly DIP and OCP — recommends inserting abstractions between policy and detail, so the system can grow by extension rather than modification. YAGNI says: don't build the abstraction until you need it. Both views have weight.

The pragmatic reading: introduce the abstraction **on the second or third occurrence of real need**, not on the first imagined one. The "rule of three" — wait until three similar cases exist before extracting a shared abstraction — is YAGNI's compromise with OCP. The book *Refactoring* makes exactly this argument: refactor to patterns once the duplication has *taught you the shape* of the abstraction, not before.

### KISS vs YAGNI

These two almost always agree, but there is a subtle conflict: the *simplest* solution today sometimes forecloses a known-near-future need. A flat function that hard-codes "USD" is simpler than one that accepts a currency parameter — but if you already know you ship to three countries next quarter, hard-coding USD is not *simple*, it is *incomplete*.

The right reading of KISS is "as simple as possible, *but no simpler*". The right reading of YAGNI is "for needs that haven't arrived yet". Both leave room for current, real, near-term requirements.

### Fail Fast vs the other three

Fail Fast is the most recent addition to the family, and it has a recognizable tension with each of the others — usually because explicit failure handling *looks like* code that could be deleted.

- **vs YAGNI.** A parser that rejects malformed input with a typed error is more code than one that coerces missing fields to zero. YAGNI, naïvely applied, would prefer the shorter version. The corrective: validation at a trust boundary is **current, real work** — the boundary exists today, untrusted input arrives today, and silent coercion is a present bug. YAGNI restrains *speculative* generality, not *current* honesty.
- **vs KISS.** A try/catch that swallows every exception and returns a default looks *easier* than a function that throws on bad input — but it is not *simpler*, because it shifts the problem into the caller's downstream code where it will surface in a worse shape. The genuinely simple design is the one that doesn't swallow.
- **vs DRY.** Repeating "validate at every boundary" can feel like duplication — three handlers each parsing-and-rejecting a similar payload. The corrective is the same as the [wrong abstraction](dry.md#the-wrong-abstraction--drys-most-expensive-mistake) rule applied to validators: superficially similar parsers for *different boundaries* are not duplicated knowledge. Unify them only when they validate the same domain rule.

A useful instinct: when removing fail-fast code feels like a KISS or YAGNI win, ask *who sees the failure if it isn't this code*. If the answer is "a customer", the code stays.

---

## Relation to SOLID

The two sets of principles sit at different altitudes:

- **DRY, KISS, YAGNI** are *coding-level heuristics*. They show up in the diff of a 30-minute change.
- **SOLID** principles are *module-level design rules*. They show up in the shape of files, packages, and boundaries.

They are complementary, not redundant. A SOLID codebase that ignores DRY/KISS/YAGNI tends to be **over-engineered**: every class has its interface, every variation has its strategy, and the simplest path through the code passes through six files. A DRY/KISS/YAGNI codebase that ignores SOLID tends to be **rigid**: simple and terse, but every change ripples through unrelated code because nothing was separated by responsibility.

The right disposition: SOLID guides where you place *boundaries*, DRY/KISS/YAGNI guide what you put on either side of them.

The [SOLID overview](../solid/solid.md) section on criticism specifically notes that the pragmatic heuristics counterbalance SOLID's pull toward abstraction. Holding both sets in mind is what produces designs that age well.

---

## Choosing between them

When the four pull in different directions, the practical tiebreakers — in roughly the order most engineers find useful:

1. **YAGNI wins over speculation.** If the only reason to add something is a hypothetical future, drop it.
2. **KISS wins over cleverness.** If two designs both meet today's needs and one is meaningfully simpler, take it.
3. **DRY wins over re-encoding the same rule in two places.** If a *single piece of knowledge* — a tax rate, an invariant, a domain calculation — has two representations that must stay in sync, unify them.
4. **DRY loses to KISS when the "duplication" is superficial.** Six lines of code that look alike but exist for different reasons are not the same knowledge.
5. **Fail Fast wins whenever the alternative is silent propagation.** If the only way to "simplify" or "deduplicate" is to swallow a failure that would otherwise surface near its cause, the simplification is a bug factory. Keep the explicit failure.

A useful posture: prefer **straightforward and slightly repetitive** over **clever and dry**, until the same change has had to be made in three places — and prefer **loud at the boundary** over **quiet recovery in the middle**, every time.

---

## When to invoke these principles

- During code review, when something feels overbuilt or under-built.
- During design discussions, as common vocabulary for *why* a proposal feels wrong.
- During refactoring, to decide whether to extract or to leave duplication alone.
- When mentoring: these are some of the shortest, most quotable principles in software — easy to teach, hard to internalize.

## When NOT to lean on them

- As a substitute for understanding the domain. Code that satisfies all four but models the wrong problem is still wrong.
- As justification for ignoring real architectural concerns. "YAGNI" is not a defense for not thinking ahead about contracts or data migration.
- As a rule applied without context. The principles are *forces*, not laws. Weight them against each other and against the specifics of the system.

---

## References

- Andrew Hunt, David Thomas — *The Pragmatic Programmer*, 20th Anniversary Edition (2019). Origin of DRY; also Tip 32 *"Crash Early"*, the original framing of Fail Fast.
- Kent Beck — *Extreme Programming Explained: Embrace Change*, 2nd ed. (2004). Origin of YAGNI in software.
- Jim Shore — [*Fail Fast*](https://martinfowler.com/ieeeSoftware/failFast.pdf), IEEE Software, September/October 2004. The canonical standalone article on the principle.
- Sandi Metz — [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction), 2016. The single most important corrective to naive DRY.
- Martin Fowler — [Yagni](https://martinfowler.com/bliki/Yagni.html), 2015. Presumptive vs incremental feature distinction.
- Rich Hickey — [Simple Made Easy](https://www.infoq.com/presentations/Simple-Made-Easy/), Strange Loop 2011. The distinction between *simple* and *easy* that underpins a serious reading of KISS.
- Fred Brooks — *No Silver Bullet: Essence and Accidents of Software Engineering* (1986). Essential vs accidental complexity.
- John Gall — *Systemantics* (1975). Source of *Gall's Law*: complex systems that work evolve from simple ones that worked.
- Dan North — [CUPID — for joyful coding](https://dannorth.net/cupid-for-joyful-coding/). Modern alternative framing that overlaps strongly with these heuristics.
