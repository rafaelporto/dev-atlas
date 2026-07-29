---
type: concept
tags:
  - language
  - svelte
  - typescript
  - frontend
related:
  - languages/svelte/overview
  - languages/svelte/project-setup
  - languages/svelte/data-fetching
  - languages/nextjs/app-router
language: "svelte"
---

# Routing

> SvelteKit's filesystem-based router — how directories and `+page`/`+layout` files under `src/routes` map to URLs, with nested layouts and dynamic segments.

---

## What is it?

Routing in the Svelte world is provided by **SvelteKit** through a **filesystem-based router**. The folder structure under `src/routes` *is* the route table: a directory becomes a URL segment, and special files (`+page.svelte`, `+layout.svelte`, `+server.ts`) define what renders and runs there. There's no separate route configuration file.

---

## Why does it matter?

Filesystem routing makes an app's URL structure visible at a glance — you navigate the routes by navigating folders. It also ties directly into SvelteKit's rendering and [data loading](data-fetching.md): each route can have a `load` function, choose SSR or prerendering, and share layout and data with its parent. This convention-over-configuration approach is the same idea behind Next.js's App Router.

---

## How it works

### Files map to routes

```
src/routes/
├── +layout.svelte          # wraps every page (nav, shell)
├── +page.svelte            # "/"
├── about/
│   └── +page.svelte        # "/about"
├── blog/
│   ├── +page.svelte        # "/blog"
│   └── [slug]/
│       ├── +page.svelte    # "/blog/:slug"
│       └── +page.ts        # load() for that page's data
└── api/
    └── health/+server.ts   # GET/POST endpoint at "/api/health"
```

Key file types:

| File | Role |
|---|---|
| `+page.svelte` | The page component for that route |
| `+layout.svelte` | Shared wrapper for the folder and its children |
| `+page.ts` / `+page.server.ts` | `load` function providing the page's data |
| `+server.ts` | An API endpoint (returns a `Response`, not UI) |

### Dynamic segments

Brackets denote parameters: `[slug]` matches one segment, `[...rest]` matches the rest of the path. Params arrive typed in the `load` function:

```typescript
// src/routes/blog/[slug]/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
  const post = await fetch(`/api/posts/${params.slug}`).then((r) => r.json());
  return { post }; // available to +page.svelte as `data`
};
```

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  let { data } = $props();   // typed via ./$types
</script>
<h1>{data.post.title}</h1>
```

### Navigation

Links are plain `<a>` tags — SvelteKit intercepts them for client-side navigation automatically (no special component needed):

```svelte
<a href="/blog">Blog</a>
```

For programmatic navigation, use `goto`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
</script>
<button onclick={() => goto('/dashboard')}>Go</button>
```

### Nested layouts

A `+layout.svelte` wraps its folder's pages and renders children via `{@render children()}`:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  let { children } = $props();
</script>
<nav><a href="/">Home</a> <a href="/about">About</a></nav>
{@render children()}
```

---

## Examples

An API endpoint alongside pages, in the same route tree:

```typescript
// src/routes/api/todos/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const todos = await db.listTodos();
  return json(todos);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const created = await db.addTodo(body);
  return json(created, { status: 201 });
};
```

---

## When to use

- Any SvelteKit application — filesystem routing is the built-in, recommended approach.
- Use `[param]`/`[...rest]` for dynamic routes and read them in typed `load` functions.
- Use `+layout.svelte` to share UI and data across a section of the app.
- Use `+server.ts` to colocate API endpoints with your routes.

## When NOT to use

- A plain Svelte + Vite app (without SvelteKit) has no built-in router — add a client router library (e.g. `svelte-routing`) or adopt SvelteKit.
- Don't hand-roll route matching in a SvelteKit app — the filesystem router already handles it.

## References

- Svelte Team. [Routing](https://svelte.dev/docs/kit/routing). svelte.dev.
- Svelte Team. [Advanced routing](https://svelte.dev/docs/kit/advanced-routing). svelte.dev.
- Svelte Team. [Loading data](https://svelte.dev/docs/kit/load). svelte.dev.
