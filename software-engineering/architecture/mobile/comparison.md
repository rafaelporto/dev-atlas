---
type: concept
tags:
  - architecture
  - mobile
  - comparison
  - decision-support
related: []
language: null
---
# Mobile Architecture Comparison

> A side-by-side comparison of mobile architectural patterns — MVC, MVP, MVVM, MVI, VIPER, Clean, and Modular — with a decision matrix for choosing one.

---

## What is it?

Mobile apps converge on a small set of architectural patterns, but the names overlap and the trade-offs blur. This article puts them side by side, compares them across the criteria that actually drive a choice, and ends with a decision matrix.

The seven patterns covered:

| Pattern | One-line description |
|---|---|
| **[MVC](mvc.md)** | View ↔ Controller ↔ Model — the original iOS pattern |
| **[MVP](mvp.md)** | Passive View + testable Presenter |
| **[MVVM](mvvm.md)** | ViewModel exposes observable state; View binds to it |
| **[MVI](mvi.md)** | Unidirectional flow: Intent → State → View |
| **[VIPER](viper.md)** | Five-layer iOS architecture with explicit routing |
| **[Clean](clean-architecture-mobile.md)** | Domain-isolated layers (Entities / Use Cases / Interface) |
| **[Modular](modular-architecture.md)** | Feature modules; orthogonal to the patterns above |

For depth on any one of them, see the linked article. This page is the **map**, not the territory.

---

## Why does it matter?

Choosing an architecture is one of the most consequential decisions in a mobile project — and one of the easiest to over-think. The wrong call costs you in two directions:

- **Under-architecting** — every screen becomes a tangle as state grows. Refactors get painful around month 6.
- **Over-architecting** — six layers and an interface for every collaborator on a 3-screen MVP. Velocity collapses before the app ships.

The patterns themselves aren't right or wrong. The match between pattern and **team size, app complexity, UI toolkit, and testability requirements** is what matters. A decision matrix makes those trade-offs explicit.

---

## How it works

### Responsibilities at a glance

Where logic lives in each pattern:

| Layer / Pattern | MVC | MVP | MVVM | MVI | VIPER | Clean |
|---|---|---|---|---|---|---|
| **UI rendering** | View | View | View | View | View | View |
| **UI ↔ logic glue** | Controller | Presenter | ViewModel | Reducer + View | Presenter | Presenter / VM |
| **Business rules** | Model (often leaks) | Model | Model / Service | Reducer | Interactor | Use Case |
| **Navigation** | Controller | Presenter | (varies) | (varies) | Router | (varies) |
| **State holder** | View / Controller | Presenter | ViewModel | Store | Presenter | UI layer |
| **State shape** | Implicit | Implicit | Observable props | Immutable single state | Implicit | Depends on UI layer |

### Data flow shape

| Pattern | Flow direction | Mutability |
|---|---|---|
| MVC | Bidirectional (V ↔ C ↔ M) | Mutable |
| MVP | Bidirectional (V ↔ P, P → M) | Mutable |
| MVVM | Bidirectional via binding (V ↔ VM, VM → M) | Mutable observable |
| MVI | **Unidirectional** (Intent → Reducer → State → View) | Immutable state, replaced on each event |
| VIPER | Layered, mostly one-way (V → P → I → V) | Mutable |
| Clean | Layered (UI → UseCase → Entity) | Mutable per layer |

MVI is the only one in this list with a strictly **unidirectional, immutable-state** flow by definition. MVVM and Clean can be implemented in MVI-style, but it's not their default.

### Compatibility with modern declarative UI

Modern UI toolkits (SwiftUI on iOS 13+, Jetpack Compose on Android, Flutter widgets) push you toward **observable state binding**. That favors patterns where the UI is a pure function of state:

