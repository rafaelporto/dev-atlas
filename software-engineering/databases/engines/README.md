# Database Engines

Specific database products, grouped by the [type](../types/README.md) they primarily implement. Each engine article covers: current popularity context, the workloads it excels at, the workloads it does *not* excel at, and operational considerations.

---

## Articles

| Article | Description |
|---|---|
| [Redis](redis.md) | In-memory data-structure store used as cache, message broker, and lightweight database |
| [Memcached](memcached.md) | Minimal, multi-threaded memory cache — opaque blobs, no structures, no persistence |
| [DynamoDB](dynamodb.md) | AWS's fully-managed, serverless key-value/document store at any scale |
| [etcd](etcd.md) | Strongly-consistent key-value store for coordination and config (Raft); Kubernetes' backing store |
| [Database Popularity](database-popularity.md) | How database popularity is measured, why each signal is biased, and how to use it |

---

## Roadmap

_The key-value family above is done. Remaining engines, grouped by [type](../types/README.md):_

| Type | Engines |
|---|---|
| Relational | PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, Oracle |
| Document | MongoDB, CouchDB, Firestore |
| Wide-Column | Cassandra, ScyllaDB, HBase, BigTable |
| Graph | Neo4j, Dgraph, ArangoDB |
| Time-Series | InfluxDB, TimescaleDB, Prometheus |
| Search | Elasticsearch, OpenSearch, Meilisearch, Typesense |
| Vector | pgvector, Pinecone, Qdrant, Weaviate, Milvus |
| NewSQL | CockroachDB, Spanner, TiDB, YugabyteDB |
| OLAP | ClickHouse, BigQuery, Snowflake, Redshift, DuckDB |
