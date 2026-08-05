---
type: concept
tags:
  - concept
  - networking
related:
  - software-engineering/communication-protocols/http/http
  - software-engineering/communication-protocols/http/websocket
  - software-engineering/communication-protocols/http/streaming
  - software-engineering/communication-protocols/overview
language: null
---
# Server-Sent Events (SSE)

> A one-way streaming channel where the server pushes a continuous stream of text events to the client over an ordinary HTTP connection, with automatic reconnection built in.

---

## What is it?

**Server-Sent Events** let a server keep an HTTP response open and stream events to the client as they happen. The client opens a normal `GET` request; the server responds with the content type `text/event-stream` and never closes it, writing small text-formatted events over time. The browser's built-in `EventSource` API consumes them and — importantly — **reconnects automatically** if the connection drops.

SSE is the simplest way to do **server → client push** when the client never needs to send data back on the same channel.

## Why does it matter?

Many "real-time" features are actually one-directional: live scores, notifications, a progress bar, a feed of new items, tokens streaming from an LLM. For these, [WebSocket](websocket.md) is more than you need — it is bidirectional, stateful, and doesn't reconnect on its own. SSE fits the shape of the problem:

- **Runs over plain HTTP** — no upgrade handshake, works with normal HTTP infrastructure, proxies, and HTTP/2 multiplexing.
- **Automatic reconnection** — `EventSource` retries on drop and can resume from the `Last-Event-ID`, so you get resilience for free.
- **Dead simple** — the wire format is human-readable text; the client is a few lines.

The limits are equally clear: it is one-way only, text-only, and (over HTTP/1.1) subject to the browser's per-domain connection cap.

## How it works

The client opens a connection and the server streams events, each a small block of `field: value` lines terminated by a blank line:

```
Client                                 Server
─────────────                          ──────────────────────────────────────
GET /orders/42/events                  HTTP/1.1 200 OK
Accept: text/event-stream    ───────►  Content-Type: text/event-stream
                                        Cache-Control: no-cache
                                        (connection stays open)

                             ◄───────  event: status
                                        id: 1
                                        data: {"status":"packed"}
                                        (blank line = end of one event)

                             ◄───────  event: status
                                        id: 2
                                        data: {"status":"shipped"}

     (drop) ──── auto-reconnect ─────► GET .../events
                                        Last-Event-ID: 2   (client resumes)
```

Key points:

- **`text/event-stream`** — the content type that tells the client this is an SSE stream.
- **Event fields** — `data:` (payload), `event:` (named type), `id:` (for resume), `retry:` (reconnect delay).
- **Auto-reconnect** — `EventSource` reconnects on failure and sends the last `id` as `Last-Event-ID` so the server can resume.
- **One-way** — the server pushes; to send data the client makes a separate ordinary HTTP request.
- **Text only** — binary must be encoded (e.g. base64); for binary streams prefer WebSocket.

## Examples

An endpoint that streams two status updates then stops, plus a client that consumes them. On the browser the client is the native `EventSource`; the server side is shown per language.

### Go

```go
http.HandleFunc("/orders/42/events", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    flusher := w.(http.Flusher)
    for i, status := range []string{"packed", "shipped"} {
        fmt.Fprintf(w, "id: %d\nevent: status\ndata: {\"status\":\"%s\"}\n\n", i+1, status)
        flusher.Flush() // push this event to the client now
        time.Sleep(time.Second)
    }
})
http.ListenAndServe(":8080", nil)
```

### TypeScript (Node.js)

```ts
import http from "node:http";

// Server
http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  ["packed", "shipped"].forEach((status, i) => {
    setTimeout(() => {
      res.write(`id: ${i + 1}\nevent: status\ndata: ${JSON.stringify({ status })}\n\n`);
    }, i * 1000);
  });
}).listen(8080);

// Client (browser — built-in EventSource, reconnects automatically)
const source = new EventSource("http://localhost:8080/orders/42/events");
source.addEventListener("status", (e) => console.log(JSON.parse(e.data).status));
```

### Java (Spring WebFlux)

```java
@RestController
class OrderEventsController {
    @GetMapping(path = "/orders/42/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    Flux<ServerSentEvent<String>> stream() {
        var statuses = List.of("packed", "shipped");
        return Flux.interval(Duration.ofSeconds(1))
                   .take(statuses.size())
                   .map(i -> ServerSentEvent.<String>builder()
                       .id(String.valueOf(i + 1))
                       .event("status")
                       .data("{\"status\":\"" + statuses.get(i.intValue()) + "\"}")
                       .build());
    }
}
```

### C# (ASP.NET Core)

```csharp
var app = WebApplication.Create();
app.MapGet("/orders/42/events", async (HttpResponse response) =>
{
    response.Headers.ContentType = "text/event-stream";
    response.Headers.CacheControl = "no-cache";
    var statuses = new[] { "packed", "shipped" };
    for (int i = 0; i < statuses.Length; i++)
    {
        await response.WriteAsync($"id: {i + 1}\nevent: status\ndata: {{\"status\":\"{statuses[i]}\"}}\n\n");
        await response.Body.FlushAsync();
        await Task.Delay(1000);
    }
});
app.Run("http://localhost:8080");
```

## When to use

- **One-way server push** — live notifications, activity feeds, dashboards, scores, order/shipment status.
- **Streaming incremental results** — progress updates, or tokens from an LLM response, delivered as they are produced.
- When you want **push with minimal moving parts** and free reconnection over ordinary HTTP.

## When NOT to use

- **Bidirectional or client-initiated** streams — use [WebSocket](websocket.md); SSE cannot send client→server on the same channel.
- **Binary payloads** — SSE is text-only; encoding binary is wasteful. Use WebSocket.
- **Very high fan-out over HTTP/1.1** — the browser's per-domain connection limit can bite; HTTP/2 mitigates it by multiplexing.

## References

- [WHATWG HTML Standard — Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) — the normative specification.
- [MDN — Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) — the `EventSource` API and event format.
- [MDN — EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) — client-side reference, including reconnection.
