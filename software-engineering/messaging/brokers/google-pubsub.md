---
type: concept
tags:
  - tool
  - messaging
related:
  - software-engineering/messaging/comparison
  - software-engineering/messaging/patterns
language: null
---
# Google Cloud Pub/Sub

> A fully managed, globally scalable publish/subscribe messaging service on Google Cloud that decouples producers and consumers with at-least-once delivery and automatic scaling.

---

## What is it?

**Google Cloud Pub/Sub** is a fully managed messaging service built around the publish/subscribe model. Producers publish messages to a **topic**; each **subscription** attached to that topic receives its own copy of every message, and consumers read from subscriptions. Because each subscription is independent, one topic can fan out to many consumers without them interfering with each other.

It is serverless and global: Google runs the infrastructure, and the service scales automatically from zero to very high throughput across regions.

## Why does it matter?

Pub/Sub is the default eventing and streaming ingress on GCP, solving large-scale fan-out and decoupling with no operations:

- **Managed and elastic** — no capacity planning; it scales to millions of messages per second and back down.
- **Native pub/sub** — unlike SQS, fan-out to multiple independent subscribers is built in, not bolted on.
- **Two delivery modes** — **pull** (consumers request messages) and **push** (Pub/Sub POSTs to an HTTPS endpoint, e.g. Cloud Run/Functions).
- **GCP integration** — a first-class source/sink for Dataflow, BigQuery, and Cloud Functions in data pipelines.

## How it works

A message published to a topic is written to every subscription on that topic. A consumer receives a message and must **acknowledge** it within the **ack deadline**; if it does not (crash, timeout), the message is redelivered — so delivery is **at-least-once** and consumers should be idempotent. Unacked-after-retries messages can be routed to a **dead-letter topic**.

By default there is no ordering. Enabling **ordering keys** guarantees that messages sharing a key are delivered in publish order (within a region). Retained/acked messages can be replayed using **snapshots** and **seek** within the retention window.

```
Producer ─► [ Topic ]
                ├─ Subscription A ──pull──► Consumer 1   (ack within deadline)
                └─ Subscription B ──push──► HTTPS endpoint (Cloud Run/Functions)

no ack in time → redelivered (at-least-once)
after N failures → Dead-Letter Topic
ordering key → per-key ordered delivery
```

## Getting Started

Create a topic and a subscription with the gcloud CLI, then publish and pull:

```bash
# Create a topic and a pull subscription
gcloud pubsub topics create orders
gcloud pubsub subscriptions create orders-sub --topic orders

# Publish a message
gcloud pubsub topics publish orders --message '{"order_id": 1234}'

# Pull and acknowledge
gcloud pubsub subscriptions pull orders-sub --auto-ack
```

Official documentation: [https://cloud.google.com/pubsub/docs](https://cloud.google.com/pubsub/docs)

## Examples

A pull consumer with explicit ack (pseudocode reflecting the client library model):

```
def handler(message):
    try:
        process(message.data)      # idempotent — at-least-once delivery
        message.ack()              # acknowledge within the ack deadline
    except:
        message.nack()             # negative-ack → redelivered sooner

subscriber.subscribe(subscription="orders-sub", callback=handler)
```

Publishing with an ordering key so per-entity order is preserved:

```
publisher.publish(topic="orders", data=event, ordering_key=account_id)
```

## When to use

- Your platform is on GCP and you want managed, elastic pub/sub with fan-out.
- Ingesting events for streaming pipelines into Dataflow or BigQuery.
- Triggering serverless consumers (Cloud Run/Functions) via push subscriptions.
- Global-scale event distribution without operating brokers.

## When NOT to use

- You need long-term, high-throughput replayable logs with rich stream processing — [Kafka](kafka.md) is a better fit (though Pub/Sub offers limited replay).
- You are not on GCP — it couples you to Google Cloud.
- You need broker-side content routing like AMQP exchanges — Pub/Sub routes by topic/subscription, not by rich rules ([RabbitMQ](rabbitmq.md) suits that).
- Ultra-low-latency, tiny-footprint edge messaging — [NATS](nats.md) is lighter.

## References

To go deeper, start with the official documentation, then the ordering and comparison references:

- [Google Cloud Pub/Sub documentation](https://cloud.google.com/pubsub/docs) — topics, subscriptions, push/pull, dead-letter.
- [Ordering messages](https://cloud.google.com/pubsub/docs/ordering) — ordering keys and their guarantees.
- [Broker Comparison](../comparison.md) — Pub/Sub vs. SQS, Service Bus, and the self-hosted brokers.
