---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - architecture
related:
  - languages/react-native/architecture-patterns
  - languages/react-native/dependency-injection
  - languages/react-native/state-management
  - languages/react-native/data-fetching
  - languages/react/folder-structure
  - software-engineering/architecture/clean
  - software-engineering/architecture/frontend/layered-frontend-architecture
language: "react-native"
---
# Application Architecture

> Organise by feature, layer inside each feature, and let dependencies point only inward — screens know about domain, domain knows nothing about screens.

---

## What is it?

Application architecture here means where code lives and what is allowed to depend on what. In a React Native app the decisions are: how directories are organised, where business logic sits relative to components, how the app reaches an API, and where the boundary between "our rules" and "the framework" falls.

This article covers the structure. For the presentation-layer patterns that fit inside it — MVC, MVVM, MVI, Clean — see [Architecture Patterns](architecture-patterns.md).

---

## Why does it matter?

An app without an agreed structure converges on the same shape: components several hundred lines long containing `fetch` calls, validation, formatting, navigation, and rendering all at once. Nothing is testable without rendering, two features quietly share a helper that was never meant to be shared, and changing the API breaks screens.

The cost is not felt in month one. It is felt when a second engineer joins, or when the backend changes, or when a screen has to be reused somewhere else.

---

## How it works

### Feature-first, not type-first

The scaffold's default is organisation by kind — all components in `components/`, all hooks in `hooks/`. That reads well with fifteen files and badly with three hundred, because working on one feature means touching six directories.

```
src/
├── features/
│   ├── posts/
│   │   ├── api/            # postRepository — HTTP + validation
│   │   ├── hooks/          # usePosts, useCreatePost
│   │   ├── components/     # PostCard, PostList
│   │   ├── model/          # domain types, pure functions
│   │   └── index.ts        # the feature's public surface
│   └── auth/
│       └── …
├── shared/
│   ├── ui/                 # Button, Card, Input — no feature knowledge
│   ├── hooks/
│   ├── lib/                # http client, storage, formatting
│   └── device/             # adapters over native modules
└── theme/

app/                        # Expo Router — routes only
```

Two rules make this hold:

1. **A feature may import from `shared/`, never from another feature.** When two features need the same thing, it moves to `shared/`. This is what stops the dependency graph becoming a mesh.
2. **`app/` contains routes, not logic.** A route file composes a screen from a feature and nothing more.

The `index.ts` barrel is the feature's public API. Anything not exported there is internal, and that convention is what lets you refactor a feature's internals with confidence.

### Layers inside a feature

```
┌──────────────────────────────────────────────────┐
│  Presentation — components, screens              │
│  Renders state, emits events. No fetch, no rules.│
└───────────────────┬──────────────────────────────┘
                    │ calls
┌───────────────────▼──────────────────────────────┐
│  Application — hooks                             │
│  Orchestrates: caching, mutations, side effects. │
└───────────────────┬──────────────────────────────┘
                    │ calls
┌───────────────────▼──────────────────────────────┐
│  Domain — types, pure functions                  │
│  Business rules. No React, no fetch, no imports  │
│  from the layers above.                          │
└───────────────────▲──────────────────────────────┘
                    │ implements
┌───────────────────┴──────────────────────────────┐
│  Data — repositories                             │
│  HTTP, storage, native modules, validation.      │
└──────────────────────────────────────────────────┘
```

Dependencies point inward. The domain layer is plain TypeScript — no `react`, no `react-native`, no `fetch`. That is what makes it testable in milliseconds and what lets it survive a UI rewrite.

### Where each kind of logic goes

| Logic | Home | Test |
|---|---|---|
| "Is this order eligible for free shipping?" | `model/` — pure function | Direct call, no render |
| "Fetch posts and cache them" | `hooks/` — a query hook | Hook test with a stub repository |
| "POST to `/posts` and validate the response" | `api/` — repository | Stubbed `fetch` |
| "Show a spinner while loading" | `components/` | Render test |
| "Which screen comes next" | `app/` — route or layout | Navigation test |

If you cannot say which row a piece of code belongs to, that is usually a sign it is doing two things.

### The boundary that matters most

Components should not know how data arrives.

