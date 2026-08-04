---
type: concept
tags:
  - concept
  - messaging
related:
  - software-engineering/messaging/protocols
  - software-engineering/messaging/brokers/rabbitmq
  - software-engineering/messaging/patterns
language: null
---
# AMQP (Advanced Message Queuing Protocol)

> An open, binary wire protocol for message-oriented middleware that standardizes how producers, brokers, and consumers exchange messages — with rich routing, acknowledgements, and interoperability across vendors.

---

## What is it?

**AMQP** is an open standard protocol that defines, at the byte level, how clients and message brokers talk to each other. Because it is a *wire protocol* — not just an API — any AMQP client can talk to any AMQP broker, regardless of language or vendor. This is its defining trait: interoperability.

There are two distinct protocols under the name. **AMQP 0-9-1** is the widely deployed version popularized by RabbitMQ; it defines a broker model of exchanges, queues, and bindings. **AMQP 1.0** is an OASIS/ISO standard that is a different, lower-level protocol focused on peer-to-peer message transfer and leaves the broker's internal topology unspecified. In everyday usage, "AMQP" most often means 0-9-1.

## Why does it matter?

Before AMQP, message brokers spoke proprietary protocols; switching vendors meant rewriting clients. AMQP made messaging portable and gave developers a rich, well-defined model:

- **Vendor neutrality** — the same client library works against RabbitMQ, Qpid, ActiveMQ (via plugins), and others.
- **Flexible routing** — the exchange/binding model expresses point-to-point, publish/subscribe, and content-based routing declaratively, without custom code in the broker.
- **Reliability primitives built in** — publisher confirms, consumer acknowledgements, and persistent messages are part of the protocol, not add-ons.

If you use RabbitMQ, you are using AMQP 0-9-1; understanding the model explains why RabbitMQ behaves the way it does. See the [RabbitMQ article](brokers/rabbitmq.md).

## How it works

In the AMQP 0-9-1 model, a producer never publishes directly to a queue. It publishes to an **exchange** with a **routing key**. The exchange applies its type-specific rules and its **bindings** to decide which **queues** receive a copy of the message. Consumers subscribe to queues.

Exchange types:

- **direct** — routes to queues whose binding key exactly equals the routing key (point-to-point / routed work).
- **topic** — routes by pattern matching on dotted routing keys (`order.*.created`), using `*` (one word) and `#` (zero or more words).
- **fanout** — ignores the routing key and broadcasts to every bound queue (pub/sub).
- **headers** — routes on message header attributes instead of the routing key.

```
Producer
   │ publish(routing_key="order.eu.created")
   ▼
┌───────────────┐   bindings
│   Exchange    │──ke="order.eu.*"──► [ Queue: eu-orders ] ──► Consumer A
│  (type=topic) │──key="order.#"─────► [ Queue: audit ]     ──► Consumer B
└───────────────┘
```

Reliability is layered on top:

- **Publisher confirms** — the broker tells the producer the message was safely accepted.
- **Consumer acknowledgements (ack/nack)** — a message is removed only after the consumer confirms processing; an unacked message on a dropped connection is redelivered.
- **Persistence** — durable queues + persistent messages survive a broker restart.

AMQP runs over a single TCP connection multiplexed into lightweight **channels**, so an application opens one connection and many channels for concurrent work.

## Examples

Publishing and consuming with a topic exchange (pseudocode reflecting the AMQP 0-9-1 model):

```
# Setup: declare an exchange, a queue, and a binding
channel.exchange_declare(name="orders", type="topic", durable=true)
channel.queue_declare(name="eu-orders", durable=true)
channel.queue_bind(queue="eu-orders", exchange="orders", routing_key="order.eu.*")

# Producer: publish to the exchange with a routing key
channel.basic_publish(
  exchange="orders",
  routing_key="order.eu.created",
  body=payload,
  properties={ delivery_mode: 2 }   # persistent
)

# Consumer: subscribe to the queue with manual ack
channel.basic_consume(queue="eu-orders", auto_ack=false, handler=fn(msg) {
  process(msg)
  channel.basic_ack(msg.delivery_tag)   # remove only after success
})
```

## When to use

- You need flexible, declarative routing — content-based, topic, or fan-out — decided by the broker rather than in application code.
- Vendor/language interoperability matters and you want a client that is not locked to one broker.
- Per-message reliability (confirms, acks, persistence) is a first-class requirement.
- You are adopting RabbitMQ or another AMQP broker for task queues, RPC, or service integration.

## When NOT to use

- You need a high-throughput, replayable event log — a partitioned log broker like [Kafka](brokers/kafka.md) with its own protocol fits better than AMQP's queue model.
- Constrained IoT/edge devices with tiny footprints and unreliable networks — [MQTT](protocols.md) is lighter and purpose-built for that.
- You only need a simple managed cloud queue — the native SDK of [SQS](brokers/aws-sqs.md) or [Pub/Sub](brokers/google-pubsub.md) is simpler than running an AMQP broker.
- The overhead of the exchange/binding model is unnecessary for a single trivial queue.

## References

To go deeper, start with the protocol reference for the model, then the broker that implements it:

- [AMQP 0-9-1 Model Explained (RabbitMQ)](https://www.rabbitmq.com/tutorials/amqp-concepts.html) — the clearest walkthrough of exchanges, queues, and bindings.
- [AMQP 1.0 (OASIS standard)](https://www.amqp.org/) — the spec for the ISO-standardized peer-to-peer version.
- [Messaging Protocols](protocols.md) — how AMQP compares to MQTT, STOMP, and Kafka's protocol.
