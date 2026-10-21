---
type: how-to
tags:
  - concept
  - ai-engineering
related:
  - software-engineering/ai-engineering/rag
  - software-engineering/ai-engineering/evals
  - software-engineering/ai-engineering/context-engineering
  - software-engineering/databases/types/vector
language: null
---

# How to Build a RAG Pipeline

> Build a small, working retrieval-augmented question-answering pipeline over a folder of Markdown files — chunk, embed, retrieve, rerank, answer with citations — and measure whether retrieval actually finds the right chunk.

---

## Prerequisites

- The concepts in [Retrieval-Augmented Generation (RAG)](rag.md): chunks, embeddings, top-k, reranking.
- **Python 3.11+** or **Node.js 20+**.
- Two API keys, exported as environment variables (never in code): `ANTHROPIC_API_KEY` for the LLM and `VOYAGE_API_KEY` for embeddings and reranking. Anthropic has no embeddings endpoint; its docs recommend Voyage AI. Any embedding provider works if you swap the Voyage blocks.
- Packages: `pip install anthropic voyageai numpy` or `npm install @anthropic-ai/sdk voyageai`.
- A corpus: this guide uses a few dev-atlas articles, for example `software-engineering/design-patterns/`. Any folder of Markdown works.
- The index lives **in memory** (a NumPy matrix in Python, plain arrays in TypeScript). That is fine up to tens of thousands of chunks; for production, persist the vectors in a database such as pgvector — see [Vector Databases](../databases/types/vector.md).

---

## Steps

### 1. Load and clean documents

Read every article, drop what is noise for retrieval (YAML front matter, index pages), and keep the path as the source id.

**Python**

```python
import re
from pathlib import Path

def load_docs(root: str) -> list[dict]:
    docs = []
    for path in sorted(Path(root).rglob("*.md")):
        if path.name == "README.md":
            continue
        text = re.sub(r"\A---\n.*?\n---\n", "", path.read_text(encoding="utf-8"), flags=re.DOTALL)
        docs.append({"source": str(path), "text": text.strip()})
    return docs
```

**TypeScript**

```typescript
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

type Doc = { source: string; text: string };

async function loadDocs(root: string): Promise<Doc[]> {
  const files = (await readdir(root, { recursive: true }))
    .filter((f) => f.endsWith(".md") && basename(f) !== "README.md")
    .sort();
  const docs: Doc[] = [];
  for (const f of files) {
    const raw = await readFile(join(root, f), "utf8");
    docs.push({ source: join(root, f), text: raw.replace(/^---\n[\s\S]*?\n---\n/, "").trim() });
  }
  return docs;
}
```

### 2. Chunk with overlap, keeping metadata

Split by structure first (each `##` section), then by size with overlap inside long sections. Each chunk carries its `source` and `section`, and the section heading is repeated in the chunk text so the chunk makes sense on its own.

**Python**

```python
def chunk_doc(doc: dict, max_chars: int = 1500, overlap: int = 200) -> list[dict]:
    chunks = []
    for part in re.split(r"(?m)^## ", doc["text"]):
        heading, _, body = part.partition("\n")
        heading = heading.lstrip("# ").strip() or "Intro"
        start = 0
        while start < len(body.strip()):
            chunks.append({
                "id": f'{doc["source"]}#{heading}#{start}',
                "source": doc["source"],
                "section": heading,
                "text": f"{heading}\n\n{body[start:start + max_chars]}",
            })
            start += max_chars - overlap
    return chunks
```

**TypeScript**

```typescript
type Chunk = { id: string; source: string; section: string; text: string };

function chunkDoc(doc: Doc, maxChars = 1500, overlap = 200): Chunk[] {
  const chunks: Chunk[] = [];
  for (const part of doc.text.split(/^## /m)) {
    const nl = part.indexOf("\n");
    const heading = (nl === -1 ? part : part.slice(0, nl)).replace(/^#+\s*/, "").trim() || "Intro";
    const body = nl === -1 ? "" : part.slice(nl + 1);
    for (let start = 0; start < body.trim().length; start += maxChars - overlap) {
      chunks.push({
        id: `${doc.source}#${heading}#${start}`,
        source: doc.source,
        section: heading,
        text: `${heading}\n\n${body.slice(start, start + maxChars)}`,
      });
    }
  }
  return chunks;
}
```

Character windows are a starting point. Before going further, print a few chunks and read them: a chunk that starts mid-table or mid-code-block will retrieve badly.

### 3. Embed and store in the index

Embed every chunk in batches with the **document** input type, and keep the vectors in the same order as the chunks — row `i` of the index is chunk `i`.

**Python — Voyage AI (embeddings)**

```python
import numpy as np
import voyageai

