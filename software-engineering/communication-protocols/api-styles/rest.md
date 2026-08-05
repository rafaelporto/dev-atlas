---
type: concept
tags:
  - concept
  - networking
related:
  - software-engineering/communication-protocols/api-styles/grpc
  - software-engineering/communication-protocols/api-styles/graphql
  - software-engineering/communication-protocols/http/http
  - software-engineering/communication-protocols/overview
language: null
---
# REST — Representational State Transfer

> An architectural style for HTTP APIs that models everything as resources addressed by URLs and manipulated with standard HTTP verbs, keeping each request stateless and self-contained.

---

## What is it?

**REST** is a way of designing web APIs around **resources** — things like an order, a user, or a product — each identified by a URL, and acted on with the standard [HTTP](../http/http.md) methods: `GET` to read, `POST` to create, `PUT`/`PATCH` to update, `DELETE` to remove. The server returns a **representation** of the resource (usually JSON) plus a status code describing the outcome.

It is the default style for public web APIs precisely because it leans entirely on HTTP that everyone already understands, needs no special tooling, and is easy to explore with a browser or `curl`.

## Why does it matter?

REST became dominant because it turns HTTP's existing vocabulary into a consistent API convention:

- **Uniform interface** — once you know the verbs and status codes, every REST API feels familiar. `GET /orders/42` means the same thing everywhere.
- **Statelessness** — each request carries everything the server needs, so any server instance can handle it. That makes horizontal scaling and caching straightforward.
- **Cacheability** — `GET` responses can be cached by browsers, CDNs, and proxies using standard HTTP headers, with no custom logic.
- **Ubiquity and tooling** — every language, framework, and HTTP client speaks it; it passes through every proxy and firewall.

The trade-offs: the client fetches whole resource representations (leading to over-fetching, or many round-trips to assemble a view — the problems [GraphQL](graphql.md) targets), and the contract is conventional rather than enforced, so it is easy to drift or break silently without discipline (schemas like OpenAPI help).

## How it works

Design a URL per resource (and per collection), then map operations onto HTTP verbs:

```
Verb + URL                     Meaning                          Typical status
─────────────────────────────  ───────────────────────────────  ──────────────
GET    /orders                 list orders (collection)          200 OK
POST   /orders                 create a new order                201 Created
GET    /orders/42              read one order                    200 OK / 404
PUT    /orders/42              replace order 42                   200 OK / 204
PATCH  /orders/42              partially update order 42          200 OK
DELETE /orders/42              delete order 42                    204 No Content
```

Principles that distinguish REST from "HTTP with random URLs":

- **Resources, not actions** — the noun is in the URL (`/orders/42`), the verb is the HTTP method. Avoid `POST /createOrder`.
- **Statelessness** — no server-side session tied to the connection; auth travels in each request (token/header).
- **Proper status codes** — `2xx` success, `4xx` client error, `5xx` server error — instead of always returning `200` with an error body.
- **HATEOAS** (the strictest level) — responses embed links to related actions/resources, so clients navigate the API rather than hard-coding URLs. Widely described, less widely implemented.
- **Representations** — the same resource can be returned as JSON, XML, etc., negotiated via the `Accept` header.

## Examples

A minimal REST endpoint: read an order by id, and create one. Note the payloads use fields like `id`, `item`, and `status` — never address-shaped values.

### Go

```go
// GET /orders/42  and  POST /orders
http.HandleFunc("/orders/", func(w http.ResponseWriter, r *http.Request) {
    id := strings.TrimPrefix(r.URL.Path, "/orders/")
    switch r.Method {
    case http.MethodGet:
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]any{"id": id, "item": "book", "status": "shipped"})
    case http.MethodPost:
        var body map[string]any
        json.NewDecoder(r.Body).Decode(&body)
        w.WriteHeader(http.StatusCreated) // 201
        json.NewEncoder(w).Encode(map[string]any{"id": "43", "item": body["item"]})
    }
})
http.ListenAndServe(":8080", nil)
```

### TypeScript (Node.js — Express)

```ts
import express from "express";
const app = express();
app.use(express.json());

// Read one resource
app.get("/orders/:id", (req, res) => {
  res.json({ id: req.params.id, item: "book", status: "shipped" });
});

// Create a resource → 201 Created
app.post("/orders", (req, res) => {
  const created = { id: "43", item: req.body.item };
  res.status(201).json(created);
});

app.listen(8080);
```

### Java (Spring Web)

```java
@RestController
@RequestMapping("/orders")
class OrderController {

    @GetMapping("/{id}")
    Map<String, Object> get(@PathVariable String id) {
        return Map.of("id", id, "item", "book", "status", "shipped");
    }

    @PostMapping
    ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        var created = Map.<String, Object>of("id", "43", "item", body.get("item"));
        return ResponseEntity.status(HttpStatus.CREATED).body(created); // 201
    }
}
```

### C# (ASP.NET Core minimal API)

```csharp
var app = WebApplication.Create();

app.MapGet("/orders/{id}", (string id) =>
    Results.Ok(new { id, item = "book", status = "shipped" }));

app.MapPost("/orders", (CreateOrder body) =>
    Results.Created($"/orders/43", new { id = "43", item = body.Item })); // 201

app.Run("http://localhost:8080");

record CreateOrder(string Item);
```

## When to use

- **Public and partner APIs** where broad compatibility, discoverability, and easy debugging matter.
- **CRUD-shaped domains** that map naturally onto resources and verbs.
- When you want to **leverage HTTP caching** (CDNs, browser cache) for read-heavy endpoints.
- As the **safe default** — most APIs should start here and only move to gRPC/GraphQL for a specific reason.

## When NOT to use

- **Chatty client views** that need to stitch together many resources — the round-trips or over-fetching hurt; consider [GraphQL](graphql.md).
- **High-performance internal service-to-service** calls needing strict contracts, binary efficiency, and streaming — consider [gRPC](grpc.md).
- **Real-time push** — REST is request/response; use [SSE](../http/sse.md) or [WebSocket](../http/websocket.md).

## References

- Fielding, Roy T. [*Architectural Styles and the Design of Network-based Software Architectures*](https://ics.uci.edu/~fielding/pubs/dissertation/top.htm), 2000 — the dissertation that defined REST.
- [MDN — HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) — the verbs REST relies on.
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) — the de-facto way to give REST APIs a machine-readable contract.
