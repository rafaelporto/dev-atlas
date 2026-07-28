---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - backend
  - concept
related:
  - languages/nextjs/app-router
  - languages/nextjs/middleware
  - languages/nodejs/http-and-web-servers
language: "nextjs"
---
# Route Handlers

> Route Handlers (`route.ts`) define HTTP API endpoints inside the App Router using the Web `Request`/`Response` APIs, for cases where a Server Action isn't the right fit.

---

## What is it?

A **Route Handler** is a file named `route.ts` (or `.js`) that exports functions named after HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, …). Each receives a standard Web `Request` and returns a Web `Response`. It is how you build a **public HTTP API** in Next.js — webhooks, third-party integrations, REST/JSON endpoints — as opposed to Server Actions, which are for your own UI's mutations.

---

## Why does it matter?

Not every server interaction is a form mutation. Webhooks, OAuth callbacks, endpoints consumed by mobile apps or external clients, file downloads, and streaming responses all need a real HTTP endpoint with a URL. Route Handlers provide that using web-standard primitives, so the knowledge transfers to other runtimes (edge, Deno, browsers).

---

## How it works

### A basic handler

```ts
// app/api/health/route.ts  →  GET /api/health
export async function GET() {
  return Response.json({ status: "ok" });
}
```

### Reading input

```ts
// app/api/users/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const user = await createUser(body); // validate before trusting `body`!
  return Response.json(user, { status: 201 });
}

// app/api/users/[id]/route.ts  →  GET /api/users/:id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url); // query string
  const user = await getUser(id);
  return user ? Response.json(user) : new Response("Not found", { status: 404 });
}
```

### Caching

`GET` handlers can be cached; opt into dynamic behavior explicitly.

```ts
export const dynamic = "force-dynamic"; // never cache this handler
export const revalidate = 60;            // or cache with ISR-style revalidation
```

### Streaming responses

Return a `ReadableStream` for Server-Sent Events or incremental output.

```ts
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("data: hello\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream" },
  });
}
```

### Route Handlers vs Server Actions

| Use a **Route Handler** when… | Use a **Server Action** when… |
|---|---|
| External clients / webhooks / mobile call it | Your own Next.js UI triggers a mutation |
| You need a stable URL and HTTP semantics | You submit a form or handle an interaction |
| Streaming / custom headers / non-JSON responses | You want revalidation + progressive enhancement |

---

## Examples

```ts
// Webhook endpoint with signature verification and validation
export async function POST(request: Request) {
  const signature = request.headers.get("x-signature") ?? "";
  const raw = await request.text();
  if (!verifySignature(raw, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }
  const event = JSON.parse(raw);
  await handleEvent(event);
  return new Response(null, { status: 204 });
}
```

---

## When to use

- Use Route Handlers for public APIs, webhooks, OAuth callbacks, and endpoints consumed by non-Next.js clients.
- Use them for streaming responses, custom headers/content types, and file downloads.
- Validate and authorize every request; treat all input as untrusted.
- Set caching (`dynamic`/`revalidate`) explicitly based on the endpoint's freshness needs.

## When NOT to use

- Do not build a Route Handler + client fetch for a mutation your own UI triggers — a Server Action is simpler.
- Do not skip input validation and auth — handlers are public endpoints.
- Do not do heavy/long-running work inline — offload to a queue and return quickly (especially for webhooks).
- Do not assume `GET` handlers are always fresh — they may be cached; be explicit.

---

## References

- [Next.js — Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js — Route Handler API reference](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [MDN — Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
- [MDN — Response](https://developer.mozilla.org/en-US/docs/Web/API/Response)
