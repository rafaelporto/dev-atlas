---
type: concept
tags: []
related: []
language: "react"
---
# State Management

> The React ecosystem offers many state libraries. Pick by *what kind* of state you're managing: server state (TanStack Query), client state (Zustand/Jotai/Redux Toolkit), URL state (router), local state (`useState`).

---

## What is it?

**State management** in a React app is the strategy for holding, updating, and sharing data. Different *kinds* of state have different needs:

| Kind | Examples | Right tool |
|---|---|---|
| Local UI state | Open/closed, hovered, form input | `useState`, `useReducer` |
| Shared client state | Theme, current user, cart | Context, Zustand, Jotai, Redux Toolkit |
| Server state | Data from APIs, cache, revalidation | TanStack Query, SWR, Apollo |
| URL state | Search filters, pagination, active tab | React Router, TanStack Router |
| Form state | Input values, validation, submit | React Hook Form |

The biggest mistake is using one tool for all of them.

---

## Why does it matter?

Most teams reach for Redux (or whatever's popular) for every app and then suffer: server data goes stale, cache logic is hand-rolled, fetching is reimplemented per route. Splitting state by *kind* gives each tool one job and produces much smaller, clearer code.

---

## How it works

### Local UI state

Default to `useState` and `useReducer`. Lift state up only when siblings need it. See [State and Events](state-and-events.md) and [`useReducer`](reducer.md).

### Server state

Server data is fundamentally different from local state: it can become stale, may need revalidation, can fail, and is shared across components that didn't fetch it. Use a dedicated library:

```tsx
import { useQuery } from "@tanstack/react-query";

function Profile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <Spinner />;
  return <h1>{user!.name}</h1>;
}
```

The library handles: deduping, caching, retries, background revalidation, optimistic updates, pagination, infinite scroll. Don't put server data in `useState`.

### Client state libraries

For shared client state that's not server data, the modern choices are:

**Zustand** — minimal, hook-based, no provider needed:

```tsx
import { create } from "zustand";

type CartState = {
  items: Item[];
  add: (item: Item) => void;
  clear: () => void;
};

const useCart = create<CartState>(set => ({
  items: [],
  add: (item) => set(s => ({ items: [...s.items, item] })),
  clear: ()   => set({ items: [] }),
}));

// Consumers
const items = useCart(s => s.items);
const add   = useCart(s => s.add);
```

**Jotai** — atomic, each piece of state is its own atom:

```tsx
import { atom, useAtom } from "jotai";

const countAtom = atom(0);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Redux Toolkit** — predictable, devtools, time-travel, large ecosystem. Heavier setup; choose when you need its full power (large team, audited transitions, complex middleware).

```tsx
import { createSlice, configureStore, type PayloadAction } from "@reduxjs/toolkit";

const cart = createSlice({
  name: "cart",
  initialState: { items: [] as Item[] },
  reducers: {
    add:   (state, action: PayloadAction<Item>) => { state.items.push(action.payload); },
    clear: (state) => { state.items = []; },
  },
});

const store = configureStore({ reducer: { cart: cart.reducer } });
```

### Comparison

| | Context | Zustand | Jotai | Redux Toolkit |
|---|---|---|---|---|
| Setup | Built-in | Minimal | Minimal | Moderate |
| Selectors | Manual | Built-in | Built-in (atomic) | Reselect / `useSelector` |
| Boilerplate | Low | Low | Low | Medium |
| Devtools | None | Optional | Optional | Excellent |
| Best for | Cross-cutting values (theme, user) | Most apps' shared state | Apps with fine-grained reactivity | Audited, complex flows |
| Bundle size | 0 | ~1 KB | ~3 KB | ~14 KB |

### URL state

Filters, search queries, pagination, sort, active tab — these belong in the URL. Bookmarkable, shareable, survives refresh, and the user expects back/forward to work:

```tsx
// React Router v6+
const [params, setParams] = useSearchParams();
const sort = params.get("sort") ?? "name";
```

For typed URL state, [TanStack Router](https://tanstack.com/router) and [nuqs](https://nuqs.47ng.com) are excellent.

---

## Examples

### Common decomposition

A typical e-commerce page:

```tsx
function ProductsPage() {
  // URL state — sharable, bookmarkable
  const [params] = useSearchParams();
  const category = params.get("category");

  // Server state — cached, revalidated
  const { data: products } = useQuery({
    queryKey: ["products", category],
    queryFn: () => fetchProducts(category),
  });

  // Client state — cart spans the app
  const addToCart = useCart(s => s.add);

  // Local state — UI-only
  const [hovered, setHovered] = useState<string | null>(null);
}
```

Four kinds of state, four tools, each doing one job.

---

## When to use

- **`useState`/`useReducer`** — default for local UI state.
- **Context** — cross-cutting values most of the tree may read (theme, user).
- **TanStack Query / SWR** — for any data fetched from an API.
- **Zustand / Jotai** — for shared client state that spans the app.
- **Redux Toolkit** — when you need its full ecosystem (devtools, middleware, RTK Query).
- **Router** — for filters, pagination, and any state worth bookmarking.

---

## When NOT to use

- Don't store server data in `useState`, Zustand, or Redux — use a query library.
- Don't store filter/sort/pagination state in Redux when the URL would do.
- Don't put high-frequency state in Context — every consumer re-renders on every change.
- Don't pick a library based on tutorials. Pick by what kind of state you have.

---

## References

- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://github.com/pmndrs/zustand)
- [Jotai](https://jotai.org)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [Kent C. Dodds — Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react)
