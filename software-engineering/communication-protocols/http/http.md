---
type: concept
tags:
  - concept
  - networking
related:
  - software-engineering/communication-protocols/transport/tcp
  - software-engineering/communication-protocols/transport/quic
  - software-engineering/communication-protocols/api-styles/rest
  - software-engineering/communication-protocols/http/websocket
  - software-engineering/communication-protocols/overview
language: null
---
# HTTP — HyperText Transfer Protocol

> The request/response application protocol of the web — a stateless, text-semantic protocol whose wire format evolved from plain text (1.1) to binary multiplexing (2) to a QUIC-based transport (3).

---

## What is it?

**HTTP** is the protocol a client (usually a browser or an app) uses to ask a server for a resource and receive a response. Every request has a **method** (`GET`, `POST`, …), a **URL**, **headers**, and an optional **body**; every response has a **status code** (`200`, `404`, …), headers, and a body. It is **stateless**: each request is self-contained, and the server keeps no memory of previous requests unless the application adds it (cookies, tokens).

Those *semantics* — methods, status codes, headers — have stayed remarkably stable while the *wire format* underneath has been reinvented three times for performance.

## Why does it matter?

HTTP is the lingua franca of the internet. It is understood by every browser, proxy, load balancer, CDN, and firewall, which is why so many higher-level styles ([REST](../api-styles/rest.md), [GraphQL](../api-styles/graphql.md), [gRPC](../api-styles/grpc.md)) and protocols ([WebSocket](websocket.md), [SSE](sse.md)) are built on or bootstrapped from it. If you build networked software, you are building on HTTP more often than not.

Understanding its versions matters because they have very different performance characteristics, and the differences explain real production behavior — why bundling assets mattered in the HTTP/1.1 era, why it stopped mattering with HTTP/2, and why HTTP/3 helps on lossy mobile networks.

## How it works

**Stateless request/response** over a transport connection:

```
Request                                Response
─────────────────────────────         ─────────────────────────────
GET /orders/42 HTTP/1.1                HTTP/1.1 200 OK
Host: api.example                      Content-Type: application/json
Accept: application/json               Content-Length: 39

(no body)                              {"id":42,"status":"shipped"}
```

The semantics above are version-independent. What changed across versions is how those messages are put on the wire:

| Version | Year | Transport | Key change | Main win |
|---|---|---|---|---|
| **HTTP/1.1** | 1997 | [TCP](../transport/tcp.md) | Text protocol, persistent connections, one request at a time per connection | Simplicity, universality |
| **HTTP/2** | 2015 | TCP | Binary framing, **multiplexing** many streams on one connection, header compression (HPACK), server push | Concurrency without many connections |
| **HTTP/3** | 2022 | [QUIC](../transport/quic.md) (UDP) | Same semantics, moved onto QUIC | No TCP head-of-line blocking, faster setup, connection migration |

```
HTTP/1.1: one request in flight per TCP connection (browsers open ~6)
          ├── req A ──► ◄── res A ──┤
                                    ├── req B ──► ◄── res B ──┤   (serialized)

HTTP/2:   many streams multiplexed on ONE TCP connection
          ├─ stream1 ─►
          ├─ stream2 ─►   interleaved frames    (but one TCP loss stalls all — HoL)
          ├─ stream3 ─►

HTTP/3:   many streams over QUIC, each delivered independently
          ├─ stream1 ─►
          ├─ stream2 ─►   a loss on stream2 does NOT stall stream1/stream3
          ├─ stream3 ─►
```

The recurring theme: **HTTP/1.1** serializes requests per connection (so the old workaround was opening several connections and bundling assets); **HTTP/2** multiplexes them but inherits TCP's head-of-line blocking; **HTTP/3** removes that by running on QUIC.

## Examples

A minimal HTTP server that returns JSON, plus a client that fetches it. Standard-library HTTP in each language negotiates the protocol version with the peer; the code you write is the same regardless of 1.1/2/3.

### Go

```go
// Server
http.HandleFunc("/orders/42", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"id":42,"status":"shipped"}`))
})
http.ListenAndServe(":8080", nil)

// Client
resp, _ := http.Get("http://localhost:8080/orders/42")
defer resp.Body.Close()
body, _ := io.ReadAll(resp.Body)
fmt.Println(resp.StatusCode, string(body)) // 200 {"id":42,"status":"shipped"}
```

### TypeScript (Node.js)

```ts
import http from "node:http";

// Server
http.createServer((req, res) => {
  if (req.url === "/orders/42") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: 42, status: "shipped" }));
  }
}).listen(8080);

// Client (global fetch, Node 18+)
const resp = await fetch("http://localhost:8080/orders/42");
console.log(resp.status, await resp.json()); // 200 { id: 42, status: 'shipped' }
```

### Java

```java
// Server (com.sun.net.httpserver, JDK built-in)
var server = HttpServer.create(new InetSocketAddress(8080), 0);
server.createContext("/orders/42", exchange -> {
    byte[] body = "{\"id\":42,\"status\":\"shipped\"}".getBytes();
    exchange.getResponseHeaders().add("Content-Type", "application/json");
    exchange.sendResponseHeaders(200, body.length);
    try (var os = exchange.getResponseBody()) { os.write(body); }
});
server.start();

// Client (java.net.http.HttpClient, HTTP/2 by default)
HttpClient client = HttpClient.newHttpClient();
HttpResponse<String> resp = client.send(
    HttpRequest.newBuilder(URI.create("http://localhost:8080/orders/42")).build(),
    HttpResponse.BodyHandlers.ofString());
System.out.println(resp.statusCode() + " " + resp.body());
```

### C#

```csharp
// Server (ASP.NET Core minimal API)
var app = WebApplication.Create();
app.MapGet("/orders/42", () => Results.Json(new { id = 42, status = "shipped" }));
app.Run("http://localhost:8080");

// Client (HttpClient, negotiates HTTP/2 or HTTP/3 when available)
using var client = new HttpClient();
var resp = await client.GetAsync("http://localhost:8080/orders/42");
Console.WriteLine((int)resp.StatusCode + " " + await resp.Content.ReadAsStringAsync());
```

## When to use

- **Almost every request/response interaction** on the web and between services — fetching data, submitting forms, calling APIs.
- As the foundation for higher-level styles: [REST](../api-styles/rest.md), [GraphQL](../api-styles/graphql.md), and [gRPC](../api-styles/grpc.md) all ride on HTTP.
- When you need **maximum reach and compatibility** — HTTP passes through virtually every network intermediary.

## When NOT to use

- **Continuous server-to-client push** — polling HTTP for updates is wasteful; use [SSE](sse.md) or [WebSocket](websocket.md).
- **Low-latency bidirectional exchange** (chat, multiplayer) — the request/response model fits poorly; use [WebSocket](websocket.md).
- **Fire-and-forget, latency-critical datagrams** (media, telemetry) — use [UDP](../transport/udp.md).

## References

- [IETF RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) and [RFC 9112 — HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112).
- [IETF RFC 9113 — HTTP/2](https://www.rfc-editor.org/rfc/rfc9113) and [RFC 9114 — HTTP/3](https://www.rfc-editor.org/rfc/rfc9114).
- [MDN — HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) — the most approachable reference for methods, status codes, and headers.
