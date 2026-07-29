---
type: concept
tags:
  - language
  - svelte
  - typescript
  - frontend
related:
  - languages/svelte/components-and-templates
  - languages/svelte/data-fetching
  - languages/react/forms
language: "svelte"
---

# Forms

> Handling input in Svelte with `bind:` two-way binding, and building robust, JS-optional forms with SvelteKit form actions and progressive enhancement.

---

## What is it?

Svelte handles form input two ways. For client-side state, **`bind:`** creates two-way binding between form elements and reactive `$state`. For submitting data to the server, SvelteKit provides **form actions** — server functions defined in `+page.server.ts` that handle `<form>` submissions and work **with or without JavaScript**, enhanced progressively with the `use:enhance` action.

---

## Why does it matter?

Form actions are one of SvelteKit's standout features: because the form posts to the server the standard HTML way, the form works even before (or without) JavaScript loads — then `use:enhance` upgrades it to a smooth, no-reload experience. This **progressive enhancement** gives resilience and accessibility for free, and keeps validation logic on the server where it's authoritative. Knowing both the client (`bind:`) and server (actions) halves is essential.

---

## How it works

### Client-side binding

```svelte
<script lang="ts">
  let name = $state('');
  let agreed = $state(false);
  let role = $state('member');
</script>

<input bind:value={name} />
<input type="checkbox" bind:checked={agreed} />
<select bind:value={role}>
  <option value="member">Member</option>
  <option value="admin">Admin</option>
</select>
```

`bind:` keeps the variable and the input in sync both ways. `bind:group` handles radio/checkbox groups.

### Server form actions

Define named (or a `default`) action in `+page.server.ts`; it receives the submitted `FormData`:

```typescript
// src/routes/signup/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const name = String(data.get('name') ?? '');

    if (!name) {
      return fail(400, { name, error: 'Name is required' }); // back to the page
    }

    await db.createUser({ name });
    throw redirect(303, '/welcome');
  },
};
```

The matching page posts to it with a plain form:

```svelte
<!-- src/routes/signup/+page.svelte -->
<script lang="ts">
  let { form } = $props(); // the action's returned data (e.g. errors)
</script>

<form method="POST">
  <input name="name" value={form?.name ?? ''} />
  {#if form?.error}<small>{form.error}</small>{/if}
  <button>Sign up</button>
</form>
```

This already works with JavaScript disabled — a full page POST, server validation, and redirect.

### Progressive enhancement

Add `use:enhance` to upgrade the same form to submit via fetch, without a full page reload, keeping the no-JS behavior as a fallback:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<form method="POST" use:enhance>
  <input name="name" value={form?.name ?? ''} />
  {#if form?.error}<small>{form.error}</small>{/if}
  <button>Sign up</button>
</form>
```

`use:enhance` can also take a callback to customize the pending/complete UI (spinners, optimistic updates).

---

## Examples

Multiple named actions on one page (e.g. a todo list with add and delete):

```typescript
export const actions: Actions = {
  add: async ({ request }) => {
    const text = String((await request.formData()).get('text') ?? '');
    await db.addTodo(text);
    return { success: true };
  },
  delete: async ({ request }) => {
    const id = String((await request.formData()).get('id') ?? '');
    await db.deleteTodo(id);
    return { success: true };
  },
};
```

```svelte
<form method="POST" action="?/add" use:enhance>
  <input name="text" /><button>Add</button>
</form>
```

---

## When to use

- Use `bind:` for client-side form state and interactive inputs.
- Use **SvelteKit form actions** for anything submitted to the server — you get server-authoritative validation and no-JS resilience.
- Add `use:enhance` to keep the UX smooth while preserving the progressive-enhancement fallback.
- Use named actions when a page has multiple distinct submissions.

## When NOT to use

- Don't bypass form actions with a hand-rolled `fetch` POST for standard form submission — you lose progressive enhancement.
- Don't rely only on client-side validation — validate in the action; the client checks are a UX nicety, not the source of truth.
- For a purely client-side widget (no server), `bind:` alone is enough — actions aren't needed.

## References

- Svelte Team. [Form actions](https://svelte.dev/docs/kit/form-actions). svelte.dev.
- Svelte Team. [`bind:`](https://svelte.dev/docs/svelte/bind). svelte.dev.
- Svelte Team. [Progressive enhancement with `use:enhance`](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement). svelte.dev.