vo = voyageai.Client()  # reads VOYAGE_API_KEY
EMBED_MODEL = "voyage-4"  # 1024 dimensions by default

def embed(texts: list[str], input_type: str, batch: int = 64) -> np.ndarray:
    vectors = []
    for i in range(0, len(texts), batch):
        vectors += vo.embed(texts[i:i + batch], model=EMBED_MODEL, input_type=input_type).embeddings
    return np.array(vectors, dtype=np.float32)

chunks = [c for d in load_docs("software-engineering/design-patterns") for c in chunk_doc(d)]
index = embed([c["text"] for c in chunks], "document")  # shape (n_chunks, 1024)
```

**TypeScript — Voyage AI (embeddings)**

```typescript
import { VoyageAIClient } from "voyageai";

// environment: the Atlas endpoint, as Voyage's docs instruct for Atlas model API keys
const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY, environment: "https://ai.mongodb.com/v1" });
const EMBED_MODEL = "voyage-4"; // 1024 dimensions by default

async function embed(texts: string[], inputType: "document" | "query", batch = 64): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += batch) {
    const res = await voyage.embed({ input: texts.slice(i, i + batch), model: EMBED_MODEL, inputType });
    vectors.push(...res.data!.map((d) => d.embedding!));
  }
  return vectors;
}

const docs = await loadDocs("software-engineering/design-patterns");
const chunks = docs.flatMap((d) => chunkDoc(d));
const index = await embed(chunks.map((c) => c.text), "document");
```

Re-run this step whenever documents change — or, better, re-embed only the chunks of the changed files.

### 4. Retrieve the top-k chunks

Embed the question with the **query** input type and rank chunks by cosine similarity.

**Python**

```python
def retrieve(question: str, k: int = 20) -> list[dict]:
    q = embed([question], "query")[0]
    scores = index @ q / (np.linalg.norm(index, axis=1) * np.linalg.norm(q))
    return [chunks[i] for i in np.argsort(scores)[::-1][:k]]
```

**TypeScript**

```typescript
const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

async function retrieve(question: string, k = 20): Promise<Chunk[]> {
  const [q] = await embed([question], "query");
  return index
    .map((v, i) => ({ i, score: cosine(v, q) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ i }) => chunks[i]);
}
```

`k = 20` is deliberately generous: the reranker in step 5 narrows it down. **Hybrid search (optional):** if questions contain exact identifiers (class names, error codes), also rank chunks with BM25 and merge the two lists with reciprocal rank fusion — each chunk scores `Σ 1 / (60 + rank)` over the lists it appears in.

### 5. Rerank (optional)

A reranker reads the question and each candidate together and scores relevance more precisely than vector similarity. Skip this step for a first version; add it when step 7 shows the right chunk is retrieved but ranked too low.

**Python — Voyage AI (reranking)**

```python
def rerank(question: str, candidates: list[dict], top_k: int = 4) -> list[dict]:
    result = vo.rerank(question, [c["text"] for c in candidates], model="rerank-3", top_k=top_k)
    return [candidates[r.index] for r in result.results]
```

**TypeScript — Voyage AI (reranking)**

```typescript
async function rerank(question: string, candidates: Chunk[], topK = 4): Promise<Chunk[]> {
  const res = await voyage.rerank({ query: question, documents: candidates.map((c) => c.text), model: "rerank-3", topK });
  return res.data!.map((r) => candidates[r.index!]);
}
```

### 6. Generate the answer with citations

Pass the final chunks as documents with citations enabled, and tell the model to answer only from them. In the Claude API, `document` blocks with `citations: {enabled: true}` make the response point at the exact passages used.

**Python — Claude API**

```python
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY

def answer(question: str) -> tuple[str, set[str]]:
    context = rerank(question, retrieve(question))
    response = client.messages.create(
        model="claude-sonnet-5-5",  # model IDs at time of writing
        max_tokens=1024,
        system="Answer only from the provided documents. If they do not contain the answer, say you do not know.",
        messages=[{"role": "user", "content": [
            *[{"type": "document",
               "source": {"type": "text", "media_type": "text/plain", "data": c["text"]},
               "title": c["source"], "citations": {"enabled": True}} for c in context],
            {"type": "text", "text": question},
        ]}],
    )
    text, sources = "", set()
    for block in response.content:
        if block.type == "text":
            text += block.text
            sources |= {c.document_title for c in block.citations or [] if c.type == "char_location"}
    return text, sources
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

