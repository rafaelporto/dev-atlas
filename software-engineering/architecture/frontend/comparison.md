---
type: concept
tags:
  - architecture
  - frontend
  - comparison
  - decision-support
  - rendering
related:
  - software-engineering/architecture/frontend/rendering-patterns
  - software-engineering/architecture/frontend/state-management-architecture
  - software-engineering/architecture/frontend/micro-frontends
  - languages/nextjs/rendering-strategies
  - software-engineering/architecture/mobile/comparison
language: null
---
# Frontend Architecture Comparison

> A side-by-side comparison of frontend architectural choices — rendering strategy, structural style, and state approach — with a decision matrix for picking them.

---

## What is it?

"Frontend architecture" is not one decision but several orthogonal ones, and it's easy to conflate them. This article puts the choices side by side and ends with a decision matrix. Three axes matter most:

| Axis | The question | Options |
|---|---|---|
| **Rendering** | Where/when is HTML produced? | CSR · SSR · SSG · ISR · Streaming · Islands · RSC |
| **Structure** | How is the codebase organized and deployed? | Monolith SPA · Modular monolith · Micro-frontends |
| **State** | Where does state live and how does it flow? | Local-first · Server-cache · Global store · Unidirectional |

These are largely independent: a component-driven app can render via any strategy, organize its code any way, and manage state by kind. This page is the **map**; for depth, follow the links.

The pieces covered:

| Article | Axis |
|---|---|
| **[Rendering Patterns](rendering-patterns.md)** | Rendering |
| **[Component-Driven Architecture](component-driven-architecture.md)** | Structure (in-app) |
| **[Layered Frontend Architecture](layered-frontend-architecture.md)** | Structure (in-app) |
| **[Micro-Frontends](micro-frontends.md)** | Structure (cross-team) |
| **[State Management Architecture](state-management-architecture.md)** | State |
| **[Design System Architecture](design-system-architecture.md)** | Cross-cutting (consistency) |
| **[WebAssembly](webassembly.md)** | Cross-cutting (compute) |

---

## Why does it matter?

Frontend architecture decisions are load-bearing and awkward to reverse. Two directions of failure:

- **Under-architecting** — a content site built as a pure CSR SPA fights SEO and first-paint forever; a growing app with all state in one global store re-renders the world on every change.
- **Over-architecting** — micro-frontends and a four-layer structure for a three-screen app; a versioned design system before the design has stabilized. Velocity collapses under ceremony.

The patterns aren't right or wrong in the abstract. The match between the pattern and the **app type, audience, team size, and freshness/interactivity needs** is what matters. A decision matrix makes those trade-offs explicit.

---

## How it works

### Rendering strategies at a glance

| Strategy | First paint | Interactive | Freshness | SEO | Server cost |
|---|---|---|---|---|---|
| CSR | Slow | Slow | Real-time | Poor | Very low |
| SSR | Fast | Medium (hydration) | Per request | Excellent | High |
| SSG | Fastest | Medium (hydration) | Build-time | Excellent | Very low |
| ISR | Fastest | Medium (hydration) | Near-fresh | Excellent | Low |
| Streaming SSR | Fast (progressive) | Progressive | Per request | Excellent | High |
| Islands | Fast | Fast (partial JS) | Source-dependent | Excellent | Low–medium |
| RSC | Fast | Fast (less JS) | Per request | Excellent | Medium–high |

### Structural styles at a glance

| Style | Deploy unit | Team fit | Main benefit | Main cost |
|---|---|---|---|---|
| Monolith SPA | One app | 1 team | Simplicity | Coordination pain at scale |
| Modular monolith | One app, feature slices | 1–few teams | Organization without ops cost | Still one pipeline |
| Micro-frontends | Many apps | Many teams | Independent deploy + autonomy | Ops + consistency overhead |

### State approaches at a glance

| Approach | Best for | Risk if misused |
|---|---|---|
| Local-first (lift as needed) | Most UI state | — (this is the default) |
| Server-cache library | Remote data | Hand-rolling caching badly |
| Global client store | Truly app-wide client state | Over-globalization, wasteful re-renders |
| Unidirectional flow | Complex shared state | Ceremony on trivial state |

---

## Decision matrix

The single most useful view: which choice fits which constraint.

Legend: ✅ good fit • ⚠️ workable with discipline • ❌ poor fit

| Criterion | CSR | SSR | SSG | ISR | Streaming/RSC | Islands |
|---|---|---|---|---|---|---|
| **Public, SEO-critical content** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Behind login, no SEO** | ✅ | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ |
| **Highly interactive (editor, dashboard)** | ✅ | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ |
| **Content changes rarely** | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| **Content changes often, large catalog** | ⚠️ | ✅ | ❌ | ✅ | ✅ | ⚠️ |
| **Personalized per request** | ⚠️ | ✅ | ❌ | ⚠️ | ✅ | ⚠️ |
| **Fast first paint is critical** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Minimize client JS** | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| **Lowest infra cost** | ✅ | ❌ | ✅ | ✅ | ❌ | ⚠️ |
| **Mostly static + a few widgets** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ |

Structural and state choices, mapped to the constraint that drives them:

| Criterion | Monolith SPA | Modular monolith | Micro-frontends |
|---|---|---|---|
| **1 team, small app** | ✅ | ⚠️ | ❌ |
| **1–few teams, growing app** | ⚠️ | ✅ | ❌ |
| **Many teams, independent deploys** | ❌ | ⚠️ | ✅ |
| **Incremental legacy migration** | ❌ | ⚠️ | ✅ |
| **Bundle-size sensitive** | ✅ | ✅ | ❌ |

