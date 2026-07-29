---
type: concept
tags:
  - language
  - svelte
  - typescript
  - frontend
  - component-driven
related:
  - languages/svelte/overview
  - languages/svelte/reactivity-and-runes
  - languages/svelte/forms
  - software-engineering/architecture/frontend/component-driven-architecture
language: "svelte"
---

# Components and Templates

> How Svelte UIs are built from `.svelte` components — markup, interpolation, template blocks, props, events, and snippets.

---

## What is it?

A Svelte **component** is a `.svelte` file containing a `<script>` (logic), markup (HTML plus Svelte's template syntax), and optional scoped `<style>`. The markup uses `{expression}` interpolation and **logic blocks** (`{#if}`, `{#each}`, `{#await}`) instead of directives. Components receive data through **props** (`$props`) and communicate outward through callback props or events.

---

## Why does it matter?

The template is where you spend most of your Svelte time, and its syntax changed in Svelte 5: props now use the `$props()` rune, and event handlers are plain attributes (`onclick`) rather than the old `on:click` directive. Knowing the current idioms — and the **snippet** feature that replaced slots — is essential to reading and writing modern Svelte.

---

## How it works

### Markup and interpolation

```svelte
<script lang="ts">
  let name = $state('Ada');
  let imageUrl = $state('/ada.png');
  let busy = $state(false);
</script>

<h1>{name}</h1>
<img src={imageUrl} alt={name} />          <!-- attribute binding -->
<button disabled={busy} onclick={() => (name = 'Grace')}>Rename</button>
```

Attributes bind with `{}`; there's a shorthand when the name matches: `<img {src} />`.

### Logic blocks

```svelte
{#if status === 'loading'}
  <p>Loading…</p>
{:else if status === 'error'}
  <p>Failed</p>
{:else}
  <p>Ready</p>
{/if}

{#each items as item (item.id)}      <!-- (item.id) is the keyed identity -->
  <li>{item.label}</li>
{:else}
  <li>No items</li>
{/each}

{#await promise}
  <p>Loading…</p>
{:then value}
  <p>{value}</p>
{:catch error}
  <p>{error.message}</p>
{/await}
```

The keyed `{#each ... (id)}` form gives items a stable identity so Svelte reuses/moves DOM nodes correctly — always key lists that can reorder.

### Props

Props are declared by destructuring `$props()`:

```svelte
<!-- UserCard.svelte -->
<script lang="ts">
  let { name, role = 'member', onselect }: {
    name: string;
    role?: string;
    onselect?: (name: string) => void;
  } = $props();
</script>

<article>
  {name} <small>{role}</small>
  <button onclick={() => onselect?.(name)}>Select</button>
</article>
```

The modern idiom for child → parent communication is a **callback prop** (`onselect` above). Svelte also supports DOM-style component events via `createEventDispatcher` (legacy) — but callback props are now preferred.

### Two-way binding

`bind:` creates two-way binding to form elements or component props:

```svelte
<input bind:value={name} />
<input type="checkbox" bind:checked={agreed} />
```

### Snippets (reusable markup)

**Snippets** are reusable chunks of markup — Svelte 5's replacement for slots. Define with `{#snippet}`, render with `{@render}`:

```svelte
<!-- Card.svelte -->
<script lang="ts">
  let { header, children } = $props();
</script>

<div class="card">
  <header>{@render header?.()}</header>
  {@render children?.()}
</div>
```

```svelte
<Card>
  {#snippet header()}<h3>Title</h3>{/snippet}
  <p>Body content.</p>
</Card>
```

---

## Examples

A keyed, interactive list with a callback prop:

```svelte
<script lang="ts">
  type User = { id: string; name: string };
  let { users, onpick }: { users: User[]; onpick: (u: User) => void } = $props();
</script>

<ul>
  {#each users as user (user.id)}
    <li onclick={() => onpick(user)}>{user.name}</li>
  {/each}
</ul>
```

---

## When to use

- Always — components and templates are the primary way to build Svelte UIs.
- Use `$props()` destructuring for the component contract and callback props for events.
- Use snippets for reusable markup and content projection (cards, layouts).
- Use `bind:` for form-element two-way binding.

## When NOT to use

- Don't omit the key in `{#each}` for lists that can reorder or be filtered — keyless each causes subtle bugs.
- Don't reach for the legacy `createEventDispatcher` in new code — prefer callback props.
- Don't put heavy computation directly in markup expressions — derive it with `$derived` (see [reactivity and runes](reactivity-and-runes.md)).

## References

- Svelte Team. [Basic markup](https://svelte.dev/docs/svelte/basic-markup). svelte.dev.
- Svelte Team. [`{#each}`, `{#if}`, `{#await}`](https://svelte.dev/docs/svelte/if). svelte.dev.
- Svelte Team. [Snippets](https://svelte.dev/docs/svelte/snippet). svelte.dev.
