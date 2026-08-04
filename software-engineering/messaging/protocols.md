---
type: concept
tags:
  - concept
  - messaging
related:
  - software-engineering/messaging/amqp
  - software-engineering/messaging/overview
  - software-engineering/messaging/comparison
language: null
---
# Messaging Protocols

> The wire protocols — AMQP, MQTT, STOMP, and broker-specific binary protocols — that define how clients and brokers actually exchange bytes, each optimized for a different environment.

---

## What is it?

A **messaging protocol** defines the exact format and rules for the bytes exchanged between a client and a message broker: how a connection is opened, how a message is framed, how acknowledgements flow. It is the layer below the broker's features and the client library's API.

The protocol matters because it determines interoperability (can any client talk to this broker?), footprint (how heavy is it on constrained devices?), and capabilities (does it support routing, QoS, transactions?). This article surveys the protocols you are most likely to meet.

## Why does it matter?

Choosing a broker often implicitly chooses a protocol, and the protocol's design leaks into what the system can do:

- An **open protocol** (AMQP, MQTT, STOMP) lets you swap client libraries and sometimes brokers; a **proprietary binary protocol** (Kafka) ties clients to that ecosystem but is tuned for its exact model.
- A **lightweight** protocol (MQTT) thrives on flaky, low-bandwidth networks; a **rich** protocol (AMQP) offers routing and reliability at higher cost.
- Knowing the protocol explains behavior: MQTT's QoS levels, AMQP's confirms, and Kafka's offset-based fetch are all protocol-level concepts, not library conveniences.

## How it works

The four protocols differ in target environment and model.

**AMQP** — a rich binary protocol for general-purpose messaging with broker-side routing (exchanges/bindings), acknowledgements, and transactions. AMQP 0-9-1 (RabbitMQ) defines a broker topology; AMQP 1.0 standardizes peer-to-peer transfer. Covered in depth in the [AMQP article](amqp.md).

**MQTT** — an extremely lightweight publish/subscribe protocol designed for IoT and constrained/unreliable networks. Tiny header, topic-based hierarchical subscriptions (`home/+/temperature`), and three **QoS levels**: 0 (at-most-once, fire-and-forget), 1 (at-least-once), 2 (exactly-once). A "last will" message announces unexpected disconnects.

**STOMP** — the Simple/Streaming Text-Oriented Messaging Protocol. A human-readable, HTTP-like text protocol (frames with `SEND`, `SUBSCRIBE`, `MESSAGE`). Trivial to implement in any language and easy to debug, but less efficient and feature-rich than binary protocols; common for browser/WebSocket messaging.

**Kafka's binary protocol** — a proprietary, TCP-based protocol built around the partitioned log. Consumers *fetch* records by offset rather than having messages pushed; the protocol is designed for high-throughput sequential I/O and batching. It is not interoperable with AMQP/MQTT clients — you use Kafka clients.

```
                Footprint    Model                 Typical use
AMQP            medium       broker routing        general messaging, RabbitMQ
MQTT            tiny         pub/sub + QoS         IoT, telemetry, mobile
STOMP           small        simple frames        browsers/WebSocket, debugging
Kafka protocol  medium       partitioned log      high-throughput streaming
```

## Examples

The same intent — "subscribe to temperature readings" — looks different per protocol.

MQTT (topic with wildcard, QoS 1):

```
SUBSCRIBE topic="home/+/temperature" qos=1
# broker pushes matching messages as they arrive
```

STOMP (text frame, easy to read on the wire):

```
SUBSCRIBE
id:0
destination:/topic/temperature

^@
```

Kafka (pull by offset — the consumer drives progress):

```
# consumer fetches records starting at its committed offset
fetch(topic="temperature", partition=0, offset=1500, max_bytes=1048576)
# advances its own offset after processing
```

## When to use

- **AMQP** — general-purpose messaging needing flexible routing and per-message reliability across languages.
- **MQTT** — IoT/edge/mobile with many devices, small messages, and unreliable connectivity.
- **STOMP** — quick integrations, browser/WebSocket clients, or when human-readable frames aid debugging.
- **Kafka protocol** — high-volume event streaming with replay, when you are committed to the Kafka ecosystem.

## When NOT to use

- Do not force **MQTT** into rich server-to-server routing scenarios — it has no exchange/binding model.
- Avoid **STOMP** for high-throughput or low-latency binary workloads — its text framing is inefficient.
- Avoid expecting **Kafka's protocol** to interoperate with AMQP/MQTT tooling — it does not.
- Do not pick a protocol in isolation — it comes bundled with the broker; choose the broker for the workload (see [comparison](comparison.md)) and accept its protocol.

## References

To go deeper, read each protocol's primary specification, then the broker comparison to see how protocol choice maps to product choice:

- [MQTT specification](https://mqtt.org/) — the pub/sub protocol for IoT, including QoS semantics.
- [STOMP specification](https://stomp.github.io/) — the text-based framing protocol.
- [Kafka protocol guide](https://kafka.apache.org/protocol) — the wire protocol behind the partitioned log.
- [AMQP](amqp.md) and [Broker Comparison](comparison.md) — the rich broker protocol and how to choose.
