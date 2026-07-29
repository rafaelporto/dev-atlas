---
type: concept
tags:
  - architecture
  - frontend
  - micro-frontends
  - decision-support
related:
  - software-engineering/architecture/microservices
  - software-engineering/architecture/mobile/modular-architecture
  - software-engineering/architecture/frontend/design-system-architecture
  - languages/nextjs/architecture
language: null
---
# Micro-Frontends

> Split a large frontend into independently built, deployed, and owned pieces — the microservices idea applied to the browser — and compose them back into one app the user sees as whole.

---

## What is it?

A micro-frontend architecture breaks a web application into several smaller frontends, each owned end-to-end by a different team, each built and deployed on its own schedule, and each responsible for a distinct part of the product (checkout, search, account, catalog). At runtime or build time these pieces are **composed** into a single experience the user perceives as one app.

It is the frontend counterpart of [microservices](../microservices.md): the same trade of *one big deployable* for *many small, independently shippable ones*, made for the same reason — to let many teams work in parallel without stepping on each other. It is primarily an **organizational** pattern; the technology exists to serve team autonomy, not the other way around.

---

## Why does it matter?

A single large frontend ("frontend monolith") owned by many teams eventually becomes a coordination bottleneck:

- Every change goes through one build and one deploy pipeline, so releases queue up behind each other.
- Teams share one dependency tree, so a library upgrade is a cross-team negotiation.
- The blast radius of a bad change is the whole app.

Micro-frontends address this by giving each team its own deployable slice:

- **Independent deployment** — checkout ships a fix without waiting for search's release.
- **Team autonomy** — each team owns its stack, tests, and pipeline within agreed contracts.
- **Fault isolation** — a broken slice can be contained rather than taking down the whole page.
- **Incremental modernization** — a legacy app can be strangled slice by slice, with new micro-frontends replacing old sections.

These benefits are real only at a certain scale. The costs — duplicated dependencies, harder consistency, cross-slice communication, operational overhead — are paid immediately, so the pattern is a poor fit for small teams and small apps.

---

## How it works

### Composition model

A **shell** (or container) application is responsible for layout, routing between slices, and shared cross-cutting concerns (auth, header/footer). Each micro-frontend renders into a region the shell provides.

```
   ┌──────────────────────────────────────────────────┐
   │                    Shell / Container                │  routing, layout, auth
   │  ┌───────────┐  ┌───────────┐  ┌────────────────┐ │
   │  │  Header   │  │  Search   │  │    Account     │ │  ← independently
   │  │  (team A) │  │  (team B) │  │    (team C)    │ │    deployed slices
   │  └───────────┘  └───────────┘  └────────────────┘ │
   │  ┌────────────────────────────────────────────┐  │
   │  │              Catalog  (team D)               │  │
   │  └────────────────────────────────────────────┘  │
   └──────────────────────────────────────────────────┘
```

### Integration approaches

The pieces can be joined at different points in the lifecycle, each with different trade-offs:

| Approach | How slices combine | Independent deploy? | Main cost |
|---|---|---|---|
| **Build-time (packages)** | Each slice is an npm package the shell imports and bundles | ❌ (shell rebuild/redeploy) | Not truly independent; coupled releases |
| **Server-side composition** | A server assembles fragments (SSI/edge) into one HTML response | ✅ | Server infrastructure; SSR complexity |
| **Runtime via Module Federation** | Shell loads slices' JS bundles at runtime (webpack/Vite federation) | ✅ | Shared-dependency versioning; runtime coupling |
| **iframes** | Each slice runs in its own iframe | ✅ | Strong isolation but awkward UX, sizing, and communication |
| **Web Components** | Each slice is a custom element the shell mounts | ✅ | Cross-framework styling/eventing edge cases |

Build-time integration is the simplest but sacrifices the headline benefit (independent deployment). Runtime approaches (Module Federation, web components, server-side composition) preserve independent deployment at the cost of runtime coordination.

### The hard parts

- **Shared dependencies** — if each slice bundles its own copy of the framework, the user downloads it many times. Runtime approaches share a single copy, which reintroduces version-coordination pressure.
- **Visual consistency** — independent teams drift visually unless a shared [design system](design-system-architecture.md) provides tokens and components. This is the usual prerequisite for micro-frontends to look like one product.
- **Cross-slice communication** — slices should be loosely coupled; communicate through the shell, custom events, or a shared URL, not by reaching into each other's internals.
- **Operational overhead** — many pipelines, many deployables, distributed debugging. This is the same tax microservices impose on the backend.

---

## Examples

The illustrative snippet (one framework's syntax) shows runtime composition via Module Federation: the shell declares a remote slice and mounts it. No application code is shared at build time.

```ts
// Shell build config: declare a remotely-deployed slice (Module Federation).
// The "checkout" slice is built and deployed by its own team, on its own schedule.
new ModuleFederationPlugin({
  name: "shell",
  remotes: {
    checkout: "checkout@https://checkout.cdn.example/remoteEntry.js",
  },
  shared: { react: { singleton: true }, "react-dom": { singleton: true } }, // one copy
});
```

```tsx
// Shell app: lazy-load the remote slice at runtime and mount it into a region.
// The shell owns routing and layout; the slice owns everything inside its box.
const Checkout = React.lazy(() => import("checkout/CheckoutApp"));

function Shell() {
  return (
    <Layout header={<Header />}>
      <Suspense fallback={<Spinner />}>
        <Checkout /> {/* deployed independently; updated without a shell release */}
      </Suspense>
    </Layout>
  );
}
```

Deploying a new version of the checkout slice updates the running app with no shell rebuild — the defining property of a runtime micro-frontend.

---

## When to use

- Large applications with **many teams** that need to deploy independently and are blocked by a shared pipeline.
- Incrementally replacing a legacy frontend, slice by slice, without a big-bang rewrite.
- Organizations where distinct product areas want autonomy over their stack and release cadence, within shared contracts.
- When you already have (or will invest in) a shared design system to hold visual consistency together.

## When NOT to use

- Small teams or small apps — the operational overhead dwarfs any benefit; a well-modularized monolith (see [Modular Architecture](../mobile/modular-architecture.md)) gives most of the code-organization wins with none of the deployment cost.
- When you can't commit to a shared design system — slices will drift into visual inconsistency.
- Performance-critical pages sensitive to bundle size — duplicated dependencies and runtime loading add weight and latency.
- Using it to fix a code-organization problem — that's what modules and clear boundaries are for; micro-frontends solve a *team-scaling and deployment* problem.

---

## References

- Geers, Michael. [Micro Frontends](https://micro-frontends.org/). micro-frontends.org.
- Jackson, Cam. [Micro Frontends](https://martinfowler.com/articles/micro-frontends.html). martinfowler.com, 2019.
- module-federation.io. [Module Federation](https://module-federation.io/). Module Federation Documentation.
- Fowler, Martin. [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html). martinfowler.com, 2015.
