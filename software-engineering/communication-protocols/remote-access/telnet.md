---
type: concept
tags:
  - concept
  - networking
related:
  - software-engineering/communication-protocols/remote-access/ssh
  - software-engineering/communication-protocols/transport/tcp
  - software-engineering/communication-protocols/overview
language: null
---
# Telnet — Teletype Network

> A 1969 protocol for remote terminal access that sends everything — including passwords — as plaintext, long since replaced by SSH but still handy for probing TCP ports.

---

## What is it?

**Telnet** is one of the oldest application protocols on the internet: it opens a bidirectional, text-based terminal session to a remote host over TCP (port 23). You connect, log in, and interact with a shell — much like [SSH](ssh.md), but with one fatal difference: **nothing is encrypted**. Usernames, passwords, commands, and output all travel across the network in the clear.

Because of that, Telnet is effectively obsolete for real remote access. Its lasting value today is as a diagnostic tool — a quick way to check whether a TCP port is open and to poke at plaintext protocols by hand.

## Why does it matter?

Telnet matters mostly as history and as a teaching contrast. For decades it *was* remote login, until packet sniffing made plaintext credentials an obvious liability and SSH replaced it wholesale in the late 1990s. Knowing why Telnet died — no confidentiality, no integrity, no server authentication — is the clearest way to understand what [SSH](ssh.md) actually buys you.

It also survives in two practical niches: **debugging** text-based protocols (you can speak HTTP or SMTP manually over a Telnet connection) and interacting with **legacy equipment** (old routers, switches, and industrial gear) that never got an SSH implementation.

## How it works

Telnet is built on the **Network Virtual Terminal (NVT)** abstraction — a canonical, imaginary terminal that both ends agree to emulate, so a client and server with different real terminals can interoperate. On top of that, peers negotiate optional features (echo mode, window size, terminal type) through a small command grammar: `WILL` / `WONT` (I will / won't do X) and `DO` / `DONT` (please do / don't do X), each introduced by the `IAC` ("interpret as command") byte.

Everything else — the actual session data — flows as raw, unencrypted bytes:

```
   Client                         Server
     │        TCP connect :23        │
     │ ────────────────────────────► │
     │   IAC negotiation (DO/WILL)   │
     │ ◄───────────────────────────► │
     │                               │
     │   "login:"  (plaintext)       │
     │ ◄──────────────────────────── │
     │   "admin"   (plaintext!)      │
     │ ────────────────────────────► │
     │   "password:" (plaintext)     │
     │ ◄──────────────────────────── │
     │   "hunter2"  (plaintext!!)    │  ← anyone on the path can read this
     │ ────────────────────────────► │
```

The takeaway: there is no key exchange, no encryption, and no cryptographic proof of the server's identity — the properties that define [SSH](ssh.md) are exactly the ones Telnet lacks.

## Examples

The one genuinely useful modern habit — using Telnet as a manual port/protocol prober:

```bash
# Is the port open? (connects, or refuses/hangs)
telnet example.com 80

# Speak HTTP by hand once connected, then press Enter twice:
GET / HTTP/1.0
Host: example.com

# Poke an SMTP server manually
telnet mail.example.com 25
```

Note that `nc` (netcat) and `curl` have largely superseded even this use:

```bash
# Modern equivalent of the port check
nc -vz example.com 80
```

## When to use

- **Quick connectivity checks** — confirming a remote TCP port is open and accepting connections.
- **Manual protocol debugging** on trusted networks — typing raw HTTP, SMTP, or other line-based protocols to see the exact server response.
- **Legacy devices** that expose only a Telnet management interface and cannot be upgraded.

## When NOT to use

- **Any real remote login or administration** — credentials and data travel in plaintext; use [SSH](ssh.md) instead.
- **Untrusted networks or the public internet** — trivially sniffed and hijacked; never expose Telnet externally.
- **Anything requiring server authentication** — Telnet gives no proof you're talking to the intended host.

## References

- [IETF RFC 854 — Telnet Protocol Specification](https://www.rfc-editor.org/rfc/rfc854) — the original standard.
- [IETF RFC 855 — Telnet Option Specifications](https://www.rfc-editor.org/rfc/rfc855) — the DO/DONT/WILL/WONT negotiation model.
- [MDN / networking glossaries on why plaintext protocols were deprecated in favor of TLS/SSH](https://developer.mozilla.org/en-US/docs/Glossary/TCP) — background on the move away from unencrypted protocols.
