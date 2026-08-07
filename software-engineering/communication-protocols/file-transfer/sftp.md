---
type: concept
tags:
  - concept
  - networking
related:
  - software-engineering/communication-protocols/remote-access/ssh
  - software-engineering/communication-protocols/file-transfer/ftp
  - software-engineering/communication-protocols/file-transfer/scp
  - software-engineering/communication-protocols/file-transfer/rsync
language: null
---
# SFTP — SSH File Transfer Protocol

> A secure file-transfer and file-management protocol that runs as a subsystem of SSH — one encrypted connection, one port, and full remote filesystem operations. Despite the name, it has nothing to do with FTP.

---

## What is it?

**SFTP** lets you transfer files *and* manipulate the remote filesystem — list directories, rename, delete, change permissions, resume partial transfers — over a secure channel. It is implemented as a **subsystem of [SSH](../remote-access/ssh.md)**: the client opens a normal SSH connection (port 22), authenticates exactly as it would for a shell, and then runs the `sftp` subsystem inside that encrypted session.

The name is a common source of confusion. SFTP is **not** "FTP over SSL" — that is [FTPS](ftp.md). SFTP is a distinct protocol that reuses SSH for all of its security and needs no second data channel.

## Why does it matter?

SFTP is the modern default for secure file transfer, and for good reasons:

- **Security for free** — it inherits SSH's encryption, integrity checking, and authentication (including public-key auth), with no extra configuration.
- **One port, firewall-friendly** — everything rides the single SSH connection, avoiding the active/passive data-channel headaches of [FTP](ftp.md).
- **Rich operations** — unlike [SCP](scp.md), which only copies, SFTP can browse, stat, rename, remove, and resume, making it suitable for interactive clients and management tooling.

If a server already runs SSH, it can offer SFTP with zero additional services — one of the reasons it displaced FTP across the industry.

## How it works

SFTP is a **packet-based protocol** layered on top of an SSH channel. Once SSH has authenticated the user and encrypted the connection, the client requests the `sftp` subsystem, and the two sides exchange structured request/response packets — `OPEN`, `READ`, `WRITE`, `STAT`, `RENAME`, `CLOSE`, and so on — that map onto filesystem operations. Because it models the filesystem rather than just a byte copy, a client can seek, resume, and enumerate directories.

```
        ┌─────────────────────────────────────────────┐
        │              SFTP subsystem                  │  file ops:
        │   OPEN / READ / WRITE / STAT / RENAME ...    │  open, read, stat...
        ├─────────────────────────────────────────────┤
        │              SSH connection layer            │  one encrypted
        │        (authenticated, encrypted channel)    │  channel, port 22
        ├─────────────────────────────────────────────┤
        │                    TCP                        │  reliable transport
        └─────────────────────────────────────────────┘
```

The whole security model — key exchange, host-key verification, public-key or password auth — is SSH's (see [SSH](../remote-access/ssh.md)). SFTP adds only the file-operation semantics on top.

## Examples

Interactive session and non-interactive transfers:

```bash
# Interactive session (uses the same auth as `ssh user@host`)
sftp user@host
# then, at the sftp> prompt:
#   ls
#   cd /var/www
#   get report.pdf
#   put deploy.tar.gz
#   rename old.txt new.txt
#   bye

# Non-interactive one-liners
sftp user@host:/var/www/report.pdf .          # download
echo "put deploy.tar.gz" | sftp user@host     # scripted upload
```

Custom port and reused SSH config:

```bash
# SFTP uses SSH, so it honors ~/.ssh/config Host aliases
sftp prod            # 'prod' defined in ~/.ssh/config (see the SSH article)

# Non-default SSH port (capital -P, unlike ssh's lowercase -p)
sftp -P 2222 user@host
```

## When to use

- **Secure file transfer as the default** — whenever a host runs SSH, prefer SFTP for uploads/downloads.
- **Automation and scripted transfers** — reuses SSH key-based auth for password-less pipelines.
- **Restrictive firewalls / NAT** — a single port avoids FTP's data-channel problems.
- **When you need filesystem operations** — browsing, renaming, resuming — not just a raw copy.

## When NOT to use

- **Synchronizing large or frequently-changing trees** — [rsync](rsync.md) transfers only the differences and is far more efficient for repeated syncs.
- **Interop with systems that only speak FTP** — you may be forced onto [FTP/FTPS](ftp.md).
- **A trivial one-off copy in a pure-SSH workflow** — [SCP](scp.md) is marginally simpler, though SFTP is a fine (and safer) choice here too.

## References

- [IETF Draft — SSH File Transfer Protocol (draft-ietf-secsh-filexfer)](https://datatracker.ietf.org/doc/html/draft-ietf-secsh-filexfer-13) — the protocol specification.
- [OpenSSH `sftp(1)` manual page](https://man.openbsd.org/sftp) — the client shipped with OpenSSH.
- [OpenSSH `sftp-server(8)` manual page](https://man.openbsd.org/sftp-server) — the server-side subsystem.
