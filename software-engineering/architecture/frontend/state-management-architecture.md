---
type: concept
tags:
  - architecture
  - frontend
  - state-management
  - reactive
  - concept
related:
  - languages/react/state-management
  - languages/react/context
  - languages/flutter/state-management
  - software-engineering/architecture/mobile/mvi
language: null
---
# State Management Architecture

> Decide what *kind* of state you have and where it should live before you reach for a library — most frontend state problems are placement problems, not tooling problems.

This article is about the architecture of state in a frontend app, independent of framework. For concrete library choices, see [React state management](../../../languages/react/state-management.md) and [Flutter state management](../../../languages/flutter/state-management.md).

---

## What is it?

State is any data that changes over the life of the UI and affects what the user sees. State management architecture is the set of decisions about **where each piece of state lives**, **who owns it**, and **how changes flow** through the app.

The central insight is that "state" is not one thing. It comes in distinct kinds with different lifetimes, sources of truth, and caching needs:

- **Server state** — data owned by a backend, fetched over the network (the product list, the user's orders). It's a *cache* of remote truth, so it can be stale and needs refetching, invalidation, and loading/error handling.
- **Client / UI state** — data the client owns outright (a sidebar's open/closed flag, the active tab, a wizard's current step). No network involved.
- **URL state** — data encoded in the address bar (the current route, search filters, pagination). It's shareable, bookmarkable, and survives reload.
- **Form state** — the in-progress values, validation, and dirty/touched flags of inputs before submission.
- **Local component state** — ephemeral state used by a single component (a hover flag, an input's controlled value).

Choosing the *kind* first tells you almost everything about where it belongs and how to manage it.

---

## Why does it matter?

Most "we need a state management library" moments are actually "we put this state in the wrong place" moments. Two failure modes dominate:

- **Over-globalization** — dropping everything into one big global store. Server data, UI flags, and form values all live in a single tree, so unrelated changes re-render half the app, and reasoning about any one screen means understanding the whole store.
- **Prop drilling** — threading a value through many intermediate components that don't use it, just to reach a deep child. The intermediates become coupled to data they don't care about.

Getting the architecture right — the correct *kind* in the correct *place* — usually removes the need for heavy tooling entirely. When it doesn't, it at least tells you *which* tool you actually need (a server-cache library vs. a client store vs. just the URL).

---

## How it works

### Match the kind to the home

| Kind of state | Natural home | Managed with |
|---|---|---|
| Server state | A server-cache layer keyed by request | Query/cache library (fetch + cache + invalidate) |
| URL state | The router / address bar | Router params and query strings |
| Client (shared) state | The smallest ancestor that needs it | Context, a lightweight store, or lifted local state |
| Form state | The form component (or a form library) | Controlled inputs / a form library |
| Local state | The component itself | The framework's built-in local state |

### Locality: keep state as low as it can go

The default should be **local**. Lift state up only to the closest common ancestor of the components that need it — no higher. Reaching for a global store is the last resort, not the first.

```
       ✗ Everything global                 ✓ State at the right altitude
       ──────────────────                  ────────────────────────────
       ┌──────────────┐                    ┌──────────────┐
       │ Global store │                    │     App      │ URL/route state
       │  · route     │                    └──────┬───────┘
       │  · theme     │                    theme ▼ (context, app-wide)
       │  · cart      │              ┌────────────┴───────────┐
       │  · modalOpen │              │      ProductPage        │ server cache (cart, list)
       │  · list      │              └────────────┬───────────┘
       │  · formDraft │               modalOpen ▼ (local to page)
       └──────┬───────┘              ┌────────────┴───────────┐
        every change                 │        Filters          │ formDraft (local)
        re-renders everything        └─────────────────────────┘
```

### Unidirectional data flow

For state that *is* shared, the durable pattern is **unidirectional flow**, the lineage running from Flux → Redux → the Elm Architecture, and the same shape as [MVI](../mobile/mvi.md) on mobile:

```
   ┌─────────┐   dispatch    ┌──────────────┐   new state   ┌────────┐
   │  View   │ ────────────► │   Reducer    │ ────────────► │ Store  │
   └─────────┘   (action)    │ (pure fn)    │               └───┬────┘
        ▲                     └──────────────┘                  │
        └──────────────── subscribe / render ◄──────────────────┘
```

The value of one-way flow is predictability: state changes only through explicit, named actions run by pure functions, so a change is traceable and reproducible (enabling time-travel debugging and easy testing). The cost is ceremony — for local state it's overkill, which is why you reserve it for genuinely shared, non-trivial state.

### Single source of truth

Each fact should have exactly one authoritative home. Deriving values (a `total` from `items`) at read time is preferable to storing the derived copy and keeping it in sync — duplicated state that can disagree is a classic bug source.

---

## Examples

The principles are framework-agnostic; the illustrative snippet (one framework's syntax) shows the same feature done wrong (everything global) then right (each kind in its home).

```tsx
// ✗ Anti-pattern: one global store holds four different kinds of state.
const useAppStore = create((set) => ({
  products: [],          // server state — a network cache
  searchQuery: "",       // belongs in the URL (shareable, bookmarkable)
  isFilterPanelOpen: false, // pure local UI state
  draftReview: "",       // form state
}));

// ✓ Each kind in its natural home:

// Server state → a cache library that handles refetch/stale/invalidate.
const { data: products, isLoading } = useQuery(["products", query], () => fetchProducts(query));

// URL state → the router owns the query; it's shareable and survives reload.
const [params, setParams] = useSearchParams();
const query = params.get("q") ?? "";

// Local UI state → the component that needs it, nothing higher.
const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);

// Form state → local to the form (or a form library).
const [draftReview, setDraftReview] = useState("");
```

The library names change per framework (Zustand/Redux/Pinia/Riverpod, TanStack Query/SWR), but the architecture — kind → home → tool — is identical.

---

## When to use

- Deliberate state architecture pays off on **any app past a couple of screens** — decide the kind and home for each piece of state as you add it.
- Reach for a **server-cache library** as soon as you fetch the same data in more than one place or need caching, refetching, and invalidation.
- Reach for a **shared client store** only when genuinely global client state (auth session, theme, a cart) is read across unrelated parts of the tree.
- Use **URL state** whenever a view should be shareable, bookmarkable, or survive reload (filters, tabs, pagination).

## When NOT to use

- **A global store for local concerns** — a single component's toggle does not belong in app-wide state.
- **A client store for server data** — hand-rolling fetch-into-a-store re-implements caching, staleness, and invalidation badly; use a server-cache library.
- **Deriving-then-storing** — don't persist values you can compute from existing state; store the source, derive the rest.
- **Adding a state library preemptively** — start with local state and lifting; add tooling only when a real, repeated pain shows up.

---

## References

- Abramov, Dan, and the Redux team. [Redux — Three Principles](https://redux.js.org/understanding/thinking-in-redux/three-principles). Redux Documentation.
- Meta. [Managing State](https://react.dev/learn/managing-state). React Documentation.
- TanStack. [TanStack Query — Overview](https://tanstack.com/query/latest/docs/framework/react/overview). TanStack Documentation.
- Czaplicki, Evan. [The Elm Architecture](https://guide.elm-lang.org/architecture/). Elm Guide.
