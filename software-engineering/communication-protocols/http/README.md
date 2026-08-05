# HTTP Family

HTTP is the application protocol of the web, and over time a family of protocols has grown around it to cover interaction patterns that plain request/response cannot. This subsection covers HTTP itself and the three most common ways to move data over (or alongside) it.

The core distinction is **direction and duration**:

- **HTTP** — client asks, server answers, done. The request/response baseline.
- **WebSocket** — a persistent, full-duplex channel where both sides send at any time.
- **SSE** — a persistent, one-way stream from server to client, over ordinary HTTP.
- **HTTP streaming** — techniques (chunked responses, long-polling) for pushing data within the HTTP request/response model.

---

## Articles

| Article | Description |
|---|---|
| [HTTP](http.md) | The web's application protocol and its evolution: HTTP/1.1 → HTTP/2 → HTTP/3 |
| [WebSocket](websocket.md) | Full-duplex, bidirectional communication over a single long-lived connection |
| [Server-Sent Events](sse.md) | One-way server → client event stream over plain HTTP |
| [HTTP Streaming](streaming.md) | Chunked transfer, streaming responses, and long-polling |

---

> These are not competitors so much as points on a spectrum. Start with plain HTTP; reach for SSE when the server needs to push; reach for WebSocket only when you genuinely need both directions at once.
