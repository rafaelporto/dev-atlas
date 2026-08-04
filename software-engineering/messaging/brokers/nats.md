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
# NATS

> A lightweight, high-performance cloud-native messaging system offering fire-and-forget pub/sub in its core and durable, replayable streams via JetStream.

---

## What is it?

**NATS** is an open-source (CNCF) messaging system designed to be small, fast, and simple to operate. Its **core** is a subject-based publish/subscribe system: producers publish to a **subject** (a dotted string like `orders.eu.created`) and subscribers receive matching messages in real time. Core NATS is **fire-and-forget** — if no one is listening, or a subscriber is down, the message is simply not delivered (at-most-once).

For durability, NATS adds **JetStream**: a persistence layer that turns subjects into retained, replayable **streams** with at-least-once delivery, consumer offsets, and acknowledgements — bringing log-like semantics to NATS without a separate system.

## Why does it matter?

NATS targets the niche of extremely low latency and tiny operational footprint, common in microservices and edge/IoT:

- **Lightweight** — a single small binary, minimal configuration, and very low resource use; trivial to run at the edge.
- **High performance / low latency** — designed for millions of messages per second with microsecond-scale latency.
- **Flexible patterns in one system** — pub/sub, queue groups (competing consumers), and request/reply are all built in; JetStream adds persistence when needed.
- **Cloud-native** — clustering, superclusters, and leaf nodes support global, multi-region topologies.

## How it works

In **core NATS**, subjects support wildcards (`*` one token, `>` the rest), and a **queue group** lets multiple subscribers share a subject's load (only one member of the group gets each message) — the competing-consumers pattern. **Request/reply** is native: a publisher includes a reply subject and awaits a response.

**JetStream** layers persistence on top: a **stream** captures messages published to configured subjects and stores them (by age, size, or count). **Consumers** track their position and acknowledge messages, giving at-least-once delivery and replay — much like a log broker.

```
CORE NATS (at-most-once, real-time)        JETSTREAM (at-least-once, persistent)

Publisher ─► subject "orders.eu.*"         Publisher ─► subject ─► [ Stream (retained) ]
   ├─► Subscriber (all get it)                                        │
   └─► Queue group [ S1 | S2 ]  (one gets it)   Consumer ← acks + offset (replayable)
       no listener → message dropped
```

## Getting Started

Run a NATS server (with JetStream enabled) via Docker:

```bash
docker run -d --name nats \
  -p 4222:4222 -p 8222:8222 \
  nats:latest -js          # -js enables JetStream

# Using the NATS CLI (nats) to publish/subscribe
nats sub "orders.>"        # subscribe (in one terminal)
nats pub orders.eu.created '{"order_id": 1234}'   # publish (in another)
```

Official documentation: [https://docs.nats.io/](https://docs.nats.io/)

## Examples

Core pub/sub with a queue group, and a JetStream durable consumer (pseudocode reflecting the client model):

```
# Core NATS: competing consumers via a queue group
nc.subscribe(subject="orders.*", queue="workers", handler=process)   # load shared across group

# Request/reply
reply = nc.request(subject="pricing.quote", payload=req, timeout=1s)

# JetStream: persistent, replayable
js.add_stream(name="ORDERS", subjects=["orders.>"])
js.subscribe(subject="orders.>", durable="warehouse", handler=fn(msg) {
    process(msg)
    msg.ack()        # at-least-once; ack advances the durable consumer
})
```

## When to use

- Microservices needing very low latency for pub/sub, request/reply, or load-balanced work.
- Edge/IoT deployments where a tiny footprint and simple ops matter.
- Global topologies via clustering, superclusters, and leaf nodes.
- You want persistence/replay (JetStream) without adopting a heavier log platform.

## When NOT to use

- You require durability and delivery guarantees but only use **core NATS** — its fire-and-forget model will lose messages; enable JetStream or choose a durable broker.
- Very large-scale, long-retention event streaming with a mature processing ecosystem — [Kafka](kafka.md) has deeper tooling.
- You want a fully managed cloud queue on AWS/Azure/GCP with zero self-hosting — [SQS](aws-sqs.md), [Service Bus](azure-service-bus.md), or [Pub/Sub](google-pubsub.md) fit better (NATS is primarily self-hosted).
- You need AMQP-style broker-side content routing — that is [RabbitMQ](rabbitmq.md)'s strength.

## References

To go deeper, start with the official documentation, then JetStream and the broker comparison:

- [NATS documentation](https://docs.nats.io/) — subjects, queue groups, request/reply, clustering.
- [JetStream](https://docs.nats.io/nats-concepts/jetstream) — persistence, streams, and durable consumers.
- [Broker Comparison](../comparison.md) — NATS vs. Kafka and the managed brokers.
