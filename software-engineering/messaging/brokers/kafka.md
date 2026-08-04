---
type: concept
tags:
  - tool
  - messaging
related:
  - software-engineering/messaging/comparison
  - software-engineering/messaging/protocols
  - software-engineering/architecture/event-driven
language: null
---
# Apache Kafka

> A distributed, partitioned, replicated commit log that stores streams of events durably and lets many independent consumers read and replay them at high throughput.

---

## What is it?

**Apache Kafka** is a distributed event streaming platform built around an append-only, ordered **log**. Producers append records to **topics**; the records stay on disk for a configured retention period regardless of who has read them. Consumers read by tracking their own position (**offset**) in the log, so many independent consumers — and new ones added later — can read the same data without affecting each other.

This is fundamentally different from a traditional queue: Kafka does not delete a message when it is consumed. It is a durable, replayable stream, which is why it underpins event-driven architectures, log aggregation, and data pipelines.

## Why does it matter?

Kafka solves the problem of moving large volumes of events reliably between many producers and many consumers, with the ability to replay:

- **High throughput** — sequential disk I/O, batching, and zero-copy transfer let a cluster handle millions of messages per second.
- **Replay** — because records are retained, a new consumer (or a fixed bug) can reprocess history from any offset.
- **Fan-out without duplication of storage** — one topic feeds many consumer groups (fraud detection, warehouse, audit) reading the same log independently.
- **Durability and scale** — partitions are replicated across brokers; the cluster scales horizontally by adding partitions and brokers.

## How it works

A topic is split into **partitions**; each partition is an ordered, immutable sequence of records. Ordering is guaranteed **within** a partition, not across the whole topic. A record's **key** determines its partition, so all records with the same key stay ordered.

Consumers belong to a **consumer group**. Kafka assigns each partition to exactly one consumer in the group, so the group shares the load and scales up to the partition count. Different groups each get the full stream. Each consumer commits its **offset** to mark progress.

```
Topic "orders" (3 partitions)          Consumer groups read independently

P0: [ r0 | r1 | r2 | r3 ... ]          Group A (warehouse)   Group B (fraud)
P1: [ r0 | r1 | r2 ... ]                 C1 ← P0                C1 ← P0,P1,P2
P2: [ r0 | r1 ... ]                      C2 ← P1,P2             (own offsets)

key(order_id) → same partition → per-order ordering preserved
```

Replication: each partition has a leader and follower replicas on other brokers; if the leader fails, a follower takes over. Modern Kafka manages cluster metadata with **KRaft** (replacing the older ZooKeeper dependency).

## Getting Started

Run a single-broker Kafka locally with Docker (KRaft mode, no ZooKeeper):

```bash
docker run -d --name kafka \
  -p 9092:9092 \
  apache/kafka:latest

# Create a topic, then produce/consume from inside the container
docker exec -it kafka /opt/kafka/bin/kafka-topics.sh \
  --create --topic orders --partitions 3 --bootstrap-server localhost:9092
```

Official quickstart: [https://kafka.apache.org/quickstart](https://kafka.apache.org/quickstart)

## Examples

Producing with a key (for per-key ordering) and consuming as part of a group (pseudocode reflecting the client model):

```
# Producer — key routes the record to a partition
producer.send(topic="orders", key=order_id, value=order_json)

# Consumer — join a group; Kafka assigns partitions and tracks offsets
consumer.subscribe(topics=["orders"], group_id="warehouse-loader")
loop:
    records = consumer.poll(timeout=1s)
    for r in records:
        process(r.value)
    consumer.commit()          # advance committed offset after processing
```

## When to use

- Event streaming and event-driven architectures with many producers/consumers.
- High-volume ingestion: logs, metrics, clickstreams, IoT telemetry.
- You need **replay** — reprocessing history after a bug fix or for a new consumer.
- Building data pipelines feeding warehouses, search indexes, or stream processors (Kafka Streams, Flink).

## When NOT to use

- Simple task/job queues where each message is handled once and never replayed — RabbitMQ or SQS are far simpler.
- Low-volume systems where Kafka's operational complexity (or managed cost) is unjustified.
- Request/reply RPC — Kafka is not designed for synchronous call-and-response.
- Complex per-message routing decisions — Kafka routes by partition key, not by AMQP-style content rules.

## References

To go deeper, start with the official documentation, then the design internals and the broker comparison:

- [Apache Kafka documentation](https://kafka.apache.org/documentation/) — the authoritative reference.
- [Kafka design internals](https://kafka.apache.org/documentation/#design) — the log, partitions, and replication explained.
- [Broker Comparison](../comparison.md) — Kafka vs. the queue-based brokers.
