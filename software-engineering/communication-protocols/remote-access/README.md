# Remote Access

Remote-access protocols give you an interactive session — a shell or terminal — on a machine across the network, as if you were sitting at its keyboard. They are the tools you use to log in, run commands, and administer remote servers.

Today the choice is essentially settled: **SSH** is the secure, encrypted standard for everything, and **Telnet** is a plaintext relic kept only for legacy gear and quick TCP diagnostics. Understanding both explains *why* encryption and authentication became non-negotiable for remote access.

---

## Articles

| Article | Description |
|---|---|
| [SSH](ssh.md) | Secure Shell — encrypted remote login, tunneling, and the base for SFTP/SCP |
| [Telnet](telnet.md) | Legacy plaintext remote terminal — replaced by SSH, useful only for diagnostics |

---

> For any real remote access today, use SSH; Telnet survives only for legacy equipment and probing whether a TCP port is open.
