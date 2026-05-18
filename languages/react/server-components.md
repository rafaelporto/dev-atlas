# Server Components

> React Server Components (RSC) render on the server, never ship JavaScript to the client, and can directly access servers and databases. They redraw how you split client and server code in a React app.

---

## What is it?

A **React Server Component (RSC)** is a component that runs only on the server. It produces serialised UI sent to the client and rendered into the React tree. It cannot use state, effects, or browser APIs — those belong to **client components**, marked with `"use client"`.

The model is supported in **Next.js App Router**, **React Router v7+** (formerly Remix), and any framework built on the [React Server Components spec](https://react.dev/reference/rsc/server-components).

```tsx
// app/page.tsx — server component (default in App Router)
import { db } from "@/lib/db";

export default async function Page() {
  const posts = await db.posts.findMany();
  return <PostList posts={posts} />;
}
```

---

## Why does it matter?

RSC closes a gap that React had since its inception: how to render parts of the app on the server with full data access while keeping interactivity on the client. Benefits:

- **Zero client-side JS** for non-interactive UI — smaller bundles, faster TTI.
- **Direct data access** — no client API roundtrip for data the server already has.
- **Secret-safe** — database tokens and API keys live only on the server.
- **Streaming** — rendered HTML streams to the client as it's produced.

The cost: a new mental model for the client/server boundary.

---

## How it works

### Server vs client components

In the App Router, every component is a **server component by default**. To opt into a client component, add the `"use client"` directive at the top of the file:

```tsx
"use client";

import { useState } from "react";

export function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```

| | Server Component | Client Component |
|---|---|---|
| Runs on | Server | Server (SSR) + Browser |
| Can use `useState` / `useEffect` | No | Yes |
| Can `async/await` at the top level | Yes | No |
| Can access DB / file system / secrets | Yes | No |
| Can attach event handlers (`onClick`) | No | Yes |
| Ships JS to the browser | No | Yes |

### The boundary

A server component can render a client component, but not the other way around (a client component can render server components only as `children`, not as imports).

```tsx
// server.tsx
import ClientCounter from "./Counter";

export default async function Page() {
  const data = await fetchSomething();
  return (
    <div>
      <h1>{data.title}</h1>
      <ClientCounter />
    </div>
  );
}
```

### Server Actions

`"use server"` marks an async function as a server action — callable from a client component (e.g., a form submit) but executed on the server.

```tsx
// app/actions.ts
"use server";

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  await db.posts.insert({ title });
}

// app/new/page.tsx
"use client";

import { createPost } from "../actions";

export function NewPostForm() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button>Create</button>
    </form>
  );
}
```

### `use()` for promises

The `use()` hook can read promises and contexts. In server components, you can pass a promise to a client component and let `use()` unwrap it under a Suspense boundary:

```tsx
// server
const dataPromise = fetchData();
<Suspense fallback={<Spinner />}>
  <Details data={dataPromise} />
</Suspense>

// client
"use client";
import { use } from "react";

function Details({ data }: { data: Promise<Data> }) {
  const value = use(data);
  return <p>{value.name}</p>;
}
```

---

## Examples

### Data fetching at the page level

```tsx
// app/users/[id]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await db.users.findById(params.id);
  if (!user) notFound();

  return (
    <main>
      <h1>{user.name}</h1>
      <EditButton userId={user.id} />
    </main>
  );
}

// EditButton is a client component because it has onClick.
```

### Mutating with a server action

```tsx
// actions.ts
"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deletePost(postId: string) {
  await db.posts.delete(postId);
  revalidatePath("/posts");
}

// PostItem.tsx
"use client";
import { deletePost } from "./actions";

export function PostItem({ post }: { post: Post }) {
  return (
    <li>
      {post.title}
      <button onClick={() => deletePost(post.id)}>Delete</button>
    </li>
  );
}
```

---

## When to use

- Apps where most pages are dominated by data fetching and content display (blogs, dashboards, e-commerce listings).
- Pages that benefit from streaming and partial rendering.
- Apps where bundle size matters and most UI doesn't need to be interactive.
- New projects using Next.js App Router, React Router v7+, or other RSC-compatible frameworks.

---

## When NOT to use

- For highly interactive apps where almost everything needs `useState` or `useEffect` — the boundary becomes mostly `"use client"`, removing most of the benefit.
- For libraries shipped to non-RSC consumers — they need to work as plain client components.
- For small SPAs where Next.js / a fullstack framework would be overkill.
- Don't put third-party client libraries in server components — they will fail to import.

---

## References

- [Server Components — react.dev](https://react.dev/reference/rsc/server-components)
- [Server Actions — react.dev](https://react.dev/reference/rsc/server-functions)
- [Next.js — Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [`use()` reference — react.dev](https://react.dev/reference/react/use)
