# Messaging

Asynchronous messaging decouples producers from consumers through an intermediary — a message broker — so services communicate reliably without being connected at the same moment. This section covers the fundamentals, the wire protocols, the recurring patterns, and the market and cloud brokers, plus a decision guide for choosing among them.

Start with the [Overview](overview.md), then read [Patterns](patterns.md) for the guarantees that govern correctness. The [Brokers](brokers/README.md) subsection deep-dives each product; the [Comparison](comparison.md) helps you pick one.

---

## Concepts & Protocols

| Article | Description |
|---|---|
| [Overview](overview.md) | What asynchronous messaging is, queue vs. stream/log, and why decoupling matters |
| [AMQP](amqp.md) | The Advanced Message Queuing Protocol — exchanges, bindings, queues, and reliability |
| [Messaging Protocols](protocols.md) | AMQP, MQTT, STOMP, and Kafka's binary protocol compared |
| [Messaging Patterns](patterns.md) | Point-to-point vs. pub/sub, delivery guarantees, ordering, and dead-letter queues |
| [Broker Comparison](comparison.md) | Kafka, RabbitMQ, SQS, Service Bus, Pub/Sub, and NATS side by side, with a decision guide |

---

## Brokers

| Subsection | Description |
|---|---|
| [Brokers](brokers/README.md) | Deep dives into each broker: Kafka, RabbitMQ, AWS SQS, Azure Service Bus, Google Pub/Sub, and NATS |