| Pattern | SwiftUI / Compose / Flutter |
|---|---|
| MVC | Awkward — Controllers fight the declarative model |
| MVP | Workable but unusual — View is passive, but declarative views *are* their own bindings |
| **MVVM** | **Natural fit** — ViewModel exposes observable state, View binds |
| **MVI** | **Excellent fit** — UI is a pure function of state by construction |
| VIPER | Workable, but ceremony-heavy for what declarative UIs already do for free |
| Clean | Compatible — pairs well with MVVM or MVI in the presentation layer |

If you're starting fresh with SwiftUI, Compose, or Flutter today, **MVVM or MVI (often with Clean underneath)** is the default starting point.

### Testability

| Pattern | Testable without the UI framework? |
|---|---|
| MVC | Hard — logic lives in Controller, which is tightly coupled to the View framework |
| MVP | Easy — Presenter is plain, View is mocked through a protocol |
| MVVM | Easy — ViewModel is plain; bindings are mocked or ignored |
| MVI | Easy — Reducer is a pure function |
| VIPER | Easy — every layer is behind a protocol |
| Clean | Easy — Use Cases and Entities don't import any UI framework |

---

## Decision matrix

The single most useful view: which pattern fits which constraint.

Legend: ✅ good fit • ⚠️ workable with discipline • ❌ poor fit

| Criterion | MVC | MVP | MVVM | MVI | VIPER | Clean |
|---|---|---|---|---|---|---|
| **App is small / prototype** | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| **App is medium-sized** | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **App is large / multi-team** | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Solo developer** | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | ⚠️ |
| **Team of 2–10 devs** | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| **Team of 10+ devs** | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **High testability is required** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Declarative UI (SwiftUI / Compose / Flutter)** | ❌ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| **Imperative UI (UIKit / Android Views)** | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| **Complex / shared state across screens** | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Side-effects-heavy (animations, network, etc.)** | ❌ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ |
| **Time-to-first-screen matters** | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| **Long-lived codebase (5+ years)** | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Strict layering / dependency direction** | ❌ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| **Onboarding new developers fast** | ✅ | ✅ | ✅ | ⚠️ | ❌ | ⚠️ |
| **Strong domain model (business rules)** | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| **State debugging / time-travel** | ❌ | ❌ | ⚠️ | ✅ | ❌ | ⚠️ |

**Modular Architecture is intentionally absent from this matrix** — it's orthogonal. You don't choose Modular *instead of* MVVM; you choose Modular *in addition to* MVVM (or any other pattern) when you have multiple feature teams and your build times start hurting. See [Modular Architecture](modular-architecture.md).

---

## Recommended pairings

Real codebases rarely use one pattern in isolation. The common stacks:

