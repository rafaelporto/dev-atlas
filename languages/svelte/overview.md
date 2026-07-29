---
type: concept
tags:
  - language
  - svelte
  - typescript
  - frontend
  - overview
related:
  - languages/svelte/project-setup
  - languages/svelte/components-and-templates
  - languages/svelte/reactivity-and-runes
  - software-engineering/architecture/frontend/frontend-stacks-and-tooling
language: "svelte"
---

# Svelte

> Svelte is a compiler-first UI framework: it turns your components into small, efficient JavaScript at build time, with no virtual DOM and no framework runtime shipped to keep the DOM in sync.

---

## What is it?

**Svelte** is a framework for building user interfaces that works as a **compiler**. Instead of shipping a runtime library that diffs a virtual DOM in the browser (as React does), Svelte compiles each component at build time into imperative JavaScript that surgically updates the DOM. You write components in `.svelte` files — HTML markup, a `<script>`, and `<style>` — and the compiler does the heavy lifting.

The current major version, **Svelte 5**, introduced **runes** (`$state`, `$derived`, `$effect`) — explicit reactivity primitives that replace the older compiler-magic syntax. **SvelteKit** is the official application framework built on Svelte, providing routing, SSR, and data loading.

---

## Why does it matter?

Svelte's compiler-first approach means there's very little framework code in the browser: bundles are small and updates are fast because they're direct DOM operations, not virtual-DOM reconciliation. The authoring experience is famously concise — a Svelte component is often noticeably shorter than its React or Vue equivalent, with reactivity, scoped styles, and templating built into the language rather than added through APIs.

The trade-off is a smaller (though fast-growing) ecosystem than React's, and — because reactivity is a language feature the compiler transforms — a model that behaves a little differently from plain JavaScript. Svelte 5's runes were introduced partly to make that reactivity more explicit and predictable.

---

## How it works

### A Svelte component

```svelte
<script lang="ts">
  let count = $state(0);              // reactive state (rune)
  let doubled = $derived(count * 2);  // derived value (rune)
</script>

<button onclick={() => count++}>Clicked {count} times</button>
{#if count > 5}
  <p>That's {doubled} doubled.</p>
{/if}

<style>
  button { font: inherit; }   /* scoped to this component automatically */
</style>
```

- The `<script>` holds logic; `$state`/`$derived` make values reactive.
- The markup is HTML with template blocks (`{#if}`, `{#each}`) and `{expression}` interpolation.
- `<style>` is automatically **scoped** to the component.

### Compile time, not runtime

```
   .svelte files  ──►  Svelte compiler  ──►  small, targeted JS
                        (build step)          (direct DOM updates,
                                               no VDOM, no runtime diffing)
```

Because the framework "disappears" into compiled output, there's no per-component runtime overhead and the shipped bundle is lean.

### Runes (Svelte 5)

Runes are compiler-recognized functions (prefixed with `$`) that declare reactivity explicitly:

- `$state(value)` — reactive state.
- `$derived(expr)` — a value computed from state, recomputed automatically.
- `$effect(fn)` — a side effect that re-runs when its dependencies change.
- `$props()` — declare component props.

See [reactivity and runes](reactivity-and-runes.md) for details.

### SvelteKit

For full applications, **SvelteKit** adds filesystem-based [routing](routing.md), server-side rendering, [data loading](data-fetching.md), and form actions — the equivalent role Next.js plays for React or Nuxt for Vue.

---

## Examples

A list with props and an event, using runes:

```svelte
<script lang="ts">
  let { title }: { title: string } = $props();
  let names = $state(['Ada', 'Grace', 'Linus']);
  let selected = $state<string | null>(null);
</script>

<h2>{title}</h2>
<ul>
  {#each names as name (name)}
    <li onclick={() => (selected = name)}>{name}</li>
  {/each}
</ul>
<p>Selected: {selected ?? 'none'}</p>
```

---

## When to use

- Performance- and size-sensitive apps — small bundles and fast, direct DOM updates.
- Teams that value concise, low-boilerplate components and an integrated authoring experience.
- Full-stack apps via SvelteKit when you want SSR/SSG and file-based routing.
- Interactive widgets embedded in other pages, where a tiny footprint matters.

## When NOT to use

- Projects that depend heavily on a specific ecosystem/library that only exists for React/Angular.
- Organizations already standardized on another framework where hiring and tooling favor it.
- When you need the largest possible pool of third-party components and integrations — React's ecosystem is bigger.

## References

- Svelte Team. [Svelte — Official Documentation](https://svelte.dev/docs/svelte/overview). svelte.dev.
- Svelte Team. [Introducing runes](https://svelte.dev/blog/runes). svelte.dev.
- Svelte Team. [SvelteKit](https://svelte.dev/docs/kit/introduction). svelte.dev.
