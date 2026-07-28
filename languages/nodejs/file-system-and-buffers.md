---
type: concept
tags:
  - language
  - nodejs
  - backend
  - concept
related:
  - languages/nodejs/streams
  - languages/nodejs/async-patterns
  - languages/nodejs/error-handling
language: "nodejs"
---
# File System and Buffers

> Node reads and writes files through the `node:fs` module (prefer the promise API), and handles raw binary data with `Buffer`, a fixed-length byte array outside the V8 heap.

---

## What is it?

The `node:fs` module provides file and directory operations in three flavors: **promise-based** (`node:fs/promises`), **callback-based**, and **synchronous** (`*Sync`). **`Buffer`** is Node's type for raw binary data — a sequence of bytes used for file contents, network packets, and cryptographic data before they are decoded to strings.

---

## Why does it matter?

Blocking synchronous file calls in a request path freeze the event loop. Choosing the promise API and streaming large files keeps a server responsive. `Buffer` handling — encodings, partial reads, binary protocols — is unavoidable in file, network, and crypto code, and getting encodings wrong corrupts data silently.

---

## How it works

### The promise API (default choice)

```javascript
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";

const text = await readFile("notes.md", "utf8");     // string (decoded)
const bytes = await readFile("image.png");            // Buffer (no encoding)
await writeFile("out.json", JSON.stringify(data));
await mkdir("logs", { recursive: true });
const entries = await readdir("src");
const info = await stat("out.json");                  // size, mtime, isFile()...
```

### Synchronous — only at startup

`readFileSync` etc. block the thread. Acceptable during startup/CLI init, never in a request handler.

```javascript
const config = JSON.parse(readFileSync("config.json", "utf8")); // at boot only
```

### Streaming large files

Use streams (see the streams article) rather than reading whole large files into memory.

### Paths

Build paths portably; derive the current dir from `import.meta.url` in ESM.

```javascript
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const p = join(__dirname, "data", "seed.json");
```

### Buffers

```javascript
const buf = Buffer.from("hello", "utf8"); // create from string
buf.length;                                // 5 (bytes, not chars)
buf.toString("hex");                       // "68656c6c6f"
buf.toString("base64");                    // "aGVsbG8="

const alloc = Buffer.alloc(16);            // zero-filled, safe
// Buffer.allocUnsafe(16) is faster but uninitialized — fill before use
```

Buffers live outside the V8 heap, so large binary data doesn't pressure the garbage collector the way large strings/arrays would.

### Encodings caveat

A multi-byte character can be split across stream chunks. Use `StringDecoder` or collect the full buffer before decoding.

---

## Examples

```javascript
// Atomic-ish write: write to a temp file then rename (rename is atomic on same fs)
import { writeFile, rename } from "node:fs/promises";
async function writeAtomic(path, data) {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, path);
}

// Hash a file without loading it fully into memory
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
function sha256(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path).on("data", (c) => hash.update(c))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}
```

---

## When to use

- Use the **promise API** (`node:fs/promises`) for all runtime file access.
- Use **streams** for large files; read small files whole with `readFile`.
- Use `Buffer.alloc` for safe zero-filled buffers; `Buffer.from` to wrap existing data.
- Use `node:path` and `import.meta.url` to build portable paths.

## When NOT to use

- Do not use `*Sync` file APIs in request handlers or hot paths — they block the event loop.
- Do not read large files fully into memory — stream them.
- Do not use `Buffer.allocUnsafe` without immediately overwriting it — it may contain old memory.
- Do not decode multi-byte data per-chunk without a `StringDecoder` — characters can split across chunks.

---

## References

- [Node.js — File system (`node:fs`)](https://nodejs.org/api/fs.html)
- [Node.js — Working with files (Learn)](https://nodejs.org/en/learn/manipulating-files/reading-files-with-nodejs)
- [Node.js — Buffer](https://nodejs.org/api/buffer.html)
- [Node.js — Path](https://nodejs.org/api/path.html)
