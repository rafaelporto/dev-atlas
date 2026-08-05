# Communication Protocols

Communication protocols are the agreed rules for how programs exchange data over a network — how a connection is set up, how messages are framed, and what a response means. This section covers the protocols you meet most in day-to-day engineering, organized by layer: the transport underneath, the HTTP family on top, and the API styles used to design services.

Start with the [Overview](overview.md) for the map (layers and interaction patterns), then use the [Comparison](comparison.md) to pick one for a concrete problem. For **asynchronous, decoupled** communication (queues, event streams, pub/sub), see the sibling [Messaging](../messaging/README.md) section — this section is about **direct** endpoint-to-endpoint communication.

---

## Articles

| Article | Description |
|---|---|
| [Overview](overview.md) | The protocol landscape: OSI/TCP-IP layers, interaction patterns, and taxonomy |
| [Comparison](comparison.md) | A side-by-side decision guide across direction, latency, contract, and reach |

---

## Subsections

| Subsection | Description |
|---|---|
| [Transport](transport/README.md) | Layer-4 transports: TCP, UDP, QUIC |
| [HTTP Family](http/README.md) | Web wire protocols: HTTP, WebSocket, SSE, and HTTP streaming |
| [API Styles](api-styles/README.md) | Designing APIs: REST, gRPC, and GraphQL |

---

> Pick along the shape of the problem — direction, latency, contract, reach — not by habit. And when components should be decoupled in time, the answer isn't a protocol here at all; it's [messaging](../messaging/README.md).
