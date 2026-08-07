---
type: concept
tags:
  - concept
  - networking
related:
  - software-engineering/communication-protocols/remote-access/ssh
  - software-engineering/communication-protocols/file-transfer/sftp
  - software-engineering/communication-protocols/file-transfer/rsync
language: null
---
# SCP — Secure Copy Protocol

> A simple command for copying files between hosts over an SSH connection — once ubiquitous, now a legacy protocol that its own maintainers recommend replacing with SFTP or rsync.

---

## What is it?

**SCP** copies files between a local and a remote machine (or between two remote machines) over a secure [SSH](../remote-access/ssh.md) connection. It descends from the old Berkeley `rcp` ("remote copy") command, keeping the same familiar syntax but running the transfer inside SSH's encrypted channel. Its whole job is a one-shot copy — there is no directory browsing, no rename, no resume.

For years `scp` was the fastest thing to reach for when you just needed to move a file securely. Today it is considered **outdated**: the OpenSSH project has deprecated the traditional SCP protocol and now recommends [SFTP](sftp.md) or [rsync](rsync.md) instead.

## Why does it matter?

SCP matters because it is everywhere — in scripts, in documentation, and in engineers' muscle memory — so you will read and write `scp` commands whether or not you choose it for new work. It also illustrates a real security lesson: the legacy SCP *protocol* has known weaknesses (notably that a malicious or compromised server could influence which files the client writes), which is precisely why it fell out of favor.

Modern OpenSSH has responded by making `scp` use the **SFTP protocol under the hood** by default, while keeping the old command-line interface. The familiar command survives; the fragile wire protocol behind it is being retired.

## How it works

Classic SCP works by having the local `scp` invoke an `scp` process on the remote host over an SSH session; the two exchange a tiny ad-hoc protocol of file metadata (permissions, size, name) followed by the raw bytes. All of it travels inside the SSH-encrypted channel, so confidentiality and authentication come from [SSH](../remote-access/ssh.md) — SCP itself adds only the copy semantics.

The important modern nuance:

- **New OpenSSH** (9.0+) — `scp` uses the **SFTP** protocol by default, gaining SFTP's safer behavior while preserving the classic syntax.
- **Legacy protocol** — you can force the old SCP protocol with `scp -O`, but this is discouraged and exists mainly for talking to very old servers.

Because SCP is copy-only, it cannot list directories, resume an interrupted transfer, or synchronize — for those you need [SFTP](sftp.md) or [rsync](rsync.md).

## Examples

The command is `scp [source] [destination]`, where a remote path is `user@host:/path`:

```bash
# Local file -> remote host
scp deploy.tar.gz user@host:/var/www/

# Remote file -> local directory
scp user@host:/var/log/app.log ./logs/

# Recursively copy a directory
scp -r ./site user@host:/var/www/

# Non-default SSH port (capital -P, unlike ssh's lowercase -p)
scp -P 2222 file.txt user@host:/tmp/

# Force the legacy SCP protocol (discouraged)
scp -O file.txt user@host:/tmp/
```

## When to use

- **A quick, one-off secure copy** in an environment where SSH is already set up and simplicity matters more than features.
- **Simple scripts** where the destination is a single known path and no synchronization or resume is needed.

## When NOT to use

- **New automation or anything non-trivial** — prefer [SFTP](sftp.md) (richer, actively maintained) or [rsync](rsync.md) (efficient, resumable).
- **Interrupted or large transfers** — SCP cannot resume; [rsync](rsync.md) can.
- **Directory synchronization** — SCP always copies everything; [rsync](rsync.md) transfers only what changed.
- **Talking to untrusted servers with the legacy protocol** — avoid `scp -O`; use the SFTP-backed default or [SFTP](sftp.md) directly.

## References

- [OpenSSH `scp(1)` manual page](https://man.openbsd.org/scp) — including the deprecation note and the `-O` legacy-protocol flag.
- [OpenSSH 9.0 release notes](https://www.openssh.com/txt/release-9.0) — announcing the switch of `scp` to the SFTP protocol by default.
- [CVE-2020-15778 and related SCP advisories](https://nvd.nist.gov/vuln/detail/CVE-2020-15778) — background on the legacy protocol's weaknesses.