async function answer(question: string): Promise<{ text: string; sources: Set<string> }> {
  const context = await rerank(question, await retrieve(question));
  const response = await client.messages.create({
    model: "claude-sonnet-5-5", // model IDs at time of writing
    max_tokens: 1024,
    system: "Answer only from the provided documents. If they do not contain the answer, say you do not know.",
    messages: [{ role: "user", content: [
      ...context.map((c) => ({
        type: "document" as const,
        source: { type: "text" as const, media_type: "text/plain" as const, data: c.text },
        title: c.source, citations: { enabled: true },
      })),
      { type: "text", text: question },
    ] }],
  });
  let text = "";
  const sources = new Set<string>();
  for (const block of response.content) {
    if (block.type !== "text") continue;
    text += block.text;
    for (const c of block.citations ?? []) if (c.type === "char_location" && c.document_title) sources.add(c.document_title);
  }
  return { text, sources };
}
```

### 7. Build a mini eval set and measure recall@k

Write about ten questions, each with the source and section that should answer it. Recall@k is the share of questions whose expected chunk shows up in the top k. It tests retrieval alone — no LLM call, cheap enough to run after every chunking or model change. See [Evals](evals.md) for grading the generated answers too.

**Python**

```python
EVAL_SET = [
    {"question": "How do I add behaviour to an object at runtime without a subclass for every combination?",
     "source": "software-engineering/design-patterns/structural/decorator.md", "section": "When to use"},
    # ... about ten entries, written by someone who knows the corpus
]

def recall_at_k(k: int = 5) -> float:
    hits = 0
    for case in EVAL_SET:
        top = rerank(case["question"], retrieve(case["question"]), top_k=k)
        hits += any(c["source"].endswith(case["source"]) and c["section"] == case["section"] for c in top)
    return hits / len(EVAL_SET)

print(f"recall@5 = {recall_at_k(5):.2f}")
```

**TypeScript**

```typescript
const EVAL_SET = [
  { question: "How do I add behaviour to an object at runtime without a subclass for every combination?",
    source: "software-engineering/design-patterns/structural/decorator.md", section: "When to use" },
  // ... about ten entries, written by someone who knows the corpus
];

async function recallAtK(k = 5): Promise<number> {
  let hits = 0;
  for (const c of EVAL_SET) {
    const top = await rerank(c.question, await retrieve(c.question), k);
    if (top.some((t) => t.source.endsWith(c.source) && t.section === c.section)) hits++;
  }
  return hits / EVAL_SET.length;
}

console.log(`recall@5 = ${(await recallAtK(5)).toFixed(2)}`);
```

Compute it with and without step 5 to see what the reranker is worth on your corpus.

---

## Verification

- **Retrieval sanity check** — for one eval question, print the top 5 chunks of `retrieve`: the expected source and section are among them.
- **Grounded answer** — `answer(...)` on that question returns text whose `sources` include the expected file; on a question the corpus cannot answer ("What is the capital of Mars?") it says it does not know instead of inventing.
- **Recall threshold** — `recall@5` is at or above the bar you set (0.8 is a reasonable starting target for a small, clean corpus). Record the number; every later change to chunking, embedding model, or k must not lower it.

```text
recall@5 = 0.90
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Generic answer with no sources | Retrieved chunks are irrelevant, or the model answered from training data | Inspect `retrieve` output first; keep "answer only from the documents"; treat an answer with an empty `sources` set as a failure |
| The right chunk exists but is outside the top-k | Pure vector search misses exact terms, or chunks lack context | Raise k and add reranking (step 5); add hybrid BM25; prefix chunks with document context (contextual retrieval) |
| Chunks split tables or code blocks | Fixed-size windows ignore structure | Split on structure first; never cut inside a fenced code block or a table; increase `max_chars` for those sections |
| Cost per question keeps growing | Too many or too large chunks in the prompt | Rerank down to 3–5 chunks; shrink chunk size; cache the static system prompt ([Prompt Caching](prompt-caching.md)) |
| Error or garbage scores comparing vectors | Embedding dimension differs from the index (model or `output_dimension` changed) | Store the model name and dimension with the index; re-embed the whole corpus when either changes — never mix vectors from two models |

---

## References

- [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings) — Claude documentation: why Voyage AI, model list, `input_type`, normalised vectors
- [Accessing Voyage AI models](https://www.mongodb.com/docs/voyageai/api-and-clients/) — official Python and TypeScript clients for embedding and reranking
- [Citations](https://platform.claude.com/docs/en/build-with-claude/citations) — Claude API document blocks and the citation response format
- [Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) — Anthropic, measured gains from contextual chunks, BM25, and reranking
- [pgvector](https://github.com/pgvector/pgvector) — the production next step: vectors in PostgreSQL with HNSW indexes
- [Ragas — available metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/) — context recall, context precision, and faithfulness for RAG evaluation
