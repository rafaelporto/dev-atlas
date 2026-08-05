---
type: concept
tags:
  - concept
  - networking
related:
  - software-engineering/communication-protocols/transport/tcp
  - software-engineering/communication-protocols/transport/quic
  - software-engineering/communication-protocols/overview
  - software-engineering/communication-protocols/comparison
language: null
---
# UDP — User Datagram Protocol

> A connectionless transport that fires individual datagrams with no handshake and no delivery guarantees — trading reliability for the lowest possible overhead and latency.

---

## What is it?

**UDP** sends discrete messages (datagrams) from one endpoint to another without establishing a connection first and without checking whether they arrive. There is no handshake, no acknowledgement, no ordering, no retransmission. You hand UDP a packet with a destination, and it does its best to deliver it — once, maybe.

That sounds fragile, and for bulk data it is. But for use cases where **speed matters more than completeness** — live audio/video, gaming, DNS lookups, metrics — it is exactly the right tool.

## Why does it matter?

UDP matters because [TCP's](tcp.md) guarantees are not free, and for some workloads they are actively harmful:

- A retransmitted video frame or audio sample arrives **too late to be useful** — you would rather skip it and show the next one.
- A DNS query is a single small request/response; opening a TCP connection for it would add round-trips for no benefit.
- High-frequency game state updates are self-correcting — the next update supersedes the lost one, so retransmission is wasted effort.

UDP hands control back to the application: if you need *some* reliability (but not TCP's all-or-nothing ordering), you build exactly what you need on top. This is precisely what [QUIC](quic.md) does.

## How it works

**Connectionless and unreliable by design.** Each datagram is independent — it carries source and destination ports, a length, and a checksum, and nothing more. There is no shared connection state between sender and receiver.

```
TCP                                   UDP
────────────────────────────         ────────────────────────────
handshake, then ordered stream        no handshake, independent datagrams

  C ──SYN──►    S                       C ──datagram 1──►  S   (may arrive)
  C ◄SYN-ACK─   S                       C ──datagram 2──►  S   (may be lost)
  C ──ACK──►    S                       C ──datagram 3──►  S   (may arrive
  C ══stream═►  S                                              out of order)
  (reliable, in order)                  (best-effort, no order guarantee)
```

What you get and don't get:

- **No handshake** — the first datagram can carry data immediately; there is no connection setup latency.
- **No ordering** — datagram 3 may arrive before datagram 2, or not at all.
- **No delivery guarantee** — lost datagrams are simply gone; UDP never retransmits.
- **Message-oriented, not stream-oriented** — one `send` is one datagram, preserving message boundaries (unlike TCP's byte stream).
- **Checksum only** — corruption is detected (and the datagram dropped), but not repaired.
- **Multicast/broadcast** — UDP can send one datagram to many receivers, which TCP cannot.

## Examples

A minimal UDP echo server and client. Note there is no `accept`/`connect` connection setup — the server binds a port and receives datagrams; the client sends one and reads the reply.

### Go

```go
// Server
addr, _ := net.ResolveUDPAddr("udp", ":9001")
conn, _ := net.ListenUDP("udp", addr)
buf := make([]byte, 1024)
for {
    n, client, _ := conn.ReadFromUDP(buf)
    conn.WriteToUDP(buf[:n], client) // echo back to sender
}

// Client
server, _ := net.ResolveUDPAddr("udp", "localhost:9001")
conn, _ := net.DialUDP("udp", nil, server)
defer conn.Close()
conn.Write([]byte("ping"))
buf := make([]byte, 1024)
n, _ := conn.Read(buf)
fmt.Println(string(buf[:n])) // "ping"
```

### TypeScript (Node.js)

```ts
import dgram from "node:dgram";

// Server
const server = dgram.createSocket("udp4");
server.on("message", (msg, rinfo) => {
  server.send(msg, rinfo.port, rinfo.address); // echo
});
server.bind(9001);

// Client
const client = dgram.createSocket("udp4");
client.send("ping", 9001, "localhost");
client.on("message", (msg) => {
  console.log(msg.toString()); // "ping"
  client.close();
});
```

### Java

```java
// Server
try (DatagramSocket socket = new DatagramSocket(9001)) {
    byte[] buf = new byte[1024];
    while (true) {
        DatagramPacket packet = new DatagramPacket(buf, buf.length);
        socket.receive(packet);
        socket.send(packet); // echo back to packet's source address/port
    }
}

// Client
try (DatagramSocket socket = new DatagramSocket()) {
    var addr = InetAddress.getByName("localhost");
    byte[] data = "ping".getBytes();
    socket.send(new DatagramPacket(data, data.length, addr, 9001));
    byte[] buf = new byte[1024];
    var reply = new DatagramPacket(buf, buf.length);
    socket.receive(reply);
    System.out.println(new String(reply.getData(), 0, reply.getLength())); // "ping"
}
```

### C#

```csharp
using System.Net;
using System.Net.Sockets;
using System.Text;

// Server
using var server = new UdpClient(9001);
while (true)
{
    var result = await server.ReceiveAsync();
    await server.SendAsync(result.Buffer, result.Buffer.Length, result.RemoteEndPoint); // echo
}

// Client
using var client = new UdpClient();
var data = Encoding.UTF8.GetBytes("ping");
await client.SendAsync(data, data.Length, "localhost", 9001);
var response = await client.ReceiveAsync();
Console.WriteLine(Encoding.UTF8.GetString(response.Buffer)); // "ping"
```

## When to use

- **Real-time media** — voice/video calls, live streaming — where a late packet is worse than a missing one.
- **Online gaming** — frequent position/state updates where the newest packet supersedes the last.
- **Small request/response lookups** — DNS, NTP — where a TCP handshake would dominate the cost.
- **Telemetry and metrics** (e.g. StatsD) — high-volume fire-and-forget where occasional loss is acceptable.
- **Multicast/broadcast** — service discovery, one-to-many distribution.

## When NOT to use

- **Anything requiring complete, ordered data** — file transfers, API responses, database traffic. Use [TCP](tcp.md).
- When you find yourself **reimplementing acknowledgements, ordering, and retransmission** on top of UDP — either use TCP, or adopt [QUIC](quic.md), which already solved this well.
- Across networks that **filter UDP** — some restrictive firewalls block or throttle it, whereas TCP/HTTP traffic passes.

## References

- [IETF RFC 768 — User Datagram Protocol](https://www.rfc-editor.org/rfc/rfc768) — the original three-page specification.
- [MDN — UDP](https://developer.mozilla.org/en-US/docs/Glossary/UDP) — concise overview and comparison with TCP.
- Kurose & Ross. *Computer Networking: A Top-Down Approach*, "Connectionless Transport: UDP".
