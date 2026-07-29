# Frontend Architecture

Architectural concepts, patterns, and styles for building web frontends — how UIs are composed from components, where and when HTML is rendered, how state and data flow, and how frontends are structured and scaled across teams. Framework-agnostic: for framework-specific depth, each article links into the [Languages](../../../languages/README.md) section.

---

## Concepts

| Article | Description |
|---|---|
| [Component-Driven Architecture](component-driven-architecture.md) | Composing UIs from single-responsibility components; boundaries and composition |
| [Rendering Patterns](rendering-patterns.md) | CSR, SSR, SSG, ISR, streaming, islands, and RSC — the taxonomy and trade-offs |
| [State Management Architecture](state-management-architecture.md) | Architecting state by kind; ownership, locality, and unidirectional flow |
| [Data Fetching & BFF](data-fetching-and-bff.md) | Client vs server fetching, caching layers, and the Backend-for-Frontend pattern |
| [WebAssembly](webassembly.md) | Near-native compute in the browser, the JS interop boundary, and when to reach for it |

---

## Styles & Patterns

| Article | Description |
|---|---|
| [Layered Frontend Architecture](layered-frontend-architecture.md) | Presentation/domain/infrastructure layering and feature-vs-layer project structure |
| [Micro-Frontends](micro-frontends.md) | Independently deployable, independently owned frontends composed into one app |
| [Design System Architecture](design-system-architecture.md) | Tokens, a shared component library, and theming as an architectural concern |

---

## Choosing

| Article | Description |
|---|---|
| [Comparison](comparison.md) | Side-by-side comparison and decision matrix across rendering, structural, and state choices |
| [Stacks & Tooling](frontend-stacks-and-tooling.md) | Reference map of frontend languages, frameworks, meta-frameworks, and build tools |

---

> These concerns are orthogonal: a component-driven app can render via any strategy, manage state by kind, and be packaged as a monolith or micro-frontends. For a structured way to choose, see the [comparison and decision matrix](comparison.md).
