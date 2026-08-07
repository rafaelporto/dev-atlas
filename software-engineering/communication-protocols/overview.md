---
type: concept
tags:
  - concept
  - networking
  - overview
related:
  - software-engineering/communication-protocols/comparison
  - software-engineering/communication-protocols/transport/tcp
  - software-engineering/communication-protocols/http/http
  - software-engineering/communication-protocols/api-styles/rest
  - software-engineering/communication-protocols/remote-access/ssh
  - software-engineering/communication-protocols/file-transfer/sftp
  - software-engineering/messaging/overview
language: null
---
# Communication Protocols — Overview

> A map of how programs talk to each other over a network: the layers involved, the interaction patterns, and where each protocol family fits.

---

## What is it?

A **communication protocol** is an agreed set of rules for how two programs exchange data over a network: how a connection is established, how messages are framed, in what order bytes arrive, and what a response means. When your browser loads a page, a mobile app syncs data, or two microservices call each other, a stack of protocols is doing the work underneath.

This section documents the protocols you meet most often in day-to-day engineering — from the transport layer (TCP, UDP, QUIC) up to the application protocols and API styles built on top (HTTP, WebSocket, SSE, REST, gRPC, GraphQL), plus the remote-access (SSH, Telnet) and file-transfer (FTP/FTPS, SFTP, SCP, rsync) protocols used to reach machines and move data between them. This overview gives you the map; each article is the deep dive.

## Why does it matter?

The protocol you pick is a set of trade-offs you inherit for the life of the system:

- **Latency and throughput** — a chatty request/response protocol behaves very differently from a persistent bidirectional stream.
- **Direction** — some interactions are client-initiated (request/response), some are server-pushed (notifications), some are full-duplex (chat, games).
- **Coupling** — a strongly-typed contract (gRPC, GraphQL schema) buys tooling and safety but couples client and server to a shared definition; a loose contract (REST over JSON) is flexible but easier to break silently.
- **Reach and operability** — HTTP traverses every firewall and proxy on earth; raw UDP or a custom TCP protocol may not.

Choosing wrong is expensive to undo: it leaks into client libraries, load balancers, observability, and the mental model of everyone who touches the system.

## How it works

### Layers: OSI vs. TCP/IP

Protocols are organized in layers, each building on the one below. The classic **OSI model** has seven layers; the **TCP/IP model** most engineers actually use collapses them into four. The protocols in this section live in the top two:

```
OSI (7 layers)            TCP/IP (4 layers)      Examples in this section
────────────────────────  ─────────────────────  ────────────────────────────
7 Application ┐
6 Presentation├──────────  Application            HTTP, WebSocket, SSE,
5 Session     ┘                                   REST, gRPC, GraphQL
────────────────────────  ─────────────────────  ────────────────────────────
4 Transport   ──────────   Transport              TCP, UDP, QUIC
────────────────────────  ─────────────────────  ────────────────────────────
3 Network     ──────────   Internet               IP  (not covered here)
────────────────────────  ─────────────────────  ────────────────────────────
2 Data Link   ┐
1 Physical    ┘──────────  Link                   Ethernet, Wi-Fi (out of scope)
```

The key insight: **application protocols ride on transport protocols**. HTTP/1.1 and HTTP/2 ride on TCP; HTTP/3 rides on QUIC (which itself rides on UDP). REST, gRPC, and GraphQL are *styles* layered on top of HTTP. Understanding the layer below explains the behavior above — HTTP/2's head-of-line blocking, for example, is a TCP property, which is exactly why HTTP/3 moved to QUIC.

### The families in this section

The web stack — API styles on the HTTP family on transport — is the core, with two more application-layer families alongside it: **remote access** (a shell on another machine) and **file transfer** (moving and syncing files). All of them ultimately ride on the transport layer.

