# Vector Databases

> Stores high-dimensional numeric vectors and answers "what is most similar to this one?" in milliseconds. The backbone of semantic search and retrieval-augmented generation.

---

## What is it?

A vector database stores **embeddings**: lists of numbers (typically 384, 768, 1024, or 1536 floats) produced by a machine-learning model. Each embedding represents a piece of content — a paragraph of text, an image, an audio clip, a user — in a geometric space where *semantic similarity* corresponds to *geometric closeness*.

The primary query is **nearest-neighbor search**: given a query vector, return the K stored vectors closest to it (by cosine similarity, dot product, or Euclidean distance). Doing this *exactly* on millions of vectors is too slow for real-time use, so vector databases use **approximate nearest-neighbor (ANN)** algorithms that trade a tiny bit of recall for several orders of magnitude in speed.

The category includes:

- **Purpose-built engines**: Pinecone, Weaviate, Qdrant, Milvus, Vespa, Chroma.
- **Vector extensions on existing databases**: pgvector (PostgreSQL), Atlas Vector Search (MongoDB), Redis Vector, Elasticsearch dense vectors.

## Why does it matter?

Vector databases solve a problem that became important roughly in 2023 and has not slowed down since: **semantic search and retrieval for AI applications**.

- **Find by meaning, not by keywords** — "documents that discuss canine companions" finds an article titled "Why dogs are great", even though no word in the query appears in the document.
- **Retrieval-Augmented Generation (RAG)** — language models do not know your private data. You embed your documents, store them in a vector DB, and at query time retrieve the most relevant chunks to inject into the prompt.
- **Recommendations and personalization** — user and item embeddings, then "users similar to this user" or "items similar to this item" become a single vector query.
- **Multimodal similarity** — images, audio, video, and text can be embedded into the same space; "find images similar to this text description" becomes feasible.

A few years ago, this kind of capability required a research team. Vector databases turned it into a library call.

## How it works

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Text:    "A loyal dog by the fireplace."                         │
│                       │                                            │
│                       ▼                                            │
│             ┌──────────────────┐                                   │
│             │ Embedding model  │  (sentence-transformer,           │
│             │ (e.g. OpenAI,    │   OpenAI, etc.)                   │
│             │  e5, bge, etc.)  │                                   │
│             └──────────────────┘                                   │
│                       │                                            │
│                       ▼                                            │
│           [0.12, -0.87, 0.04, ..., 0.31]   (1536 floats)          │
│                       │                                            │
│                       ▼                                            │
│             ┌────────────────────┐                                 │
│             │ Vector DB stores:  │                                 │
│             │   id, vector,      │                                 │
│             │   payload (metadata)│                                │
│             └────────────────────┘                                 │
│                                                                    │
│  Query:   "pet near a warm place"                                  │
│            → embed → same model → query vector                     │
│            → ANN index → top-K closest stored vectors → results    │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

Two ideas do the heavy lifting:

- **Embeddings come from an external model**, not from the database. The database does not understand semantics; it understands geometry. The semantics live in the model that produced the vectors.
- **ANN indexes** like **HNSW** (Hierarchical Navigable Small World) and **IVF** (Inverted File Index) make K-nearest-neighbor search sublinear in the number of vectors. They trade a small recall loss (you may miss a few of the true top-K) for massive speed.

A useful pattern is **hybrid search**: combine vector similarity with a traditional keyword filter ("find documents semantically similar to X, but only those tagged 'finance' and published after 2025"). Most vector databases support this directly.

## Examples

Using **pgvector** in PostgreSQL — vectors as a real column type, with familiar SQL on top:

```sql
CREATE EXTENSION vector;

CREATE TABLE documents (
  id        BIGSERIAL PRIMARY KEY,
  content   TEXT       NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  tags      TEXT[]
);

-- HNSW index for fast ANN search
CREATE INDEX documents_embedding_idx
  ON documents
  USING hnsw (embedding vector_cosine_ops);

-- Find the 5 most semantically similar docs to a query vector,
-- but only those tagged 'finance'.
SELECT id, content
FROM   documents
WHERE  'finance' = ANY(tags)
ORDER  BY embedding <=> '[0.12, -0.87, ...]'::vector
LIMIT  5;
```

`<=>` is pgvector's cosine-distance operator.

In **Qdrant** (REST/Python), the same query:

```python
client.search(
    collection_name="documents",
    query_vector=[0.12, -0.87, ...],
    query_filter=Filter(
        must=[FieldCondition(key="tags", match=MatchValue(value="finance"))]
    ),
    limit=5
)
```

## When to use

- **Semantic search**: search experiences where the user types in natural language, not exact terms.
- **Retrieval-Augmented Generation (RAG)**: feeding context to a language model from your own corpus.
- **Recommendation systems**: similar-items, similar-users, content-based recommendations.
- **Multimodal applications**: search across text, images, audio with a single vector space.
- **Clustering, deduplication, anomaly detection** when "similar" needs to be defined by an embedding model rather than by hand-crafted features.

## When NOT to use

- **Exact-match lookups are enough**: if users search by SKU, ID, or precise keyword, a [relational](relational.md), [key-value](key-value.md), or [search engine](search-engine.md) is cheaper and more accurate.
- **You do not have an embedding model**, and the cost (latency, dollars, or operational complexity) of producing embeddings on every write and every query is not worth it.
- **You need transactional consistency** between the vectors and the rest of your data: most dedicated vector stores are secondary indexes. If staying transactional matters, prefer pgvector or another in-database extension.
- **The dataset is tiny**: a few thousand vectors fit in memory, and a NumPy `argsort` over cosine similarity is fine. No database needed.
- **Your queries are not similarity-shaped**: vector databases are bad at everything that is not "find K nearest". Use the right tool for the question.

## References

- [*Efficient and Robust Approximate Nearest Neighbor Search using HNSW Graphs*, Malkov & Yashunin (2016)](https://arxiv.org/abs/1603.09320)
- [pgvector — Open source vector similarity search for Postgres](https://github.com/pgvector/pgvector)
- [Pinecone — *Learning Center on Vector Databases*](https://www.pinecone.io/learn/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
