# Search Engines

> Databases built around the inverted index. Optimized for "given these words, find the most relevant documents" — full-text, ranked, sub-second.

---

## What is it?

A search engine — used as a database — is optimized for one operation: given a query string, return the documents that match, ranked by **relevance**. The data is still organized as documents (similar to a [document database](document.md)), but the query model is completely different: instead of "give me the document with id X", you ask "give me the documents that contain *X*, and rank them by how relevant they are to my query".

The category is dominated by engines built on **Apache Lucene** (Elasticsearch, OpenSearch, Solr) and a newer generation of standalone, lighter-weight engines (Meilisearch, Typesense, Tantivy). All of them are built around the same core data structure: the **inverted index**.

In practice, search engines occupy a niche between database and application logic — they are usually the secondary store, fed by a primary database, providing the search experience the primary cannot.

## Why does it matter?

Search engines solve three problems that no general-purpose database handles well:

- **Full-text search at speed** — `LIKE '%foo%'` cannot use indexes and scans the table. A search engine returns the same answer in milliseconds across millions of documents.
- **Relevance ranking** — the result is *ordered* by how well it matches the query, not just whether it does. This is the entire point of search.
- **Fuzzy matching, stemming, synonyms, multilingual analysis** — typo tolerance, "running" matching "run", "USA" matching "United States". The engine bakes linguistic intelligence in.

If your product has a search box that people actually type into, you almost certainly need a dedicated search engine. If your product searches by SKU or ID, you do not.

## How it works

The core data structure is the **inverted index**: a map from each distinct term to the list of documents that contain it.

```
Documents:
  D1: "the quick brown fox"
  D2: "the lazy brown dog"
  D3: "quick brown foxes jump"

Inverted index (after lowercasing + stemming):
  ┌────────┬───────────────────┐
  │ Term   │ Posting list      │
  ├────────┼───────────────────┤
  │ brown  │ D1, D2, D3        │
  │ dog    │ D2                │
  │ fox    │ D1, D3            │   ← "fox" and "foxes" stem to same term
  │ jump   │ D3                │
  │ lazy   │ D2                │
  │ quick  │ D1, D3            │
  │ the    │ D1, D2            │
  └────────┴───────────────────┘

Query: "quick fox"  →  intersect(posting(quick), posting(fox))
                   →  {D1, D3}
                   →  rank by TF-IDF / BM25
                   →  D1 (better match), D3
```

The pipeline applied to incoming text is the **analyzer**:

1. **Tokenization** — split on whitespace and punctuation.
2. **Normalization** — lowercase, strip diacritics, fold Unicode.
3. **Filtering** — remove stop words (the, a, of), apply stemming or lemmatization.
4. **Indexing** — for each remaining token, append the document ID to the posting list.

At query time the same analyzer is applied to the query string, so "Running Foxes" and "the quick brown fox" can find each other.

Ranking is typically **BM25** (an evolution of TF-IDF): rare terms count more, term frequency in a document boosts the score, longer documents are penalized.

## Examples

Indexing and querying with **Elasticsearch** (JSON DSL):

```json
PUT /articles/_doc/1
{
  "title":  "The quick brown fox",
  "body":   "A fox jumps over the lazy dog.",
  "author": "Aesop",
  "tags":   ["fable", "animals"]
}

GET /articles/_search
{
  "query": {
    "multi_match": {
      "query":    "running fox",
      "fields":   ["title^2", "body"],
      "fuzziness": "AUTO"
    }
  }
}
```

The `title^2` syntax boosts matches in the title. `fuzziness: AUTO` allows up to 2 edits, so "fxo" still matches "fox".

Modern relational engines also offer in-database full-text search. In **PostgreSQL**:

```sql
CREATE TABLE article (
  id     BIGSERIAL PRIMARY KEY,
  title  TEXT NOT NULL,
  body   TEXT NOT NULL,
  search TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', body),  'B')
  ) STORED
);

CREATE INDEX article_search_idx ON article USING GIN (search);

SELECT id, ts_rank(search, q) AS rank
FROM   article, to_tsquery('english', 'running & fox') q
WHERE  search @@ q
ORDER  BY rank DESC;
```

This is enough for many applications and avoids running a second cluster — but lacks the analyzers, distributed scaling, and operational maturity of a dedicated engine.

## When to use

- **User-facing full-text search**: product catalogs, documentation, knowledge bases, e-commerce.
- **Relevance ranking matters**: you need the best result first, not all results in some order.
- **Fuzzy matching, typo tolerance, multilingual analysis** — handled out of the box.
- **Log and event search** — Elasticsearch's other major market is observability, where the query model "find the documents matching these filters" fits log data perfectly.
- **Faceted search and aggregations** — "Filter by category, brand, price range; show counts per facet" — search engines do this naturally.

## When NOT to use

- **The search engine is your primary store**: most are not designed to be the source of truth. Treat them as a derived index; the primary database is somewhere else.
- **Strict ACID transactions** are required: most search engines are eventually consistent and offer no real transactional model.
- **The data is mostly numeric or structured** with no text component: a [relational database](relational.md) is better.
- **You only need exact-match lookups by ID or SKU**: a [key-value](key-value.md) or relational lookup is simpler and faster.
- **Heavy joins** across documents: search engines flatten their world; cross-document joins are not their model.

## References

- [Apache Lucene Documentation](https://lucene.apache.org/core/)
- [Elasticsearch — *The Definitive Guide*](https://www.elastic.co/guide/en/elasticsearch/guide/current/index.html)
- [*Relevant Search*, Doug Turnbull and John Berryman](https://www.manning.com/books/relevant-search) — the book on building search experiences
- [BM25 Explained — *The Probabilistic Relevance Framework*](https://www.staff.city.ac.uk/~sb317/papers/foundations_bm25_review.pdf)
