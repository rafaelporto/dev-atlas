---
type: concept
tags:
  - concept
  - networking
related:
  - software-engineering/communication-protocols/http/http
  - software-engineering/communication-protocols/http/sse
  - software-engineering/communication-protocols/http/websocket
  - software-engineering/communication-protocols/overview
language: null
---
# HTTP Streaming

> Techniques for pushing or progressively delivering data within HTTP's request/response model — chunked transfer, streaming responses, and long-polling — without upgrading to WebSocket.

---

## What is it?

**HTTP streaming** is a family of techniques that let a server send data incrementally, or simulate server push, while staying inside ordinary HTTP. The three you meet most often:

- **Chunked transfer / streaming responses** — the server sends the response body in pieces as it produces them, instead of buffering the whole thing and sending it at once.
- **Long-polling** — the client makes a request; the server holds it open until it has something to say, then responds; the client immediately re-requests.
- **(SSE)** — a standardized form of a streaming response with an event format and auto-reconnect, covered in its own article ([SSE](sse.md)).

These predate and complement [WebSocket](websocket.md) and [SSE](sse.md), and remain useful because they need no special protocol — just HTTP.

## Why does it matter?

Not every situation can or should upgrade to WebSocket/SSE. HTTP streaming matters because:

- **Streaming responses** cut time-to-first-byte and memory use for large or generated payloads — the client starts processing (or the user starts seeing) results while the server is still producing them. This is how streamed file downloads, CSV exports, and LLM token streaming over plain HTTP work.
- **Long-polling** gives you near-real-time server push using nothing but standard requests, so it works everywhere — including through restrictive proxies that block WebSocket — and is the classic fallback when SSE/WebSocket aren't available.

The costs: long-polling wastes a request/reconnect cycle per message and ties up connections; chunked streaming is one-way and still a single response.

## How it works

**Chunked transfer encoding** (HTTP/1.1) sends the body as a series of sized chunks with no upfront `Content-Length`, terminated by a zero-length chunk. (HTTP/2 and HTTP/3 achieve the same with their own framing.)

```
HTTP/1.1 200 OK
Transfer-Encoding: chunked
Content-Type: text/plain

7\r\n         ← chunk size in hex
chunk 1\r\n
7\r\n
chunk 2\r\n
0\r\n\r\n      ← zero-length chunk = end of body
```

**Long-polling** vs. **regular polling** — long-polling holds the request open to avoid empty responses and reduce latency:

```
Regular polling                        Long-polling
────────────────────────────          ────────────────────────────────────
C ─ GET /updates ─► S                  C ─ GET /updates ─► S
C ◄─ 200 (nothing) ─ S  (waste)                            (S holds it open…)
   ...wait fixed interval...           C ◄─ 200 {update} ─ S  (only when ready)
C ─ GET /updates ─► S                  C ─ GET /updates ─► S  (re-request now)
C ◄─ 200 {update} ─ S                                      (S holds again…)
```

Key points:

- **Streaming response** — flush the body incrementally; one request, one long response, server→client only.
- **Long-polling** — many short-lived requests, each held until data exists; approximates push in both reach and latency but with per-message overhead.
- **Relationship to SSE/WebSocket** — SSE is a specialized streaming response; WebSocket replaces the request/response model entirely. Reach for these first when supported; use raw streaming/long-polling as a lower-common-denominator fallback or for progressive payloads.

## Examples

Two things per language: a **streaming (chunked) response** that flushes lines as they are produced, and the shape of a **long-poll** handler.

### Go

```go
// Streaming (chunked) response — flush each line as produced
http.HandleFunc("/report", func(w http.ResponseWriter, r *http.Request) {
    flusher := w.(http.Flusher)
    for i := 1; i <= 3; i++ {
        fmt.Fprintf(w, "row %d\n", i)
        flusher.Flush() // send this chunk now
        time.Sleep(500 * time.Millisecond)
    }
})

// Long-poll — block until an update is available, then respond
http.HandleFunc("/updates", func(w http.ResponseWriter, r *http.Request) {
    select {
    case update := <-updates:      // data arrived
        json.NewEncoder(w).Encode(update)
    case <-time.After(30 * time.Second): // timeout → client re-requests
        w.WriteHeader(http.StatusNoContent)
    }
})
```

### TypeScript (Node.js)

```ts
import http from "node:http";

http.createServer((req, res) => {
  if (req.url === "/report") {
    // Streaming response: write chunks over time, then end
    res.writeHead(200, { "Content-Type": "text/plain" });
    let i = 1;
    const timer = setInterval(() => {
      res.write(`row ${i}\n`);
      if (++i > 3) { clearInterval(timer); res.end(); }
    }, 500);
  } else if (req.url === "/updates") {
    // Long-poll: hold the response until an update or timeout
    const onUpdate = (u: unknown) => res.end(JSON.stringify(u));
    updates.once("data", onUpdate);
    setTimeout(() => { updates.off("data", onUpdate); res.writeHead(204).end(); }, 30_000);
  }
}).listen(8080);
```

### Java (Spring MVC — StreamingResponseBody)

```java
@RestController
class ReportController {
    // Streaming (chunked) response
    @GetMapping("/report")
    StreamingResponseBody report() {
        return out -> {
            for (int i = 1; i <= 3; i++) {
                out.write(("row " + i + "\n").getBytes());
                out.flush();
                Thread.sleep(500);
            }
        };
    }

    // Long-poll with async request handling
    @GetMapping("/updates")
    DeferredResult<Update> updates() {
        DeferredResult<Update> result = new DeferredResult<>(30_000L); // timeout
        pending.add(result); // completed elsewhere when an update arrives
        return result;
    }
}
```

### C# (ASP.NET Core)

```csharp
var app = WebApplication.Create();

// Streaming (chunked) response — no Content-Length, flush per line
app.MapGet("/report", async (HttpResponse res) =>
{
    for (int i = 1; i <= 3; i++)
    {
        await res.WriteAsync($"row {i}\n");
        await res.Body.FlushAsync();
        await Task.Delay(500);
    }
});

// Long-poll — await an update or time out with 204
app.MapGet("/updates", async (HttpContext ctx) =>
{
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ctx.RequestAborted);
    cts.CancelAfter(TimeSpan.FromSeconds(30));
    var update = await updates.WaitForNextAsync(cts.Token); // null on timeout
    return update is null ? Results.NoContent() : Results.Json(update);
});

app.Run("http://localhost:8080");
```

## When to use

- **Progressively generated or large responses** — exports, reports, and LLM token streaming over plain HTTP — where you want data flowing before it is all ready.
- **Long-polling as a fallback** when [SSE](sse.md)/[WebSocket](websocket.md) are unavailable or blocked by intermediaries.
- When you must stay within **plain HTTP** for maximum compatibility.

## When NOT to use

- **Standardized one-way push** — prefer [SSE](sse.md); it gives you the event format and auto-reconnect for free.
- **Bidirectional real-time** — use [WebSocket](websocket.md); long-polling's request-per-message overhead does not scale for chatty, two-way traffic.
- **Small, infrequent updates** where ordinary polling at a sensible interval is simpler and cheaper.

## References

- [IETF RFC 9112 §7.1 — Chunked Transfer Coding](https://www.rfc-editor.org/rfc/rfc9112#section-7.1) — the chunked encoding specification.
- [MDN — Transfer-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Transfer-Encoding) — chunked responses in practice.
- [MDN — Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) — consuming streamed HTTP responses on the client.
