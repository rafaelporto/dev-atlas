---
type: concept
tags:
  - language
  - svelte
  - typescript
  - reactive
  - state-management
related:
  - languages/svelte/overview
  - languages/svelte/stores
  - languages/svelte/components-and-templates
  - languages/angular/signals-and-change-detection
language: "svelte"
---

# Reactivity and Runes

> Svelte 5's reactivity model — the `$state`, `$derived`, and `$effect` runes that make values reactive explicitly, replacing the earlier compiler-magic syntax.

---

## What is it?

**Runes** are special functions (prefixed with `$`) that the Svelte compiler recognizes to declare reactivity. `$state` creates reactive state, `$derived` computes values from it, and `$effect` runs side effects when dependencies change. Introduced in **Svelte 5**, runes are the current reactivity model, replacing Svelte 3/4's implicit `let`-is-reactive and `$:` label syntax.

---

## Why does it matter?

In earlier Svelte, any top-level `let` in a component was reactive, and `$:` marked reactive statements — concise, but the rules were implicit and only worked *inside* `.svelte` files, not in shared `.ts` modules. Runes make reactivity **explicit and portable**: `$state`/`$derived` behave the same in a component or in a plain `.svelte.ts` module, and it's clear at a glance which values are reactive. This scales better and removes a class of "why didn't this update?" surprises.

---

## How it works

### `$state` — reactive state

```svelte
<script lang="ts">
  let count = $state(0);
  let user = $state({ name: 'Ada', age: 36 }); // deeply reactive
</script>

<button onclick={() => count++}>{count}</button>
<button onclick={() => user.age++}>Age: {user.age}</button>
```

`$state` makes a value reactive. Objects and arrays are deeply reactive — mutating `user.age` or pushing to an array triggers updates; you don't need immutable replacement.

### `$derived` — computed values

```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  // for multi-statement derivations, use $derived.by:
  let summary = $derived.by(() => {
    const label = count === 1 ? 'time' : 'times';
    return `${count} ${label}`;
  });
</script>
```

`$derived` recomputes automatically when the state it reads changes, and its result is cached — the equivalent of a computed value.

### `$effect` — side effects

```svelte
<script lang="ts">
  let count = $state(0);

  $effect(() => {
    // runs after render and re-runs when count changes
    document.title = `Count: ${count}`;
    return () => { /* optional cleanup before next run / on destroy */ };
  });
</script>
```

Use `$effect` for side effects (DOM APIs, subscriptions, logging) — **not** for deriving state (use `$derived`). Effects auto-track whatever reactive values they read.

### `$props` and `$bindable`

Props are a rune too, and a prop can be made two-way bindable:

```svelte
<script lang="ts">
  let { value = $bindable(''), label }: { value?: string; label: string } = $props();
</script>
<label>{label}<input bind:value /></label>
```

### Reactivity outside components

Because runes aren't tied to `.svelte` files, you can put reactive logic in a `.svelte.ts` module and import it — the basis for rune-based shared state (see [stores](stores.md)):

```typescript
// counter.svelte.ts
export function createCounter() {
  let count = $state(0);
  return {
    get count() { return count; },
    inc() { count++; },
  };
}
```

---

## Examples

A search filter derived from state — no manual subscriptions:

```svelte
<script lang="ts">
  let all = $state(['Ada', 'Alan', 'Grace', 'Linus']);
  let query = $state('');
  let filtered = $derived(
    all.filter((n) => n.toLowerCase().includes(query.toLowerCase())),
  );
</script>

<input bind:value={query} placeholder="Filter" />
<ul>
  {#each filtered as name (name)}<li>{name}</li>{/each}
</ul>
```

---

## When to use

- `$state` for any reactive component or module state — the default.
- `$derived` for values computed from state (filters, totals, formatted strings).
- `$effect` for side effects triggered by state change (DOM, storage, subscriptions).
- Rune-based `.svelte.ts` modules for shared reactive logic across components.

## When NOT to use

- Don't use `$effect` to compute derived state — use `$derived`; effects for derivation run extra times and are harder to reason about.
- Don't expect a plain `let` to be reactive in Svelte 5 — you must use `$state` (this differs from Svelte 3/4).
- Don't overuse `$effect` for logic that belongs in event handlers — prefer handling changes where they originate.

## References

- Svelte Team. [`$state`](https://svelte.dev/docs/svelte/$state). svelte.dev.
- Svelte Team. [`$derived`](https://svelte.dev/docs/svelte/$derived). svelte.dev.
- Svelte Team. [`$effect`](https://svelte.dev/docs/svelte/$effect). svelte.dev.
