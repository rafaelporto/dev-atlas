---
type: concept
tags:
  - concept
  - comparison
  - decision-support
  - messaging
related:
  - software-engineering/messaging/brokers/kafka
  - software-engineering/messaging/brokers/rabbitmq
  - software-engineering/messaging/brokers/aws-sqs
  - software-engineering/messaging/brokers/azure-service-bus
  - software-engineering/messaging/brokers/google-pubsub
  - software-engineering/messaging/brokers/nats
language: null
---
# Broker Comparison

> A side-by-side comparison of Kafka, RabbitMQ, AWS SQS, Azure Service Bus, Google Pub/Sub, and NATS — and a decision guide for choosing among them.

---

## What is it?

This article compares the six message brokers covered in this section across the dimensions that actually drive a choice: their core model (queue vs. log), delivery and ordering guarantees, throughput, retention/replay, whether they are self-hosted or fully managed, and their protocol. It closes with a decision guide.

The single most important distinction is **queue vs. log**. Queue brokers (RabbitMQ, SQS, Service Bus, core NATS) deliver a message to a consumer and then remove it. Log brokers (Kafka, and NATS JetStream) append messages to a retained, replayable stream that many consumer groups read independently. Most other differences follow from this split.

## Why does it matter?

Brokers look interchangeable until a requirement exposes the difference: you need to replay a week of events (needs a log), or you need one job run exactly once by a worker pool (a queue), or you cannot run infrastructure (needs managed). Picking the wrong side of the queue/log divide leads to fighting the tool. A deliberate comparison up front avoids a costly migration later.

## How it works

The comparison table summarizes the trade-offs. "Managed" means a cloud service with no servers to run; "self-hosted" means you operate it (or use a managed add-on).

| Broker | Model | Delivery | Ordering | Retention / replay | Hosting | Protocol |
|---|---|---|---|---|---|---|
| [Kafka](brokers/kafka.md) | Partitioned log | At-least-once (exactly-once within Kafka) | Per partition | Yes — time/size based, replayable | Self-hosted or managed (MSK, Confluent) | Kafka binary |
| [RabbitMQ](brokers/rabbitmq.md) | Queue (AMQP routing) | At-least-once / at-most-once | Per queue | No (consumed = gone) | Self-hosted or managed | AMQP 0-9-1 (+ MQTT/STOMP plugins) |
| [AWS SQS](brokers/aws-sqs.md) | Queue | At-least-once (standard), exactly-once-ish (FIFO) | FIFO queues only | No — up to 14-day buffer | Fully managed (AWS) | HTTP/AWS SDK |
| [Azure Service Bus](brokers/azure-service-bus.md) | Queue + topics/subscriptions | At-least-once (+ sessions) | Per session | No (short TTL buffer) | Fully managed (Azure) | AMQP 1.0 (+ HTTP) |
| [Google Pub/Sub](brokers/google-pubsub.md) | Pub/sub | At-least-once | Ordering keys (optional) | Limited (retention window, replay via snapshots) | Fully managed (GCP) | HTTP/gRPC SDK |
| [NATS](brokers/nats.md) | Core: pub/sub; JetStream: log | Core: at-most-once; JetStream: at-least-once | Per subject/stream | Core: none; JetStream: yes | Self-hosted (or Synadia Cloud) | NATS protocol |

```
Choose by the primary question:

Need to REPLAY history / high-volume streaming?    ─► Kafka  (or NATS JetStream)
Need flexible ROUTING + per-message reliability?    ─► RabbitMQ
On AWS, want a zero-ops QUEUE?                       ─► SQS (FIFO for ordering)
On Azure, want queues + topics + transactions?       ─► Azure Service Bus
On GCP, want managed global PUB/SUB?                 ─► Google Pub/Sub
Need ultra-light, low-latency messaging / edge?      ─► NATS
```

## Examples

Two requirements, two clear answers.

*"Process each uploaded video exactly once across a pool of workers, on AWS, with no servers to manage."* → a **queue** + managed → **SQS** (FIFO if per-user ordering is needed).

*"Feed the same stream of user-activity events into real-time fraud detection, a data warehouse loader, and an audit archive — and let a new consumer replay the last 7 days."* → a **replayable log** with independent consumer groups → **Kafka**.

## When to use

- **Kafka** — event streaming, log aggregation, replay, high throughput; you accept operational complexity or pay for a managed offering.
- **RabbitMQ** — task queues, RPC, and complex routing where AMQP's exchanges shine.
- **AWS SQS / Azure Service Bus / Google Pub/Sub** — you are already on that cloud and want a managed broker with minimal ops.
- **NATS** — microservices and edge/IoT needing very low latency and a tiny footprint; JetStream when you also need persistence.

## When NOT to use

- Do not use **Kafka** as a simple task queue — its complexity is unjustified when RabbitMQ or SQS suffices.
- Do not use **RabbitMQ** as a long-term replayable event store — it is not a log.
- Do not use a **cloud-native broker** (SQS/Service Bus/Pub/Sub) if you need portability across clouds or on-prem — you couple to that provider.
- Do not use **core NATS** when you require durability and delivery guarantees — use JetStream (or a different broker) instead.

## References

To go deeper, read each broker's own article in this section and its official documentation, then match the dimensions above to your requirements:

- [Kafka](brokers/kafka.md), [RabbitMQ](brokers/rabbitmq.md), [AWS SQS](brokers/aws-sqs.md), [Azure Service Bus](brokers/azure-service-bus.md), [Google Pub/Sub](brokers/google-pubsub.md), [NATS](brokers/nats.md) — the per-broker deep dives.
- [Messaging Patterns](patterns.md) — the delivery and ordering guarantees referenced in the table.
- [RabbitMQ vs Kafka (official comparison)](https://www.rabbitmq.com/blog/2023/07/13/rabbitmq-vs-kafka-part-1) — a vendor walkthrough of the queue-vs-log trade-off.
