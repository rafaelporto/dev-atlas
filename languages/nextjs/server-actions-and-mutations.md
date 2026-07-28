---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - concept
related:
  - languages/nextjs/server-and-client-components
  - languages/nextjs/data-fetching-and-caching
  - languages/react/forms
language: "nextjs"
---
# Server Actions and Mutations

> Server Actions are async functions marked `"use server"` that run on the server and can be called directly from forms and event handlers, giving type-safe mutations without hand-written API endpoints.

---

## What is it?

A **Server Action** is a function that executes on the server but is callable from client code as if it were local. Marked with the `"use server"` directive, it handles **mutations** — creating, updating, deleting data — directly from a `<form>` action or an event handler, and can then revalidate cached data or redirect. It replaces much of the boilerplate of building a REST endpoint plus a client fetch for every mutation.

---

## Why does it matter?

Traditionally a mutation means: write an API route, write a client `fetch`, wire loading/error state, and keep types in sync across the boundary. Server Actions collapse that into one typed function. They also integrate with the caching system (`revalidatePath`/`revalidateTag`) and work with progressive enhancement — forms submit even before JavaScript loads.

---

## How it works

### Defining a Server Action

```tsx
// app/todos/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export async function createTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  if (!title) throw new Error("title required"); // validate on the server
  await db.todo.create({ data: { title } });
  revalidatePath("/todos");                       // refresh cached list
}
```

### Calling from a form (progressive enhancement)

```tsx
// app/todos/page.tsx (Server Component)
import { createTodo } from "./actions";

export default function Todos() {
  return (
    <form action={createTodo}>
      <input name="title" />
      <button type="submit">Add</button>
    </form>
  );
}
```

The form works without client JavaScript; once hydrated, submission becomes a client-side call.

### Pending state and optimistic UI

Client Components use React hooks around actions:

```tsx
"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Saving…" : "Save"}</button>;
}
```

`useActionState` tracks the action's return value/errors; `useOptimistic` shows an immediate optimistic update.

### After a mutation: revalidate or redirect

- `revalidatePath("/path")` / `revalidateTag("tag")` — invalidate cached data so the next render is fresh.
- `redirect("/somewhere")` — navigate after success.

### Security

Server Actions are **public HTTP endpoints** under the hood. Always validate and authorize inside them — never trust the caller.

```tsx
"use server";
export async function deletePost(id: string) {
  const user = await requireUser();          // authenticate/authorize
  if (!(await canDelete(user, id))) throw new Error("forbidden");
  await db.post.delete({ where: { id } });
  revalidateTag("posts");
}
```

---

## Examples

```tsx
// Form with server-side validation surfaced back to the client via useActionState
"use client";
import { useActionState } from "react";
import { createTodo } from "./actions"; // action returns { error?: string }

export function TodoForm() {
  const [state, action] = useActionState(createTodo, {});
  return (
    <form action={action}>
      <input name="title" />
      {state.error && <p role="alert">{state.error}</p>}
      <button>Add</button>
    </form>
  );
}
```

---

## When to use

- Use Server Actions for mutations (create/update/delete) triggered by forms and interactions.
- Pair them with `revalidatePath`/`revalidateTag` to keep cached data consistent after a change.
- Use `useActionState`/`useFormStatus`/`useOptimistic` for pending and optimistic UX.
- Prefer them over hand-written API routes when the caller is your own Next.js UI.

## When NOT to use

- Do not skip validation/authorization inside an action — it is a public endpoint; treat all input as untrusted.
- Do not use Server Actions as a general public API for third parties — use Route Handlers for that.
- Do not perform long-running/background work in an action — offload to a queue/worker.
- Do not forget to revalidate affected caches, or the UI will show stale data after a mutation.

---

## References

- [Next.js — Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js — Forms and Mutations](https://nextjs.org/docs/app/guides/forms)
- [React — `useActionState`](https://react.dev/reference/react/useActionState)
- [React — `"use server"`](https://react.dev/reference/rsc/use-server)
