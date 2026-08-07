---
type: concept
tags:
  - concept
  - networking
related:
  - software-engineering/communication-protocols/remote-access/ssh
  - software-engineering/communication-protocols/file-transfer/sftp
  - software-engineering/communication-protocols/file-transfer/scp
  - software-engineering/communication-protocols/file-transfer/ftp
language: null
---
# rsync — Remote Sync

> A file-synchronization tool and protocol that copies only the differences between source and destination, making repeated transfers of large trees fast, resumable, and idempotent.

---

## What is it?

**rsync** synchronizes files and directory trees between two locations — local-to-remote, remote-to-local, or local-to-local — while transferring as little data as possible. Instead of copying whole files every time, it compares source and destination and sends only the **parts that changed**. Run it once and it copies everything; run it again after a small edit and it sends just the delta.

It is both a command-line tool and a wire protocol. Over a network it typically runs its protocol **over [SSH](../remote-access/ssh.md)** (secure, the common case) or against a standalone **rsync daemon** (`rsync://`, for public mirrors and high-throughput internal use).

## Why does it matter?

rsync is the backbone of an enormous amount of backup, mirroring, and deployment tooling because of three properties:

- **Efficiency** — the delta-transfer algorithm means a nightly backup of a 100 GB tree with a few changed files moves megabytes, not gigabytes.
- **Idempotence** — running the same sync repeatedly converges to the same state; it is safe to re-run.
- **Resumability** — an interrupted transfer can pick up where it left off (`--partial`), unlike [SCP](scp.md).

These make rsync the right tool precisely where [SFTP](sftp.md) and [SCP](scp.md) are weak: repeated, large, or flaky transfers.

## How it works

The core is the **rsync (delta-transfer) algorithm**. To update a file, the receiver splits its existing copy into fixed-size blocks and computes two checksums per block — a fast **rolling checksum** and a strong hash. It sends these to the sender, which rolls the fast checksum byte-by-byte across its own version of the file to find matching blocks. It then transmits only the **non-matching data** plus instructions on how to reassemble the file from existing blocks and new bytes.

```
Sender's file:   [ A ][ B'][ C ][ D ]     B changed to B'
Receiver has:    [ A ][ B ][ C ][ D ]

1. Receiver → sender:  checksums for blocks A, B, C, D
2. Sender rolls checksums, finds A, C, D already present
3. Sender → receiver:  "reuse A, here are new bytes for B', reuse C, reuse D"
4. Receiver rebuilds the file from local blocks + the small delta
```

Transport-wise, `rsync user@host:...` spawns rsync on the far side over SSH and the two processes speak the rsync protocol through that encrypted pipe; `rsync rsync://host/...` connects to a listening rsync daemon instead.

## Examples

Common synchronization patterns:

```bash
# Sync a local dir to a remote host over SSH (archive mode + compression, verbose)
rsync -avz ./site/ user@host:/var/www/site/

# Mirror exactly: delete files on the destination that no longer exist in the source
rsync -avz --delete ./site/ user@host:/var/www/site/

# Preview what would change without transferring anything
rsync -avz --dry-run ./site/ user@host:/var/www/site/

# Resume a large, interrupted transfer with progress
rsync -avz --partial --progress bigfile.iso user@host:/data/

# Force a specific SSH option (e.g. non-default port)
rsync -avz -e 'ssh -p 2222' ./site/ user@host:/var/www/site/
```

> Watch the **trailing slash** on the source: `./site/` copies the *contents* of `site` into the destination, while `./site` copies the `site` directory itself into it.

## When to use

- **Backups and mirrors** — efficient, incremental, repeatable syncs of large trees.
- **Deployments** — pushing build artifacts to servers, sending only what changed.
- **Large or unreliable transfers** — resumable and bandwidth-efficient where a plain copy would restart from zero.
- **One-way synchronization** with optional exact mirroring (`--delete`).

## When NOT to use

- **A single quick file copy** — [SCP](scp.md) or [SFTP](sftp.md) are simpler when there's nothing to synchronize.
- **Interactive filesystem operations** — browsing, ad-hoc renames, and manual management fit [SFTP](sftp.md) better.
- **Interop with systems that only speak FTP** — rsync must be available on both ends (or a daemon must be running); when it isn't, you may be stuck with [FTP/FTPS](ftp.md).
- **True bidirectional sync with conflict handling** — rsync is one-way; use a purpose-built sync tool for two-way merges.

## References

- [rsync `rsync(1)` manual page](https://download.samba.org/pub/rsync/rsync.1) — the full command reference.
- Tridgell, Andrew, and Paul Mackerras. *The rsync algorithm* (Technical Report TR-CS-96-05, ANU) — [the original paper describing the delta-transfer algorithm](https://www.andrew.cmu.edu/course/15-749/READINGS/required/cas/tridgell96.pdf).
- [rsync official site and documentation](https://rsync.samba.org/) — daemon setup, protocol, and options.