```
                 ┌────────────────────────────────────────────┐
  API styles     │  REST         gRPC           GraphQL        │  how you
  (design)       │  (resources)  (RPC/Protobuf) (query lang.)  │  design APIs
                 └───────────────────┬────────────────────────┘
                                     │ ride on
  Application ┌───────────────┐ ┌────▼─────────┐ ┌───────────────────┐
  protocols   │ HTTP family   │ │ Remote access│ │ File transfer     │
              │ HTTP, WS,     │ │ SSH, Telnet  │ │ FTP/FTPS, SFTP,   │
              │ SSE, HTTP     │ │              │ │ SCP, rsync        │
              │ streaming     │ │              │ │ (SFTP/SCP/rsync   │
              │               │ │              │ │  ride on SSH)     │
              └───────┬───────┘ └──────┬───────┘ └─────────┬─────────┘
                      │ ride on        │ ride on           │ ride on
                 ┌────▼────────────────▼───────────────────▼───┐
  Transport      │  TCP          UDP           QUIC             │  layer-4
                 │  (reliable)   (fast)        (multiplexed)    │  transports
                 └────────────────────────────────────────────┘
```

### Interaction patterns

Independently of layer, protocols implement a small set of interaction patterns. Recognizing the pattern your problem needs is the fastest way to shortlist protocols:

- **Request/response** — client asks, server answers, connection idles. HTTP, REST, unary gRPC, GraphQL queries.
- **Server push (one-way stream)** — server sends a continuous stream to the client without repeated requests. SSE, server-streaming gRPC.
- **Full-duplex (bidirectional stream)** — both sides send at any time over one connection. WebSocket, bidirectional gRPC.
- **Fire-and-forget** — send without waiting or guaranteeing delivery. Raw UDP.
- **Publish/subscribe (asynchronous, decoupled)** — producers and consumers never talk directly; a broker sits between them. This is **messaging** — see the [Messaging section](../messaging/overview.md), which covers AMQP, MQTT, Kafka, and friends. This section deliberately does not re-cover those.

## Examples

Rather than code (each protocol article carries real examples in Go, TypeScript/Node.js, Java, and C#), here is the same intent — *"the client wants order #42 and updates about it"* — expressed through different protocols, to make the trade-offs concrete:

```
Protocol     Interaction        Shape of the exchange
──────────   ────────────────   ────────────────────────────────────────────
REST/HTTP    request/response   GET /orders/42            → 200 {json}
                                (poll again for updates)
GraphQL      request/response   POST /graphql {query ...} → 200 {only fields asked}
gRPC (unary) request/response   GetOrder(id:42)           → Order{...}  (binary)
SSE          server push        GET /orders/42/events     → stream of update events
WebSocket    full-duplex        open once, send/receive order updates both ways
Messaging    pub/sub            publish "order.updated"; interested services consume
```

Same goal, five very different systems. The [comparison](comparison.md) turns this into an explicit decision guide.

## When to use

- Use this section when you are **choosing how two components should talk** — a new API, a real-time feature, a service-to-service call — and want to understand the options before committing.
- Read the [transport articles](transport/tcp.md) when you are building something low-level (a custom protocol, a game server, a proxy) or debugging behavior that HTTP inherits from TCP/UDP.
- Read the [HTTP family](http/http.md) and [API styles](api-styles/rest.md) when designing web and service APIs.

## When NOT to use

- Do not reach for a protocol decision when a **framework has already made it well for you** — most CRUD web apps are fine on plain HTTP/REST, and reaching for gRPC or WebSocket adds operational cost for no benefit.
- Do not use this section for **asynchronous, decoupled messaging** (queues, event streams, pub/sub across services) — that is the [Messaging section](../messaging/overview.md).
- Do not treat the layers as swappable in isolation: you rarely "pick TCP" directly — you pick an application protocol (HTTP/3, gRPC) that comes with a transport.

## References

- Kurose, James F., and Keith W. Ross. *Computer Networking: A Top-Down Approach*. Pearson. The standard textbook on the layered model.
- [MDN — An overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview) — how application protocols sit on the network stack.
- [IETF RFC 1122 — Requirements for Internet Hosts](https://www.rfc-editor.org/rfc/rfc1122) — the TCP/IP layering model in its original form.
