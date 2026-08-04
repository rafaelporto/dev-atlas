---
type: concept
tags:
  - concept
  - messaging
  - async
related:
  - software-engineering/messaging/overview
  - software-engineering/architecture/event-driven
  - software-engineering/messaging/comparison
language: null
---
# Messaging Patterns

> The recurring designs of message-based systems — point-to-point vs. publish/subscribe, delivery guarantees, ordering, and dead-letter handling — that determine correctness under failure.

---

## What is it?

**Messaging patterns** are the standard ways producers and consumers exchange messages and the guarantees a system makes about that exchange. Two axes matter most: the **distribution model** (does a message go to one consumer or many?) and the **delivery guarantee** (how many times might a consumer see a message?). Everything else — ordering, retries, dead-lettering, idempotency — follows from choices on these axes.

These patterns are broker-independent: Kafka, RabbitMQ, SQS, and the rest all implement the same underlying ideas with different names and defaults.

## Why does it matter?

Distributed messaging fails in ways in-process calls do not: networks drop, consumers crash mid-processing, brokers restart. The patterns exist to keep the system correct anyway. Getting them wrong produces the classic bugs — a payment charged twice, events processed out of order, a poison message that blocks a queue forever. Choosing the right guarantee (and designing consumers to match) is the difference between a reliable pipeline and a corrupt one.

## How it works

**Distribution models.**

- **Point-to-point (queue)** — each message is consumed by exactly one consumer. Multiple consumers form a *competing-consumers* pool that scales throughput horizontally.
- **Publish/subscribe (topic)** — each message is delivered to every interested subscriber. Fan-out enables independent reactions to the same event.

**Delivery guarantees.**

- **At-most-once** — deliver and forget; a failure loses the message. Lowest overhead, acceptable for disposable telemetry.
- **At-least-once** — redeliver until acknowledged; failures cause **duplicates**. The most common guarantee; consumers must be **idempotent**.
- **Exactly-once** — no loss and no duplicates. Expensive and only achievable end-to-end with cooperation (transactions, dedup keys, or processing frameworks); often the practical answer is at-least-once + idempotency.

**Ordering.** Total ordering across a whole topic is rare and costly. Most brokers guarantee order only within a partition/queue/session key. Route messages that must stay ordered to the same key.

**Dead-letter queue (DLQ).** After N failed processing attempts, a message is moved to a separate queue instead of being retried forever — isolating "poison" messages for inspection without blocking the main flow.

```
Competing consumers (scale)          At-least-once + idempotency

[ queue ]──► Consumer 1              deliver ──► process ──► ack
        └──► Consumer 2                  ▲                    │
        └──► Consumer 3                  └── no ack? redeliver┘
   one message → one consumer        duplicate possible → dedup by message id

Retry then dead-letter

msg ──► attempt 1..N fails ──► [ DLQ ]  (inspect, fix, replay)
```

## Examples

An **idempotent consumer** — the standard defense for at-least-once delivery. Track processed message IDs and skip duplicates:

```
on_message(msg):
    if store.seen(msg.id):        # already processed this exact message
        ack(msg)                  # ack again; do no work
        return
    process(msg)                  # the actual business effect
    store.mark_seen(msg.id)       # record before/with the effect (transactionally if possible)
    ack(msg)
```

**Ordering by key** — send all events for one entity to the same partition/queue so they stay ordered relative to each other:

```
publish(topic="account-events", key=account_id, message=event)
# broker maps key -> partition; same account_id always lands on the same partition
```

## When to use

- **Point-to-point** — work/task processing where each job must run exactly one time across a pool of workers.
- **Pub/sub** — multiple services must react independently to the same event (fan-out).
- **At-least-once + idempotency** — the default for most business messaging; correct and affordable.
- **DLQ** — any consumer that can fail on individual messages, to avoid head-of-line blocking.

## When NOT to use

- Do not rely on **exactly-once** as a broker checkbox for end-to-end correctness — design idempotency instead; true exactly-once needs cooperation across the whole path.
- Do not assume **global ordering**; if you need it, funnel through a single partition and accept the throughput ceiling.
- Do not use **at-most-once** for anything whose loss has business impact.
- Do not skip a **DLQ** on a queue that can receive malformed messages — one poison message can stall the entire consumer group.

## References

To go deeper, start with the pattern catalog, then see how specific brokers expose these guarantees:

- [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/) — the definitive catalog of messaging patterns and terminology.
- [Idempotent Consumer pattern (microservices.io)](https://microservices.io/patterns/communication-style/idempotent-consumer.html) — handling at-least-once duplicates.
- [Broker Comparison](comparison.md) — which guarantees and ordering models each broker provides by default.
