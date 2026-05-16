# Database Concepts

Fundamentals shared across every database engine. These are the building blocks referenced by the [Types](../types/README.md) and [Engines](../engines/README.md) articles.

---

## Articles

_This section is being built out. Planned articles:_

| Article | Description |
|---|---|
| `acid.md` | Atomicity, Consistency, Isolation, Durability |
| `base.md` | Basically Available, Soft state, Eventual consistency |
| `cap-theorem.md` | The Consistency / Availability / Partition-tolerance trade-off |
| `pacelc.md` | CAP extended with latency under normal operation |
| `consistency-models.md` | Strong, eventual, causal, read-your-writes |
| `isolation-levels.md` | Read Uncommitted → Serializable, and the anomalies they prevent |
| `transactions.md` | Begin / commit / rollback, savepoints, two-phase commit |
| `indexing.md` | B-tree, LSM-tree, hash, bitmap, inverted index |
| `replication.md` | Leader-follower, multi-leader, leaderless |
| `partitioning-sharding.md` | Range, hash, directory-based partitioning |
| `normalization.md` | 1NF–BCNF and when to denormalize on purpose |
| `oltp-vs-olap.md` | Transactional vs analytical workloads |
| `query-planning.md` | Parser → planner → executor; reading query plans |
| `wal-and-mvcc.md` | Write-Ahead Logging and Multi-Version Concurrency Control |
