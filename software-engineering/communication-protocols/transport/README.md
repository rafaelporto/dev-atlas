# Transport Protocols

The transport layer (layer 4) moves bytes between two endpoints and defines the guarantees you get: whether data arrives reliably and in order, or fast and best-effort. Every application protocol in the rest of this section rides on one of these.

The choice is fundamentally a trade-off between **reliability** and **latency**. TCP gives you an ordered, reliable byte stream at the cost of setup and retransmission overhead. UDP gives you cheap, connectionless datagrams with no guarantees. QUIC is the modern synthesis: UDP-based, but adding TCP-grade reliability plus multiplexing and built-in encryption.

---

## Articles

| Article | Description |
|---|---|
| [TCP](tcp.md) | Connection-oriented, reliable, ordered byte stream — the default transport |
| [UDP](udp.md) | Connectionless, unreliable, low-overhead datagrams — speed over guarantees |
| [QUIC](quic.md) | UDP-based, multiplexed, 0-RTT, encrypted — the transport behind HTTP/3 |

---

> You rarely choose a transport directly — you choose an application protocol that comes with one. But understanding the transport explains the application's behavior: HTTP/2's head-of-line blocking, a game's use of UDP, or HTTP/3's faster connection setup all come from the layer below.
