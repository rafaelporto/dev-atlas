---
type: concept
tags:
  - operating-system
  - linux
  - overview
related:
  - operating-systems/linux/shell
  - operating-systems/linux/commands
  - operating-systems/linux/shortcuts
  - operating-systems/macos/overview
language: null
---

# Linux Overview

> Linux is a free, open-source, Unix-like operating system kernel that — combined with GNU userland and other software — powers most servers, containers, and cloud infrastructure in the world.

---

## What is it?

Strictly speaking, **Linux** is just the **kernel**: the core program that talks to hardware and manages processes, memory, and I/O. What people run day to day is a **distribution** (distro): the Linux kernel packaged together with a userland (usually GNU tools), a shell, an init system, a package manager, and applications. Ubuntu, Debian, Fedora, Arch, and Alpine are all distros wrapping the same kernel.

Linux is **Unix-like**: it follows Unix design principles and the POSIX standard closely, without being derived from the original AT&T Unix source. That is why the shell experience is nearly identical to macOS's.

This article stays **distribution-agnostic** — it covers what is true across essentially all Linux systems, and flags where things vary by distro rather than teaching any single one.

---

## Why does it matter?

Linux is the default platform for modern computing infrastructure:

- Nearly all **cloud servers** and **containers** run Linux — a Docker image *is* a Linux userland.
- **Kubernetes**, CI runners, and most backend deployment targets are Linux.
- It's **free and open source (GPLv2)**, endlessly customizable, and runs on hardware from a Raspberry Pi to a supercomputer.

For engineers, understanding Linux fundamentals — the filesystem layout, permissions, processes, and the shell — is essentially a prerequisite for backend, DevOps, and infrastructure work, regardless of the distro in front of you.

---

## How it works

Linux separates a small privileged **kernel** from a large **userland**:

```
┌───────────────────────────────────────────────┐
│  User applications (shell, editors, servers)    │
├───────────────────────────────────────────────┤
│  GNU userland + libraries (coreutils, glibc)    │  ← userspace
├───────────────────────────────────────────────┤
│  System call interface                          │  ← the boundary
├───────────────────────────────────────────────┤
│  Linux kernel: scheduler, MM, VFS, net, drivers │  ← kernelspace
├───────────────────────────────────────────────┤
│  Hardware                                       │
└───────────────────────────────────────────────┘
```

Concepts that hold across distros:

- **Everything is a file.** Regular files, directories, devices (`/dev/sda`), and even kernel/process state (`/proc`, `/sys`) are exposed through the filesystem and read/written with the same tools.
- **The Filesystem Hierarchy Standard (FHS).** A single tree rooted at `/`, with well-known locations: `/bin` `/usr/bin` (programs), `/etc` (config), `/home` (users), `/var` (logs, spool), `/tmp`, `/dev`, `/proc`, `/sys`, `/mnt` `/media` (mounts). There are no drive letters.
- **Users, groups, and permissions.** Every file has an owner, a group, and read/write/execute bits for owner/group/others. `root` (UID 0) is the superuser; privilege is escalated with `sudo`.
- **Processes and signals.** Processes form a tree from PID 1. They are controlled with signals (`SIGTERM`, `SIGKILL`, …) and organized with **cgroups** and **namespaces** — the same kernel features that make containers possible.
- **The init system.** PID 1 boots and supervises services. **systemd** is the most common today (`systemctl`, `journalctl`), though minimal distros use alternatives (OpenRC, runit, or Alpine's BusyBox init).

**Where distros differ** (so you know what *not* to assume): the package manager (`apt`/`dpkg` on Debian/Ubuntu, `dnf`/`rpm` on Fedora/RHEL, `pacman` on Arch, `apk` on Alpine), the default init, the C library (`glibc` vs. Alpine's `musl`), and default shell.

---

## Examples

Distribution-agnostic ways to inspect a Linux system:

```bash
# Kernel and architecture (works everywhere)
uname -a
uname -r          # kernel version only

# Which distribution is this? (standard file since systemd)
cat /etc/os-release

# CPU, memory, and block devices
nproc
free -h
lsblk

# The "everything is a file" idea in action:
cat /proc/cpuinfo      # CPU details from the kernel
cat /proc/loadavg      # system load
ls /sys/class/net      # network interfaces as files
```

---

## When to use

- Servers, cloud VMs, and container images — Linux is the de facto standard.
- CI/CD runners and reproducible build environments.
- Embedded and IoT devices, where a small custom Linux fits tight resources.
- Any workload where cost, openness, and total control over the OS matter.

## When NOT to use

- You must run Apple's toolchain (Xcode) or Windows-only enterprise software.
- You need vendor-certified desktop apps (some creative/CAD suites) with no Linux port.
- The team lacks the appetite to manage driver/hardware quirks on desktop/laptop Linux.

---

## References

- [The Linux Kernel Archives](https://www.kernel.org/)
- [Filesystem Hierarchy Standard (Linux Foundation)](https://refspecs.linuxfoundation.org/fhs.shtml)
- [The Linux Documentation Project](https://tldp.org/)
- [`man7.org` — Linux man pages online](https://man7.org/linux/man-pages/)
- [systemd documentation](https://systemd.io/)
