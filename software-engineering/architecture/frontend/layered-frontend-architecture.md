---
type: concept
tags:
  - architecture
  - frontend
  - clean-architecture
  - concept
related:
  - languages/react/folder-structure
  - software-engineering/architecture/clean
  - software-engineering/architecture/hexagonal
  - software-engineering/architecture/layered
  - software-engineering/architecture/mobile/modular-architecture
language: null
---
# Layered Frontend Architecture

> Apply the classic idea of layers — presentation, application, domain, infrastructure — to a browser app, so business logic doesn't end up tangled inside components.

This is the frontend application of general layering. For the underlying styles, see [Layered](../layered.md), [Clean](../clean.md), and [Hexagonal](../hexagonal.md); for a concrete file tree in one framework, see [React folder structure](../../../languages/react/folder-structure.md).

---

## What is it?

A frontend app is more than components. Behind the UI there is business logic (what a valid order looks like), application logic (the steps to place one), and infrastructure (HTTP clients, storage, the framework itself). Layered frontend architecture separates these concerns into distinct layers with a **controlled dependency direction**, so that a change in one layer doesn't ripple through the others.

The typical layers, from outside in:

- **Presentation** — components, styles, and view logic. Renders state and captures user intent.
- **Application** — use cases / orchestration: "place order" coordinates validation, calls a service, updates state. Framework-aware but UI-agnostic.
- **Domain** — the business model and rules, expressed in plain language types and pure functions. Knows nothing about the UI, the network, or the framework.
- **Infrastructure** — concrete adapters: HTTP clients, local storage, WebSocket connections, third-party SDKs.