**Design systems and WebAssembly are intentionally absent from the matrices** — they're orthogonal. You don't pick a design system *instead of* SSR; you add one *when* multiple teams/apps must stay consistent. You don't pick Wasm *instead of* a structure; you reach for it *when* a specific compute-heavy concern outgrows JavaScript.

---

## Recommended pairings

Real apps combine choices across the three axes. Common stacks:

| Use case | Recommended stack |
|---|---|
| Marketing site / docs / blog | **SSG (+ Islands)** · monolith · local state |
| Large content site / news / e-commerce catalog | **ISR** · modular monolith · server-cache for data |
| Personalized app with SEO (logged-in home feed) | **SSR / RSC** · modular monolith · server-cache + URL state |
| Internal dashboard / admin (no SEO) | **CSR** · modular monolith · server-cache + local state |
| Real-time editor / collaborative app | **CSR (+ streaming for shell)** · layered structure · unidirectional store; **Wasm** for hot compute |
| Large product, many teams | **SSR/RSC or ISR** · **micro-frontends** · shared **design system** |

---

## Examples — picking an architecture in real scenarios

### Scenario 1 — Company blog and docs, one developer

**Pick:** SSG (with a few islands for search/comments), monolith, local state.
**Why:** Content is the same for everyone and changes rarely. Static files on a CDN give the best speed and lowest cost. No global store, no BFF, no micro-frontends — there's nothing to justify them.

### Scenario 2 — E-commerce catalog, 50k products, small team

**Pick:** ISR for product pages, modular monolith, a server-cache library for cart/inventory.
**Why:** SSG's speed without rebuilding 50k pages on every price change; ISR revalidates pages individually. Feature slices (catalog, cart, checkout) keep the codebase organized under one pipeline. Server data goes through a cache library, not a global store.

### Scenario 3 — SaaS dashboard behind login, 4 developers

**Pick:** CSR (or SSR for the shell), modular monolith, server-cache + local UI state.
**Why:** SEO is irrelevant behind auth, and the app is highly interactive, so CSR's trade-offs are fine. Feature-based structure with layering keeps business logic out of components. Server state via a query library; UI flags stay local.

### Scenario 4 — Collaborative whiteboard with real-time sync

**Pick:** CSR with a streamed shell, layered architecture, unidirectional store, WebAssembly for the hot path.
**Why:** Unidirectional immutable state makes complex real-time updates and undo/redo tractable (the [MVI](../mobile/mvi.md) shape). The domain (CRDT, sync protocol) is isolated in layers and testable without the UI. Heavy geometry/encoding runs in Wasm.

### Scenario 5 — Large retail platform, 6 product teams

**Pick:** SSR/RSC or ISR per area, micro-frontends, a shared design system.
**Why:** Independent deployment unblocks six teams from one pipeline. A shared design system is the non-negotiable prerequisite so the slices still look like one product. Rendering strategy is chosen per area (static-ish catalog vs. personalized account).

---

## When to use

Reach for this comparison whenever you are choosing — or reconsidering — a frontend architecture. Work top-down: use the decision matrix to narrow candidates, the recommended pairings to combine them, and the scenarios above as worked examples. Let the team size, the product's complexity, and SEO/performance needs drive the pick rather than novelty.

## When NOT to use

Red flags that you've reached for too much:

- **A global store for a single component's toggle.** State placement, not tooling, is the fix.
- **Micro-frontends with one team.** You've taken on microservices' operational tax for none of its team-scaling benefit.
- **A versioned design system before the design is stable.** You'll ship breaking changes weekly.
- **SSR-everything by default.** You pay server cost on pages that could be static files.
- **A four-layer structure for three CRUD screens.** The indirection costs more than it returns.

The middle — modular monolith, ISR/SSR where SEO matters, server-cache for data, local-first for UI — is where most successful apps live.

## When patterns are NOT mutually exclusive

Keep the three axes separate and answer them independently:

1. **Where/when is HTML rendered?** → a rendering strategy (often *per route*, not one global choice).
2. **How is the code organized and deployed?** → monolith / modular / micro-frontends.
3. **Where does state live?** → by kind: local, server-cache, URL, or a shared store.

A single app routinely mixes rendering strategies across routes, runs a modular monolith, and manages state by kind — all at once. Design systems and Wasm layer on top of any combination. The art is answering each axis for *this* product, not adopting a bundle wholesale.

---

## References

- **Articles in this section** — deeper coverage of each axis:
  - [Rendering Patterns](rendering-patterns.md), [Component-Driven Architecture](component-driven-architecture.md), [Layered Frontend Architecture](layered-frontend-architecture.md)
  - [Micro-Frontends](micro-frontends.md), [State Management Architecture](state-management-architecture.md), [Design System Architecture](design-system-architecture.md), [WebAssembly](webassembly.md)
- Osmani, Addy, and Jason Miller. [Rendering on the Web](https://web.dev/articles/rendering-on-the-web). web.dev, Google.
- patterns.dev. [Rendering Patterns](https://www.patterns.dev/vanilla/rendering-patterns/). patterns.dev.
- Jackson, Cam. [Micro Frontends](https://martinfowler.com/articles/micro-frontends.html). martinfowler.com, 2019.
