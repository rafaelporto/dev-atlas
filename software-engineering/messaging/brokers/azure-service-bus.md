---
type: concept
tags:
  - tool
  - messaging
related:
  - software-engineering/messaging/comparison
  - software-engineering/messaging/patterns
  - software-engineering/messaging/amqp
language: null
---
# Azure Service Bus

> A fully managed enterprise message broker on Azure offering both queues and publish/subscribe topics, with sessions, transactions, and dead-lettering built in.

---

## What is it?

**Azure Service Bus** is Microsoft's fully managed enterprise messaging service. It provides two destination types: **queues** (point-to-point) and **topics** with **subscriptions** (publish/subscribe), so one message can be delivered to one consumer or fanned out to many filtered subscribers. Its native wire protocol is [AMQP 1.0](../amqp.md), and it also exposes an HTTP API.

It targets enterprise integration scenarios that need more than a raw queue: ordered processing via **sessions**, **transactions** across multiple messages/entities, scheduled delivery, and duplicate detection.

## Why does it matter?

Service Bus is the go-to broker for applications on Azure that need enterprise messaging semantics without operating infrastructure:

- **Queues *and* topics in one service** — point-to-point work and pub/sub fan-out with per-subscription filters, no extra component required.
- **Sessions** — FIFO ordering and stateful processing grouped by a session id (e.g. all messages for one order handled in order by one consumer).
- **Enterprise features** — transactions, duplicate detection, scheduled/deferred messages, and automatic dead-lettering.
- **Managed + integrated** — no servers to run; native integration with Azure Functions, Logic Apps, and Entra ID (Azure AD) auth.

## How it works

For point-to-point, producers send to a **queue** and competing consumers receive from it. For pub/sub, producers send to a **topic**; each **subscription** on that topic receives a copy of messages matching its **filter** (a SQL-like rule), and consumers read from subscriptions as if they were queues.

Consumers use **peek-lock**: a received message is locked (invisible to others) until the consumer completes it (removed), abandons it (unlocked and redelivered), or lets the lock expire. Messages that exceed the max delivery count — or are explicitly dead-lettered — move to an associated **dead-letter subqueue**.

```
POINT-TO-POINT                       PUBLISH / SUBSCRIBE

Producer ─► [ Queue ] ─► Consumer    Producer ─► [ Topic ]
                                                 ├─ Sub A (filter: region='eu') ─► Consumer 1
peek-lock: complete / abandon /                  └─ Sub B (filter: 1=1, all)     ─► Consumer 2
           dead-letter                 each subscription = an independent queue-like view
```

**Sessions** enforce ordering: messages sharing a `SessionId` are delivered in order and locked to a single consumer for the session's lifetime.

## Getting Started

Provision a namespace and a queue with the Azure CLI:

```bash
# Create a Service Bus namespace (Standard tier supports topics)
az servicebus namespace create --name my-namespace \
  --resource-group my-rg --sku Standard

# Create a queue
az servicebus queue create --name orders \
  --namespace-name my-namespace --resource-group my-rg
```

Then connect an AMQP/SDK client using the namespace connection string or Entra ID auth.

Official documentation: [https://learn.microsoft.com/azure/service-bus-messaging/](https://learn.microsoft.com/azure/service-bus-messaging/)

## Examples

Sending to a topic and receiving from a session-enabled queue (pseudocode reflecting the SDK model):

```
# Publish to a topic — subscriptions with matching filters each get a copy
sender = client.topic_sender("orders")
sender.send({ body: order_json, application_properties: { region: "eu" } })

# Receive with peek-lock + explicit completion
receiver = client.queue_receiver("orders", session_id="order-1234")  # ordered per session
for msg in receiver.receive():
    try:
        process(msg)
        receiver.complete(msg)     # remove after success
    except:
        receiver.abandon(msg)      # unlock → redelivered; eventually dead-lettered
```

## When to use

- Your platform is on Azure and you want a managed broker with both queues and pub/sub topics.
- You need ordered, stateful processing via sessions (per-entity FIFO).
- Enterprise semantics matter: transactions, duplicate detection, scheduled delivery, dead-lettering.
- Integrating with Azure Functions, Logic Apps, or other Azure services.

## When NOT to use

- High-throughput event streaming with replay — use [Kafka](kafka.md) or Azure Event Hubs, not Service Bus.
- You are not on Azure — it couples you to that cloud; prefer a portable broker or your own cloud's service.
- Ultra-low-latency, lightweight edge messaging — [NATS](nats.md) is far lighter.
- Simple single-cloud queue needs where the enterprise feature set is overkill and cost/tier complexity is unwanted.

## References

To go deeper, start with the official documentation, then the AMQP model it speaks and the broker comparison:

- [Azure Service Bus documentation](https://learn.microsoft.com/azure/service-bus-messaging/) — queues, topics, sessions, transactions.
- [Service Bus vs. Event Hubs vs. Event Grid](https://learn.microsoft.com/azure/event-grid/compare-messaging-services) — choosing among Azure's messaging services.
- [AMQP](../amqp.md) and [Broker Comparison](../comparison.md) — the protocol and cross-broker trade-offs.
