---
type: concept
tags:
  - tool
  - messaging
related:
  - software-engineering/messaging/comparison
  - software-engineering/messaging/amqp
  - software-engineering/messaging/patterns
language: null
---
# RabbitMQ

> A mature, general-purpose message broker built on AMQP, offering flexible routing through exchanges and bindings, per-message reliability, and a broad protocol ecosystem.

---

## What is it?

**RabbitMQ** is an open-source message broker whose core protocol is [AMQP 0-9-1](../amqp.md). Producers publish messages to an **exchange**, which routes them to one or more **queues** based on **bindings** and the message's routing key. Consumers read from queues, and a message is removed once acknowledged. It is the archetypal *queue* broker: messages are delivered and then gone (no long-term replay like a log).

Beyond AMQP, RabbitMQ supports MQTT, STOMP, and WebSocket messaging through plugins, and adds durable **streams** for append-only workloads — making it flexible across many messaging styles.

## Why does it matter?

RabbitMQ is the default choice when you need **smart routing** and **reliable task delivery** rather than a high-volume replayable log:

- **Flexible routing** — direct, topic, fanout, and headers exchanges express point-to-point, pub/sub, and content-based routing declaratively, decided by the broker.
- **Per-message reliability** — publisher confirms, consumer acknowledgements, persistent messages, and dead-letter exchanges are first-class.
- **Fair work distribution** — competing consumers with prefetch limits distribute tasks evenly across a worker pool.
- **Mature and polyglot** — battle-tested, with clients in every major language and a friendly management UI.

## How it works

The AMQP model separates *publishing* from *routing*. A producer publishes to an exchange with a routing key; the exchange's type and its bindings decide which queues receive a copy. Consumers subscribe to queues and acknowledge messages after processing; unacked messages on a dropped connection are redelivered.

```
Producer
   │ publish(exchange="orders", routing_key="order.eu.created")
   ▼
┌────────────────┐  bindings
│ Exchange       │─"order.eu.*"─► [ Queue: eu-orders ] ─► Worker A ─┐ competing
│ (type=topic)   │─"order.#"─────► [ Queue: audit ]    ─► Worker B ─┘ consumers
└────────────────┘
   failed N times → Dead Letter Exchange → [ Queue: dlq ]
```

Reliability layers: **durable** queues plus **persistent** messages survive a restart; **publisher confirms** tell the producer the broker stored the message; **manual acks** ensure a message is only removed after successful processing; a **dead-letter exchange** captures messages that repeatedly fail. **Quorum queues** replicate across nodes for high availability.

## Getting Started

Run RabbitMQ locally (with the management UI) via Docker:

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management
```

Open [http://localhost:15672](http://localhost:15672) (default user/pass `guest`/`guest`) for the management UI. AMQP clients connect on port `5672`.

Official tutorials: [https://www.rabbitmq.com/tutorials](https://www.rabbitmq.com/tutorials)

## Examples

A topic exchange with a durable queue and manual acknowledgement (pseudocode reflecting the AMQP model):

```
# Topology
channel.exchange_declare("orders", type="topic", durable=true)
channel.queue_declare("eu-orders", durable=true)
channel.queue_bind(queue="eu-orders", exchange="orders", routing_key="order.eu.*")

# Producer
channel.basic_publish(exchange="orders", routing_key="order.eu.created",
                      body=payload, properties={ delivery_mode: 2 })  # persistent

# Consumer — fair dispatch + manual ack
channel.basic_qos(prefetch_count=1)
channel.basic_consume("eu-orders", auto_ack=false, handler=fn(msg) {
    process(msg)
    channel.basic_ack(msg.delivery_tag)   # remove only after success
})
```

## When to use

- Task/job queues and background work processed once by a worker pool.
- Complex or content-based routing between services (topic/headers exchanges).
- Request/reply and RPC patterns over messaging.
- You want AMQP interoperability and per-message reliability without operating a log platform.

## When NOT to use

- High-volume event streaming with **replay** — a log broker like [Kafka](kafka.md) fits better (RabbitMQ streams narrow but do not erase this gap).
- Extremely high sustained throughput where a partitioned log outperforms a queue.
- You want a fully managed, zero-ops cloud queue and are on AWS/Azure/GCP — [SQS](aws-sqs.md), [Service Bus](azure-service-bus.md), or [Pub/Sub](google-pubsub.md) remove the ops burden.
- Ultra-low-latency, tiny-footprint edge messaging — [NATS](nats.md) is lighter.

## References

To go deeper, start with the official tutorials and the AMQP model, then the broker comparison:

- [RabbitMQ documentation](https://www.rabbitmq.com/docs) — configuration, reliability, clustering.
- [RabbitMQ tutorials](https://www.rabbitmq.com/tutorials) — hands-on examples of each routing pattern.
- [AMQP](../amqp.md) and [Broker Comparison](../comparison.md) — the protocol and how RabbitMQ compares to Kafka.
