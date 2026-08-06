---
type: concept
tags:
  - database
  - backend
related:
  - software-engineering/databases/types/key-value
  - software-engineering/databases/types/document
  - software-engineering/databases/engines/redis
language: null
---
# DynamoDB

> A fully-managed, serverless key-value and document store that scales to any throughput with single-digit-millisecond latency — as long as you design around its access patterns.

---

## What is it?

Amazon DynamoDB is a proprietary, **AWS-only** NoSQL database. It combines a **key-value** and a **document** model: data lives in tables as *items* (rows), each a bag of *attributes* (typed fields, including nested JSON-like documents). Every item is identified by a **primary key** — either a single **partition key** or a composite **partition key + sort key**.

It is **serverless**: there are no servers, versions, or disks to manage. You create a table and read/write it through an API; AWS handles partitioning, replication, and scaling. Capacity is either **provisioned** (you set read/write units) or **on-demand** (pay per request). Data is stored on disk (not in-memory) and replicated across three Availability Zones for durability.

DynamoDB descends from the 2007 *Dynamo* paper, one of the most influential documents in NoSQL history — though today's DynamoDB is a managed evolution, not the original system.

## Why does it matter?

DynamoDB is the default database for serverless and event-driven applications on AWS. It pairs naturally with Lambda and API Gateway, scales elastically without capacity planning, and holds latency flat — single-digit milliseconds — from thousands to millions of requests per second. Because it is fully managed, an ops team never patches, backs up, or reshards it.

The catch that shapes everything: DynamoDB rewards **modeling for known access patterns up front** (often via *single-table design*). Get the key design right and it is nearly unbreakable at scale; get it wrong and you fight hot partitions, expensive scans, and costs that balloon.

## How it works

```
        PutItem / GetItem / Query / Scan  (HTTPS API)
                          │
                 hash(partition key)
                          │
     ┌────────────────────┼────────────────────┐
     ▼                    ▼                    ▼
┌──────────┐        ┌──────────┐        ┌──────────┐
│partition │        │partition │        │partition │
│  (3 AZ    │        │  copies) │        │          │
│ replicas)│        │          │        │          │
└──────────┘        └──────────┘        └──────────┘
  within a partition, items are ordered by sort key
```

- **Partitioning by hash**: the partition key is hashed to place the item on a partition. Items sharing a partition key are stored together, ordered by sort key — enabling efficient range `Query` within one partition.
- **Replication**: each partition is synchronously replicated across three AZs, giving high durability and availability.
- **Consistency**: reads are **eventually consistent** by default (cheaper, faster) or **strongly consistent** on request (reads the leader replica).
- **Secondary indexes**: **Local Secondary Indexes** (same partition key, different sort key) and **Global Secondary Indexes** (different partition key entirely) add alternative access paths at extra cost.
- **Scale**: no cross-partition coordination on the read path, so throughput scales by spreading load across partition keys — which is why an even key distribution matters so much.

## Examples

Write and read an item (AWS CLI, item as JSON):

```
aws dynamodb put-item --table-name Users \
  --item '{"userId": {"S": "42"}, "name": {"S": "Ada"}, "tier": {"S": "gold"}}'

aws dynamodb get-item --table-name Users \
  --key '{"userId": {"S": "42"}}'
```

Query a partition by key + sort-key range (orders for one user, newest first):

```
aws dynamodb query --table-name Orders \
  --key-condition-expression "userId = :u AND createdAt > :t" \
  --expression-attribute-values '{":u": {"S": "42"}, ":t": {"S": "2026-01-01"}}' \
  --no-scan-index-forward
```

`Scan` reads the whole table — avoid it on the hot path:

```
aws dynamodb scan --table-name Users     # expensive: reads every item
```

## When to use

- **Serverless applications on AWS** — pairs naturally with Lambda, API Gateway, and event-driven stacks.
- **Unpredictable or spiky scale** — on-demand capacity absorbs traffic swings without provisioning.
- **Well-defined, key-based access patterns** — lookups and range queries by partition/sort key.
- **Workloads needing zero database operations** — no patching, resharding, or backups to run.
- **Extreme throughput at flat latency** — hundreds of thousands of requests/sec with a single-digit-ms P99.

## When NOT to use

- **AWS lock-in is unacceptable** — DynamoDB runs only on AWS; there is no self-hosted version.
- **Ad-hoc or relational queries** — joins, arbitrary filters, and reporting are painful; use a [relational](../types/relational.md) database or an analytics store.
- **Access patterns are unknown or change often** — the up-front data modeling is unforgiving to redesign.
- **Cost sensitivity with heavy scans or poor key design** — hot partitions and full scans get expensive fast.
- **Large items or big binary blobs** — items are capped (400 KB); store large objects in S3 and keep a pointer.

## References

- [Amazon DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [*Dynamo: Amazon's Highly Available Key-value Store* (2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
- [DynamoDB — single-table design](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html)
