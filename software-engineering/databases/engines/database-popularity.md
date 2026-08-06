---
type: concept
tags:
  - database
  - overview
  - comparison
related:
  - software-engineering/databases/engines/redis
  - software-engineering/databases/engines/memcached
  - software-engineering/databases/engines/dynamodb
  - software-engineering/databases/engines/etcd
language: null
---
# Database Popularity

> How database popularity is actually measured, why each signal is biased, and how to use "everyone uses it" as one input to a decision — not the decision itself.

---

## What is it?

Database popularity is a rough measure of how widely a database engine is used and talked about. There is no single authoritative number: popularity is inferred from proxies — job postings, search interest, survey responses, forum activity, and open-source stars — each capturing a different slice of reality. This article is about reading those signals critically, not memorizing a leaderboard.

The three most-cited sources:

- **DB-Engines Ranking** — a monthly score blending web mentions, search-engine interest, job offers, professional-network profiles, and technical-forum activity.
- **Stack Overflow Developer Survey** — an annual self-reported survey of what developers *use* and what they *admire vs. dread*.
- **GitHub stars and trends** — a proxy for open-source mindshare and contributor momentum.

## Why does it matter?

Popularity is not a measure of technical quality — but it is a real engineering input. A widely-used engine means a larger talent pool to hire from, more libraries and tooling, more answered questions when you get stuck, more battle-tested edge cases, and a lower risk that the project is abandoned. Betting on an obscure database can be the right call, but it front-loads risk onto your team.

The trap is treating a ranking as a recommendation. The most popular engine for the *industry* is rarely the best engine for *your specific workload*. Popularity should narrow the field and flag risk — not pick the winner.

## How it works

Each signal has a systematic bias. Knowing the bias is the whole point:

| Signal | Measures | Biased toward / against |
|---|---|---|
| DB-Engines Ranking | Mentions, jobs, searches, forum activity | Toward established/enterprise engines with lots of chatter; a lagging indicator of hype |
| Stack Overflow Survey | Self-reported use + sentiment | Toward the web/startup developers who answer surveys; under-samples enterprise and non-English communities |
| GitHub stars | Open-source mindshare | Ignores closed/managed engines entirely — **DynamoDB, Oracle, and Spanner have no meaningful star count** |

Read them together, never alone. A managed, proprietary engine like [DynamoDB](dynamodb.md) can dominate real-world serverless deployments while being invisible on GitHub. An engine can rack up stars on launch hype years before it is production-mature. And DB-Engines rewards sheer volume of discussion, which favors incumbents.

Popularity is also **segmented by type**: comparing a cache to a data warehouse is meaningless. The useful question is "what's popular *within the category I actually need*".

## Examples

A durable, category-relative snapshot of frequently-chosen engines as of the mid-2020s (illustrative, not a live ranking):

| Type | Commonly chosen engines |
|---|---|
| Relational | PostgreSQL, MySQL, SQL Server, Oracle, SQLite |
| Document | MongoDB, Firestore, CouchDB |
| Key-Value / cache | [Redis](redis.md), [Memcached](memcached.md), [DynamoDB](dynamodb.md), [etcd](etcd.md) |
| Wide-column | Cassandra, ScyllaDB, HBase |
| Search | Elasticsearch, OpenSearch |
| Time-series | InfluxDB, TimescaleDB, Prometheus |
| OLAP / warehouse | ClickHouse, BigQuery, Snowflake, DuckDB |

The pattern that survives the years: a small set of mature, general-purpose engines (PostgreSQL foremost) absorb most workloads, while specialized engines win their niche. Positions shift; the shape rarely does.

## When to use

- **Reducing risk on a long-lived system** — favor a popular, mature engine when longevity, hiring, and ecosystem depth matter more than a marginal technical edge.
- **Estimating hiring and support cost** — popularity is a decent proxy for how easily you'll staff and troubleshoot it.
- **Sanity-checking a choice** — if you're about to pick something almost nobody uses for a mainstream workload, popularity is the flag that makes you justify it.

## When NOT to use

- **As the deciding factor for a specialized workload** — match the *shape of the data model* to your problem; popularity is a tiebreaker, not the criterion.
- **Comparing across categories** — a cache outscoring a warehouse tells you nothing useful.
- **Trusting a single source** — each signal is biased; managed engines are invisible to some of them.
- **Reading hype as maturity** — GitHub stars spike on launch, long before an engine is production-ready.

## References

- [DB-Engines Ranking](https://db-engines.com/en/ranking)
- [Stack Overflow Annual Developer Survey](https://survey.stackoverflow.co/)
- [*Designing Data-Intensive Applications*, Martin Kleppmann](https://dataintensive.net/) — on matching workloads to data models
