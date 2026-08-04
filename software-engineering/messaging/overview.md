---
type: concept
tags:
  - concept
  - overview
  - messaging
related:
  - software-engineering/architecture/event-driven
  - software-engineering/messaging/patterns
  - software-engineering/messaging/comparison
language: null
---
# Messaging Overview

> Asynchronous messaging lets services communicate by exchanging messages through an intermediary instead of calling each other directly, decoupling producers from consumers in time, space, and scale.

---

## What is it?

**Messaging** is a style of communication in which one component (the **producer**) sends a message and another component (the **consumer**) receives it later, without the two being connected at the same moment. Instead of a producer invoking a consumer directly — as in a synchronous HTTP call — the message is handed to an intermediary that stores it and delivers it when the consumer is ready.

That intermediary is usually a **message broker** (Kafka, RabbitMQ, SQS, Azure Service Bus, Google Pub/Sub) or, in some designs, a lightweight library with no central server (brokerless). The essential idea is the same: the producer's job ends when the message is accepted, and the consumer processes it independently.

## Why does it matter?

Direct, synchronous calls couple services tightly: if the callee is slow or down, the caller blocks or fails. Messaging breaks that coupling along three axes:

- **Temporal decoupling** — the consumer does not need to be running when the message is sent. The broker holds it until the consumer is available.
- **Spatial decoupling** — the producer does not need to know who consumes the message or how many consumers exist. It publishes to a destination, not to a peer.
- **Load decoupling (buffering)** — a queue absorbs traffic spikes. If producers momentarily outpace consumers, messages accumulate instead of overloading the consumer.

These properties make messaging the backbone of event-driven systems, background job processing, cross-service integration, and data pipelines. See [event-driven architecture](../architecture/event-driven.md) for the architectural style built on top of it.

## How it works

Two fundamental models dominate messaging, and the difference shapes every broker choice.

**Queue (point-to-point).** A message goes to a queue and is delivered to exactly one consumer, then removed. Multiple consumers on the same queue form a *competing-consumers* pool that shares the load. This is the model for task/job processing — each job must be handled once.

**Log / stream (publish-subscribe with retention).** Messages are appended to an ordered, durable log. Many independent consumer groups read the same log at their own pace, and messages are retained (by time or size) regardless of who has read them — so consumers can *replay* history. This is the model for event streaming and analytics.

```
QUEUE (point-to-point)                 LOG / STREAM (retained)

Producer                               Producer
   │                                      │  append
   ▼                                      ▼
[ m3 | m2 | m1 ]  queue             [ m1 | m2 | m3 | m4 ... ]  log (append-only)
   │      consumed once                 ▲            ▲
   ├──────► Consumer A                  │            │
   └──────► Consumer B   (compete)   Group X      Group Y   (each reads all, own offset)
```

Around these models, brokers add features covered in [messaging patterns](patterns.md): delivery guarantees (at-most / at-least / exactly-once), ordering, dead-letter queues, and acknowledgements. The wire format is defined by a [protocol](protocols.md) such as AMQP, MQTT, or a broker-specific binary protocol.

## Examples

Conceptually, a producer and consumer never reference each other — only a named destination:

```
# Producer side
publish(destination="orders.created", message={ order_id: 1234, total: 99.90 })

# Consumer side (runs independently, possibly on another host, later in time)
on_message(destination="orders.created", handler=process_order)
```

The broker sits in between. The producer returns as soon as the broker accepts the message; the consumer is invoked whenever it is ready and the broker has something to deliver.

## When to use

- Services must be decoupled so that a slow or unavailable consumer does not break the producer.
- Work can be processed asynchronously (emails, notifications, image processing, ETL).
- Traffic is spiky and you need a buffer to smooth load.
- Multiple independent consumers need to react to the same event (fan-out).
- You are building an event-driven architecture or a data streaming pipeline.

## When NOT to use

- The caller genuinely needs an immediate, synchronous answer (e.g. a price quote to render on screen) — a request/response call is simpler and more direct.
- Strong end-to-end transactional consistency across steps is required and the added complexity of idempotency, ordering, and dead-lettering is not justified.
- The system is small and the operational cost of running (or paying for) a broker outweighs the coupling problem it would solve.
- Strict, low-latency ordering of every message through a single path is required — messaging adds hops and, in most models, only partial ordering guarantees.

## References

To go deeper, start with the vendor-neutral pattern catalog and the architectural context, then move to the concrete protocol and broker articles in this section:

- [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/) — the canonical catalog of messaging patterns (Hohpe & Woolf); the vocabulary the whole field uses.
- [Event-Driven Architecture](../architecture/event-driven.md) — the architectural style layered on top of messaging.
- [Messaging Patterns](patterns.md) and [Broker Comparison](comparison.md) — delivery guarantees, ordering, and how to choose a broker.
