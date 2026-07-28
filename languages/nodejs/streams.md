---
type: concept
tags:
  - language
  - nodejs
  - backend
  - concept
related:
  - languages/nodejs/file-system-and-buffers
  - languages/nodejs/async-patterns
  - languages/nodejs/http-and-web-servers
language: "nodejs"
---
# Streams

> Streams process data in chunks as it arrives instead of loading it all into memory, and backpressure keeps fast producers from overwhelming slow consumers.

---

## What is it?

A **stream** is an abstraction for reading or writing data incrementally. Node has four kinds: **Readable** (source), **Writable** (sink), **Duplex** (both), and **Transform** (Duplex that modifies data in transit, e.g. compression). Streams are `EventEmitter`s under the hood and are the backbone of Node's I/O — files, sockets, and HTTP bodies are all streams.

---

## Why does it matter?

Loading a 2 GB file or response into memory with `readFile` can crash the process; streaming it uses near-constant memory. **Backpressure** — the built-in mechanism that pauses a source when the destination can't keep up — is what makes this safe. Streaming is essential for large payloads, real-time data, and high-throughput services.

---

## How it works

### The four types

| Type | Role | Example |
|---|---|---|
| Readable | produces data | `fs.createReadStream`, HTTP request |
| Writable | consumes data | `fs.createWriteStream`, HTTP response |
| Duplex | both, independent | TCP socket |
| Transform | both, data flows through | `zlib.createGzip`, hashing |

### Piping and pipeline

`pipeline` connects streams and handles errors and cleanup correctly (prefer it over manual `.pipe()`).

```javascript
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";

await pipeline(
  createReadStream("big.log"),
  createGzip(),
  createWriteStream("big.log.gz"),
);
// backpressure, errors, and resource cleanup handled automatically
```

### Backpressure

`.write()` returns `false` when the internal buffer is full; a well-behaved producer waits for the `drain` event. `pipeline`/`pipe` manage this for you — which is why you should rarely wire streams manually.

### Async iteration

Readable streams are async-iterable — often the simplest consumption model.

```javascript
for await (const chunk of createReadStream("data.csv")) {
  process(chunk); // Buffer chunk
}
```

### A Transform stream

```javascript
import { Transform } from "node:stream";

const upper = new Transform({
  transform(chunk, _enc, cb) {
    cb(null, chunk.toString().toUpperCase());
  },
});
```

### Web Streams

Node also implements the WHATWG **Web Streams** API (`ReadableStream`/`WritableStream`), which interoperates with `fetch` bodies and runs in browsers and edge runtimes.

---

## Examples

```javascript
// Stream a large file as an HTTP response — constant memory
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";

createServer((req, res) => {
  const path = "large-video.mp4";
  res.writeHead(200, { "content-length": statSync(path).size });
  createReadStream(path).pipe(res); // backpressure respected
}).listen(3000);

// Convert a stream to a string only when you know it's small
import { text } from "node:stream/consumers";
const body = await text(req);
```

---

## When to use

- Use streams for large files, uploads/downloads, and proxying data between sources and sinks.
- Use `pipeline` (from `stream/promises`) to connect streams with correct error handling and cleanup.
- Use async iteration (`for await`) for straightforward chunk-by-chunk consumption.
- Use Web Streams when interoperating with `fetch`, edge runtimes, or the browser.

## When NOT to use

- Do not buffer huge inputs with `readFile`/concatenation — you risk out-of-memory crashes.
- Do not wire streams with manual `.write()` without honoring `drain` — you break backpressure.
- Do not use `.pipe()` without error handling — a mid-stream error can leak resources; use `pipeline`.
- Do not stream tiny payloads where a single `await` read is simpler.

---

## References

- [Node.js — Stream](https://nodejs.org/api/stream.html)
- [Node.js — stream.pipeline](https://nodejs.org/api/stream.html#streampipelinesource-transforms-destination-callback)
- [Node.js — Backpressuring in Streams](https://nodejs.org/en/learn/modules/backpressuring-in-streams)
- [Node.js — Web Streams API](https://nodejs.org/api/webstreams.html)