```tsx
// ✗ The component knows the URL, the shape, the error handling, the caching
function PostList() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch("https://api.example.test/posts").then(r => r.json()).then(setPosts);
  }, []);
  return <FlatList data={posts} … />;
}

// ✓ The component knows it needs posts
function PostList() {
  const { data, isLoading } = usePosts();
  if (isLoading) return <ActivityIndicator />;
  return <FlatList data={data} … />;
}
```

The second version can be rendered in a test with a stubbed hook, reused with a different data source, and read in ten seconds.

### Keeping the framework at the edge

React Native, Expo Router, and TanStack Query are dependencies, not the architecture. The domain layer should not import any of them. In practice this means:

- Domain functions take and return plain data.
- Repositories own `fetch`, storage, and native modules.
- Hooks are the only place that knows about React's lifecycle.
- Components are the only place that knows about `react-native`.

That discipline is what made migrating from React Navigation to Expo Router a routing-layer change for well-structured apps, and a whole-app change for others.

---

## Examples

One feature, fully laid out:

```ts
// src/features/orders/model/order.ts — domain, no framework
export type Order = {
  id: string;
  items: { price: number; quantity: number }[];
  country: string;
};

export function subtotal(order: Order): number {
  return order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function qualifiesForFreeShipping(order: Order): boolean {
  return order.country === "BR" ? subtotal(order) >= 200 : subtotal(order) >= 50;
}
```

```ts
// src/features/orders/api/orderRepository.ts — data
import { z } from "zod";
import { request } from "@/shared/lib/http";

const orderSchema = z.object({
  id: z.string(),
  items: z.array(z.object({ price: z.number(), quantity: z.number() })),
  country: z.string(),
});

export const orderRepository = {
  getById: async (id: string) => orderSchema.parse(await request(`/orders/${id}`)),
};
```

```ts
// src/features/orders/hooks/useOrder.ts — application
import { useQuery } from "@tanstack/react-query";
import { orderRepository } from "../api/orderRepository";

export function useOrder(id: string) {
  return useQuery({ queryKey: ["orders", id], queryFn: () => orderRepository.getById(id) });
}
```

```tsx
// src/features/orders/components/OrderSummary.tsx — presentation
import { Text, View } from "react-native";
import { qualifiesForFreeShipping, subtotal, type Order } from "../model/order";

export function OrderSummary({ order }: { order: Order }) {
  return (
    <View>
      <Text>Subtotal: {subtotal(order)}</Text>
      {qualifiesForFreeShipping(order) && <Text>Free shipping</Text>}
    </View>
  );
}
```

```tsx
// app/orders/[id].tsx — route, composition only
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useOrder, OrderSummary } from "@/features/orders";

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useOrder(id);

  if (isLoading || !data) return <ActivityIndicator />;
  return <OrderSummary order={data} />;
}
```

The shipping rule — the part most likely to change and most costly to get wrong — is a pure function tested in one line, with no device, no network, and no render.

---

## When to use

- **Feature-first organisation** for any app beyond a handful of screens. Retrofitting it later is tedious.
- **A pure domain layer** whenever there are real business rules. If the app only displays API responses, there may be nothing to put there — and that is fine.
- **A repository per feature**, so the API shape is described in one place.
- **A barrel `index.ts`** per feature, to make the public surface explicit.
- **Strict no-cross-feature-imports**, enforced by review or by an ESLint boundary rule.

## When NOT to use

- Do not build four layers for a three-screen app. `app/` plus `components/` plus a couple of hooks is the right size for a prototype.
- Do not create a domain layer that only forwards calls. Empty abstraction is cost without benefit.
- Do not wrap every library "in case we swap it". Wrap the ones you plausibly might — native modules and the HTTP client — and use the rest directly.
- Do not put navigation logic in the domain layer. Routing is presentation.
- Do not let `app/` accumulate logic. The moment a route file has a `useEffect` doing real work, it belongs in a hook.

---

## References

- [Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Expo Router — file-based routing](https://docs.expo.dev/router/introduction/)
- [Thinking in React](https://react.dev/learn/thinking-in-react)
- [You Might Not Need an Effect — React](https://react.dev/learn/you-might-not-need-an-effect)
