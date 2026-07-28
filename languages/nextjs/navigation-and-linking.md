---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - concept
related:
  - languages/nextjs/app-router
  - languages/nextjs/layouts-and-pages
  - languages/react/routing
language: "nextjs"
---
# Navigation and Linking

> Use `<Link>` for declarative client-side navigation with automatic prefetching, and the `useRouter`/`redirect` APIs for programmatic navigation on the client and server.

---

## What is it?

Navigation in the App Router is client-side by default: moving between routes swaps only the changed segments without a full page reload. The **`<Link>`** component is the primary API (it also **prefetches** routes in the background); **`useRouter`** handles programmatic navigation in Client Components, and **`redirect`**/**`permanentRedirect`** handle it on the server.

---

## Why does it matter?

Client-side transitions with prefetching make a Next.js app feel instant. Using the right API — `<Link>` vs `useRouter` vs server `redirect` — in the right place keeps navigation fast, accessible, and correct (e.g., server redirects for auth happen before any client render).

---

## How it works

### Link (the default)

```tsx
import Link from "next/link";

<Link href="/dashboard">Dashboard</Link>
<Link href={`/blog/${slug}`} prefetch={false}>Read more</Link>
```

`<Link>` renders an `<a>` (accessible, right-click/open-in-new-tab work) and prefetches the target when it enters the viewport, so the destination is often already loaded on click.

### Programmatic navigation (Client Components)

```tsx
"use client";
import { useRouter } from "next/navigation"; // note: next/navigation, not next/router

export function SaveButton() {
  const router = useRouter();
  async function onSave() {
    await save();
    router.push("/done");     // navigate
    router.refresh();          // re-fetch Server Component data for the current route
  }
  return <button onClick={onSave}>Save</button>;
}
```

`router.push`/`replace`/`back`/`forward` control history; `router.refresh()` refetches server data without losing client state.

### Server-side redirects

In Server Components, Server Actions, and Route Handlers, use `redirect` — it throws to interrupt rendering and send the user elsewhere (e.g., unauthenticated → login).

```tsx
import { redirect } from "next/navigation";
export default async function Page() {
  const user = await getUser();
  if (!user) redirect("/login");
  return <Dashboard user={user} />;
}
```

### Reading the current route

```tsx
"use client";
import { usePathname, useSearchParams, useParams } from "next/navigation";
const pathname = usePathname();          // "/blog/hello"
const query = useSearchParams();         // ?tab=comments
```

### Active links

Compare `usePathname()` to `href` to style the active nav item.

---

## Examples

```tsx
// Accessible nav with active styling
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();
  const items = [["/", "Home"], ["/blog", "Blog"]] as const;
  return (
    <nav>
      {items.map(([href, label]) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
```

---

## When to use

- Use `<Link>` for all in-app navigation — it is accessible and prefetches.
- Use `useRouter` (from `next/navigation`) for navigation triggered by logic/events in Client Components; call `router.refresh()` to re-sync server data.
- Use `redirect`/`permanentRedirect` on the server for auth gating and post-action navigation.
- Use `usePathname`/`useSearchParams` to read route state and highlight active links.

## When NOT to use

- Do not use a raw `<a href>` for internal routes — you lose client-side transitions and prefetching.
- Do not import `useRouter` from `next/router` in the App Router — use `next/navigation`.
- Do not use client-side navigation for auth redirects that must happen before render — use server `redirect`.
- Do not disable prefetching globally without reason — it powers the instant feel.

---

## References

- [Next.js — Linking and Navigating](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating)
- [Next.js — `<Link>`](https://nextjs.org/docs/app/api-reference/components/link)
- [Next.js — useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)
- [Next.js — redirect](https://nextjs.org/docs/app/api-reference/functions/redirect)
