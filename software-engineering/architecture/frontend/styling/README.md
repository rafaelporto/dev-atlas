# Styling Architecture

How styles are organised, decoupled, shared, and evolved across a frontend — from a single app to a monorepo or a set of micro-frontends, under any rendering strategy. These articles cover the architectural decisions; for the mechanics of CSS itself and of each styling tool (Sass, CSS Modules, CSS-in-JS, utility-first CSS), see the [CSS](../../../../languages/css/README.md) section.

Start with [CSS Architecture and Organization](css-architecture-and-organization.md) for the layer model the other articles build on. For the shared UI as a product, see [Design System Architecture](../design-system-architecture.md).

---

## Articles

| Article | Description |
|---|---|
| [CSS Architecture and Organization](css-architecture-and-organization.md) | Style layers mapped onto `@layer`, global vs colocated styles, a component's public style API, dependency direction, and folder layouts |
| [Design Tokens](design-tokens.md) | Token tiers, the W3C DTCG format, the Style Dictionary pipeline, multi-brand theming, and versioning and deprecating tokens |
| [Styling in Monorepos](styling-in-monorepos.md) | Shared `tokens` and `ui` packages, what they ship, sharing a Tailwind theme, deterministic cross-package ordering, and internal versioning |
| [Styling Micro-Frontends](styling-micro-frontends.md) | Leakage, ordering and version skew; isolation options compared; who owns the reset; tokens as a runtime contract |
| [Styling and Rendering Strategies](styling-and-rendering-strategies.md) | How CSR/SPA, SSR, SSG, streaming, RSC, and islands change styling: critical CSS, FOUC, build-time extraction vs runtime CSS-in-JS |
| [Evolving and Migrating Styles](evolving-and-migrating-styles.md) | Auditing, containing legacy CSS in a low layer, incremental migration, common migrations, codemods, and deprecation policy |
