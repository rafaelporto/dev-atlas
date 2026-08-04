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
# AWS SQS (Simple Queue Service)

> A fully managed, serverless message queue on AWS that buffers messages between producers and consumers with zero infrastructure to operate.

---

## What is it?

**Amazon SQS** is a fully managed message queue. Producers send messages to a queue; consumers poll the queue, process messages, and delete them. AWS runs the infrastructure — there are no brokers to provision, patch, or scale. It is a *queue* broker (point-to-point): a message is delivered, held invisible while being processed, and removed on success.

SQS comes in two flavors. **Standard** queues offer maximum throughput with at-least-once delivery and best-effort ordering. **FIFO** queues guarantee ordering and (effectively) exactly-once processing within a message group, at lower throughput.

## Why does it matter?

SQS is the default queue for decoupling components on AWS because it removes operational burden almost entirely:

- **Zero ops** — no servers, no clustering, no capacity planning; it scales automatically.
- **Buffering** — absorbs traffic spikes so a slow consumer (or a temporarily down one) does not lose work; messages persist up to 14 days.
- **Reliability primitives** — visibility timeout, redrive policy, and native dead-letter queues handle failures cleanly.
- **Deep AWS integration** — pairs with Lambda (event source), SNS (fan-out), and IAM for access control.

## How it works

A consumer **receives** a message, which becomes **invisible** to others for the duration of the **visibility timeout**. The consumer processes it and then **deletes** it. If the consumer crashes or the timeout expires before deletion, the message becomes visible again and is redelivered — this is why SQS is **at-least-once** and consumers must be idempotent.

After a configurable number of failed receives (`maxReceiveCount`), a **redrive policy** moves the message to a **dead-letter queue** for inspection instead of retrying forever.

```
Producer ──► [ SQS Queue ] ──receive──► Consumer
                  │  message hidden (visibility timeout)
                  │
     delete on success ──────────────► removed
     no delete (crash/timeout) ──────► visible again → redelivered
     failed maxReceiveCount times ───► [ Dead-Letter Queue ]
```

SQS has **no native publish/subscribe**: one message is consumed by one consumer. To fan out to multiple consumers, put **SNS** (or EventBridge) in front and subscribe several SQS queues to it — the common "SNS → SQS fan-out" pattern.

## Getting Started

Create a standard queue with the AWS CLI, send and receive a message:

```bash
# Create a queue
aws sqs create-queue --queue-name orders

# Send a message
aws sqs send-message \
  --queue-url https://sqs.<region>.amazonaws.com/<account-id>/orders \
  --message-body '{"order_id": 1234}'

# Receive (message becomes invisible for the visibility timeout)
aws sqs receive-message \
  --queue-url https://sqs.<region>.amazonaws.com/<account-id>/orders
```

Official developer guide: [https://docs.aws.amazon.com/sqs/](https://docs.aws.amazon.com/sqs/)

## Examples

A consumer loop with explicit delete after success (pseudocode reflecting the SDK model):

```
loop:
    resp = sqs.receive_message(queue_url=URL, max_messages=10, wait_time=20)  # long polling
    for msg in resp.messages:
        try:
            process(msg.body)                       # must be idempotent (at-least-once)
            sqs.delete_message(queue_url=URL, receipt_handle=msg.receipt_handle)
        except:
            pass   # leave it: visibility timeout expires → redelivered → eventually DLQ
```

FIFO queue: send with a `MessageGroupId` so messages in the same group stay ordered and deduplicated.

## When to use

- Decoupling components already running on AWS with minimal operational overhead.
- Buffering work for Lambda functions or worker fleets (task queues).
- You need a reliable queue with automatic scaling and built-in dead-lettering.
- FIFO: ordered, deduplicated processing within a group (e.g. per-account events).

## When NOT to use

- You need native pub/sub fan-out — SQS alone is point-to-point; add SNS/EventBridge, or use [Google Pub/Sub](google-pubsub.md)/[Service Bus topics](azure-service-bus.md).
- You need a replayable event log — SQS deletes on consumption and retains at most 14 days; use [Kafka](kafka.md).
- Multi-cloud or on-prem portability — SQS ties you to AWS.
- Very high-throughput strict ordering — FIFO throughput is capped compared to standard queues and log brokers.

## References

To go deeper, start with the AWS developer guide, then the fan-out and comparison references:

- [Amazon SQS documentation](https://docs.aws.amazon.com/sqs/) — queues, visibility timeout, FIFO, DLQ.
- [SNS + SQS fan-out pattern](https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html) — adding pub/sub in front of SQS.
- [Broker Comparison](../comparison.md) — SQS vs. the other managed and self-hosted brokers.
