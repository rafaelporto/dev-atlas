---
type: concept
tags:
  - language
  - svelte
  - typescript
  - state-management
related:
  - languages/svelte/reactivity-and-runes
  - languages/svelte/overview
  - languages/vue/state-management
  - software-engineering/architecture/frontend/state-management-architecture
language: "svelte"
---

# Stores and Shared State

> Sharing state across Svelte components — the classic store contract (`writable`, `readable`, `derived`) and the modern rune-based approach.

---

## What is it?

A Svelte **store** is an object holding a value that components can subscribe to and that updates the UI when it changes. The built-in stores — `writable`, `readable`, and `derived` from `svelte/store` — implement a simple subscription contract. In **Svelte 5**, much shared state is instead expressed with **runes** in `.svelte.ts` modules; stores remain fully supported and useful for stream-like values.

---

## Why does it matter?

Components need to share state — a logged-in user, a theme, a cart — without threading props through every level. Stores gave Svelte a clean, framework-native way to do this long before runes existed, with an elegant `$store` auto-subscription syntax in templates. With runes, you now have two good options; knowing which fits (runes for most app state, stores for subscription/stream semantics and interop) keeps shared state simple.

---

## How it works

### Writable stores

```typescript
// stores/count.ts
import { writable } from 'svelte/store';

export const count = writable(0);

export function increment() {
  count.update((n) => n + 1);
}
```

Any component can use it. The `$` prefix **auto-subscribes** in a component and unsubscribes on destroy:

```svelte
<script lang="ts">
  import { count, increment } from '@/stores/count';
</script>

<button onclick={increment}>{$count}</button>   <!-- $count reads the value -->
```

Outside a component (or manually), you subscribe explicitly and must unsubscribe:

```typescript
const unsub = count.subscribe((v) => console.log(v));
// ...later
unsub();
```

### Derived stores

`derived` builds a store from one or more others:

```typescript
import { writable, derived } from 'svelte/store';

export const items = writable<Item[]>([]);
export const total = derived(items, ($items) =>
  $items.reduce((sum, i) => sum + i.price, 0),
);
```

### Readable stores

`readable` exposes a value that consumers can't write — ideal for wrapping an external source (a timer, a websocket) with setup/teardown:

```typescript
import { readable } from 'svelte/store';

export const now = readable(new Date(), (set) => {
  const id = setInterval(() => set(new Date()), 1000);
  return () => clearInterval(id); // cleanup when the last subscriber leaves
});
```

### Rune-based shared state (Svelte 5)

For most application state, a rune-based module is now idiomatic and avoids the `$`/subscription model entirely:

```typescript
// stores/cart.svelte.ts
class CartState {
  items = $state<Item[]>([]);
  get total() { return this.items.reduce((s, i) => s + i.price, 0); }
  add(item: Item) { this.items.push(item); }
  clear() { this.items = []; }
}

export const cart = new CartState();
```

```svelte
<script lang="ts">
  import { cart } from '@/stores/cart.svelte';
</script>

<p>{cart.items.length} items — {cart.total}</p>
<button onclick={() => cart.clear()}>Clear</button>
```

---

## Examples

Choosing between the two models:

```
   ┌── Is the value a stream / needs subscribe-unsubscribe semantics
   │    (timer, websocket, RxJS interop, third-party source)? ──┐
   │                                                             │
  yes → svelte/store (writable/readable/derived)      no → rune-based .svelte.ts
```

Both are reactive and both work app-wide; runes are the simpler default for plain shared state, stores shine for subscription-based sources.

---

## When to use

- **Rune-based `.svelte.ts` modules** for most shared application state (user, cart, UI flags) in Svelte 5.
- **`writable`/`derived` stores** for shared state where the store contract or `$` auto-subscription is convenient, and for library/legacy interop.
- **`readable` stores** to wrap external sources (timers, sockets) with clean setup/teardown.

## When NOT to use

- Don't reach for a global store when a prop or a small piece of local `$state` would do.
- Don't put server-fetched data in a store and hand-manage freshness — treat server state as a cache (see [state management architecture](../../software-engineering/architecture/frontend/state-management-architecture.md)).
- Don't manually subscribe to a store in a component when the `$store` auto-subscription handles it — manual subscriptions risk leaks.

## References

- Svelte Team. [Stores](https://svelte.dev/docs/svelte/stores). svelte.dev.
- Svelte Team. [`$state`](https://svelte.dev/docs/svelte/$state). svelte.dev.
- Svelte Team. [Shared state](https://svelte.dev/docs/svelte/state-management). svelte.dev.
