---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - state-management
related:
  - languages/react-native/data-fetching
  - languages/react-native/architecture
  - languages/react-native/dependency-injection
  - languages/react/state-management
  - languages/flutter/state-management
  - software-engineering/architecture/frontend/state-management-architecture
language: "react-native"
---
# State Management

> Sort state by kind first — local, client, server, persisted — and give each kind its own home. The library choice follows from that and matters far less.

---

## What is it?

State management is deciding where each piece of data lives and who is allowed to change it. In a React Native app four kinds show up, and they have different requirements:

| Kind | Example | Home |
|---|---|---|
| **Local UI** | A toggle, a text input's value | `useState` in the component |
| **Client** | Theme, selected filters, cart contents | A store — Zustand, Redux Toolkit, Jotai |
| **Server** | Posts, the user profile, anything from an API | A query cache — TanStack Query |
| **Persisted** | Auth token, onboarding completed | Device storage — MMKV, SecureStore |

---

## Why does it matter?

The most common architectural mistake in React apps is putting all four kinds in one global store. Server data then needs manual invalidation, refetching, and staleness tracking — reimplementing a cache, badly. Local UI state in a global store causes unrelated screens to re-render.

React Native adds a constraint the web does not have: the app can be backgrounded and killed by the OS at any moment. Which state survives that, and which does not, is a decision you must make explicitly.

---

## How it works

### Local UI state

Most state is local, and should stay that way. If only one component and its children need it, `useState` is the answer.

```tsx
const [isExpanded, setIsExpanded] = useState(false);
```

When several related values change together, `useReducer` keeps the transitions in one place and makes them testable in isolation.

### Client state — a store

For state genuinely shared across screens, a store avoids threading props through a navigator. **Zustand** is the lightest option and needs no provider:

```ts
// src/features/cart/store.ts
import { create } from "zustand";

type CartItem = { id: string; name: string; price: number; quantity: number };

type CartStore = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  add: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      return existing
        ? {
            items: state.items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
            ),
          }
        : { items: [...state.items, { ...item, quantity: 1 }] };
    }),
  remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
}));
```

Select narrowly, so a component re-renders only when the slice it reads changes:

```tsx
// ✗ Re-renders on any cart change
const { items } = useCartStore();

// ✓ Re-renders only when the count changes
const count = useCartStore((s) => s.items.length);
```

That selector discipline is the single biggest performance lever when using a store.

### Server state — not a store

Data from an API is a **cache**, not state you own. It goes stale, needs refetching, can fail, and arrives asynchronously. TanStack Query models all of that; a store does not.

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["posts"],
  queryFn: fetchPosts,
});
```

See [Data Fetching](data-fetching.md) for the full treatment.

### Persisted state

Two storage options, chosen by sensitivity:

```ts
// Fast synchronous key-value — preferences, cached values, flags
import { MMKV } from "react-native-mmkv";
export const storage = new MMKV();

storage.set("theme", "dark");
const theme = storage.getString("theme");
```

```ts
// Encrypted — tokens, credentials, anything sensitive
import * as SecureStore from "expo-secure-store";

await SecureStore.setItemAsync("session_token", token);
const token = await SecureStore.getItemAsync("session_token");
```

MMKV is synchronous, which means no loading state for a preference read on startup. **Never put an auth token in MMKV** — it is not encrypted. Use SecureStore, which is backed by the iOS Keychain and Android Keystore.

Persisting a store slice is a few lines:

```ts
import { createJSONStorage, persist } from "zustand/middleware";

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({ theme: "system", setTheme: (theme) => set({ theme }) }),
    {
      name: "settings",
      storage: createJSONStorage(() => ({
        getItem: (name) => storage.getString(name) ?? null,
        setItem: (name, value) => storage.set(name, value),
        removeItem: (name) => storage.delete(name),
      })),
    },
  ),
);
```

### Comparison

| Library | Boilerplate | Provider needed | Best for |
|---|---|---|---|
| `useState` / `useReducer` | None | No | Local, and most things |
| **Zustand** | Very low | No | Most shared client state |
| **Jotai** | Low | Yes | Fine-grained atoms, derived values |
| **Redux Toolkit** | Moderate | Yes | Large teams, complex flows, time-travel debugging |
| **Context** | Low | Yes | Dependency injection, not frequently-changing state |

Context deserves a specific warning: every consumer re-renders when the value changes, with no selector escape hatch. It is the right tool for injecting a stable dependency — a client, a theme object, a session — and the wrong tool for state that changes often.

---

## Examples

Sorting one screen's state by kind:

```tsx
export default function CheckoutScreen() {
  // Local UI — nothing else needs it
  const [isPromoOpen, setPromoOpen] = useState(false);

  // Client — shared across screens
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  // Server — a cache, with its own loading and error states
  const { data: shipping, isLoading } = useQuery({
    queryKey: ["shipping", items.length],
    queryFn: () => fetchShippingOptions(items),
  });

  // Persisted — survives app restart
  const address = useSettingsStore((s) => s.defaultAddress);

  return (
    <View>
      <Pressable onPress={() => setPromoOpen((v) => !v)}>
        <Text>Promo code</Text>
      </Pressable>
      {isLoading ? <ActivityIndicator /> : <ShippingPicker options={shipping} />}
    </View>
  );
}
```

Four kinds, four homes, in one screen. No global store holding an API response, and no server data being manually invalidated.

---

## When to use

- `useState` by default. Promote to a store only when a second, unrelated screen genuinely needs the same value.
- **Zustand** for shared client state in most apps — no provider, small API, selector support.
- **Redux Toolkit** when the team is large enough that convention matters more than brevity, or when you need the devtools timeline.
- **MMKV** for preferences and non-sensitive cached values; **SecureStore** for anything a leak would compromise.
- **Context** for injecting stable dependencies — see [Dependency Injection](dependency-injection.md).

## When NOT to use

- Do not put server responses in a client store. You will end up rebuilding invalidation, retries, and staleness by hand.
- Do not put navigation state in a store — the navigator owns it.
- Do not put form state in a global store. It is local to the screen until submitted; see [Forms](forms.md).
- Do not use Context for values that change frequently — every consumer re-renders, and there is no way to subscribe to part of it.
- Do not subscribe to a whole store when you need one field. `useStore()` without a selector re-renders on every change.
- Do not store tokens or credentials in MMKV or AsyncStorage. Neither is encrypted.

---

## References

- [State — React Native](https://reactnative.dev/docs/state)
- [Managing State — React](https://react.dev/learn/managing-state)
- [Zustand — documentation](https://zustand.docs.pmnd.rs/)
- [TanStack Query — documentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Store data — Expo](https://docs.expo.dev/develop/user-interface/store-data/)
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)
