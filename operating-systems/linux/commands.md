---
type: concept
tags:
  - operating-system
  - linux
  - cli
related:
  - operating-systems/linux/overview
  - operating-systems/linux/shell
  - operating-systems/macos/commands
language: null
---

# Linux Commands

> The core command-line toolkit shared by essentially every Linux distribution — files, text, processes, permissions, and networking — kept distribution-agnostic.

---

## What is it?

These are the commands that come from the **GNU coreutils** and related standard packages present on nearly all Linux systems. They cover navigating and manipulating files, transforming text, inspecting and controlling processes, managing permissions, and basic networking. This article deliberately avoids distro-specific tooling (package managers) as a *subject* — those vary — and focuses on the portable common ground.

---

## Why does it matter?

This toolkit is the same whether you're on Ubuntu, Fedora, Arch, or an Alpine container. Learn it once and you can operate almost any Linux box — a server over SSH, a CI runner, a Docker image. Combined with pipes and redirection (see the shell article), these small single-purpose programs compose into powerful one-liners, embodying the Unix philosophy: *do one thing well, and connect them*.

---

## How it works

**Files & directories**

| Command | Purpose |
|---|---|
| `ls -lah` | List files (long, all, human sizes) |
| `cd`, `pwd` | Change / print working directory |
| `cp`, `mv`, `rm` | Copy, move/rename, remove (`rm -r` recursive) |
| `mkdir -p`, `rmdir` | Make (nested) / remove directories |
| `find <dir> -name '*.log'` | Search the tree by name/size/time |
| `ln -s target link` | Create a symbolic link |
| `du -sh`, `df -h` | Directory size / filesystem free space |

**Viewing & transforming text**

| Command | Purpose |
|---|---|
| `cat`, `less`, `head`, `tail -f` | Show / page / first / follow a file |
| `grep -rn 'pattern' .` | Search text recursively |
| `sed 's/a/b/g'` | Stream editing / substitution |
| `awk '{print $2}'` | Field-based processing |
| `sort`, `uniq -c`, `wc -l`, `cut`, `tr` | Sort, count, count lines, columns, translate |

**Processes & system**

| Command | Purpose |
|---|---|
| `ps aux`, `top`/`htop` | List / monitor processes |
| `kill <pid>`, `kill -9`, `pkill name` | Send signals / force-kill / by name |
| `jobs`, `fg`, `bg`, `nohup` | Job control |
| `systemctl status <svc>` | Service state (systemd) |
| `journalctl -u <svc>` | Service logs (systemd) |
| `free -h`, `uptime`, `dmesg` | Memory, load, kernel messages |

**Permissions & ownership**

| Command | Purpose |
|---|---|
| `chmod 644 file` / `chmod +x` | Change permission bits |
| `chown user:group file` | Change owner/group |
| `sudo`, `su` | Run as root / switch user |
| `umask` | Default permission mask for new files |

**Networking**

| Command | Purpose |
|---|---|
| `ip a`, `ip route` | Interfaces / routing (replaces old `ifconfig`) |
| `ss -tulpn` | Listening sockets/ports (replaces `netstat`) |
| `curl`, `wget` | HTTP requests / downloads |
| `ssh user@host`, `scp`, `rsync` | Remote shell / copy / sync |
| `ping`, `dig`/`nslookup` | Connectivity / DNS |

> Package managers are distro-specific: `apt`/`dpkg` (Debian/Ubuntu), `dnf`/`rpm` (Fedora/RHEL), `pacman` (Arch), `apk` (Alpine), `zypper` (openSUSE). The *concepts* (install, remove, update, search) are the same; only the command differs.

---

## Examples

Portable one-liners you'll reuse constantly:

```bash
# Find the 5 largest files under the current tree
find . -type f -printf '%s %p\n' 2>/dev/null | sort -rn | head -5

# Which process is holding port 8080?
ss -tulpn | grep :8080

# Tail a service's logs and filter for errors (systemd)
journalctl -u nginx -f | grep -i error

# Recursively find and replace across a project (with backups)
grep -rl 'oldName' src/ | xargs sed -i.bak 's/oldName/newName/g'

# Set safe permissions: dirs 755, files 644
find . -type d -exec chmod 755 {} + && find . -type f -exec chmod 644 {} +
```

Reading a permission string, `-rwxr-xr--`:

```text
 -  rwx  r-x  r--
 │   │    │    └─ others: read
 │   │    └────── group:  read + execute
 │   └─────────── owner:  read + write + execute
 └─────────────── type:   - file, d directory, l symlink
```

---

## When to use

- Operating any Linux host — the portable core works over SSH, in containers, and on CI.
- Building pipelines: compose `grep`/`sed`/`awk`/`sort`/`uniq` instead of writing a script.
- Diagnosing running systems: `ps`/`ss`/`journalctl`/`df` before reaching for heavier tools.

## When NOT to use

- Don't hardcode a distro's package manager in portable scripts — detect it or document the requirement.
- Don't assume the newest tools exist on minimal images — Alpine/BusyBox provide trimmed applets; some GNU flags are missing.
- Don't reach for `sed`/`awk` gymnastics when the data is structured — use `jq` for JSON, a real parser for anything nested.

---

## References

- [GNU Coreutils Manual](https://www.gnu.org/software/coreutils/manual/)
- [`man7.org` — Linux man pages online](https://man7.org/linux/man-pages/)
- [The Linux Command Line — William Shotts (free book)](https://linuxcommand.org/tlcl.php)
- [ExplainShell — break down any command](https://explainshell.com/)
