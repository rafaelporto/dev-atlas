# File Transfer

File-transfer protocols move and synchronize files between machines across a network. Unlike the [remote-access](../remote-access/README.md) protocols, whose job is an interactive shell, these are about getting bytes of *files* from one host to another — a single upload, a scripted deploy, or a nightly backup.

The four covered here span the spectrum:

- **FTP / FTPS** — the classic protocol with separate control and data channels; FTPS adds TLS. Common in legacy interop.
- **SFTP** — secure transfer as a subsystem of SSH, single port, rich filesystem operations. The modern default.
- **SCP** — copy-over-SSH; simple but a legacy, deprecated protocol.
- **rsync** — efficient delta-transfer synchronization, ideal for large or repeated transfers.

---

## Articles

| Article | Description |
|---|---|
| [FTP & FTPS](ftp.md) | Classic File Transfer Protocol and its TLS-secured variant |
| [SFTP](sftp.md) | Secure file transfer as an SSH subsystem — the modern default |
| [SCP](scp.md) | Copy files over SSH — a legacy, deprecated protocol |
| [rsync](rsync.md) | Incremental delta-transfer sync, over SSH or a daemon |

---

> For secure transfers today, reach for SFTP or rsync-over-SSH; FTP/FTPS and SCP survive mostly for legacy interoperability.