| Use case | Recommended stack |
|---|---|
| Prototype / single-developer app | **MVC** (or MVVM if you're starting in SwiftUI) |
| Small app, SwiftUI/Compose/Flutter | **MVVM** with `@Observable` / `ViewModel` / `Provider` |
| Medium app, mixed UI toolkits | **MVVM + Clean** — MVVM in the UI layer, Clean Use Cases underneath |
| Side-effects-heavy app (real-time, complex flows) | **MVI + Clean** — MVI in the UI layer, Clean Use Cases for domain logic |
| Large multi-team app | **MVVM (or MVI) + Clean + Modular** — features as packages, each with its own MVVM/MVI + shared Clean domain |
| Enterprise iOS app, UIKit-heavy | **VIPER**, optionally with Clean underneath |
| Cross-platform Flutter app | **MVVM + Clean** (with Provider/Riverpod/Bloc as the state mechanism) |

---

## Examples — picking a pattern in real scenarios

### Scenario 1 — Two-week solo prototype, 3 screens, SwiftUI

**Pick:** MVVM (lightweight).
**Why:** SwiftUI's `@State` + a single `@Observable` view model per screen is enough. You skip Clean and Modular because the app won't live long enough to benefit. Add tests as you go, but don't build a layer cake.

### Scenario 2 — Production app, 20 screens, 4 developers, SwiftUI/Compose mix

**Pick:** MVVM + Clean.
**Why:** MVVM in the UI layer (one ViewModel per screen). Clean Use Cases below to keep business logic out of the ViewModels. Tests target Use Cases and ViewModels independently. Skip Modular until build times hurt — usually around 30+ screens or 8+ developers.

### Scenario 3 — Banking app, 100+ screens, 5 teams, both iOS and Android

**Pick:** MVVM (or MVI) + Clean + Modular.
**Why:** Each feature ships as its own module (SPM package or Gradle module). Each module is internally MVVM + Clean. Shared infrastructure (networking, auth, design system) is in horizontal modules. Build-time wins justify the ceremony.

### Scenario 4 — Real-time editor (collaborative whiteboard, chat with rich state)

**Pick:** MVI + Clean.
**Why:** Unidirectional flow with immutable state makes complex side effects tractable. State snapshots enable undo/redo and time-travel debugging. Clean keeps the domain (CRDT, sync protocol) testable in isolation.

### Scenario 5 — Legacy UIKit app being maintained, no rewrite in sight

**Pick:** Stay where you are.
**Why:** If it's MVC and small, don't migrate. If it's MVVM or VIPER and stable, don't migrate. Pattern migrations are the most expensive refactors in mobile dev and rarely pay back. Improve where it hurts; leave what works alone.

---

## When NOT to over-architect

A few red flags that you've reached for too much architecture:

- **Boilerplate dominates feature code.** If adding a screen means touching 6 files and 4 protocols before you write any logic, the architecture is in your way.
- **Test setup is longer than the test.** Heavy mocking pyramids are usually a sign of too many abstractions.
- **No two screens use the same pattern.** Architecture should be a constraint, not a buffet.
- **The architecture is the reason for the architecture.** "We need Clean because Clean is correct" is not a justification — the team and the problem are.

The corollary: don't picked **VIPER** or **Clean** for a 3-screen app. Don't pick **MVC** for a 100-screen app. The middle is where MVVM and MVI live — and that's why they dominate modern mobile.

---

## When patterns are NOT mutually exclusive

The clearest mental model is to separate two orthogonal questions:

1. **How do I organize layers across business and UI?** → **Clean** (or nothing, for small apps)
2. **How does my UI layer manage state?** → **MVVM, MVI, MVP, VIPER, or MVC**

You can answer both, neither, or only one. Real-world examples:

- *Clean + MVVM* — Use Cases below, ViewModels above
- *Clean + MVI* — Use Cases below, Redux-style store above
- *Just MVVM* — ViewModel calls services directly, no Use Cases (fine for small apps)
- *Just MVC* — prototypes and very small apps

**Modular** is a third orthogonal axis: how you package the code, not how you write it. Add it last, when build times or team coordination demand it.

---

## References

- **Articles in this section** — deeper coverage of each pattern:
  - [MVC](mvc.md), [MVP](mvp.md), [MVVM](mvvm.md), [MVI](mvi.md), [VIPER](viper.md)
  - [Clean Architecture (mobile)](clean-architecture-mobile.md)
  - [Modular Architecture](modular-architecture.md)
- *Clean Architecture: A Craftsman's Guide to Software Structure and Design* — Robert C. Martin (Prentice Hall, 2017)
- *Patterns of Enterprise Application Architecture* — Martin Fowler (Addison-Wesley, 2002) — origin of MVP and MVVM lineage
- [Architecture Patterns for SwiftUI — Hacking with Swift](https://www.hackingwithswift.com/quick-start/swiftui)
- [Guide to App Architecture — Android Developers](https://developer.android.com/topic/architecture)
- [Flutter App Architecture Guide](https://docs.flutter.dev/app-architecture)
- [The Model-View-Presenter pattern — Martin Fowler](https://martinfowler.com/eaaDev/uiArchs.html)