The **dependency rule** is the heart of it: dependencies point inward. Presentation depends on application, application on domain; the domain depends on nothing. Infrastructure implements interfaces the inner layers define, so the direction of dependency is inverted at the boundary (as in Hexagonal's ports and adapters).

---

## Why does it matter?

The default failure mode of frontend codebases is the **fat component**: a single file that fetches data, holds state, validates input, formats output, and renders markup. It works for one screen and rots at scale — business rules are trapped inside JSX, untestable without rendering, and duplicated across every screen that needs them.

Layering fixes this by giving each concern a home:

- **Testability** — domain rules are pure functions tested without a browser; use cases are tested with fake infrastructure.
- **Replaceability** — swap `fetch` for a different client, or REST for GraphQL, by changing one adapter. The domain and UI don't notice.
- **Framework independence at the core** — business rules survive a framework migration (React → Svelte) because they never imported the framework.
- **Clear ownership** — a rule change lives in the domain; a styling change lives in presentation. Changes stay local.

The trade-off is indirection: more files and interfaces. On a three-screen app that's pure overhead; on a long-lived product it's what keeps velocity from collapsing.

---

## How it works

### The layers and the dependency rule

```
   ┌──────────────────────────────────────────────────┐
   │  Presentation  (components, styles, view logic)    │
   │      │ depends on                                   │
   │      ▼                                              │
   │  Application   (use cases, orchestration)           │
   │      │ depends on                                   │
   │      ▼                                              │
   │  Domain        (entities, business rules — pure)    │  ◄── depends on nothing
   │      ▲ implements interfaces defined here           │
   │      │                                              │
   │  Infrastructure (HTTP, storage, SDKs, adapters)     │
   └──────────────────────────────────────────────────┘
        Dependencies point inward. Infrastructure is wired
        in from the outside (dependency inversion).
```

A domain type (`Order`) and a rule (`canCheckout(cart)`) are plain code — no imports from the framework or the network. A use case (`placeOrder`) depends on the domain and on an *interface* (`OrderGateway`); the concrete HTTP implementation lives in infrastructure and is injected in. The component calls the use case and renders the result.

### Layer-based vs. feature-based structure

Layering is about *dependencies*, not necessarily *folders*. There are two ways to lay it out on disk:

```
   Layer-based (by technical role)     Feature-based (by domain slice)
   ───────────────────────────────     ───────────────────────────────
   src/                                 src/
     components/                          features/
     hooks/                                 checkout/
     services/                                components/
     domain/                                  use-cases/
     ...                                      domain/
                                              infrastructure/
                                            catalog/
                                              ...
                                          shared/
```

- **Layer-based** groups files by technical role. Simple at first, but a single feature ends up scattered across every folder, and folders grow without bound.
- **Feature-based** groups by domain slice, with the layers living *inside* each feature. This scales better: a feature is self-contained, easy to reason about, own, and even extract. Cross-feature code goes in `shared/`.

For anything past a handful of screens, feature-based structure with layering inside each feature is the more durable choice, and it aligns with [Modular Architecture](../mobile/modular-architecture.md) when features become independently owned packages.

### Public API boundaries

Each feature (or layer) should expose a small **public surface** — an index that re-exports what outsiders may use — and keep everything else private. This prevents deep imports into a feature's internals, so its structure can change freely as long as the public API holds.

---

## Examples

The illustrative snippet (one framework's syntax) shows a pure domain rule, a use case depending on an interface, and a thin component — the business logic lives outside the component.

```ts
// domain/ — pure business model and rules. No framework, no network.
export interface Cart { items: LineItem[]; }
export function cartTotal(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
}
export function canCheckout(cart: Cart): boolean {
  return cart.items.length > 0 && cartTotal(cart) > 0;
}

// application/ — orchestration. Depends on the domain and on an INTERFACE,
// not on a concrete HTTP client (dependency inversion).
export interface OrderGateway { submit(cart: Cart): Promise<OrderId>; }

export function makePlaceOrder(gateway: OrderGateway) {
  return async (cart: Cart): Promise<OrderId> => {
    if (!canCheckout(cart)) throw new Error("Cart is not checkout-ready");
    return gateway.submit(cart);
  };
}

// infrastructure/ — the concrete adapter, wired in from the outside.
export const httpOrderGateway: OrderGateway = {
  submit: (cart) => fetch("/api/orders", { method: "POST", body: JSON.stringify(cart) })
    .then((r) => r.json()),
};

// presentation/ — a thin component: calls the use case, renders the result.
function CheckoutButton({ cart }: { cart: Cart }) {
  const placeOrder = makePlaceOrder(httpOrderGateway); // injected dependency
  return (
    <button disabled={!canCheckout(cart)} onClick={() => placeOrder(cart)}>
      Checkout · {cartTotal(cart)}
    </button>
  );
}
```

`cartTotal` and `canCheckout` are testable with no browser; `makePlaceOrder` is testable with a fake `OrderGateway`; only `CheckoutButton` needs a render test. Swapping REST for GraphQL means writing a new gateway — nothing else changes.

---

## When to use

- Apps with real business logic in the client (multi-step flows, validation, pricing, permissions) that would otherwise pile up inside components.
- Long-lived products where framework migrations, backend swaps, or team growth are plausible.
- Codebases where testability of business rules without the UI is a priority.
- Alongside feature-based structure and [Modular Architecture](../mobile/modular-architecture.md) once multiple teams own different slices.

## When NOT to use

- Small or short-lived apps (a prototype, a few CRUD screens) — the extra layers and interfaces cost more than they return; keep logic close to the component.
- Content-first sites with little client logic — there's barely a domain to isolate.
- Ceremony for its own sake — an interface with a single implementation that will never be swapped is indirection without payoff. Add layers where logic actually accumulates, not everywhere.
- Deeply nested layer-based folders on a large app — they scatter features; prefer feature-based slices.

---

## References

- Martin, Robert C. [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). Clean Coder Blog, 2012.
- Cockburn, Alistair. [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/). alistair.cockburn.us.
- feature-sliced.design. [Feature-Sliced Design — Overview](https://feature-sliced.design/docs/get-started/overview). Feature-Sliced Design.
- Fowler, Martin. [PresentationDomainDataLayering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html). martinfowler.com, 2015.
